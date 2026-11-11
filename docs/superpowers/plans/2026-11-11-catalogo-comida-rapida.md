# Catálogo de Comida Rápida Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (elegido: el usuario delegó todas las decisiones y no hay tareas independientes).

**Goal:** Catálogo web de comida rápida, llamativo y móvil primero, donde el cliente ve precios e imágenes, arma un carrito y envía el pedido por WhatsApp.

**Architecture:** Sitio estático sin backend ni build (decisión mía, el usuario no eligió stack). La lógica pura (carrito, totales, mensaje de WhatsApp) vive en `cart.js` y se prueba con `node:test`. La interfaz (`app.js`) solo renderiza y llama a esa lógica. Imágenes: ilustraciones SVG genéricas inline, sin depender de internet.

**Tech Stack:** HTML, CSS y JavaScript puros (ES modules), `node:test`, Playwright (ya instalado) para la verificación visual.

**Spec:** Sin documento aparte: el usuario dejó todo a mi criterio. Diseño derivado de `ui-ux-pro-max` (Vibrant & Block-based, rojo apetitoso + dorado, Playfair Display SC / Karla).

## Global Constraints

- Moneda COP, formato `$18.900` (sin decimales), localizado `es-CO`.
- Carpeta `catalogo/`; no tocar el `index.html` de la raíz.
- Móvil primero (375px), probado también a 768/1024/1440.
- Sin emojis como iconos (SVG), foco visible, `prefers-reduced-motion` respetado, objetivos táctiles ≥ 44px, contraste ≥ 4.5:1.
- Número de WhatsApp y nombre del negocio son constantes en `menu.js` (`BUSINESS`), marcadas como de ejemplo.
- Texto en español colombiano.

## Review Focus

- Carrito vacío: el botón de enviar pedido está deshabilitado y no genera mensaje.
- Cantidad llevada a 0 con "−" elimina la línea; no hay cantidades negativas.
- Nombre del cliente con caracteres especiales (`&`, `#`, tildes, saltos) llega íntegro en la URL de WhatsApp.
- El carrito sobrevive a recargar la página (localStorage) y no se rompe si localStorage está bloqueado o corrupto.
- Producto con id desconocido guardado en localStorage se descarta en vez de romper el render.

---

### Task 1: Lógica del carrito y mensaje de WhatsApp

**Files:**
- Create: `catalogo/menu.js`, `catalogo/cart.js`
- Test: `catalogo/tests/cart.test.mjs`

**Interfaces:**
- Produces (`menu.js`): `export const BUSINESS = { name, phone, currency }`, `export const CATEGORIES: {id,label}[]`, `export const PRODUCTS: {id,category,name,desc,price,badge?,art}[]` (`art` = clave de ilustración SVG).
- Produces (`cart.js`):
  - `formatCOP(n: number): string`
  - `addItem(cart, id): cart`, `setQty(cart, id, qty): cart` (qty ≤ 0 elimina), `clear(): cart` — inmutables, `cart` es `{[id]: qty}`
  - `lines(cart, products): {product, qty, subtotal}[]` (ignora ids desconocidos)
  - `total(cart, products): number`, `count(cart): number`
  - `buildWhatsAppUrl({business, lines, total, customer:{name,type,address,notes}}): string`
  - `load(storage): cart` / `save(storage, cart): void` (a prueba de errores)

- [ ] **Step 1: Escribir tests que fallan** — `formatCOP(18900) === '$18.900'`; `addItem` dos veces da qty 2; `setQty(c,'x',0)` elimina la clave; `lines` ignora ids desconocidos; `total` suma subtotales; la URL empieza con `https://wa.me/<phone>?text=` y `decodeURIComponent` del texto contiene el nombre `Ñandú & Co #1`, cada línea `2 x Nombre — $…` y el total; `load` con JSON corrupto o storage que lanza devuelve `{}`.
- [ ] **Step 2: Correr** `node --test catalogo/tests/` — Esperado: FALLA (módulos no existen).
- [ ] **Step 3: Implementar** `menu.js` (≥ 12 productos en 5 categorías: Hamburguesas, Perros y Sándwiches, Papas y Snacks, Pizza, Bebidas y Postres) y `cart.js` con las firmas de arriba.
- [ ] **Step 4: Correr** el mismo comando — Esperado: todo PASA.
- [ ] **Step 5: Commit** `feat: lógica de carrito y pedido por WhatsApp`.

### Task 2: Interfaz del catálogo

**Files:**
- Create: `catalogo/index.html`, `catalogo/styles.css`, `catalogo/art.js`, `catalogo/app.js`

**Interfaces:**
- Consumes: todo lo de Task 1.
- Produces: `art.js` → `export function art(key: string): string` (SVG inline, una ilustración por clave usada en `PRODUCTS`, con fallback genérico).

- [ ] **Step 1: `art.js`** con ilustraciones SVG genéricas y coloridas (hamburguesa, doble, pollo, hot dog, sándwich, papas, nuggets, aros, pizza, gaseosa, malteada, helado/postre).
- [ ] **Step 2: `index.html` + `styles.css`**: hero con gancho y CTA "Pedir ahora", barra de categorías pegajosa, grilla de tarjetas (imagen, nombre, descripción, precio, botón agregar / selector − n +), botón flotante de carrito con contador y total, panel del carrito (hoja inferior en móvil), formulario (nombre, domicilio o recoger, dirección, notas) y botón "Enviar pedido por WhatsApp".
- [ ] **Step 3: `app.js`**: renderiza categorías/productos/carrito desde `menu.js`, conecta eventos a `cart.js`, persiste con `save`, deshabilita el envío si el carrito está vacío o falta nombre (y dirección si es domicilio), con mensajes de error junto al campo.
- [ ] **Step 4: Verificar con Playwright** (script en el scratchpad): a 375px sin scroll horizontal; agregar 2 productos cambia contador y total; recargar conserva el carrito; el enlace de enviar apunta a `wa.me` con el pedido; sin errores de consola. Capturas a 375 y 1280.
- [ ] **Step 5: Commit** `feat: interfaz del catálogo de comida rápida`.

### Task 3: Cierre

- [ ] Revisión de código (`requesting-code-review`), `verification-before-completion` (re-ejecutar tests y Playwright), commit y push a `claude/trusting-bell-y4htjw`.
