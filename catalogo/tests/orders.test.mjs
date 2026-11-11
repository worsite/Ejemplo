import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, flow, nextStatus, nextLabel, isActive, customerMessage, progress, validateOrderForm, buildCreateOrderArgs, minutesAgo } from '../orders.js';

test('flujo de mesa pasa por "listo"; el de domicilio por "en_despacho"', () => {
  assert.deepEqual(flow('mesa'), ['pendiente', 'confirmado', 'en_cocina', 'listo', 'entregado']);
  assert.deepEqual(flow('domicilio'), ['pendiente', 'confirmado', 'en_cocina', 'en_despacho', 'entregado']);
});

test('nextStatus avanza un paso y termina en null', () => {
  assert.equal(nextStatus('pendiente', 'mesa'), 'confirmado');
  assert.equal(nextStatus('en_cocina', 'mesa'), 'listo');
  assert.equal(nextStatus('en_cocina', 'domicilio'), 'en_despacho');
  assert.equal(nextStatus('entregado', 'mesa'), null);
  assert.equal(nextStatus('cancelado', 'mesa'), null);
});

test('nextLabel da el texto del botón principal', () => {
  assert.equal(nextLabel('confirmado'), 'Confirmar pedido');
  assert.equal(nextLabel('en_cocina'), 'Pasar a cocina');
  assert.equal(nextLabel('en_despacho'), 'Despachar');
});

test('isActive es falso para entregado y cancelado', () => {
  assert.equal(isActive('pendiente'), true);
  assert.equal(isActive('en_despacho'), true);
  assert.equal(isActive('entregado'), false);
  assert.equal(isActive('cancelado'), false);
});

test('customerMessage distingue "listo" en mesa y existe para todos los estados', () => {
  assert.match(customerMessage('listo', 'mesa'), /mesa/i);
  for (const id of Object.keys(STATUS)) assert.ok(customerMessage(id, 'domicilio').length > 5, id);
});

test('progress marca hecho/actual/pendiente y detecta cancelado', () => {
  const p = progress('en_cocina', 'domicilio');
  assert.deepEqual(p.steps.map(s => s.state), ['done', 'done', 'current', 'todo', 'todo']);
  assert.equal(p.cancelled, false);
  assert.equal(progress('cancelado', 'mesa').cancelled, true);
});

const ok = { name: 'Ana', phone: '', type: 'mesa', table: '5', address: '', notes: '' };

test('validateOrderForm acepta mesa válida', () => {
  assert.deepEqual(validateOrderForm(ok, { tables: 12 }), {});
});
test('validateOrderForm exige nombre', () => {
  assert.ok(validateOrderForm({ ...ok, name: '   ' }, { tables: 12 }).name);
});
test('validateOrderForm exige mesa dentro del rango', () => {
  assert.ok(validateOrderForm({ ...ok, table: '' }, { tables: 12 }).table);
  assert.ok(validateOrderForm({ ...ok, table: '13' }, { tables: 12 }).table);
  assert.ok(validateOrderForm({ ...ok, table: '0' }, { tables: 12 }).table);
});
test('validateOrderForm exige dirección y teléfono en domicilio', () => {
  const e = validateOrderForm({ ...ok, type: 'domicilio', table: '' }, { tables: 12 });
  assert.ok(e.address); assert.ok(e.phone);
  assert.deepEqual(validateOrderForm({ ...ok, type: 'domicilio', table: '', address: 'Cra 7 #12-34', phone: '+57 300 111 2233' }, { tables: 12 }), {});
});
test('validateOrderForm rechaza teléfono muy corto aunque sea opcional', () => {
  assert.ok(validateOrderForm({ ...ok, phone: '12' }, { tables: 12 }).phone);
});
test('validateOrderForm rechaza tipo desconocido', () => {
  assert.ok(validateOrderForm({ ...ok, type: 'recoger' }, { tables: 12 }).type);
});

test('buildCreateOrderArgs arma el RPC y limpia campos según el tipo', () => {
  const lines = [{ product: { id: 'a', name: 'Clásica', price: 18900 }, qty: 2, subtotal: 37800 }];
  const mesa = buildCreateOrderArgs({ lines, total: 37800, customer: { ...ok, name: '  Ana ', address: 'ignorada', notes: ' sin cebolla ' } });
  assert.deepEqual(mesa, {
    p_name: 'Ana', p_phone: null, p_type: 'mesa', p_table: 5, p_address: null, p_notes: 'sin cebolla',
    p_items: [{ id: 'a', name: 'Clásica', qty: 2, price: 18900 }], p_total: 37800,
  });
  const dom = buildCreateOrderArgs({ lines, total: 37800, customer: { ...ok, type: 'domicilio', table: '5', address: ' Cra 7 ', phone: '300 111 2233' } });
  assert.equal(dom.p_table, null);
  assert.equal(dom.p_address, 'Cra 7');
  assert.equal(dom.p_phone, '300 111 2233');
});

test('buildCreateOrderArgs recorta notas largas a 300 caracteres', () => {
  const lines = [{ product: { id: 'a', name: 'X', price: 1 }, qty: 1, subtotal: 1 }];
  const a = buildCreateOrderArgs({ lines, total: 1, customer: { ...ok, notes: 'x'.repeat(500) } });
  assert.equal(a.p_notes.length, 300);
});

test('minutesAgo redondea hacia abajo y no baja de 0', () => {
  const now = Date.parse('2026-11-11T12:10:30Z');
  assert.equal(minutesAgo('2026-11-11T12:00:00Z', now), 10);
  assert.equal(minutesAgo('2026-11-11T12:11:00Z', now), 0);
});

import { elapsedLabel, isLate } from '../orders.js';

test('elapsedLabel: ahora, minutos y horas', () => {
  assert.equal(elapsedLabel(0), 'ahora');
  assert.equal(elapsedLabel(7), 'hace 7 min');
  assert.equal(elapsedLabel(60), 'hace 1 h');
  assert.equal(elapsedLabel(125), 'hace 2 h 5 min');
});

test('isLate: pendiente tarda ≥3 min; los demás activos ≥20; los cerrados nunca', () => {
  assert.equal(isLate('pendiente', 2), false);
  assert.equal(isLate('pendiente', 3), true);
  assert.equal(isLate('en_cocina', 19), false);
  assert.equal(isLate('en_cocina', 20), true);
  assert.equal(isLate('entregado', 500), false);
});
