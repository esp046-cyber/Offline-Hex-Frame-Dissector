// DNP3 parser: Data Link (with CRC check), Transport, Application layers, IIN decoding.
import * as T from './tag-converter.js';

/** CRC-16/DNP: poly 0x3D65 (reflected 0xA6BC), init 0, output inverted. */
export function crc16(bytes, start = 0, end = bytes.length) {
  let crc = 0;
  for (let i = start; i < end; i++) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b++) crc = (crc & 1) ? (crc >>> 1) ^ 0xA6BC : crc >>> 1;
  }
  return (~crc) & 0xFFFF;
}

export const hex = (n, w = 2) => '0x' + n.toString(16).toUpperCase().padStart(w, '0');

function decodeBits(value, table) {
  return table.map((t, bit) => ({ bit, name: t.name, sev: t.sev, desc: t.desc, hint: t.hint, set: ((value >> bit) & 1) === 1 }));
}

export function decodeIIN(iin1, iin2) {
  const a = decodeBits(iin1, T.IIN1_BITS), b = decodeBits(iin2, T.IIN2_BITS);
  return { iin1: { raw: iin1, flags: a }, iin2: { raw: iin2, flags: b }, active: [...a, ...b].filter(f => f.set) };
}

function parseLinkFrame(b, off, n, issues) {
  if (b.length - off < 10) { issues.push({ level: 'error', msg: `Frame ${n}: only ${b.length - off} byte(s) left, a link header needs 10.` }); return null; }
  if (b[off] !== 0x05 || b[off + 1] !== 0x64) {
    issues.push({ level: 'error', msg: `Frame ${n}: bad sync bytes ${hex(b[off])} ${hex(b[off + 1])} (expected 0x05 0x64).` });
    return null;
  }
  const length = b[off + 2], c = b[off + 3];
  const ctrl = { raw: c, dir: (c >> 7) & 1, prm: (c >> 6) & 1, fcb: (c >> 5) & 1, fcv: (c >> 4) & 1, fc: c & 0x0F };
  ctrl.fcName = (ctrl.prm ? T.LINK_PRIMARY_FC : T.LINK_SECONDARY_FC)[ctrl.fc] || 'UNKNOWN';
  ctrl.dirName = ctrl.dir ? 'From master' : 'From outstation';
  const dest = b[off + 4] | (b[off + 5] << 8), src = b[off + 6] | (b[off + 7] << 8);
  const crcRx = b[off + 8] | (b[off + 9] << 8), crcCalc = crc16(b, off, off + 8);
  const crc = { rx: crcRx, calc: crcCalc, ok: crcRx === crcCalc };
  if (!crc.ok) issues.push({ level: 'error', msg: `Frame ${n}: header CRC mismatch (received ${hex(crcRx, 4)}, calculated ${hex(crcCalc, 4)}).` });
  if (length < 5) { issues.push({ level: 'error', msg: `Frame ${n}: LENGTH ${length} is below the minimum of 5.` }); }

  let remaining = Math.max(0, length - 5), pos = off + 10;
  const data = [], blocks = [];
  let truncated = false;
  while (remaining > 0) {
    const size = Math.min(16, remaining);
    const avail = b.length - pos;
    if (avail < size + 2) {
      for (let i = 0; i < Math.min(size, Math.max(avail, 0)); i++) data.push(b[pos + i]);
      issues.push({ level: 'error', msg: `Frame ${n}: data truncated (needs ${remaining} more user-data byte(s) plus CRCs).` });
      pos = b.length; truncated = true; break;
    }
    const rx = b[pos + size] | (b[pos + size + 1] << 8), calc = crc16(b, pos, pos + size);
    blocks.push({ rx, calc, ok: rx === calc, size });
    if (rx !== calc) issues.push({ level: 'error', msg: `Frame ${n}: data block ${blocks.length} CRC mismatch (received ${hex(rx, 4)}, calculated ${hex(calc, 4)}).` });
    for (let i = 0; i < size; i++) data.push(b[pos + i]);
    pos += size + 2; remaining -= size;
  }
  return { n, offset: off, length, ctrl, dest, src, crc, blocks, data, truncated, end: pos };
}

function parseObjects(a, start, hasData, issues) {
  const objects = [];
  let p = start;
  while (p < a.length) {
    if (a.length - p < 3) { issues.push({ level: 'warn', msg: `Object header at byte ${p} is incomplete.` }); break; }
    const group = a[p], variation = a[p + 1], q = a[p + 2];
    const prefix = (q >> 4) & 7, range = q & 0x0F;
    const names = T.objectName(group, variation);
    const o = { group, variation, qualifier: q, prefix, range, groupName: names.group, varName: names.variation,
      prefixName: T.QUALIFIER_PREFIX[prefix] || 'Reserved', rangeName: T.QUALIFIER_RANGE[range] || 'Reserved', rangeText: '', count: null, raw: null };
    p += 3;
    const rdU = n => { let x = 0; for (let i = 0; i < n; i++) x += a[p + i] * 2 ** (8 * i); return x; };
    const rangeBytes = { 0: 1, 1: 2, 2: 4, 3: 1, 4: 2, 5: 4, 7: 1, 8: 2, 9: 4 }[range];
    if (range === 6) { o.rangeText = 'all'; }
    else if (range === 11 || rangeBytes === undefined) { objects.push(o); issues.push({ level: 'warn', msg: `Qualifier ${hex(q)} not decoded further; remaining bytes shown raw.` }); o.raw = a.slice(p); break; }
    else {
      const need = (range <= 5) ? rangeBytes * 2 : rangeBytes;
      if (a.length - p < need) { issues.push({ level: 'warn', msg: 'Range field is truncated.' }); objects.push(o); break; }
      if (range <= 2) { const s = rdU(rangeBytes); p += rangeBytes; const e = rdU(rangeBytes); p += rangeBytes; o.count = e - s + 1; o.rangeText = `${s} to ${e}`; }
      else if (range <= 5) { p += need; o.rangeText = 'address range'; }
      else { o.count = rdU(rangeBytes); p += rangeBytes; o.rangeText = `count ${o.count}`; }
    }
    objects.push(o);
    if (!hasData || o.count === null || o.count < 0) continue;
    const prefixSize = { 0: 0, 1: 1, 2: 2, 3: 4 }[prefix];
    let bytes;
    if (names.size === null) bytes = Math.ceil(o.count / 8);
    else if (names.size === undefined || prefixSize === undefined) { o.raw = a.slice(p); issues.push({ level: 'warn', msg: `Object size for g${group}v${variation} unknown; remaining bytes shown raw.` }); break; }
    else bytes = o.count * (prefixSize + names.size);
    if (p + bytes > a.length) { o.raw = a.slice(p); issues.push({ level: 'warn', msg: `g${group}v${variation} data is shorter than its range implies.` }); break; }
    o.raw = a.slice(p, p + bytes); p += bytes;
  }
  return objects;
}

function parseApplication(a, issues) {
  if (a.length < 2) { issues.push({ level: 'error', msg: 'Application fragment is shorter than 2 bytes.' }); return null; }
  const c = a[0], fc = a[1];
  const ctrl = { raw: c, fir: (c >> 7) & 1, fin: (c >> 6) & 1, con: (c >> 5) & 1, uns: (c >> 4) & 1, seq: c & 0x0F };
  const isResponse = T.isResponseFC(fc);
  const app = { ctrl, fc, fcName: T.APP_FC[fc] || 'UNKNOWN', isResponse, iin: null, objects: [] };
  let p = 2;
  if (isResponse) {
    if (a.length < 4) { issues.push({ level: 'error', msg: 'Response is missing IIN1/IIN2 bytes.' }); return app; }
    app.iin = decodeIIN(a[2], a[3]); p = 4;
  }
  if (!T.APP_FC[fc]) issues.push({ level: 'warn', msg: `Unknown application function code ${hex(fc)}.` });
  app.objects = parseObjects(a, p, isResponse || T.DATA_REQUEST_FC.has(fc), issues);
  return app;
}

/** Parse a byte array holding one or more DNP3 link frames. */
export function parseDNP3(bytes) {
  const issues = [], frames = [];
  let off = 0, n = 1;
  while (off < bytes.length) {
    const f = parseLinkFrame(bytes, off, n++, issues);
    if (!f) break;
    frames.push(f); off = f.end;
  }
  if (!frames.length) return { byteCount: bytes.length, frames, transports: [], app: null, issues };

  const transports = [], payload = [];
  frames.forEach(f => {
    if (!f.data.length || ![3, 4].includes(f.ctrl.fc) || !f.ctrl.prm) return;
    const t = f.data[0];
    transports.push({ frame: f.n, raw: t, fin: (t >> 7) & 1, fir: (t >> 6) & 1, seq: t & 0x3F });
    for (let i = 1; i < f.data.length; i++) payload.push(f.data[i]);
  });

  let app = null;
  if (transports.length) {
    if (!transports[0].fir) issues.push({ level: 'warn', msg: 'First segment does not have FIR set: this is a continuation, so the application layer is not decoded.' });
    else {
      if (!transports[transports.length - 1].fin) issues.push({ level: 'warn', msg: 'Message has no FIN segment; only the pasted segments are decoded.' });
      app = parseApplication(payload, issues);
    }
  }
  return { byteCount: bytes.length, frames, transports, app, issues };
}
