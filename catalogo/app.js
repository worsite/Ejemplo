import { BUSINESS, CATEGORIES, PRODUCTS } from './menu.js';
import { artSvg, HERO_ART } from './art.js';
import { formatCOP, addItem, setQty, clear, lines, total, count, buildWhatsAppUrl, load, save } from './cart.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  $('cartbar').hidden = n === 0;
  $('barCount').textContent = n;
  $('barTotal').textContent = formatCOP(tot);
  document.body.classList.toggle('has-bar', n > 0);

  $('emptyState').hidden = n !== 0;
  $('cartContent').hidden = n === 0;
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
const openCart = () => { render(); if (!sheet.open) sheet.showModal(); };
$('openCartTop').addEventListener('click', openCart);
$('openCartBar').addEventListener('click', openCart);
$('closeCart').addEventListener('click', () => sheet.close());
$('backToMenu').addEventListener('click', () => { sheet.close(); $('menu').scrollIntoView({ behavior: 'smooth' }); });
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
$('clearCart').addEventListener('click', () => { update(clear(), 'Pedido vaciado'); });

/* Formulario */
const form = $('orderForm');
const typeInputs = form.querySelectorAll('input[name="type"]');
function syncType() {
  const dom = form.type.value === 'domicilio';
  $('addressField').hidden = !dom;
  if (!dom) { $('addressErr').textContent = ''; $('address').removeAttribute('aria-invalid'); }
}
typeInputs.forEach((r) => r.addEventListener('change', syncType));

function fieldError(inputId, errId, msg) {
  $(errId).textContent = msg;
  if (msg) $(inputId).setAttribute('aria-invalid', 'true'); else $(inputId).removeAttribute('aria-invalid');
}
$('name').addEventListener('input', () => fieldError('name', 'nameErr', ''));
$('address').addEventListener('input', () => fieldError('address', 'addressErr', ''));

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ls = lines(cart, PRODUCTS);
  if (!ls.length) return;
  const customer = {
    name: form.name.value.trim(),
    type: form.type.value,
    address: form.address.value.trim(),
    notes: form.notes.value,
  };
  fieldError('name', 'nameErr', customer.name ? '' : 'Escribe tu nombre para el pedido.');
  fieldError('address', 'addressErr', customer.type === 'domicilio' && !customer.address ? 'Escribe la dirección de entrega.' : '');
  const firstBad = form.querySelector('[aria-invalid="true"]');
  if (firstBad) { firstBad.focus(); return; }

  const url = buildWhatsAppUrl({ business: BUSINESS, lines: ls, total: total(cart, PRODUCTS), customer });
  // Con 'noopener' el navegador devuelve siempre null, así que no sirve para detectar bloqueos:
  // se confirma el envío y se deja siempre un enlace por si la ventana no se abrió.
  window.open(url, '_blank', 'noopener');
  $('sendStatus').innerHTML = `Abrimos WhatsApp con tu pedido; solo falta pulsar enviar allá. ¿No se abrió? <a href="${esc(url)}" target="_blank" rel="noopener">Abrir WhatsApp</a>`;
});

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
