/**
 * Workbox build configuration (injectManifest mode).
 *
 * The hand-written /service-worker.js (Phase 2) must contain the placeholder
 *   precacheAndRoute(self.__WB_MANIFEST);
 * `npm run build` copies the static site into ./dist, then Workbox injects the
 * precache manifest and writes the final worker to ./dist/service-worker.js.
 */
module.exports = {
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{html,css,js,webmanifest,svg,json,txt,xml}'
  ],
  globIgnores: [
    'service-worker.js',
    '.well-known/**',
    'sitemap.xml',
    'robots.txt'
  ],
  swSrc: 'service-worker.js',
  swDest: 'dist/service-worker.js',
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
  dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./
};
