// Gradium web app (0.39.0): works offline after the first visit.
// Built files have a hash in their name, so a saved copy is always right: cache first.
// Everything else (the page itself) tries the network first.
const CACHE = 'gradium-web'; // ponytail: old built files stay in it (~1 MB per release); rename to clear it if it ever matters

// the first visit loads the page before this worker exists: save the page and its scripts now (0.40.1),
// so the very next open works offline (the app also hands over the fonts it already loaded, main.tsx)
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('./', { cache: 'no-cache' });
    if (!res.ok) return;
    const html = await res.clone().text();
    await cache.put(new URL('./', self.registration.scope).href, res);
    const files = [...new Set([...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map((m) => m[1]))];
    await cache.addAll(files).catch(() => undefined);
  })().catch(() => undefined));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // Supabase and other sites: untouched
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (url.pathname.includes('/assets/')) {
      const hit = await cache.match(req, { ignoreVary: true }); // a saved copy matches whoever asks (e.g. "Vary: Origin")
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
      const hit = await cache.match(key, { ignoreSearch: true, ignoreVary: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
