import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS, DAYS, emptyMenu, newId, flattenMenu, findItem, priceOf, partsOf, buildDetail, validateMenu } from '../menu.js';
import { MENU } from './fixtures.mjs';

test('DAYS usa 0 = domingo como Date.getDay', () => {
  assert.equal(DAYS.length, 7);
  assert.equal(DAYS[0], 'Domingo');
  assert.equal(DAYS[5], 'Viernes');
});

test('BUSINESS trae los datos del folleto', () => {
  assert.equal(BUSINESS.name, 'Mamá Inés');
  assert.ok(Number.isInteger(BUSINESS.tables) && BUSINESS.tables >= 1);
  assert.match(BUSINESS.phoneLabel, /301 349 6764/);
});

test('emptyMenu no tiene secciones', () => assert.deepEqual(emptyMenu(), { sections: [] }));

test('newId da 6 caracteres seguros y casi nunca repite', () => {
  const ids = new Set(Array.from({ length: 200 }, newId));
  assert.ok([...ids].every((i) => /^[a-z0-9]{6}$/.test(i)));
  assert.ok(ids.size > 195);
});

test('flattenMenu da claves seccion.plato, precio y partes', () => {
  const flat = flattenMenu(MENU);
  assert.deepEqual(flat.map((f) => f.key), ['s1.i1', 's1.i2', 's2.i1', 's2.i2']);
  assert.equal(flat[0].price, 25000);
  assert.equal(flat[2].price, 8000);
  assert.deepEqual(flat[0].parts, ['Sancocho', 'Arroz', 'Ensalada', 'Maduro', 'Jugo']);
});

test('findItem encuentra por clave y devuelve null si no existe', () => {
  assert.equal(findItem(MENU, 's2.i2').item.name, 'Limonada especial');
  assert.equal(findItem(MENU, 'zz.i1'), null);
  assert.equal(findItem(MENU, 's1.zz'), null);
  assert.equal(findItem(null, 's1.i1'), null);
});

test('priceOf: precio propio gana; si no, el de la sección; si no, null', () => {
  assert.equal(priceOf({ price: 25000 }, {}), 25000);
  assert.equal(priceOf({ price: 25000 }, { price: 9000 }), 9000);
  assert.equal(priceOf({ price: null }, {}), null);
});

test('partsOf une "incluye" de la sección con las partes del plato, sin repetir ni vacíos', () => {
  assert.deepEqual(partsOf({ includes: ['Sopa', ' '] }, { parts: ['Arroz', 'sopa', ''] }), ['Sopa', 'Arroz']);
  assert.deepEqual(partsOf({}, {}), []);
});

test('buildDetail resume lo que NO quiere, la elección y la nota', () => {
  assert.equal(buildDetail({ removed: ['Arroz', 'Ensalada'] }), 'Sin arroz, sin ensalada');
  assert.equal(buildDetail({ choice: 'Coco', choiceLabel: 'Sabor' }), 'Sabor: Coco');
  assert.equal(buildDetail({ removed: ['Jugo'], choice: 'Coco', choiceLabel: 'Sabor', note: 'poca sal' }), 'Sin jugo · Sabor: Coco · poca sal');
  assert.equal(buildDetail({}), '');
  assert.equal(buildDetail({ note: 'x'.repeat(500) }).length, 200);
});

test('validateMenu acepta un menú correcto y uno vacío', () => {
  assert.deepEqual(validateMenu(MENU), []);
  assert.deepEqual(validateMenu(emptyMenu()), []);
});

test('validateMenu explica cada problema', () => {
  const clone = () => JSON.parse(JSON.stringify(MENU));
  let m = clone(); m.sections[1].items[0].price = null;
  assert.match(validateMenu(m).join(' '), /Limonada natural.*precio/i);
  m = clone(); m.sections[0].title = '  ';
  assert.match(validateMenu(m).join(' '), /título/i);
  m = clone(); m.sections[0].items[0].name = '';
  assert.match(validateMenu(m).join(' '), /nombre/i);
  m = clone(); m.sections[0].items[0].price = -5;
  assert.match(validateMenu(m).join(' '), /precio/i);
  m = clone(); m.sections[0].items[0].price = 1500.5;
  assert.match(validateMenu(m).join(' '), /precio/i);
  m = clone(); m.sections = Array.from({ length: 13 }, (_, i) => ({ id: 'x' + i, title: 't', price: 1, items: [] }));
  assert.match(validateMenu(m).join(' '), /12/);
  m = clone(); m.sections[1].id = 's1';
  assert.match(validateMenu(m).join(' '), /repet/i);
  m = clone(); m.sections[0].items[1].id = 'i1';
  assert.match(validateMenu(m).join(' '), /repet/i);
});
