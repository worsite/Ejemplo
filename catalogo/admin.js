import { createSupabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { BUSINESS } from './menu.js';
import { formatCOP } from './cart.js';
import { STATUS, nextStatus, nextLabel, isActive, minutesAgo, elapsedLabel, isLate, keyFromHash } from './orders.js';
import { $, esc } from './util.js';

const POLL_MS = 5000;
const store = (() => { try { return window.localStorage; } catch { return null; } })();
const sb = createSupabase({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY });
const KEY_STORE = 'burgerfest-admin-key-v1';
let adminKey = null;   // clave del enlace privado (se recuerda en este equipo)

const COLUMNS = [
  { id: 'pendiente', title: 'Nuevos', statuses: ['pendiente'] },
  { id: 'confirmado', title: 'Confirmados', statuses: ['confirmado'] },
  { id: 'en_cocina', title: 'En cocina', statuses: ['en_cocina'] },
  { id: 'salida', title: 'Listos y en despacho', statuses: ['listo', 'en_despacho'] },
];

let orders = [];
let known = null;               // ids ya vistos; null = aún no cargó la primera vez
let view = 'activos';
let confirmCancel = null;       // id del pedido que espera confirmación de cancelación
let busy = new Set();           // ids con un cambio de estado en curso
let lastSig = '';
let timer = null;
let soundOn = (() => { try { return store?.getItem('burgerfest-sound') !== 'off'; } catch { return true; } })();
let audio = null;
let flashIds = new Set();

/* ---------- Sonido ---------- */
function unlockAudio() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { audio = null; }
}
function beep() {
  if (!soundOn || !audio) return;
  try {
    [[880, 0], [660, 0.18]].forEach(([freq, at]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, audio.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.3, audio.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + at + 0.16);
      o.connect(g); g.connect(audio.destination);
      o.start(audio.currentTime + at); o.stop(audio.currentTime + at + 0.17);
    });
  } catch { /* sin audio */ }
}
function renderSound() {
  $('soundBtn').textContent = `Sonido: ${soundOn ? 'sí' : 'no'}`;
  $('soundBtn').setAttribute('aria-pressed', String(soundOn));
}

/* ---------- Pantallas ---------- */
function showLocked(msg = '') {
  clearInterval(timer); timer = null;
  $('panel').hidden = true;
  $('locked').hidden = false;
  $('lockedErr').textContent = msg;
  document.title = 'Panel de pedidos | ' + BUSINESS.name;
}
function forgetKey() {
  adminKey = null;
  try { store?.removeItem(KEY_STORE); } catch { /* sin storage */ }
}
function showPanel() {
  $('locked').hidden = true;
  $('panel').hidden = false;
  $('panelTitle').textContent = `Pedidos · ${BUSINESS.name}`;
  renderSound();
  known = null; lastSig = ''; orders = [];
  poll();
  clearInterval(timer);
  timer = setInterval(poll, POLL_MS);
}
function notice(msg) {
  $('notice').textContent = msg || '';
  $('notice').hidden = !msg;
}
function setConn(ok) {
  $('conn').textContent = ok ? 'En vivo' : 'Sin conexión…';
  $('conn').classList.toggle('off', !ok);
}

/* ---------- Datos ---------- */
async function poll() {
  try {
    const rows = await sb.rpc('admin_list_orders', { p_key: adminKey });
    setConn(true);
    notice('');
    apply(Array.isArray(rows) ? rows : []);
  } catch (e) {
    if (e.status === 403) { forgetKey(); showLocked('Este enlace ya no es válido. Pide el enlace privado nuevo.'); return; }
    setConn(false);
  }
}

function apply(rows) {
  const fresh = rows.filter((o) => o.status === 'pendiente' && known && !known.has(o.id));
  orders = rows;
  if (fresh.length) {
    beep();
    flashIds = new Set(fresh.map((o) => o.id));
    $('live').textContent = fresh.length === 1 ? `Nuevo pedido #${fresh[0].code}` : `${fresh.length} pedidos nuevos`;
  }
  known = new Set(rows.map((o) => o.id));
  render();
}

async function setStatus(id, status) {
  if (busy.has(id)) return;
  busy.add(id); confirmCancel = null; render();
  try {
    const row = await sb.rpc('admin_set_status', { p_key: adminKey, p_id: id, p_status: status });
    if (!row || !row.id) throw new Error('respuesta inválida');
    orders = orders.map((o) => (o.id === id ? { ...o, ...row } : o));
    notice('');
  } catch (e) {
    if (e.status === 403) { busy.delete(id); forgetKey(); showLocked('Este enlace ya no es válido. Pide el enlace privado nuevo.'); return; }
    notice('No se pudo cambiar el estado del pedido. Revisa la conexión e inténtalo de nuevo.');
  } finally { busy.delete(id); }
  render();
}

/* ---------- Render ---------- */
function itemsHtml(o) {
  return (Array.isArray(o.items) ? o.items : []).map((i) =>
    `<li><b>${esc(i.qty)}×</b> ${esc(i.name)}</li>`).join('');
}

function cardHtml(o, now) {
  const min = minutesAgo(o.created_at, now);
  const next = nextStatus(o.status, o.order_type);
  const active = isActive(o.status);
  const where = o.order_type === 'mesa' ? `Mesa ${esc(o.table_number)}` : 'Domicilio';
  const late = isLate(o.status, min);
  const working = busy.has(o.id);
  const phone = o.customer_phone ? `<a href="tel:${esc(String(o.customer_phone).replace(/[^\d+]/g, ''))}">${esc(o.customer_phone)}</a>` : '';
  let actions = '';
  if (active && confirmCancel === o.id) {
    actions = `<div class="confirm"><span>¿Cancelar el pedido #${esc(o.code)}?</span>
      <button type="button" class="btn btn-danger" data-act="cancel-yes" data-id="${esc(o.id)}">Sí, cancelar</button>
      <button type="button" class="btn btn-ghost" data-act="cancel-no" data-id="${esc(o.id)}">No</button></div>`;
  } else if (active) {
    actions = `<div class="actions">
      ${next ? `<button type="button" class="btn btn-main" data-act="next" data-id="${esc(o.id)}" data-to="${next}" ${working ? 'disabled' : ''}>${working ? 'Guardando…' : esc(nextLabel(next))}</button>` : ''}
      <button type="button" class="btn btn-ghost" data-act="cancel" data-id="${esc(o.id)}" ${working ? 'disabled' : ''}>Cancelar</button></div>`;
  }
  return `<article class="order s-${o.status}${late ? ' late' : ''}${flashIds.has(o.id) ? ' flash' : ''}" data-order="${esc(o.id)}" aria-label="Pedido ${esc(o.code)}">
    <header>
      <span class="code">#${esc(o.code)}</span>
      <span class="where ${o.order_type}">${where}</span>
      <span class="age">${esc(elapsedLabel(min))}</span>
    </header>
    <p class="who"><b>${esc(o.customer_name)}</b> ${phone}</p>
    ${o.address ? `<p class="addr">${esc(o.address)}</p>` : ''}
    <ul class="items">${itemsHtml(o)}</ul>
    ${o.notes ? `<p class="notes"><b>Notas:</b> ${esc(o.notes)}</p>` : ''}
    <p class="total"><span class="pill">${esc(STATUS[o.status]?.label || o.status)}</span><b>${formatCOP(o.total)}</b></p>
    ${actions}
  </article>`;
}

function render(force = false) {
  const now = Date.now();
  const list = orders.filter((o) => (view === 'activos' ? isActive(o.status) : !isActive(o.status)));
  const pend = orders.filter((o) => o.status === 'pendiente').length;
  const nActive = orders.filter((o) => isActive(o.status)).length;
  const sig = JSON.stringify([view, confirmCancel, [...busy], [...flashIds], list.map((o) => [o.id, o.status]), Math.floor(now / 60000)]);
  $('nActivos').textContent = nActive;
  document.title = (pend ? `(${pend}) ` : '') + 'Panel de pedidos | ' + BUSINESS.name;
  if (!force && sig === lastSig) return;
  lastSig = sig;

  const board = $('board');
  board.className = 'board ' + (view === 'activos' ? 'cols' : 'hist');
  if (view === 'activos') {
    board.innerHTML = COLUMNS.map((c) => {
      const items = list.filter((o) => c.statuses.includes(o.status)).sort((a, b) => a.created_at.localeCompare(b.created_at));
      return `<section class="col col-${c.id}" aria-label="${esc(c.title)}">
        <h2>${esc(c.title)} <span class="n">${items.length}</span></h2>
        ${items.map((o) => cardHtml(o, now)).join('') || '<p class="none">Nada por aquí</p>'}
      </section>`;
    }).join('');
  } else {
    board.innerHTML = `<section class="col" aria-label="Historial"><h2>Entregados y cancelados <span class="n">${list.length}</span></h2>
      ${list.slice(0, 60).map((o) => cardHtml(o, now)).join('') || '<p class="none">Aún no hay pedidos cerrados</p>'}</section>`;
  }
  $('emptyAll').hidden = orders.length > 0;
  flashIds = new Set();
}

/* ---------- Eventos ---------- */
$('board').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.act) {
    case 'next': setStatus(id, b.dataset.to); break;
    case 'cancel': confirmCancel = id; render(true); break;
    case 'cancel-no': confirmCancel = null; render(true); break;
    case 'cancel-yes': setStatus(id, 'cancelado'); break;
  }
});

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  view = t.dataset.view;
  document.querySelectorAll('.tab').forEach((x) => { x.classList.toggle('on', x === t); x.setAttribute('aria-pressed', String(x === t)); });
  render(true);
}));

$('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn;
  try { store?.setItem('burgerfest-sound', soundOn ? 'on' : 'off'); } catch { /* sin storage */ }
  unlockAudio(); renderSound(); if (soundOn) beep();
});

$('logoutBtn').addEventListener('click', () => { forgetKey(); showLocked(''); });

/* Inicio: el enlace privado trae la clave en "#k=…"; se guarda y se quita de la barra de direcciones */
function acceptLink() {
  const k = keyFromHash(location.hash);
  if (!k) return false;
  adminKey = k;
  try { store?.setItem(KEY_STORE, k); } catch { /* sin storage: vale mientras la pestaña esté abierta */ }
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* nada */ }
  return true;
}
window.addEventListener('hashchange', () => { if (acceptLink()) showPanel(); });  // enlace pegado en una pestaña ya abierta
if (!acceptLink()) {
  try { adminKey = store?.getItem(KEY_STORE) || null; } catch { adminKey = null; }
}
if (adminKey) showPanel(); else showLocked();
