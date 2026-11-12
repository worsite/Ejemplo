import { BUSINESS, DAYS, findItem, buildDetail, priceOf } from './menu.js';
import { artSvg } from './art.js';
import { formatCOP, addLine, setQty, clear, resolve, total, count, load, save } from './cart.js';
import { createSupabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { isActive, customerMessage, progress, validateOrderForm, buildCreateOrderArgs } from './orders.js';
import { $, esc } from './util.js';

const sb = createSupabase({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY });
const ORDER_KEY = 'mamaines-order-v1';
const POLL_MS = 5000;
const MENU_POLL_MS = 60000;
const ORDER_TTL_MS = 12 * 60 * 60 * 1000;
const store = (() => { try { return window.localStorage; } catch { return { getItem() { return null; }, setItem() {}, removeItem() {} }; } })();

let cart = load(store);
let menus = {};            // { '0': {sections}, … } tal como los guarda el panel
let today = new Date().getDay();
let viewDay = null;        // día que se está mirando
let menusState = 'loading'; // loading | ok | error

const todayMenu = () => menus[String(today)] || null;

/* ---------- Datos del negocio ---------- */
function renderStatic() {
  $('contactPhone').textContent = BUSINESS.phoneLabel;
  $('contactPhone').href = `tel:+57${BUSINESS.phone}`;
  $('contactAddress').textContent = BUSINESS.address;
  $('contactInsta').textContent = BUSINESS.instagram;
}

/* ---------- Menú ---------- */
function starSvg(price) {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 28 - Math.PI / 2;
    const r = i % 2 ? 38 : 48;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<span class="star"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${pts}" fill="#FFD668"/></svg><b>${formatCOP(price)}</b></span>`;
}

function dishHtml(section, item, canOrder) {
  const key = `${section.id}.${item.id}`;
  const price = priceOf(section, item);
  const own = item.price != null;
  return `<li class="dish">
    <div class="dish-art" aria-hidden="true">${artSvg(item.art)}</div>
    <div class="dish-main">
      <h3>${esc(item.name)}</h3>
      ${item.desc ? `<p class="desc">${esc(item.desc)}</p>` : ''}
      ${own ? `<p class="own-price">${formatCOP(item.price)}</p>` : ''}
    </div>
    ${canOrder && price != null ? `<button type="button" class="btn btn-wine pick" data-act="pick" data-key="${esc(key)}" aria-label="Pedir ${esc(item.name)}">Pedir</button>` : ''}
  </li>`;
}

function sectionHtml(s, canOrder) {
  const inc = (s.includes || []).filter((x) => String(x).trim());
  return `<section class="msec" aria-label="${esc(s.title)}">
    <div class="msec-head">
      <div>
        <h2>${esc(s.title)}</h2>
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
        ${inc.length ? `<p class="incl">Incluye: ${esc(inc.join(', '))}</p>` : ''}
      </div>
      ${s.price != null ? starSvg(s.price) : ''}
    </div>
    <ul class="dishes">${(s.items || []).map((it) => dishHtml(s, it, canOrder)).join('')}</ul>
  </section>`;
}

function renderMenu() {
  const body = $('menuBody');
  if (menusState === 'loading') {
    $('mdDay').textContent = '';
    $('dayTabs').innerHTML = '';
    $('dayBanner').hidden = true;
    body.innerHTML = '<p class="state">Cargando el menú…</p>';
    return;
  }
  if (menusState === 'error') {
    $('dayBanner').hidden = true;
    body.innerHTML = '<p class="state">No pudimos cargar el menú. Revisa tu conexión.</p><button type="button" class="btn btn-wine" data-act="retry">Intentar de nuevo</button>';
    return;
  }
  const day = viewDay ?? today;
  const isToday = day === today;
  $('mdDay').textContent = DAYS[day];
  $('dayTabs').innerHTML = DAYS.map((d, i) =>
    `<button type="button" data-act="day" data-day="${i}" aria-pressed="${i === day}"${i === today ? ' class="is-today"' : ''}>${d.slice(0, 3)}${i === today ? '<span class="sr-only"> (hoy)</span>' : ''}</button>`).join('');

  const menu = menus[String(day)];
  const has = menu && (menu.sections || []).some((s) => (s.items || []).length);
  const banner = $('dayBanner');
  if (!isToday) {
    banner.hidden = false;
    banner.innerHTML = `Estás viendo el menú del <b>${esc(DAYS[day])}</b>. Solo se puede pedir el menú de hoy. <button type="button" class="link-btn" data-act="day" data-day="${today}">Ver el de hoy</button>`;
  } else banner.hidden = true;

  if (!has) {
    body.innerHTML = isToday
      ? '<p class="state">Hoy todavía no hay menú del día publicado. ¡Vuelve en un ratico!</p>'
      : '<p class="state">Este día todavía no tiene menú programado.</p>';
    return;
  }
  body.innerHTML = menu.sections.map((s) => sectionHtml(s, isToday)).join('');
}

async function loadMenus() {
  try {
    const r = await sb.rpc('get_daily_menus');
    if (!r || typeof r.menus !== 'object') throw new Error('Respuesta inválida');
    menus = r.menus;
    if (Number.isInteger(r.today)) {
      if (viewDay === null || viewDay === today) viewDay = r.today;   // si pasó la medianoche, sigue al día nuevo
      today = r.today;
    }
    menusState = 'ok';
    const kept = cart.filter((l) => resolve([l], todayMenu()).length);
    if (kept.length !== cart.length) { cart = kept; save(store, cart); }
  } catch {
    if (menusState !== 'ok') menusState = 'error';
  }
  renderMenu();
  renderCart();
}

/* ---------- Personalizar un plato ---------- */
const dishDialog = $('dishDialog');
let dishCtx = null;   // { f, qty }

function openDish(key) {
  const f = findItem(todayMenu(), key);
  if (!f || f.price == null) return;
  dishCtx = { f, qty: 1 };
  $('dishTitle').textContent = 'Arma tu plato';
  $('dishName').textContent = f.item.name;
  $('dishPrice').textContent = formatCOP(f.price);
  $('dishArt').innerHTML = artSvg(f.item.art);
  $('dishNote').value = '';
  $('choiceErr').textContent = '';
  $('partsField').hidden = f.parts.length === 0;
  $('partsList').innerHTML = f.parts.map((p, i) =>
    `<label class="check"><input type="checkbox" name="part" value="${esc(p)}" id="part${i}" checked><span>${esc(p)}</span></label>`).join('');
  const choices = f.item.choices || [];
  $('choiceField').hidden = choices.length === 0;
  $('choiceLegend').textContent = f.item.choiceLabel || 'Elige uno';
  $('choiceList').innerHTML = choices.map((c, i) =>
    `<label class="check radio"><input type="radio" name="choice" value="${esc(c)}" id="choice${i}"><span>${esc(c)}</span></label>`).join('');
  syncDish();
  if (!dishDialog.open) dishDialog.showModal();
}

function syncDish() {
  $('dishQty').textContent = dishCtx.qty;
  $('dishAdd').textContent = `Agregar · ${formatCOP(dishCtx.f.price * dishCtx.qty)}`;
}

$('dishMinus').addEventListener('click', () => { if (dishCtx.qty > 1) { dishCtx.qty -= 1; syncDish(); } });
$('dishPlus').addEventListener('click', () => { if (dishCtx.qty < 20) { dishCtx.qty += 1; syncDish(); } });
$('closeDish').addEventListener('click', () => dishDialog.close());
dishDialog.addEventListener('click', (e) => { if (e.target === dishDialog) dishDialog.close(); });

$('dishForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const { f, qty } = dishCtx;
  const choices = f.item.choices || [];
  const choice = $('dishForm').querySelector('input[name="choice"]:checked')?.value || '';
  if (choices.length && !choice) {
    $('choiceErr').textContent = `Elige una opción (${f.item.choiceLabel || 'Elige uno'}).`;
    $('choiceList').querySelector('input').focus();
    return;
  }
  const removed = [...$('dishForm').querySelectorAll('input[name="part"]')].filter((c) => !c.checked).map((c) => c.value);
  const detail = buildDetail({ removed, choice, choiceLabel: f.item.choiceLabel, note: $('dishNote').value });
  dishDialog.close();
  update(addLine(cart, { itemKey: f.key, detail, qty }), `${f.item.name} agregado al pedido`);
});

/* ---------- Carrito ---------- */
function stepper(key, name, q) {
  return `<div class="step" role="group" aria-label="Cantidad de ${esc(name)}">
    <button type="button" data-act="dec" data-key="${esc(key)}" aria-label="Quitar uno de ${esc(name)}">−</button>
    <output aria-live="polite">${q}</output>
    <button type="button" data-act="inc" data-key="${esc(key)}" aria-label="Agregar uno más de ${esc(name)}">+</button>
  </div>`;
}

function renderCart() {
  const resolved = resolve(cart, todayMenu());
  const n = count(resolved);
  const tot = total(cart, todayMenu());

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
  $('lines').innerHTML = resolved.map((l) => `
    <li class="line">
      <div class="dish-art small" aria-hidden="true">${artSvg(l.art)}</div>
      <div class="line-info">
        <strong>${esc(l.name)}</strong>
        ${l.detail ? `<span class="detail">${esc(l.detail)}</span>` : ''}
        <span>${formatCOP(l.price)} c/u</span>
      </div>
      <div class="line-side">
        ${stepper(l.key, l.name, l.qty)}
        <span class="line-sub">${formatCOP(l.subtotal)}</span>
      </div>
    </li>`).join('');
}

function update(next, message) {
  cart = next;
  save(store, cart);
  renderCart();
  if (message) $('live').textContent = message;
}

/* ---------- Eventos de la página ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  switch (btn.dataset.act) {
    case 'pick': openDish(btn.dataset.key); break;
    case 'day':
      viewDay = Number(btn.dataset.day);
      renderMenu();
      break;
    case 'retry': menusState = 'loading'; renderMenu(); loadMenus(); break;
    case 'inc': case 'dec': {
      const line = cart.find((l) => l.key === btn.dataset.key);
      if (!line) return;
      const q = line.qty + (btn.dataset.act === 'inc' ? 1 : -1);
      update(setQty(cart, line.key, q), q > 0 ? `Cantidad: ${q}` : 'Plato quitado del pedido');
      const again = [...$('lines').querySelectorAll(`[data-act="${btn.dataset.act}"]`)].find((b) => b.dataset.key === line.key);
      if (again) again.focus({ preventScroll: true });
      break;
    }
  }
});

const sheet = $('sheet');
let view = 'cart';
const openCart = () => { view = 'cart'; renderCart(); if (!sheet.open) sheet.showModal(); };
const openTrack = () => { view = 'track'; renderCart(); if (!sheet.open) sheet.showModal(); };
$('openCartTop').addEventListener('click', () => (count(cart) === 0 && active ? openTrack() : openCart()));
$('openCartBar').addEventListener('click', openCart);
$('trackBtn').addEventListener('click', openTrack);
$('closeCart').addEventListener('click', () => sheet.close());
const toMenu = () => { sheet.close(); $('menuBody').scrollIntoView({ behavior: 'smooth' }); };
$('backToMenu').addEventListener('click', toMenu);
$('backFromTrack').addEventListener('click', toMenu);
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
$('clearCart').addEventListener('click', () => update(clear(), 'Pedido vaciado'));

/* ---------- Vistas de la hoja ---------- */
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

const MENU_ERR = /menú|plato|precios|Hoy no hay/i;
let sending = false;
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (sending) return;
  const resolved = resolve(cart, todayMenu());
  if (!resolved.length) return;
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
    const r = await sb.rpc('create_order', buildCreateOrderArgs({ resolved, total: total(cart, todayMenu()), customer }));
    if (!r || !r.id) throw new Error('Respuesta inválida');
    setActive({ id: r.id, code: r.code, type: customer.type, table: customer.type === 'mesa' ? Number(customer.table) : null, status: 'pendiente', at: Date.now() });
    form.notes.value = '';
    update(clear(), `Pedido ${r.code} enviado`);
    openTrack();
  } catch (err) {
    if (err.status === 400 && MENU_ERR.test(err.message)) {
      $('sendStatus').textContent = `${err.message}. Tu carrito sigue guardado.`;
      loadMenus();
    } else {
      $('sendStatus').textContent = 'No pudimos enviar tu pedido. Revisa tu conexión e inténtalo de nuevo; tu carrito sigue guardado.';
    }
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
  renderCart();
}

const STATUS_LABEL = { pendiente: 'Pendiente', confirmado: 'Confirmado', en_cocina: 'En cocina', listo: 'Listo', en_despacho: 'En despacho', entregado: 'Entregado', cancelado: 'Cancelado' };

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
  $('trackBtnText').textContent = `Pedido #${o.code} · ${STATUS_LABEL[o.status] || ''}`;
}

$('newOrder').addEventListener('click', () => { setActive(null); view = 'cart'; toMenu(); });

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

/* ---------- Arranque ---------- */
renderStatic();
syncType();
renderMenu();
renderCart();
loadMenus();
schedulePoll();
pollOnce();
setInterval(loadMenus, MENU_POLL_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadMenus(); pollOnce(); } });
