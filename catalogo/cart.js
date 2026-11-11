// Lógica pura del carrito: sin DOM, probada con node:test.
const STORAGE_KEY = 'burgerfest-cart-v1';

export function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO', { useGrouping: true, maximumFractionDigits: 0 })
    .replace(/[\s,]/g, '.');
}

export function addItem(cart, id) {
  return { ...cart, [id]: (cart[id] || 0) + 1 };
}

export function setQty(cart, id, qty) {
  const next = { ...cart };
  if (!Number.isFinite(qty) || qty <= 0) delete next[id];
  else next[id] = Math.floor(qty);
  return next;
}

export function clear() { return {}; }

export function lines(cart, products) {
  const out = [];
  for (const product of products) {
    const qty = cart[product.id];
    if (qty > 0) out.push({ product, qty, subtotal: product.price * qty });
  }
  return out;
}

export function total(cart, products) {
  return lines(cart, products).reduce((s, l) => s + l.subtotal, 0);
}

export function count(cart) {
  return Object.values(cart).reduce((s, q) => s + q, 0);
}

export function load(storage) {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    for (const [id, q] of Object.entries(raw)) if (Number.isInteger(q) && q > 0) out[id] = q;
    return out;
  } catch { return {}; }
}

export function save(storage, cart) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* storage bloqueado o lleno */ }
}
