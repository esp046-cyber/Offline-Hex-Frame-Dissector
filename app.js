// Main controller: wires editor, parser, templates and IndexedDB history.
import { initEditor } from './js/editor.js';
import { parseDNP3 } from './js/validator.js';
import { renderResult, renderHistory, summaryOf } from './js/templates.js';
import { saveDecode, getRecent, clearAll } from './js/db.js';
import { initTabs } from './js/tabs.js';
import { initDictionary } from './js/dictionary.js';
import { initDecoders } from './js/decoders.js';

const SAMPLE_REQUEST = '05 64 0B C4 0A 00 01 00 AC D1 C0 C0 01 3C 01 06 FF 50';
const SAMPLE_RESPONSE = '05 64 15 44 01 00 0A 00 4D 19 C0 C0 81 90 08 1E 02 00 00 01 01 10 00 01 20 00 23 2D';

const $ = id => document.getElementById(id);
const input = $('hexInput'), status = $('status'), results = $('results'), history = $('historyList');
let saveTimer;

async function refreshHistory() {
  try { history.innerHTML = renderHistory(await getRecent()); }
  catch { history.innerHTML = '<li class="dim empty">History is unavailable in this browser.</li>'; }
}

function onChange(s) {
  clearTimeout(saveTimer);
  if (s.empty) { status.textContent = 'Paste a hex string to decode it.'; status.className = 'status'; results.innerHTML = ''; return; }
  if (!s.ok) { status.textContent = s.error; status.className = 'status status-bad'; results.innerHTML = ''; return; }
  const r = parseDNP3(s.bytes);
  status.textContent = `${s.bytes.length} bytes, ${r.frames.length} link frame${r.frames.length === 1 ? '' : 's'}.`;
  status.className = 'status';
  results.innerHTML = renderResult(r);
  if (r.frames.length) {
    saveTimer = setTimeout(() => saveDecode(s.text, summaryOf(r)).then(refreshHistory).catch(() => {}), 900);
  }
}

const editor = initEditor(input, onChange);
$('sampleReq').addEventListener('click', () => editor.setValue(SAMPLE_REQUEST));
$('sampleResp').addEventListener('click', () => editor.setValue(SAMPLE_RESPONSE));
$('clearInput').addEventListener('click', () => { editor.setValue(''); input.focus(); });
$('clearHistory').addEventListener('click', async () => { try { await clearAll(); } catch {} refreshHistory(); });
history.addEventListener('click', e => {
  const b = e.target.closest('button[data-hex]');
  if (b) { editor.setValue(b.dataset.hex); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});

const online = () => { $('net').textContent = navigator.onLine ? 'Online' : 'Offline: everything still works'; $('net').dataset.online = navigator.onLine; };
window.addEventListener('online', online); window.addEventListener('offline', online); online();

initTabs(); initDictionary(); initDecoders();
refreshHistory();
if (new URLSearchParams(location.search).get('action') === 'decode') input.focus();
