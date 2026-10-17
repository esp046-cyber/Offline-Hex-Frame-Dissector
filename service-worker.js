/* DNP3 FieldAssist service worker: precache everything, serve cache-first, work fully offline.
   `npm run build` (Workbox injectManifest) replaces self.__WB_MANIFEST with the real file list + revisions. */
const FALLBACK = ['index.html', 'offline.html', 'style.css', 'app.js', 'sw-register.js', 'manifest.webmanifest',
  'js/editor.js', 'js/validator.js', 'js/templates.js', 'js/tag-converter.js', 'js/db.js', 'js/tabs.js', 'js/dictionary.js', 'js/decoders.js'].map(url => ({ url, revision: 'dev' }));
const MANIFEST = self.__WB_MANIFEST || FALLBACK;

const sig = MANIFEST.map(e => e.url + (e.revision || '')).join('|');
let h = 0; for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
const CACHE = 'fieldassist-' + (h >>> 0).toString(16);
const SCOPE = self.registration.scope;               // works at / and at /repo-name/
const abs = u => new URL(u, SCOPE).href;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(MANIFEST.map(m => new Request(abs(m.url), { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fieldassist-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const url = new URL(req.url);
    let hit = await cache.match(req, { ignoreSearch: true });
    if (!hit && req.mode === 'navigate') {
      const scopePath = new URL(SCOPE).pathname;
      let rel = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : '';
      if (!rel) rel = 'index.html';
      else if (!rel.includes('.')) rel = rel.replace(/\/$/, '') + '.html';
      hit = await cache.match(abs(rel));
    }
    if (hit) return hit;
    try { return await fetch(req); }
    catch {
      if (req.mode === 'navigate') return (await cache.match(abs('offline.html'))) || Response.error();
      return Response.error();
    }
  })());
});
