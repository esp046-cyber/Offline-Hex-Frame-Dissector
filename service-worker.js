/* DNP3 FieldAssist service worker.
   - Bump CACHE_VERSION on any release to force every device to replace its cache.
   - Files are precached for offline use, but served NETWORK-FIRST (4 s timeout) so a deploy shows up on the
     next load; with no signal the cached copy is used.
   - `npm run build` (Workbox injectManifest) replaces self.__WB_MANIFEST with the real file list + revisions. */
const CACHE_VERSION = 'v3';

const FALLBACK = ['index.html', 'offline.html', '404.html', 'privacy.html', 'style.css', 'app.js', 'sw-register.js', 'manifest.webmanifest',
  'js/editor.js', 'js/validator.js', 'js/templates.js', 'js/tag-converter.js', 'js/db.js', 'js/tabs.js', 'js/dictionary.js', 'js/decoders.js']
  .map(url => ({ url, revision: CACHE_VERSION }));
const MANIFEST = self.__WB_MANIFEST || FALLBACK;

const sig = MANIFEST.map(e => e.url + (e.revision || '')).join('|');
let h = 0; for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
const CACHE = `fieldassist-${CACHE_VERSION}-${(h >>> 0).toString(16)}`;
const SCOPE = self.registration.scope;               // works at / and at /repo-name/
const abs = u => new URL(u, SCOPE).href;
const TIMEOUT_MS = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(MANIFEST.map(m => new Request(abs(m.url), { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('fieldassist-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  const t = e.data && e.data.type;
  if (t === 'SKIP_WAITING') self.skipWaiting();
  if (t === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
});

const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

async function cachedFallback(req, cache, isNav) {
  const url = new URL(req.url);
  let hit = await cache.match(req, { ignoreSearch: true });
  if (!hit && isNav) {
    const scopePath = new URL(SCOPE).pathname;
    let rel = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : '';
    if (!rel) rel = 'index.html';
    else if (!rel.includes('.')) rel = rel.replace(/\/$/, '') + '.html';
    hit = await cache.match(abs(rel));
  }
  if (hit) return hit;
  if (isNav) return (await cache.match(abs('offline.html'))) || Response.error();
  return Response.error();
}

async function handle(req) {
  const cache = await caches.open(CACHE);
  const isNav = req.mode === 'navigate';
  try {
    const res = await Promise.race([fetch(new Request(req.url, { cache: 'no-cache' })), timeout(TIMEOUT_MS)]);
    if (res.ok) { cache.put(req, res.clone()); return res; }
    if (isNav && res.status === 404) return (await cache.match(abs('404.html'))) || res;
    return res;
  } catch {
    return cachedFallback(req, cache, isNav);
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(handle(req));
});
