// Editor del menú de la semana (panel de administración): un menú por día, con secciones y platos.
import { DAYS, MAX_SECTIONS, MAX_ITEMS, cloneMenu, emptyMenu, blankSection, blankItem, moveItem, normalizeMenu, parseList, parsePrice, validateMenu, flattenMenu } from './menu.js';
import { artSvg, ART_OPTIONS } from './art.js';
import { formatCOP } from './cart.js';
import { esc } from './util.js';

export function createMenuEditor({ root, rpc, getKey, onForbidden }) {
  let menus = {};
  let today = new Date().getDay();
  let day = null;
  let draft = emptyMenu();
  let dirty = false;
  let saving = false;
  let loaded = false;
  let message = '';        // aviso verde / rojo
  let messageKind = 'ok';
  let errors = [];         // problemas de validación antes de guardar

  const count = (m) => flattenMenu(m).length;
  const priceHint = (v) => (v ? `= ${formatCOP(v)}` : '');
  const val = (v) => (v == null ? '' : esc(v));

  /* ---------- Datos ---------- */
  async function refresh() {
    try {
      const r = await rpc('get_daily_menus');
      menus = r?.menus || {};
      if (Number.isInteger(r?.today)) today = r.today;
      loaded = true;
      if (day === null) day = today;
      if (!dirty) draft = cloneMenu(menus[String(day)]);
    } catch {
      message = 'No pudimos cargar los menús. Revisa la conexión.'; messageKind = 'err';
    }
    render();
  }

  function setDay(d) {
    if (dirty && !window.confirm('Tienes cambios sin guardar en este día. ¿Descartarlos?')) return;
    day = d; draft = cloneMenu(menus[String(d)]); dirty = false; errors = []; message = ''; render();
  }

  async function save() {
    if (saving) return;
    const menu = normalizeMenu(draft);
    errors = validateMenu(menu);
    message = '';
    if (errors.length) { render(); root.querySelector('.errlist')?.focus(); return; }
    saving = true; render();
    try {
      await rpc('admin_save_menu', { p_key: getKey(), p_day: day, p_menu: menu });
      menus[String(day)] = menu;
      draft = cloneMenu(menu);
      dirty = false;
      message = `Guardado. ${DAYS[day]} ya se ve así en el catálogo.`; messageKind = 'ok';
    } catch (e) {
      if (e.status === 403) { saving = false; onForbidden(); return; }
      message = `No se pudo guardar: ${e.message}`; messageKind = 'err';
    }
    saving = false; render();
  }

  /* ---------- Vista ---------- */
  function itemHtml(it, si, ii, n) {
    const p = `data-s="${si}" data-i="${ii}"`;
    return `<li class="eitem">
      <div class="eitem-top">
        <div class="eart" data-art-prev="${si}.${ii}" aria-hidden="true">${artSvg(it.art)}</div>
        <div class="eitem-fields">
          <label>Nombre del plato<input type="text" ${p} data-f="name" value="${val(it.name)}" maxlength="80" placeholder="Ej: Gallina guisada"></label>
          <label>Descripción <span class="opt">(opcional)</span><input type="text" ${p} data-f="desc" value="${val(it.desc)}" maxlength="200" placeholder="Ej: arroz, ensalada, maduro y jugo"></label>
        </div>
      </div>
      <div class="egrid">
        <label>Precio propio <span class="opt">(vacío = el de la sección)</span>
          <input type="text" inputmode="numeric" ${p} data-f="price" data-hint value="${val(it.price)}" placeholder="Ej: 8000"><span class="hint" data-hintfor>${priceHint(it.price)}</span></label>
        <label>Imagen
          <select ${p} data-f="art">${ART_OPTIONS.map((o) => `<option value="${o.key}"${o.key === (it.art || 'plato') ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
      </div>
      <label>Qué lleva <span class="opt">(separado por comas; el cliente puede quitar lo que no quiera)</span>
        <input type="text" ${p} data-f="parts" value="${val((it.parts || []).join(', '))}" placeholder="Ej: Arroz, Ensalada, Maduro, Jugo"></label>
      <div class="egrid">
        <label>Elegir uno de <span class="opt">(opcional, separado por comas)</span>
          <input type="text" ${p} data-f="choices" value="${val((it.choices || []).join(', '))}" placeholder="Ej: Coco, Cereza, Hierbabuena"></label>
        <label>Pregunta de la elección
          <input type="text" ${p} data-f="choiceLabel" value="${val(it.choiceLabel)}" maxlength="40" placeholder="Ej: Sabor"></label>
      </div>
      <div class="erow">
        <button type="button" class="btn btn-ghost sm" data-act="item-up" ${p} ${ii === 0 ? 'disabled' : ''} aria-label="Subir plato">↑ Subir</button>
        <button type="button" class="btn btn-ghost sm" data-act="item-down" ${p} ${ii === n - 1 ? 'disabled' : ''} aria-label="Bajar plato">↓ Bajar</button>
        <button type="button" class="btn btn-danger sm" data-act="item-del" ${p}>Quitar plato</button>
      </div>
    </li>`;
  }

  function sectionHtml(s, si, total) {
    const p = `data-s="${si}"`;
    const items = s.items || [];
    return `<section class="esec" aria-label="Sección ${si + 1}">
      <div class="esec-head">
        <h3>Sección ${si + 1}</h3>
        <div class="erow">
          <button type="button" class="btn btn-ghost sm" data-act="sec-up" ${p} ${si === 0 ? 'disabled' : ''} aria-label="Subir sección">↑</button>
          <button type="button" class="btn btn-ghost sm" data-act="sec-down" ${p} ${si === total - 1 ? 'disabled' : ''} aria-label="Bajar sección">↓</button>
          <button type="button" class="btn btn-danger sm" data-act="sec-del" ${p}>Quitar sección</button>
        </div>
      </div>
      <div class="egrid">
        <label>Título<input type="text" ${p} data-f="title" value="${val(s.title)}" maxlength="80" placeholder="Ej: Sancocho de gallina"></label>
        <label>Precio de la sección <span class="opt">(la estrella; vale para todos sus platos)</span>
          <input type="text" inputmode="numeric" ${p} data-f="price" data-hint value="${val(s.price)}" placeholder="Ej: 25000"><span class="hint" data-hintfor>${priceHint(s.price)}</span></label>
      </div>
      <div class="egrid">
        <label>Nota <span class="opt">(opcional)</span><input type="text" ${p} data-f="note" value="${val(s.note)}" maxlength="120" placeholder="Ej: (Para todos nuestros platos)"></label>
        <label>Incluye en todos sus platos <span class="opt">(por comas)</span><input type="text" ${p} data-f="includes" value="${val((s.includes || []).join(', '))}" placeholder="Ej: Sancocho de gallina"></label>
      </div>
      <ul class="eitems">${items.map((it, ii) => itemHtml(it, si, ii, items.length)).join('') || '<li class="none">Esta sección todavía no tiene platos.</li>'}</ul>
      <button type="button" class="btn btn-ghost" data-act="item-add" ${p} ${items.length >= MAX_ITEMS ? 'disabled' : ''}>+ Agregar plato</button>
    </section>`;
  }

  function render() {
    if (!loaded) { root.innerHTML = '<p class="state">Cargando los menús…</p>'; return; }
    const others = DAYS.map((d, i) => ({ d, i, n: count(menus[String(i)]) })).filter((x) => x.i !== day);
    root.innerHTML = `
      <div class="mdays" role="group" aria-label="Día del menú">
        ${DAYS.map((d, i) => `<button type="button" data-act="day" data-day="${i}" aria-pressed="${i === day}"${i === today ? ' class="is-today"' : ''}>${d}${i === today ? '<span class="tag">hoy</span>' : ''}${count(menus[String(i)]) === 0 ? '<span class="tag empty">sin menú</span>' : ''}</button>`).join('')}
      </div>
      <div class="mbar">
        <h2>Menú del ${esc(DAYS[day])}${day === today ? ' (hoy)' : ''}</h2>
        <div class="erow">
          <label class="copy">Copiar desde
            <select id="copyFrom">${others.map((x) => `<option value="${x.i}">${x.d}${x.n ? '' : ' (vacío)'}</option>`).join('')}</select></label>
          <button type="button" class="btn btn-ghost" data-act="copy">Copiar aquí</button>
          <button type="button" class="btn btn-ghost" data-act="clear">Vaciar día</button>
          <a class="btn btn-ghost" href="index.html" target="_blank" rel="noopener">Ver el catálogo</a>
        </div>
      </div>
      <p class="mhelp">El cliente solo puede pedir el menú de <b>hoy</b>; los otros días los puede ver. Cada plato necesita un precio (propio o el de su sección).</p>
      ${errors.length ? `<div class="errlist" role="alert" tabindex="-1"><b>Revisa esto antes de guardar:</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
      ${draft.sections.map((s, si) => sectionHtml(s, si, draft.sections.length)).join('') || '<p class="none big">Este día no tiene menú. Agrega una sección para empezar (por ejemplo, "Sancocho de gallina" o "Carnes").</p>'}
      <button type="button" class="btn btn-ghost" data-act="sec-add" ${draft.sections.length >= MAX_SECTIONS ? 'disabled' : ''}>+ Agregar sección</button>
      <div class="msave">
        <p class="mstate ${dirty ? 'dirty' : ''}" role="status">${message ? `<span class="${messageKind}">${esc(message)}</span>` : dirty ? 'Tienes cambios sin guardar.' : 'Sin cambios.'}</p>
        <button type="button" class="btn btn-main" data-act="save" ${saving || !dirty ? 'disabled' : ''}>${saving ? 'Guardando…' : 'Guardar menú'}</button>
      </div>`;
  }

  /* ---------- Edición ---------- */
  const mark = () => { dirty = true; message = ''; };

  root.addEventListener('input', (e) => {
    const el = e.target.closest('[data-f]');
    if (!el) return;
    const s = draft.sections[Number(el.dataset.s)];
    const target = el.dataset.i !== undefined ? s.items[Number(el.dataset.i)] : s;
    const f = el.dataset.f;
    if (f === 'price') {
      target.price = parsePrice(el.value);
      const hint = el.parentElement.querySelector('[data-hintfor]');
      if (hint) hint.textContent = priceHint(target.price);
    } else if (['parts', 'choices', 'includes'].includes(f)) target[f] = parseList(el.value);
    else target[f] = el.value;
    mark();
    const saveBtn = root.querySelector('[data-act="save"]');
    if (saveBtn) saveBtn.disabled = saving;
    const st = root.querySelector('.mstate');
    if (st) { st.className = 'mstate dirty'; st.textContent = 'Tienes cambios sin guardar.'; }
  });

  root.addEventListener('change', (e) => {
    if (e.target.matches('select[data-f="art"]')) {
      const s = draft.sections[Number(e.target.dataset.s)], it = s.items[Number(e.target.dataset.i)];
      it.art = e.target.value;
      root.querySelector(`[data-art-prev="${e.target.dataset.s}.${e.target.dataset.i}"]`).innerHTML = artSvg(it.art);
      mark();
      const saveBtn = root.querySelector('[data-act="save"]'); if (saveBtn) saveBtn.disabled = saving;
      const st = root.querySelector('.mstate'); if (st) { st.className = 'mstate dirty'; st.textContent = 'Tienes cambios sin guardar.'; }
    }
  });

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const si = Number(b.dataset.s), ii = Number(b.dataset.i);
    switch (b.dataset.act) {
      case 'day': if (Number(b.dataset.day) !== day) setDay(Number(b.dataset.day)); return;
      case 'save': save(); return;
      case 'copy': {
        const from = Number(root.querySelector('#copyFrom').value);
        if (count(draft) && !window.confirm(`Esto reemplaza el menú del ${DAYS[day]} con el del ${DAYS[from]}. ¿Seguir?`)) return;
        draft = cloneMenu(menus[String(from)]); mark(); errors = []; break;
      }
      case 'clear':
        if (draft.sections.length && !window.confirm(`¿Vaciar el menú del ${DAYS[day]}? (Se aplica cuando guardes.)`)) return;
        draft = emptyMenu(); mark(); errors = []; break;
      case 'sec-add': draft.sections.push(blankSection()); mark(); break;
      case 'sec-del':
        if (!window.confirm(`¿Quitar la sección "${draft.sections[si].title || si + 1}" y sus platos?`)) return;
        draft.sections.splice(si, 1); mark(); break;
      case 'sec-up': draft.sections = moveItem(draft.sections, si, -1); mark(); break;
      case 'sec-down': draft.sections = moveItem(draft.sections, si, 1); mark(); break;
      case 'item-add': draft.sections[si].items = [...(draft.sections[si].items || []), blankItem()]; mark(); break;
      case 'item-del': draft.sections[si].items.splice(ii, 1); mark(); break;
      case 'item-up': draft.sections[si].items = moveItem(draft.sections[si].items, ii, -1); mark(); break;
      case 'item-down': draft.sections[si].items = moveItem(draft.sections[si].items, ii, 1); mark(); break;
      default: return;
    }
    render();
    // devuelve el foco al campo recién creado, si lo hay
    if (b.dataset.act === 'item-add') {
      const inputs = root.querySelectorAll(`.esec:nth-of-type(${si + 1}) .eitem [data-f="name"]`);
      inputs[inputs.length - 1]?.focus();
    }
    if (b.dataset.act === 'sec-add') root.querySelectorAll('.esec [data-f="title"]')[draft.sections.length - 1]?.focus();
  });

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  return {
    show: () => { if (!dirty) { loaded = false; render(); refresh(); } else render(); },
    isDirty: () => dirty,
  };
}
