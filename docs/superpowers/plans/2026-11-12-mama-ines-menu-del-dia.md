# Mamá Inés: Menú del Día Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline; el usuario delegó el diseño y las decisiones).

**Goal:** Rebrandear el catálogo a "Mamá Inés Restaurante" (logo y colores de sus folletos) y reemplazar la carta fija por un **Menú del Día** programable por día de la semana desde el panel admin, con ilustraciones por plato y pedido personalizable (qué quiere / qué no quiere).

**Architecture:** Los menús viven en Supabase (`daily_menus`, un JSON por día de la semana, 0=domingo). El público los lee con `get_daily_menus()` (incluye el día "hoy" en hora de Bogotá calculado por el servidor). El admin los guarda con `admin_save_menu(clave, día, menú)`. **Los precios se resuelven en el servidor**: el cliente solo manda `{id, cantidad, detalle}` y `create_order` busca nombre y precio en el menú de hoy; si el total mostrado no coincide, rechaza el pedido. Sitio estático sin dependencias; ilustraciones SVG en el código.

**Tech Stack:** HTML/CSS/JS puro, `node:test`, Playwright con Supabase simulado, SQL de Postgres.

**Spec:** petición del usuario en el chat + imágenes: logo (`catalogo/assets/`) y folletos de Domingo y Viernes.

## Global Constraints

- Marca: vinotinto `#68393D` (logo), dorado `#BCAA72` (títulos de los folletos), estrella de precio `#FFD668`, tarjeta crema `#F3EFE8`, fondo madera oscuro. Texto pequeño nunca en dorado claro (contraste < 4.5:1).
- Días: índice 0=Domingo … 6=Sábado; "hoy" lo define el servidor con `America/Bogota`.
- Moneda COP `$25.000`. Texto en español colombiano.
- Un plato hereda el precio de su sección salvo que tenga precio propio; el precio de la sección se muestra como estrella, como en los folletos.
- Solo se puede pedir el menú de **hoy**; los otros días se pueden ver.
- Límites: ≤12 secciones por menú, ≤30 platos por sección, ≤30000 bytes, detalle del plato ≤200 caracteres.
- Datos del negocio tomados de los folletos: tel. 301 349 6764, Cra 32 # 10-47B Colseguros, @Restmamaines, Est. 2012.

## Review Focus

- El cliente intenta mandar un precio propio o un plato que no es del menú de hoy → rechazado por el servidor.
- El admin edita el menú mientras el cliente ya lo tenía cargado: el pedido falla con mensaje claro ("el menú cambió") y el carrito se conserva.
- Carrito guardado con un plato que ya no existe en el menú: se descarta sin romper.
- Menú vacío o día sin programar: mensaje amable, sin botón de pedir.
- Texto del admin (nombres, descripciones) escapado en cliente y panel (sin XSS).
- Guardar el menú con plato sin precio (ni propio ni de la sección) → error explicado, no se guarda.
- Cambio de día a medianoche con la página abierta.

---

### Task 1: Lógica del menú, carrito por líneas y pedido

**Files:** Modify `catalogo/menu.js`, `catalogo/cart.js`, `catalogo/orders.js`; Test `catalogo/tests/menu.test.mjs`, `catalogo/tests/cart.test.mjs`, `catalogo/tests/orders.test.mjs`.

**Interfaces (Produces):**
- `menu.js`: `BUSINESS`, `DAYS`, `emptyMenu()`, `newId()`, `flattenMenu(menu)`, `findItem(menu,key)`, `priceOf(section,item)`, `partsOf(section,item)`, `buildDetail({removed,choice,choiceLabel,note})`, `validateMenu(menu)`.
- `cart.js`: carrito = `[{key,itemKey,qty,detail}]`; `addLine`, `setQty`, `clear`, `resolve(cart,menu)`, `total(cart,menu)`, `count`, `load`, `save`, `formatCOP`.
- `orders.js`: `buildCreateOrderArgs({resolved,total,customer})` manda `p_items:[{id,qty,detail}]`.

- [ ] Escribir pruebas que fallan; verlas fallar; implementar; verlas pasar. Commit.

### Task 2: SQL

**Files:** Modify `catalogo/supabase/schema.sql`, `catalogo/supabase/README.md`.

- [ ] Tabla `daily_menus`, `validate_menu`, `get_daily_menus`, `admin_save_menu`, `create_order` con precios del servidor, y menús iniciales (Domingo y Viernes de los folletos; Lunes–Jueves y Sábado de ejemplo con los mismos platos y precios).
- [ ] Probar en Postgres de prueba: reglas, manipulación de precios, plato ajeno, menú vacío, actualización desde la versión anterior.

### Task 3: Ilustraciones

**Files:** Modify `catalogo/art.js` (reemplaza las de comida rápida; exporta `artSvg(key)`, `ART_OPTIONS`).

- [ ] ~19 ilustraciones de platos y limonadas con la paleta de la marca; revisar una hoja de contacto.

### Task 4: Catálogo (cliente)

**Files:** Modify `catalogo/index.html`, `catalogo/styles.css`, `catalogo/app.js`.

- [ ] Diseño tipo folleto, pestañas de días, estrella de precio, diálogo "qué quieres / qué no quieres", carrito por líneas, seguimiento. Playwright.

### Task 5: Panel admin — Menú de la semana

**Files:** Modify `catalogo/admin.html`, `catalogo/admin.css`, `catalogo/admin.js`; Create `catalogo/menu-editor.js`.

- [ ] Pestaña "Menú de la semana": editor por día (secciones, platos, precios, incluye, elecciones, imagen), copiar desde otro día, vista previa, guardar. Mostrar el detalle del plato en las tarjetas de pedido. Playwright.

### Task 6: Cierre

- [ ] `build.py` embebe los logos; regenerar `dist/`; repetir pruebas por `file://`; documentación; revisión; push.
