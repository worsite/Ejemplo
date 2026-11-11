# Puesta en marcha de Supabase (una sola vez)

1. **Crear las tablas y reglas.** En tu proyecto de Supabase abre **SQL Editor → New query**, pega todo `schema.sql` y pulsa **Run**. (Si ya habías ejecutado la versión anterior con correo y contraseña, se actualiza sola: elimina lo viejo y no pierde pedidos.)
2. **Crear tu enlace privado del panel.** Al final de `schema.sql` hay un bloque comentado (paso 6). Quítale los `-- `, **ejecuta solo ese bloque** y te devuelve una fila `tu_enlace_privado` con algo como `admin.html#k=3f9a…`. Cópialo y guárdalo: es la única vez que se muestra (en la base solo queda su huella, no la clave).
3. **Entrar.** Abre `admin.html` **con ese enlace completo** una vez en cada dispositivo (celular de la caja, tablet de la cocina…). Desde ahí basta con abrir `admin.html` (o guardarlo como favorito): entra directo, sin correo ni contraseña.
4. Haz un pedido de prueba desde el catálogo y mira que aparezca en el panel.

## Cómo está protegido
- El panel **no tiene contraseña, pero sí una clave larga (64 caracteres) dentro del enlace**. Quien no tenga el enlace no ve ni cambia nada: la base exige la clave en cada consulta y, si es incorrecta, responde "No autorizado" tras 1 segundo.
- **Trata el enlace como una contraseña**: no lo publiques ni lo pegues en grupos abiertos. Si se filtra o se pierde un equipo, borra la fila de `admin_keys` y genera un enlace nuevo (paso 2); los equipos con el enlace viejo quedan bloqueados solos.
- Las tablas no se pueden leer ni escribir directamente: el público solo puede llamar a `create_order` y `get_order_status` (que devuelve únicamente el estado de **un** pedido si conoces su identificador UUID).
- La base recalcula que el total coincida con los productos enviados. Los **precios** los envía el catálogo; si quieres blindarlos del todo, el siguiente paso es guardar los productos en una tabla y leer los precios desde ahí.

## Archivos para publicar
- Versión modular: la carpeta `catalogo/` (`index.html` = catálogo, `admin.html` = panel). Necesita un servidor web (cualquier hosting estático sirve).
- Versión de un solo archivo: `python3 catalogo/build.py` genera `catalogo/dist/catalogo.html` y `catalogo/dist/admin.html`, que se abren con doble clic o se suben a cualquier hosting.
- Pruebas: `node --test catalogo/tests/*.test.mjs`.

## Límites conocidos
- No hay límite de pedidos por minuto: si recibes spam, activa CAPTCHA/limitación en Supabase o pide ayuda para añadirlo.
- Los precios los manda el catálogo (ver arriba).
- El panel se actualiza cada 5 segundos (consulta periódica), no por websockets.
