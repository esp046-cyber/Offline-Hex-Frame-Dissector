// Input sanitation for pasted hex strings.

/** Strip 0x prefixes, spaces, commas, colons, newlines. Returns { ok, bytes, text, error }. */
export function sanitizeHex(raw) {
  const cleaned = String(raw || '').replace(/0x/gi, '').replace(/[\s,;:\-_]+/g, '');
  if (!cleaned) return { ok: false, empty: true, bytes: [], text: '', error: '' };
  const bad = cleaned.match(/[^0-9a-f]/i);
  if (bad) return { ok: false, bytes: [], text: '', error: `Invalid character "${bad[0]}". Use hex digits 0-9 and A-F only.` };
  if (cleaned.length % 2) return { ok: false, bytes: [], text: '', error: 'Odd number of hex digits. A byte needs two digits; check for a missing character.' };
  const bytes = [];
  for (let i = 0; i < cleaned.length; i += 2) bytes.push(parseInt(cleaned.substr(i, 2), 16));
  return { ok: true, bytes, text: formatHex(bytes) };
}

export function formatHex(bytes) {
  return bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

/** Wire a textarea so every edit triggers onChange(sanitizeResult). */
export function initEditor(textarea, onChange) {
  let timer;
  const run = () => onChange(sanitizeHex(textarea.value));
  textarea.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
  textarea.addEventListener('paste', () => setTimeout(() => {
    const r = sanitizeHex(textarea.value);
    if (r.ok) textarea.value = r.text;
    run();
  }, 0));
  return { setValue(v) { textarea.value = v; run(); }, run };
}
