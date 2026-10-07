// Gradium web app (0.39.0): works offline after the first visit.
// Built files have a hash in their name, so a saved copy is always right: cache first.
// Everything else (the page, programs, published sheets, rules) tries the network first.
const CACHE = 'gradium-web'; // ponytail: old built files stay in it (~1 MB per release); rename to clear it if it ever matters

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // Supabase and other sites: untouched
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (url.pathname.includes('/assets/')) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }
    // the page itself is saved under one name, so any address opens it offline
    const key = req.mode === 'navigate' ? new URL('./', self.registration.scope).href : req;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(key, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
