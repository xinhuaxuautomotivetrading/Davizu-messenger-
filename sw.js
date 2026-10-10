const CACHE = 'davizu-messenger-1';
const CORE = ['./', 'index.html', 'app.html', 'privacy.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});

// Pages: network first (so updates arrive), cache as offline fallback.
// Images, icons and CDN libraries: cache first. Supabase API calls are never cached.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const cdn = url.hostname === 'cdn.jsdelivr.net';
  if (!same && !cdn) return;
  const isPage = req.mode === 'navigate' || (same && /\.(html|js|json)$/.test(url.pathname));
  if (isPage) {
    e.respondWith(fetch(req).then(res => {
      if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return res;
    }).catch(() => caches.match(req).then(h => h || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
    return res;
  })));
});
