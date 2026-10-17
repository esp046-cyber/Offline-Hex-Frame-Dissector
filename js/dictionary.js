// Searchable offline Object / Variation reference, built from the tables in tag-converter.js.
import { OBJECTS } from './tag-converter.js';
import { esc } from './templates.js';

const CATS = [
  ['Binary Inputs', [1, 2, 3, 4]], ['Binary Outputs / CROB', [10, 11, 12]], ['Counters', [20, 21, 22]],
  ['Analog Inputs', [30, 32]], ['Analog Outputs', [40, 41]], ['Time and Date', [50, 51, 52]],
  ['Class Data', [60]], ['Internal Indications', [80]]
];
const NOTES = {
  1: 'Static state. v1 packs 8 points per byte; v2 adds a flag byte per point.',
  2: 'Events. Flag byte bit 7 is the state.',
  12: 'Used with SELECT / OPERATE / DIRECT_OPERATE. Layout: control code, count, on-time (ms, 4 bytes), off-time (ms, 4 bytes), status.',
  20: 'Running counter value, little-endian.', 22: 'Counter change events.',
  30: 'Flag byte first (where "with flag"), then value little-endian. Float variations are IEEE-754.',
  32: 'Analog change events; time variants add a 48-bit timestamp.',
  41: 'Setpoint commands (SELECT / OPERATE / DIRECT_OPERATE).',
  50: 'v1 is 48-bit milliseconds since 1970-01-01 UTC, little-endian. Master writes it to clear NEED_TIME.',
  60: 'v1 = Class 0 (all static data), v2 / v3 / v4 = Class 1 / 2 / 3 events. Used in READ and ENABLE_UNSOLICITED.',
  80: 'Packed bits. Index 7 = DEVICE_RESTART (write 0 to clear), index 4 = NEED_TIME.'
};

const groups = CATS.flatMap(([cat, ids]) => ids.filter(g => OBJECTS[g]).map(g => ({
  group: g, cat, name: OBJECTS[g].name, note: NOTES[g] || '',
  vars: Object.entries(OBJECTS[g].vars).map(([n, v]) => ({ n: +n, name: v.name, size: v.size }))
})));
const sizeText = s => s === null ? 'bit-packed' : s === 0 ? 'no data' : s + (s === 1 ? ' byte' : ' bytes');

export function filterDictionary(q) {
  q = q.trim().toLowerCase();
  if (!q) return groups;
  const num = /^\d+$/.test(q) ? +q : null;
  const tokens = q.split(/\s+/);
  return groups.map(g => {
    const gHay = `g${g.group} obj ${g.group} ${g.name} ${g.cat}`.toLowerCase();
    if (num !== null ? g.group === num : tokens.every(t => gHay.includes(t))) return g;
    const vars = g.vars.filter(v => {
      if (num !== null) return false;
      const hay = `${gHay} v${v.n} g${g.group}v${v.n} ${v.name}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    });
    return vars.length ? { ...g, vars } : null;
  }).filter(Boolean);
}

export function renderDictionary(list) {
  if (!list.length) return '<p class="dim">No objects match. Try a group number such as 30, or a word such as analog.</p>';
  return list.map(g => `<section class="dict-group"><h3><code>Obj ${g.group}</code> ${esc(g.name)} <span class="dim">${esc(g.cat)}</span></h3>
    ${g.note ? `<p class="dim">${esc(g.note)}</p>` : ''}
    <div class="scroll"><table class="grid"><thead><tr><th>Var</th><th>Description</th><th>Size per point</th></tr></thead><tbody>
    ${g.vars.map(v => `<tr><td><code>g${g.group}v${v.n}</code></td><td>${esc(v.name)}</td><td class="mono">${sizeText(v.size)}</td></tr>`).join('')}
    </tbody></table></div></section>`).join('');
}

export function initDictionary() {
  const q = document.getElementById('dictSearch'), out = document.getElementById('dictResults'), n = document.getElementById('dictCount');
  const run = () => { const l = filterDictionary(q.value); out.innerHTML = renderDictionary(l); n.textContent = `${l.length} object group${l.length === 1 ? '' : 's'}`; };
  q.addEventListener('input', run); run();
}
