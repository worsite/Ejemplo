// Lógica pura de pedidos: estados, validación y armado del RPC. Sin DOM ni red.
export const STATUS = {
  pendiente: { label: 'Pendiente', customer: 'Recibimos tu pedido. Estamos esperando que el local lo confirme.' },
  confirmado: { label: 'Confirmado', customer: '¡Pedido confirmado! En breve empezamos a prepararlo.' },
  en_cocina: { label: 'En cocina', customer: 'Estamos preparando tu pedido.' },
  listo: { label: 'Listo', customer: '¡Tu pedido está listo!' },
  en_despacho: { label: 'En despacho', customer: 'Tu pedido va en camino.' },
  entregado: { label: 'Entregado', customer: '¡Buen provecho! Gracias por pedir con nosotros.' },
  cancelado: { label: 'Cancelado', customer: 'Tu pedido fue cancelado. Escríbenos si tienes dudas.' },
};

const NEXT_LABEL = {
  confirmado: 'Confirmar pedido', en_cocina: 'Pasar a cocina', listo: 'Marcar listo',
  en_despacho: 'Despachar', entregado: 'Marcar entregado',
};

export function flow(type) {
  return type === 'domicilio'
    ? ['pendiente', 'confirmado', 'en_cocina', 'en_despacho', 'entregado']
    : ['pendiente', 'confirmado', 'en_cocina', 'listo', 'entregado'];
}

export function nextStatus(status, type) {
  const f = flow(type);
  const i = f.indexOf(status);
  return i === -1 || i === f.length - 1 ? null : f[i + 1];
}

export const nextLabel = (status) => NEXT_LABEL[status] || '';
export const isActive = (status) => status !== 'entregado' && status !== 'cancelado';

export function customerMessage(status, type) {
  if (status === 'listo' && type === 'mesa') return '¡Tu pedido está listo y va para tu mesa!';
  return (STATUS[status] || STATUS.pendiente).customer;
}

export function progress(status, type) {
  const f = flow(type);
  const cur = f.indexOf(status);
  return {
    cancelled: status === 'cancelado',
    steps: f.map((id, i) => ({
      id, label: STATUS[id].label,
      state: status === 'cancelado' ? 'todo' : i < cur ? 'done' : i === cur ? 'current' : 'todo',
    })),
  };
}

const digits = (s) => String(s || '').replace(/\D/g, '');

export function validateOrderForm(form, { tables }) {
  const e = {};
  if (!String(form.name || '').trim()) e.name = 'Escribe tu nombre para el pedido.';
  if (form.type !== 'mesa' && form.type !== 'domicilio') {
    e.type = 'Elige si es para mesa o domicilio.';
    return e;
  }
  const phone = String(form.phone || '').trim();
  if (form.type === 'mesa') {
    const t = Number(form.table);
    if (!Number.isInteger(t) || t < 1 || t > tables) e.table = `Elige tu mesa (1 a ${tables}).`;
    if (phone && digits(phone).length < 7) e.phone = 'Revisa el teléfono: parece incompleto.';
  } else {
    if (String(form.address || '').trim().length < 5) e.address = 'Escribe la dirección de entrega.';
    if (digits(phone).length < 7) e.phone = 'Escribe un teléfono para contactarte.';
  }
  return e;
}

export function buildCreateOrderArgs({ lines, total, customer }) {
  const dom = customer.type === 'domicilio';
  const phone = String(customer.phone || '').trim();
  return {
    p_name: String(customer.name).trim(),
    p_phone: phone || null,
    p_type: customer.type,
    p_table: dom ? null : Number(customer.table),
    p_address: dom ? String(customer.address).trim() : null,
    p_notes: String(customer.notes || '').trim().slice(0, 300) || null,
    p_items: lines.map((l) => ({ id: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price })),
    p_total: total,
  };
}

export function minutesAgo(iso, nowMs) {
  return Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 60000));
}

export function elapsedLabel(min) {
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `hace ${h} h ${m} min` : `hace ${h} h`;
}

// Un pedido "se atrasa" si lleva ≥3 min sin confirmar, o ≥20 min en cualquier otro estado activo.
export function isLate(status, min) {
  if (!isActive(status)) return false;
  return min >= (status === 'pendiente' ? 3 : 20);
}
