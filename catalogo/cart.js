// Carrito por líneas: cada línea es un plato + su detalle ("sin arroz · Sabor: coco") + cantidad.
// Solo se guarda qué plato (itemKey) y cuántos; nombre y precio salen siempre del menú vigente.
import { flattenMenu, MAX_DETAIL } from './menu.js';

const STORAGE_KEY = 'mamaines-cart-v1';
const MAX_QTY = 50;

export function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO', { useGrouping: true, maximumFractionDigits: 0 })
    .replace(/[\s,]/g, '.');
}

const lineKey = (itemKey, detail) => `${itemKey}|${detail}`;

export function addLine(cart, { itemKey, detail = '', qty = 1 }) {
  if (!Number.isInteger(qty) || qty <= 0) return cart;
  const key = lineKey(itemKey, detail);
  const i = cart.findIndex((l) => l.key === key);
  if (i === -1) return [...cart, { key, itemKey, detail, qty: Math.min(qty, MAX_QTY) }];
  return cart.map((l, j) => (j === i ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY) } : l));
}

export function setQty(cart, key, qty) {
  if (!Number.isFinite(qty) || qty <= 0) return cart.filter((l) => l.key !== key);
  return cart.map((l) => (l.key === key ? { ...l, qty: Math.min(Math.floor(qty), MAX_QTY) } : l));
}

export const clear = () => [];

export function resolve(cart, menu) {
  const byKey = new Map(flattenMenu(menu).map((f) => [f.key, f]));
  const out = [];
  for (const l of cart) {
    const f = byKey.get(l.itemKey);
    if (!f || f.price == null) continue;
    out.push({ ...l, name: f.item.name, price: f.price, subtotal: f.price * l.qty, art: f.item.art });
  }
  return out;
}

export const total = (cart, menu) => resolve(cart, menu).reduce((s, l) => s + l.subtotal, 0);
export const count = (cart) => cart.reduce((s, l) => s + l.qty, 0);

export function load(storage) {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const l of raw) {
      if (!l || typeof l.itemKey !== 'string' || !Number.isInteger(l.qty) || l.qty <= 0) continue;
      const detail = typeof l.detail === 'string' ? l.detail.slice(0, MAX_DETAIL) : '';
      out.push({ key: lineKey(l.itemKey, detail), itemKey: l.itemKey, detail, qty: Math.min(l.qty, MAX_QTY) });
    }
    return out;
  } catch { return []; }
}

export function save(storage, cart) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(cart.map(({ itemKey, detail, qty }) => ({ itemKey, detail, qty })))); } catch { /* storage bloqueado o lleno */ }
}
