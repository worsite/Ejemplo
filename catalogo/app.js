import { BUSINESS, CATEGORIES, PRODUCTS } from './menu.js';
import { artSvg, HERO_ART } from './art.js';
import { formatCOP, addItem, setQty, clear, lines, total, count, load, save } from './cart.js';
import { createSupabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { isActive, customerMessage, progress, validateOrderForm, buildCreateOrderArgs } from './orders.js';
import { $, esc } from './util.js';

const sb = createSupabase({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY });
const ORDER_KEY = 'burgerfest-order-v1';
const POLL_MS = 5000;
const ORDER_TTL_MS = 12 * 60 * 60 * 1000;
const store = (() => { try { return window.localStorage; } catch { return { getItem() { return null; }, setItem() {} }; } })();

let cart = load(store);
const tones = ['#FFE08A', '#FFB4A2', '#FFD6A5', '#BDE7C6', '#FFC4D6'];

/* ---------- Render estático ---------- */
function renderStatic() {
  document.title = `${BUSINESS.name} | Pide tu comida rápida`;
  $('brandName').textContent = BUSINESS.name;
  $('footName').textContent = BUSINESS.name;
  $('chipHours').textContent = BUSINESS.hours;
  $('chipDelivery').textContent = BUSINESS.deliveryNote;
  $('heroArt').innerHTML = artSvg(HERO_ART);

  $('cats').innerHTML = CATEGORIES.map((c) =>
    `<a href="#cat-${c.id}" data-cat="${c.id}">${esc(c.label)}</a>`).join('');

  $('menu').innerHTML = CATEGORIES.map((c, i) => `
    <section class="cat" id="cat-${c.id}" aria-labelledby="h-${c.id}">
      <h2 id="h-${c.id}">${esc(c.label)}</h2>
      <div class="grid">
        ${PRODUCTS.filter((p) => p.category === c.id).map((p) => card(p, tones[i % tones.length])).join('')}
      </div>
    </section>`).join('');
}

function card(p, tone) {
  return `
  <article class="card" data-id="${p.id}">
    <div class="card-art" style="--tone:${tone}">
      ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
      ${artSvg(p.art)}
    </div>
    <div class="card-body">
      <h3>${esc(p.name)}</h3>
      <p class="desc">${esc(p.desc)}</p>
      <div class="card-foot">
        <span class="price">${formatCOP(p.price)}</span>
        <div class="ctl" data-ctl="${p.id}"></div>
      </div>
    </div>
  </article>`;
}

/* ---------- Controles dinámicos ---------- */
function ctlHtml(p) {
  const q = cart[p.id] || 0;
  if (!q) {
    return `<button class="btn btn-red add" type="button" data-act="add" data-id="${p.id}" aria-label="Agregar ${esc(p.name)} al pedido">Agregar</button>`;
  }
  return stepper(p, q);
}

function stepper(p, q) {
  return `<div class="step" role="group" aria-label="Cantidad de ${esc(p.name)}">
    <button type="button" data-act="dec" data-id="${p.id}" aria-label="Quitar uno de ${esc(p.name)}">−</button>
    <output aria-live="polite">${q}</output>
    <button type="button" data-act="inc" data-id="${p.id}" aria-label="Agregar uno más de ${esc(p.name)}">+</button>
  </div>`;
}

function renderControls() {
  for (const p of PRODUCTS) {
    const el = document.querySelector(`[data-ctl="${p.id}"]`);
    if (el) el.innerHTML = ctlHtml(p);
  }
}

function renderCart() {
  const ls = lines(cart, PRODUCTS);
  const n = count(Object.fromEntries(ls.map((l) => [l.product.id, l.qty])));
  const tot = total(cart, PRODUCTS);

  $('countTop').hidden = n === 0;
  $('countTop').textContent = n;
  $('openCartBar').hidden = n === 0;
  $('barCount').textContent = n;
  $('barTotal').textContent = formatCOP(tot);
  $('trackBtn').hidden = !active;
  $('cartbar').hidden = n === 0 && !active;
  document.body.classList.toggle('has-bar', n > 0 || !!active);

  applyView(n);
  $('sheetTotal').textContent = formatCOP(tot);
  $('lines').innerHTML = ls.map((l) => `
    <li class="line">
      <div class="line-art" aria-hidden="true">${artSvg(l.product.art)}</div>
      <div class="line-info">
        <strong>${esc(l.product.name)}</strong>
        <span>${formatCOP(l.product.price)} c/u</span>
      </div>
      <div class="line-side">
        ${stepper(l.product, l.qty)}
        <span class="line-sub">${formatCOP(l.subtotal)}</span>
      </div>
    </li>`).join('');
}

function render() {
  renderControls();
  renderCart();
}

function update(next, message) {
  cart = next;
  save(store, cart);
  render();
  if (message) $('live').textContent = message;
}

/* ---------- Eventos ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  const q = cart[id] || 0;
  if (btn.dataset.act === 'add' || btn.dataset.act === 'inc') {
    update(addItem(cart, id), `${p.name} agregado. Cantidad: ${q + 1}`);
  } else if (btn.dataset.act === 'dec') {
    update(setQty(cart, id, q - 1), q - 1 > 0 ? `${p.name}: ${q - 1}` : `${p.name} quitado del pedido`);
  }
  // Tras re-render, devolver el foco al mismo control para no perder la posición con teclado.
  const act = btn.dataset.act === 'add' ? 'inc' : btn.dataset.act;
  const root = btn.closest('dialog') || document;
  const target = root.querySelector(`[data-act="${act}"][data-id="${id}"]`);
  if (target) target.focus({ preventScroll: true });
});

const sheet = $('sheet');
const openCart = () => { view = 'cart'; render(); if (!sheet.open) sheet.showModal(); };
const openTrack = () => { view = 'track'; render(); if (!sheet.open) sheet.showModal(); };
$('openCartTop').addEventListener('click', () => (count(cart) === 0 && active ? openTrack() : openCart()));
$('openCartBar').addEventListener('click', openCart);
$('trackBtn').addEventListener('click', openTrack);
$('backFromTrack').addEventListener('click', () => { sheet.close(); $('menu').scrollIntoView({ behavior: 'smooth' }); });
$('closeCart').addEventListener('click', () => sheet.close());
$('backToMenu').addEventListener('click', () => { sheet.close(); $('menu').scrollIntoView({ behavior: 'smooth' }); });
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
$('clearCart').addEventListener('click', () => { update(clear(), 'Pedido vaciado'); });

/* ---------- Vistas de la hoja: carrito o seguimiento ---------- */
let view = 'cart';
function applyView(n = count(cart)) {
  const track = view === 'track' && !!active;
  $('sheetTitle').textContent = track ? 'Seguimiento' : 'Mi pedido';
  $('emptyState').hidden = track || n !== 0;
  $('cartContent').hidden = track || n === 0;
  $('trackView').hidden = !track;
  if (track) renderTrack();
}

/* ---------- Formulario ---------- */
const form = $('orderForm');
const tableSel = $('table');
tableSel.innerHTML = '<option value="">Elige tu mesa</option>' +
  Array.from({ length: BUSINESS.tables }, (_, i) => `<option value="${i + 1}">Mesa ${i + 1}</option>`).join('');

const FIELDS = { name: 'nameErr', table: 'tableErr', address: 'addressErr', phone: 'phoneErr' };
function setError(field, msg) {
  $(FIELDS[field]).textContent = msg || '';
  if (msg) $(field).setAttribute('aria-invalid', 'true'); else $(field).removeAttribute('aria-invalid');
}
function syncType() {
  const dom = form.type.value === 'domicilio';
  $('tableField').hidden = dom;
  $('addressField').hidden = !dom;
  $('phoneOpt').hidden = dom;
  for (const f of Object.keys(FIELDS)) setError(f, '');
}
form.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener('change', syncType));
for (const f of Object.keys(FIELDS)) $(f).addEventListener('input', () => setError(f, ''));

let sending = false;
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (sending) return;
  const ls = lines(cart, PRODUCTS);
  if (!ls.length) return;
  const customer = {
    name: form.name.value, phone: form.phone.value, type: form.type.value,
    table: form.table.value, address: form.address.value, notes: form.notes.value,
  };
  const errors = validateOrderForm(customer, { tables: BUSINESS.tables });
  for (const f of Object.keys(FIELDS)) setError(f, errors[f]);
  const firstBad = Object.keys(FIELDS).find((f) => errors[f] && !$(f).closest('[hidden]'));
  if (firstBad) { $(firstBad).focus(); return; }

  sending = true;
  $('sendBtn').disabled = true;
  $('sendBtn').textContent = 'Enviando…';
  $('sendStatus').textContent = '';
  try {
    const r = await sb.rpc('create_order', buildCreateOrderArgs({ lines: ls, total: total(cart, PRODUCTS), customer }));
    if (!r || !r.id) throw new Error('Respuesta inválida');
    setActive({ id: r.id, code: r.code, type: customer.type, table: customer.type === 'mesa' ? Number(customer.table) : null, status: 'pendiente', at: Date.now() });
    form.notes.value = '';
    update(clear(), `Pedido ${r.code} enviado`);
    openTrack();
  } catch (err) {
    $('sendStatus').textContent = 'No pudimos enviar tu pedido. Revisa tu conexión e inténtalo de nuevo; tu carrito sigue guardado.';
  } finally {
    sending = false;
    $('sendBtn').disabled = false;
    $('sendBtn').textContent = 'Enviar pedido';
  }
});

/* ---------- Seguimiento del pedido ---------- */
let active = loadActive();
let pollTimer = null;

function loadActive() {
  try {
    const o = JSON.parse(store.getItem(ORDER_KEY) || 'null');
    return o && o.id && Date.now() - o.at < ORDER_TTL_MS ? o : null;
  } catch { return null; }
}
function setActive(o) {
  active = o;
  try { o ? store.setItem(ORDER_KEY, JSON.stringify(o)) : store.removeItem(ORDER_KEY); } catch { /* sin storage */ }
  schedulePoll();
  render();
}

function renderTrack() {
  const o = active;
  const p = progress(o.status, o.type);
  $('trackCode').textContent = `Pedido #${o.code}`;
  $('trackMsg').textContent = customerMessage(o.status, o.type);
  $('trackMsg').dataset.status = o.status;
  $('trackSteps').innerHTML = p.cancelled ? '' : p.steps.map((s) =>
    `<li class="${s.state}"${s.state === 'current' ? ' aria-current="step"' : ''}><span class="mark" aria-hidden="true"></span>${esc(s.label)}</li>`).join('');
  $('trackWhere').textContent = o.type === 'mesa' ? `Mesa ${o.table}` : 'Domicilio';
  $('trackNote').textContent = isActive(o.status) ? 'Esta pantalla se actualiza sola.' : '';
  $('newOrder').hidden = isActive(o.status);
  $('trackBtnText').textContent = `Pedido #${o.code} · ${progressLabel(o)}`;
}
const progressLabel = (o) => ({ pendiente: 'Pendiente', confirmado: 'Confirmado', en_cocina: 'En cocina', listo: 'Listo', en_despacho: 'En despacho', entregado: 'Entregado', cancelado: 'Cancelado' }[o.status] || '');

$('newOrder').addEventListener('click', () => { setActive(null); view = 'cart'; sheet.close(); $('menu').scrollIntoView({ behavior: 'smooth' }); });

async function pollOnce() {
  if (!active || !isActive(active.status)) return;
  try {
    const r = await sb.rpc('get_order_status', { p_id: active.id });
    if (!r) { setActive(null); return; }
    if (r.status !== active.status) {
      setActive({ ...active, status: r.status });
      $('live').textContent = customerMessage(r.status, active.type);
    }
  } catch { /* sin red: se reintenta en el siguiente ciclo */ }
}
function schedulePoll() {
  clearInterval(pollTimer);
  pollTimer = null;
  if (active && isActive(active.status)) pollTimer = setInterval(pollOnce, POLL_MS);
}

/* Categoría activa al hacer scroll */
function watchCategories() {
  const links = [...document.querySelectorAll('#cats a')];
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle('on', a.dataset.cat === en.target.id.replace('cat-', '')));
      const on = links.find((a) => a.classList.contains('on'));
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('.cat').forEach((s) => io.observe(s));
}

renderStatic();
syncType();
render();
watchCategories();
schedulePoll();
pollOnce();
