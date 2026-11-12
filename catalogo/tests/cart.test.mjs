import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCOP, addLine, setQty, clear, resolve, total, count, load, save } from '../cart.js';
import { MENU } from './fixtures.mjs';

test('formatCOP formatea con punto de miles y sin decimales', () => {
  assert.equal(formatCOP(25000), '$25.000');
  assert.equal(formatCOP(0), '$0');
  assert.equal(formatCOP(1250000), '$1.250.000');
});

test('addLine junta el mismo plato con el mismo detalle y no muta', () => {
  const c0 = [];
  const c1 = addLine(c0, { itemKey: 's1.i1', detail: 'Sin arroz' });
  const c2 = addLine(c1, { itemKey: 's1.i1', detail: 'Sin arroz', qty: 2 });
  assert.equal(c2.length, 1);
  assert.equal(c2[0].qty, 3);
  assert.deepEqual(c0, []);
});

test('addLine separa líneas cuando cambia el detalle', () => {
  let c = addLine([], { itemKey: 's1.i1', detail: '' });
  c = addLine(c, { itemKey: 's1.i1', detail: 'Sin ensalada' });
  assert.equal(c.length, 2);
  assert.notEqual(c[0].key, c[1].key);
});

test('addLine ignora cantidades inválidas', () => {
  assert.deepEqual(addLine([], { itemKey: 's1.i1', qty: 0 }), []);
  assert.deepEqual(addLine([], { itemKey: 's1.i1', qty: -2 }), []);
});

test('setQty con 0 o negativo elimina la línea; con otro número la cambia', () => {
  const c = addLine([], { itemKey: 's1.i1', detail: '' });
  const key = c[0].key;
  assert.deepEqual(setQty(c, key, 0), []);
  assert.deepEqual(setQty(c, key, -3), []);
  assert.equal(setQty(c, key, 4)[0].qty, 4);
  assert.equal(setQty(c, 'otra', 4).length, 1);
});

test('resolve toma nombre y precio del menú y descarta platos que ya no existen', () => {
  let c = addLine([], { itemKey: 's1.i1', detail: 'Sin arroz', qty: 2 });
  c = addLine(c, { itemKey: 's2.i1' });
  c = addLine(c, { itemKey: 'zz.i9' });
  const r = resolve(c, MENU);
  assert.equal(r.length, 2);
  assert.equal(r[0].name, 'Gallina guisada');
  assert.equal(r[0].price, 25000);
  assert.equal(r[0].subtotal, 50000);
  assert.equal(r[1].price, 8000);
});

test('total y count ignoran lo desconocido en el total y cuentan unidades', () => {
  let c = addLine([], { itemKey: 's1.i1', qty: 2 });
  c = addLine(c, { itemKey: 's2.i2', detail: 'Sabor: Coco' });
  c = addLine(c, { itemKey: 'zz.i9' });
  assert.equal(total(c, MENU), 2 * 25000 + 11000);
  assert.equal(count(c), 4);
  assert.deepEqual(clear(), []);
});

test('resolve sin menú devuelve vacío', () => {
  const c = addLine([], { itemKey: 's1.i1' });
  assert.deepEqual(resolve(c, null), []);
  assert.equal(total(c, null), 0);
});

test('load/save: JSON corrupto o storage que lanza devuelven []', () => {
  assert.deepEqual(load({ getItem: () => '{no es json' }), []);
  assert.deepEqual(load({ getItem: () => { throw new Error('bloqueado'); } }), []);
  assert.deepEqual(load({ getItem: () => null }), []);
  assert.deepEqual(load({ getItem: () => '{"a":1}' }), []);
  assert.doesNotThrow(() => save({ setItem: () => { throw new Error('lleno'); } }, [{ a: 1 }]));
});

test('load descarta líneas inválidas y recorta el detalle', () => {
  const raw = JSON.stringify([
    { itemKey: 's1.i1', qty: 2, detail: 'ok' },
    { itemKey: 's1.i2', qty: -1, detail: '' },
    { itemKey: 5, qty: 1, detail: '' },
    { itemKey: 's1.i1', qty: 1.5, detail: '' },
    { itemKey: 's2.i1', qty: 1, detail: 'x'.repeat(500) },
  ]);
  const c = load({ getItem: () => raw });
  assert.equal(c.length, 2);
  assert.equal(c[1].detail.length, 200);
  assert.ok(c.every((l) => typeof l.key === 'string'));
});
