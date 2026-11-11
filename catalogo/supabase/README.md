# Puesta en marcha de Supabase (una sola vez)

1. **Crear las tablas y reglas.** En tu proyecto de Supabase abre **SQL Editor → New query**, pega todo `schema.sql` y pulsa **Run**.
2. **Crear tu usuario administrador.** **Authentication → Users → Add user → Create new user**: correo y contraseña (marca *Auto Confirm User*).
3. **Autorizarlo como admin.** En el SQL Editor ejecuta (con tu correo):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu-correo@ejemplo.com'
   on conflict do nothing;
   ```
4. **Recomendado:** en **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up*, para que nadie más pueda crear cuentas.
5. Abre `admin.html`, entra con ese correo y contraseña, y haz un pedido de prueba desde el catálogo.

## Cómo está protegido
- El cliente público solo usa la clave `anon` y solo puede llamar a `create_order` y `get_order_status` (que devuelve únicamente el estado de **un** pedido si conoces su identificador, un UUID imposible de adivinar). No puede listar ni leer pedidos.
- Para ver o cambiar pedidos hay que iniciar sesión **y** estar en la tabla `admins`. El admin solo puede modificar la columna `status`.
- La base recalcula que el total coincida con los productos enviados. Los **precios** los envía el catálogo; si algún día quieres blindarlos del todo, el siguiente paso es guardar los productos en una tabla y leer los precios desde ahí.

## Archivos para publicar
- Versión modular: la carpeta `catalogo/` (`index.html` = catálogo, `admin.html` = panel). Necesita un servidor web (cualquier hosting estático sirve).
- Versión de un solo archivo: `python3 catalogo/build.py` genera `catalogo/dist/catalogo.html` y `catalogo/dist/admin.html`, que se abren con doble clic o se suben a cualquier hosting.
- Pruebas: `node --test catalogo/tests/*.test.mjs`.

## Límites conocidos
- No hay límite de pedidos por minuto: si recibes spam, activa CAPTCHA/limitación en Supabase o pide ayuda para añadirlo.
- Los precios los manda el catálogo (ver arriba).
- El panel se actualiza cada 5 segundos (consulta periódica), no por websockets.
