// HTML string templates for decoded layers. All dynamic text is escaped.
import { hex } from './validator.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const row = (k, v, cls = '') => `<tr><th scope="row">${esc(k)}</th><td class="${cls}">${v}</td></tr>`;
const ok = (good, text) => `<span class="pill ${good ? 'pill-ok' : 'pill-bad'}">${good ? 'OK' : 'BAD'}</span> ${text}`;
const bit = b => (b ? '1 (set)' : '0');
const bytesHex = arr => esc(arr.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '));

function iinGroup(title, g) {
  const items = g.flags.map(f => `<li class="iin ${f.set ? 'iin-on sev-' + f.sev : 'iin-off'}">
    <span class="iin-bit">${f.bit}</span><span class="iin-name">${esc(f.name)}</span>
    <span class="iin-desc">${f.set ? esc(f.desc) : 'Clear'}</span></li>`).join('');
  return `<div class="iin-group"><h4>${title} <code>${hex(g.raw)}</code></h4><ul class="iin-list">${items}</ul></div>`;
}

function alertBanner(app) {
  if (!app || !app.iin) return '';
  const act = app.iin.active.filter(f => f.sev !== 'info' || /CLASS/.test(f.name));
  if (!act.length) return `<section class="banner banner-ok"><strong>No fault IIN bits set.</strong> The outstation reports no restart, time or buffer problems.</section>`;
  const items = act.map(f => `<li><strong>${esc(f.name)}</strong>: ${esc(f.hint)}</li>`).join('');
  const worst = act.some(f => f.sev === 'error') ? 'banner-error' : act.some(f => f.sev === 'warn') ? 'banner-warn' : 'banner-info';
  return `<section class="banner ${worst}" role="alert"><h3>Internal indications to act on</h3><ul>${items}</ul></section>`;
}

function linkLayer(frames) {
  return frames.map(f => `<table class="kv"><caption>Frame ${f.n}</caption>
    ${row('Sync', ok(true, '05 64'))}
    ${row('Length', `${f.length} <span class="dim">(${Math.max(0, f.length - 5)} user-data bytes)</span>`)}
    ${row('Control', `${hex(f.ctrl.raw)} <span class="dim">${esc(f.ctrl.dirName)}, ${f.ctrl.prm ? 'primary' : 'secondary'}, ${esc(f.ctrl.fcName)} (${f.ctrl.fc})</span>`)}
    ${row('DIR / PRM', `${f.ctrl.dir} / ${f.ctrl.prm}`)}
    ${row(f.ctrl.prm ? 'FCB / FCV' : 'DFC', f.ctrl.prm ? `${f.ctrl.fcb} / ${f.ctrl.fcv}` : String(f.ctrl.fcv))}
    ${row('Destination', `${f.dest} <span class="dim">${hex(f.dest, 4)}</span>`)}
    ${row('Source', `${f.src} <span class="dim">${hex(f.src, 4)}</span>`)}
    ${row('Header CRC', ok(f.crc.ok, `rx ${hex(f.crc.rx, 4)}, calc ${hex(f.crc.calc, 4)}`))}
    ${row('Data block CRCs', f.blocks.length ? f.blocks.map((b, i) => `<span class="pill ${b.ok ? 'pill-ok' : 'pill-bad'}">${i + 1}</span>`).join(' ') : '<span class="dim">none</span>')}
  </table>`).join('');
}

function transportLayer(ts) {
  if (!ts.length) return '<p class="dim">No user data in this frame, so there is no transport header.</p>';
  return ts.map(t => `<table class="kv"><caption>Frame ${t.frame}</caption>
    ${row('Header', hex(t.raw))}${row('FIN', bit(t.fin))}${row('FIR', bit(t.fir))}${row('Sequence', String(t.seq))}</table>`).join('');
}

function objectsTable(objs) {
  if (!objs.length) return '<p class="dim">No object headers.</p>';
  const rows = objs.map(o => `<tr><td><code>g${o.group}v${o.variation}</code></td><td>${esc(o.groupName)}<br><span class="dim">${esc(o.varName)}</span></td>
    <td>${hex(o.qualifier)}<br><span class="dim">${esc(o.prefixName)}; ${esc(o.rangeName)}</span></td>
    <td>${esc(o.rangeText || '-')}</td><td class="mono">${o.raw && o.raw.length ? bytesHex(o.raw) : '<span class="dim">-</span>'}</td></tr>`).join('');
  return `<div class="scroll"><table class="grid"><thead><tr><th>Object</th><th>Name</th><th>Qualifier</th><th>Range</th><th>Data bytes</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function appLayer(app, transports) {
  if (!app) return `<p class="dim">${transports.length ? 'Application layer not decoded (see notes).' : 'No application data.'}</p>`;
  const c = app.ctrl;
  return `<table class="kv">
    ${row('App control', `${hex(c.raw)} <span class="dim">FIR ${c.fir}, FIN ${c.fin}, CON ${c.con}, UNS ${c.uns}, SEQ ${c.seq}</span>`)}
    ${row('Function code', `<strong>${esc(app.fcName)}</strong> <span class="dim">${app.fc} (${hex(app.fc)}) ${app.isResponse ? 'outstation response' : 'master request'}</span>`)}
    ${row('Confirm requested', c.con ? 'Yes' : 'No')}
    ${row('Unsolicited', c.uns ? 'Yes' : 'No')}
  </table>${app.iin ? `<h3 class="sub">Internal indications</h3>${iinGroup('IIN1', app.iin.iin1)}${iinGroup('IIN2', app.iin.iin2)}` : ''}
  <h3 class="sub">Objects</h3>${objectsTable(app.objects)}`;
}

export function renderResult(r) {
  const notes = r.issues.length ? `<section class="notes"><h3>Notes</h3><ul>${r.issues.map(i => `<li class="note-${i.level}">${esc(i.msg)}</li>`).join('')}</ul></section>` : '';
  if (!r.frames.length) return `${notes}`;
  return `${alertBanner(r.app)}${notes}
    <section class="layer layer-link"><h2>Data link</h2>${linkLayer(r.frames)}</section>
    <section class="layer layer-transport"><h2>Transport</h2>${transportLayer(r.transports)}</section>
    <section class="layer layer-app"><h2>Application</h2>${appLayer(r.app, r.transports)}</section>`;
}

export function summaryOf(r) {
  if (!r.frames.length) return 'Unparsed';
  const f = r.frames[0], a = r.app;
  const iin = a && a.iin && a.iin.active.length ? ' | ' + a.iin.active.map(x => x.name).join(', ') : '';
  return `${f.src}→${f.dest} ${a ? a.fcName : f.ctrl.fcName}${iin}`;
}

export function renderHistory(list) {
  if (!list.length) return '<li class="dim empty">Decoded frames are saved here, offline, on this device.</li>';
  return list.map(e => `<li><button type="button" class="hist" data-hex="${esc(e.hex)}"><span class="hist-sum">${esc(e.summary)}</span>
    <span class="hist-hex mono">${esc(e.hex.slice(0, 48))}${e.hex.length > 48 ? '…' : ''}</span></button></li>`).join('');
}
