// DNP3 payload value mini-decoders: Obj 50 time, analog/counter values, CROB control code.
import { sanitizeHex } from './editor.js';
import { esc } from './templates.js';

/** 48-bit little-endian milliseconds since 1970-01-01 UTC. */
export function decodeTime(bytes) {
  if (bytes.length !== 6) return { error: `Object 50 time is 6 bytes (48 bits); you entered ${bytes.length}.` };
  const ms = bytes.reduce((a, b, i) => a + b * 2 ** (8 * i), 0);
  const d = new Date(ms);
  return {
    ms, utc: d.toISOString().replace('T', ' ').replace('Z', ' UTC'),
    local: d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false }),
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/** Little-endian 8/16/32-bit value -> unsigned, signed, (float32). */
export function decodeValue(bytes) {
  if (![1, 2, 4].includes(bytes.length)) return { error: `Enter 1, 2 or 4 bytes (8, 16 or 32 bit); you entered ${bytes.length}.` };
  const dv = new DataView(Uint8Array.from(bytes).buffer), n = bytes.length;
  const rd = { 1: [dv.getUint8, dv.getInt8], 2: [dv.getUint16, dv.getInt16], 4: [dv.getUint32, dv.getInt32] }[n];
  const u = rd[0].call(dv, 0, true), s = rd[1].call(dv, 0, true);
  return { bits: n * 8, u, s, hex: '0x' + u.toString(16).toUpperCase().padStart(n * 2, '0'), float: n === 4 ? dv.getFloat32(0, true) : null };
}

const OPS = { 0: 'NUL', 1: 'Pulse On', 2: 'Pulse Off', 3: 'Latch On', 4: 'Latch Off' };
const TCC = { 0: 'NUL', 1: 'Close', 2: 'Trip', 3: 'Reserved' };
export function decodeCROB(bytes) {
  if (bytes.length !== 1) return { error: `The control code is 1 byte; you entered ${bytes.length}.` };
  const c = bytes[0], op = c & 0x0F, tcc = c >> 6;
  return { code: c, op, opName: OPS[op] || `Reserved (${op})`, tcc: TCC[tcc], queue: (c >> 4) & 1, clear: (c >> 5) & 1,
    bin: c.toString(2).padStart(8, '0') };
}

const kv = rows => `<table class="kv">${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`).join('')}</table>`;
const err = m => `<p class="status status-bad">${esc(m)}</p>`;

function bind(inputId, outId, decode, render) {
  const el = document.getElementById(inputId), out = document.getElementById(outId);
  const run = () => {
    const s = sanitizeHex(el.value);
    if (s.empty) { out.innerHTML = ''; return; }
    if (!s.ok) { out.innerHTML = err(s.error); return; }
    const r = decode(s.bytes);
    out.innerHTML = r.error ? err(r.error) : render(r);
  };
  el.addEventListener('input', run); run();
}

export function initDecoders() {
  bind('timeInput', 'timeOut', decodeTime, r => kv([
    ['Local time', `<strong>${esc(r.local)}</strong> <span class="dim">${esc(r.zone)}</span>`],
    ['UTC', esc(r.utc)], ['Milliseconds since epoch', String(r.ms)], ['Seconds since epoch', (r.ms / 1000).toString()]]));
  bind('valueInput', 'valueOut', decodeValue, r => kv([
    ['Width', `${r.bits}-bit little-endian`], ['Unsigned', `<strong>${r.u}</strong>`], ['Signed', `<strong>${r.s}</strong>`], ['Hex (value)', r.hex],
    ...(r.float !== null ? [['As IEEE float32', String(r.float)]] : [])]));
  bind('crobInput', 'crobOut', decodeCROB, r => kv([
    ['Operation', `<strong>${esc(r.opName)}</strong> <span class="dim">bits 0-3 = ${r.op}</span>`],
    ['Trip / Close code', `${esc(r.tcc)} <span class="dim">bits 6-7</span>`],
    ['Clear', r.clear ? 'Yes' : 'No'], ['Queue (obsolete)', r.queue ? 'Yes' : 'No'], ['Binary', r.bin]]));
}
