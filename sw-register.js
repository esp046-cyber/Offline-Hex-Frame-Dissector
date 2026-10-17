// Registers the service worker, checks for updates, and reloads once when a new version takes over.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;   // false on the very first visit: no reload then
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    try {                                                       // keep whatever the engineer was typing
      const box = document.getElementById('hexInput');
      if (box && box.value) sessionStorage.setItem('fa-draft', box.value);
    } catch { /* storage blocked */ }
    location.reload();
  });

  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'VERSION') {
      const el = document.getElementById('ver');
      if (el) el.textContent = 'Version ' + e.data.version;
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' }).then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          // A new worker finished installing while an old one controls the page: activate it now.
          if (w.state === 'installed' && navigator.serviceWorker.controller) w.postMessage({ type: 'SKIP_WAITING' });
        });
      });
      navigator.serviceWorker.ready.then(() => {
        const c = navigator.serviceWorker.controller || reg.active;
        if (c) c.postMessage({ type: 'GET_VERSION' });
      });
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(err => console.warn('Service worker registration failed:', err));
  });
}
