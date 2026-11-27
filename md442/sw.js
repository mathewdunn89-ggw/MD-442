// MD|442 desktop app: offline copy of the console. Bump the name on every release.
const C = 'md442-desk-v33';
const CORE = ['./', './index.html', './md442.js', './md442.css', './md442-dark.css', './md442-ux.css', './mix-autoplay.js', './manifest.webmanifest', './app/icon-192.png', './app/icon-512.png', './samples/md187/BOOMBP.wav', './samples/md187/DRUMS.wav', './samples/md187/STABS.wav', './samples/md187/VOX.wav', './samples/md888/RUMBLE.wav', './samples/md888/GABBA.wav', './samples/md888/TRANCE.wav', './samples/md888/HITS.wav'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('md442-desk-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin && /^\/md(442|187|888)\//.test(u.pathname) && !/^\/md\d+\/app\//.test(u.pathname)) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.host)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; })));
  }
});
