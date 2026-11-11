import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, CATEGORIES, BUSINESS } from '../menu.js';
import { formatCOP, addItem, setQty, lines, total, count, buildWhatsAppUrl, load, save } from '../cart.js';

const P = [
  { id: 'a', name: 'Burger Clásica', price: 18900 },
  { id: 'b', name: 'Papas Grandes', price: 7500 },
];

test('formatCOP formatea con punto de miles y sin decimales', () => {
  assert.equal(formatCOP(18900), '$18.900');
  assert.equal(formatCOP(0), '$0');
  assert.equal(formatCOP(1250000), '$1.250.000');
});

test('addItem dos veces da cantidad 2 y no muta el original', () => {
  const c0 = {};
  const c2 = addItem(addItem(c0, 'a'), 'a');
  assert.equal(c2.a, 2);
  assert.deepEqual(c0, {});
});

test('setQty con 0 o negativo elimina la línea', () => {
  assert.deepEqual(setQty({ a: 2 }, 'a', 0), {});
  assert.deepEqual(setQty({ a: 2 }, 'a', -3), {});
  assert.equal(setQty({ a: 2 }, 'a', 5).a, 5);
});

test('lines ignora ids desconocidos y calcula subtotales', () => {
  const l = lines({ a: 2, zzz: 4 }, P);
  assert.equal(l.length, 1);
  assert.equal(l[0].subtotal, 37800);
});

test('total y count suman solo productos conocidos / todas las unidades', () => {
  assert.equal(total({ a: 2, b: 1, zzz: 9 }, P), 45300);
  assert.equal(count({ a: 2, b: 1 }), 3);
});

test('buildWhatsAppUrl incluye nombre especial, líneas y total', () => {
  const cart = { a: 2, b: 1 };
  const url = buildWhatsAppUrl({
    business: { name: 'Burger Fest', phone: '573001112233' },
    lines: lines(cart, P),
    total: total(cart, P),
    customer: { name: 'Ñandú & Co #1', type: 'domicilio', address: 'Cra 7 #12-34', notes: 'Sin cebolla\nPor favor' },
  });
  assert.ok(url.startsWith('https://wa.me/573001112233?text='));
  const text = decodeURIComponent(url.split('?text=')[1]);
  assert.match(text, /Ñandú & Co #1/);
  assert.match(text, /2 x Burger Clásica — \$37\.800/);
  assert.match(text, /1 x Papas Grandes — \$7\.500/);
  assert.match(text, /Total: \$45\.300/);
  assert.match(text, /Cra 7 #12-34/);
  assert.match(text, /Sin cebolla\nPor favor/);
});

test('buildWhatsAppUrl para recoger no pide dirección', () => {
  const url = buildWhatsAppUrl({
    business: { name: 'X', phone: '57300' },
    lines: lines({ a: 1 }, P), total: 18900,
    customer: { name: 'Ana', type: 'recoger', address: '', notes: '' },
  });
  const text = decodeURIComponent(url.split('?text=')[1]);
  assert.match(text, /Recoger en el local/);
  assert.doesNotMatch(text, /Dirección/);
});

test('load/save: JSON corrupto o storage que lanza devuelven {}', () => {
  assert.deepEqual(load({ getItem: () => '{no es json' }), {});
  assert.deepEqual(load({ getItem: () => { throw new Error('bloqueado'); } }), {});
  assert.deepEqual(load({ getItem: () => null }), {});
  assert.doesNotThrow(() => save({ setItem: () => { throw new Error('lleno'); } }, { a: 1 }));
});

test('load descarta cantidades inválidas', () => {
  assert.deepEqual(load({ getItem: () => JSON.stringify({ a: 2, b: -1, c: 'x', d: 1.5 }) }), { a: 2 });
});

test('menú: ≥12 productos, categorías válidas, ids únicos, precios enteros positivos', () => {
  assert.ok(PRODUCTS.length >= 12);
  assert.equal(new Set(PRODUCTS.map(p => p.id)).size, PRODUCTS.length);
  const cats = new Set(CATEGORIES.map(c => c.id));
  for (const p of PRODUCTS) {
    assert.ok(cats.has(p.category), p.id);
    assert.ok(Number.isInteger(p.price) && p.price > 0, p.id);
  }
  assert.ok(BUSINESS.phone && BUSINESS.name);
});
