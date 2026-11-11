# Pedidos en Supabase + Panel Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline; el usuario delegó las decisiones).

**Goal:** Los pedidos del catálogo se guardan en Supabase (con mesa o domicilio), llegan solos a un panel de administración donde se confirman y cambian de estado, y el cliente ve el estado de su pedido en vivo.

**Architecture:** Sitio estático. Cliente `supabase.js` mínimo sobre `fetch` (PostgREST + GoTrue), sin librerías ni CDN, probado con `fetch` inyectado. Lógica pura en `orders.js`. Seguridad en la base: RLS activado; el público (anon) solo puede llamar dos funciones RPC (`create_order`, `get_order_status`); el admin entra con Supabase Auth y la tabla `admins` autoriza. El panel y el cliente se actualizan por sondeo cada 5 s (decisión mía: más fácil de probar y robusto, sin websockets; 5 s es suficiente para sentirse automático).

**Tech Stack:** HTML/CSS/JS puro, `node:test`, Playwright con Supabase simulado vía `page.route`, SQL de Postgres.

**Spec:** petición del usuario en el chat (confirmar pedido, estados cocina/despacho, mesa o domicilio, panel admin). Sin documento aparte.

## Global Constraints

- Moneda COP `$18.900`; texto en español colombiano.
- Solo la clave `anon` en el cliente; nunca `service_role`. URL: `https://uzvxcyqlifhcgdwubsdl.supabase.co`.
- El público no puede leer ni listar pedidos (privacidad de nombres/direcciones): solo `create_order` y `get_order_status(id)`.
- Estados: `pendiente, confirmado, en_cocina, listo, en_despacho, entregado, cancelado`. Flujo mesa: pendiente→confirmado→en_cocina→listo→entregado. Flujo domicilio: pendiente→confirmado→en_cocina→en_despacho→entregado.
- Tipos de pedido: `mesa` (número 1..`BUSINESS.tables`) o `domicilio` (dirección y teléfono obligatorios).
- Accesibilidad como en el catálogo: foco visible, objetivos ≥ 44px, `prefers-reduced-motion`.

## Review Focus

- Pedido con `domicilio` sin dirección/teléfono o `mesa` sin número es rechazado en cliente y por la base (constraints).
- Token de admin vencido: se renueva solo; si falla, vuelve al login sin perder la pantalla en blanco.
- Falla de red al enviar: el carrito NO se vacía y se muestra el error.
- Doble clic en "Enviar" no crea dos pedidos.
- Admin: texto del cliente (nombre, notas, dirección) se escapa (sin XSS).
- Un usuario autenticado que no está en `admins` no ve pedidos.

---

### Task 1: Lógica de pedidos y cliente Supabase

**Files:** Create `catalogo/orders.js`, `catalogo/supabase.js`, `catalogo/config.js`, `catalogo/util.js`; Test `catalogo/tests/orders.test.mjs`, `catalogo/tests/supabase.test.mjs`.

**Interfaces (Produces):**
- `orders.js`: `STATUS`, `flow(type)`, `nextStatus(status,type)`, `nextLabel(status)`, `isActive(status)`, `customerMessage(status,type)`, `progress(status,type)`, `validateOrderForm(form,{tables})`, `buildCreateOrderArgs({lines,total,customer})`, `minutesAgo(iso,nowMs)`.
- `supabase.js`: `createSupabase({url,key,fetch,now,storage})` → `{rpc, signIn, signOut, getSession, select, update}`.
- `util.js`: `esc(text)`, `$(id)`.

- [ ] Escribir tests que fallan (flujos y transiciones, validación mesa/domicilio, args del RPC, `rpc` con cabeceras correctas, error legible, `signIn` + token de usuario en `select`, renovación de token vencido, `update` PATCH con filtro).
- [ ] Ver el fallo, implementar, ver todo en verde con `node --test catalogo/tests/*.test.mjs`.
- [ ] Commit.

### Task 2: Esquema SQL

**Files:** Create `catalogo/supabase/schema.sql`, `catalogo/supabase/README.md` (pasos para el usuario).

- [ ] Tabla `orders` con checks (mesa/domicilio, estados), `admins`, `is_admin()`, RLS, RPC `create_order`/`get_order_status` (security definer, `search_path` fijo), permisos mínimos (admin solo actualiza `status`), trigger `updated_at`.
- [ ] Revisar que anon no tenga acceso directo a `orders`. Commit.

### Task 3: Catálogo conectado

**Files:** Modify `catalogo/index.html`, `catalogo/app.js`, `catalogo/styles.css`, `catalogo/menu.js` (`BUSINESS.tables`), `catalogo/cart.js` (quitar WhatsApp).

- [ ] Formulario con mesa/domicilio, envío por RPC, carrito se vacía solo si el envío fue bien, anti doble clic, panel de seguimiento con pasos y sondeo, aviso persistente del pedido activo.
- [ ] Playwright con Supabase simulado. Commit.

### Task 4: Panel admin

**Files:** Create `catalogo/admin.html`, `catalogo/admin.js`, `catalogo/admin.css`.

- [ ] Login, tablero por estado, botón principal por pedido (Confirmar / A cocina / Listo / Despachar / Entregado), cancelar con confirmación, sonido y contador en el título para pedidos nuevos, filtros Activos/Historial, sondeo cada 5 s, escape de HTML.
- [ ] Playwright: login, llega un pedido nuevo, flujo completo hasta entregado, el cliente ve cada estado. Commit.

### Task 5: Versiones de un solo archivo y cierre

- [ ] `catalogo/build.py` genera `catalogo/dist/catalogo.html` y `catalogo/dist/admin.html`; probar ambos por `file://`.
- [ ] Revisión, verificación, push.
