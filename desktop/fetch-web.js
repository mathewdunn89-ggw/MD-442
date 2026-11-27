// Copies the live MD|442 web app into ./web so the desktop app works offline.
// Run in CI before electron-builder. Pass a base URL to override.
const fs = require('fs'), path = require('path');
const BASE = (process.argv[2] || 'https://music.nestgroup.space/md442/').replace(/\/?$/, '/');
const OUT = path.join(__dirname, 'web');
const seen = new Set(), queue = ['', 'app/', 'manifest.webmanifest', 'app/icon-192.png', 'app/icon-512.png'];
const local = u => { const p = u.endsWith('/') || u === '' ? u + 'index.html' : u; return path.join(OUT, p); };
async function get(rel) {
  if (seen.has(rel)) return; seen.add(rel);
  const res = await fetch(new URL(rel, BASE));
  if (!res.ok) { if (rel.endsWith('/') || rel === '' || /md442\.(js|css)$/.test(rel)) throw new Error(rel + ' ' + res.status); console.warn('skip', rel, res.status); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(local(rel)), { recursive: true }); fs.writeFileSync(local(rel), buf);
  console.log('got', rel || 'index.html', buf.length);
  if (/\.(html|css|webmanifest)$/.test(local(rel))) {
    const dir = rel.endsWith('/') || rel === '' ? rel : rel.replace(/[^/]*$/, '');
    for (const m of buf.toString().matchAll(/(?:src|href)=["']([^"'#?]+)|url\(["']?([^"')#?]+)|"src"\s*:\s*"([^"]+)"/g)) {
      const u = m[1] || m[2] || m[3];
      if (!u || /^(https?:|data:|mailto:|\/\/)/.test(u)) continue;
      const abs = new URL(u, new URL(dir, BASE));
      if (!abs.href.startsWith(BASE)) continue;
      queue.push(abs.href.slice(BASE.length));
    }
  }
}
// Files the app loads from JavaScript (the MD187/MD888 sample banks) are listed in the service worker's CORE list.
async function fromServiceWorker() {
  const res = await fetch(new URL('sw.js', BASE)); if (!res.ok) return;
  for (const m of (await res.text()).matchAll(/'\.\/((?:samples)\/[^']+)'/g)) queue.push(m[1]);
}
(async () => { await fromServiceWorker(); while (queue.length) await get(queue.shift()); })().catch(e => { console.error(e); process.exit(1); });
