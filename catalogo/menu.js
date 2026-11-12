// Datos del negocio y lógica pura del menú del día (sin DOM ni red).
// Los menús de cada día viven en Supabase y se editan desde el panel.
export const BUSINESS = {
  name: 'Mamá Inés',
  tagline: 'Restaurante · Est. 2012',
  tables: 12,                       // mesas disponibles para elegir al pedir
  phone: '3013496764',              // datos tomados de los folletos
  phoneLabel: '301 349 6764',
  address: 'Cra 32 # 10-47B · Colseguros',
  instagram: '@Restmamaines',
};

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']; // = Date.getDay()
export const MAX_SECTIONS = 12;
export const MAX_ITEMS = 30;
export const MAX_DETAIL = 200;

export const emptyMenu = () => ({ sections: [] });

export function newId() {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const r = globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(new Uint8Array(6)) : Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  return Array.from(r, (n) => abc[n % abc.length]).join('');
}

export const priceOf = (section, item) => item?.price ?? section?.price ?? null;

export function partsOf(section, item) {
  const seen = new Set();
  const out = [];
  for (const raw of [...(section?.includes || []), ...(item?.parts || [])]) {
    const p = String(raw || '').trim();
    if (p && !seen.has(p.toLowerCase())) { seen.add(p.toLowerCase()); out.push(p); }
  }
  return out;
}

export function flattenMenu(menu) {
  const out = [];
  for (const section of menu?.sections || []) {
    for (const item of section.items || []) {
      out.push({ key: `${section.id}.${item.id}`, section, item, price: priceOf(section, item), parts: partsOf(section, item) });
    }
  }
  return out;
}

export const findItem = (menu, key) => flattenMenu(menu).find((f) => f.key === key) || null;

export function buildDetail({ removed = [], choice = '', choiceLabel = '', note = '' } = {}) {
  const segs = [];
  if (removed.length) segs.push(removed.map((p) => `sin ${String(p).toLowerCase()}`).join(', ').replace(/^s/, 'S'));
  if (choice) segs.push(`${choiceLabel || 'Opción'}: ${choice}`);
  if (String(note).trim()) segs.push(String(note).trim());
  return segs.join(' · ').slice(0, MAX_DETAIL);
}

const isPrice = (p) => Number.isInteger(p) && p > 0;

// Devuelve la lista de problemas (vacía = menú válido). Espeja las reglas de la base de datos.
export function validateMenu(menu) {
  const errs = [];
  if (!menu || !Array.isArray(menu.sections)) return ['El menú no es válido.'];
  if (menu.sections.length > MAX_SECTIONS) errs.push(`Máximo ${MAX_SECTIONS} secciones por menú.`);
  const secIds = new Set();
  for (const s of menu.sections) {
    const label = String(s.title || '').trim() || '(sin título)';
    if (!String(s.title || '').trim()) errs.push('Una sección no tiene título.');
    if (secIds.has(s.id)) errs.push(`La sección "${label}" tiene un código repetido.`);
    secIds.add(s.id);
    if (s.price != null && !isPrice(s.price)) errs.push(`El precio de la sección "${label}" no es válido.`);
    const items = s.items || [];
    if (items.length > MAX_ITEMS) errs.push(`La sección "${label}" tiene más de ${MAX_ITEMS} platos.`);
    const itemIds = new Set();
    for (const it of items) {
      const name = String(it.name || '').trim();
      if (!name) errs.push(`Hay un plato sin nombre en "${label}".`);
      if (itemIds.has(it.id)) errs.push(`"${name || label}" tiene un código repetido.`);
      itemIds.add(it.id);
      if (it.price != null && !isPrice(it.price)) errs.push(`El precio de "${name}" no es válido.`);
      else if (name && priceOf(s, it) == null) errs.push(`"${name}" no tiene precio (ponle uno o ponle precio a la sección).`);
    }
  }
  return errs;
}

/* ---------- Ayudas del editor del panel ---------- */
export const parseList = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export function parsePrice(s) {
  const n = Number(String(s ?? '').replace(/\D/g, ''));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function moveItem(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length || i < 0 || i >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export const cloneMenu = (menu) => (menu && Array.isArray(menu.sections) ? JSON.parse(JSON.stringify(menu)) : emptyMenu());
export const blankItem = () => ({ id: newId(), name: '', art: 'plato' });
export const blankSection = () => ({ id: newId(), title: '', price: null, items: [] });

// Deja el menú listo para guardar: recorta textos, quita campos vacíos y normaliza los precios.
export function normalizeMenu(menu) {
  const txt = (v) => String(v ?? '').trim();
  const list = (a) => (Array.isArray(a) ? a.map(txt).filter(Boolean) : []);
  return {
    sections: (menu?.sections || []).map((s) => {
      const out = { id: s.id, title: txt(s.title) };
      if (txt(s.note)) out.note = txt(s.note);
      const price = parsePrice(s.price);
      if (price) out.price = price;
      if (list(s.includes).length) out.includes = list(s.includes);
      out.items = (s.items || []).map((it) => {
        const o = { id: it.id, name: txt(it.name) };
        if (txt(it.desc)) o.desc = txt(it.desc);
        const p = parsePrice(it.price);
        if (p) o.price = p;
        if (list(it.parts).length) o.parts = list(it.parts);
        if (list(it.choices).length) {
          o.choices = list(it.choices);
          if (txt(it.choiceLabel)) o.choiceLabel = txt(it.choiceLabel);
        }
        o.art = txt(it.art) || 'plato';
        return o;
      });
      return out;
    }),
  };
}
