// Bump the name on every release.
const C = 'md442-app-v28';
const CORE = ['./', './index.html', '../md442.js', '../md442.css', '../md442-dark.css', '../md442-ux.css', './manifest.webmanifest', './icon-192.png', './icon-512.png', '../samples/md187/BOOMBP.wav', '../samples/md187/DRUMS.wav', '../samples/md187/STABS.wav', '../samples/md187/VOX.wav', '../samples/md888/RUMBLE.wav', '../samples/md888/GABBA.wav', '../samples/md888/TRANCE.wav', '../samples/md888/HITS.wav'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.host)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; })));
  }
});
