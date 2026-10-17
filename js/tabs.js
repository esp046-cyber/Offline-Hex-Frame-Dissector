// Accessible tab switching; remembers the active tab in the URL hash.
export function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const show = id => {
    tabs.forEach(t => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById('panel-' + t.dataset.tab).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { show(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab); });
    t.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click(); }
    });
  });
  const start = location.hash.slice(1);
  show(tabs.some(t => t.dataset.tab === start) ? start : 'dissector');
}
