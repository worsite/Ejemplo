# Puesta en marcha de Supabase (una sola vez)

1. En tu proyecto de Supabase abre **SQL Editor → New query**, pega todo `schema.sql` y pulsa **Run**. Es todo lo que hace falta: crea las tablas, las reglas de seguridad y registra la clave del panel. (Se puede ejecutar varias veces, y actualiza solo desde versiones anteriores sin perder pedidos.)
2. Abre `admin.html`: **entra directo, sin correo, contraseña ni enlace especial.**
3. Haz un pedido de prueba desde el catálogo y mira que aparezca en el panel.

## Importante sobre el acceso directo
- La clave del panel (`ADMIN_KEY`) está dentro de `config.js` y, por tanto, dentro de `admin.html`. **Cualquiera que abra `admin.html` entra al panel y ve nombres, teléfonos y direcciones de los clientes.** Por eso conviene:
  - No publicar ni enlazar `admin.html` desde el catálogo ni redes sociales.
  - Guardarlo con un nombre difícil de adivinar (por ejemplo `panel-7k2x9.html`) y compartir la dirección solo con el personal.
- La base **sigue protegida por dentro**: las tablas no se pueden leer ni escribir directamente (ni con la clave pública del proyecto); solo se puede entrar por las funciones del panel con `ADMIN_KEY`, o crear pedidos y consultar el estado de uno por su identificador.
- Si algún día quieres cerrar el acceso, hay dos caminos: (a) cambiar la clave: genera una nueva, ponla en `config.js`, agrega su huella `sha256` al paso 6 de `schema.sql`, bórra la anterior y vuelve a publicar; (b) pedir que se reactive el acceso con correo y contraseña.

## Archivos para publicar
- Versión modular: la carpeta `catalogo/` (`index.html` = catálogo, `admin.html` = panel). Necesita un servidor web (cualquier hosting estático sirve).
- Versión de un solo archivo: `python3 catalogo/build.py` genera `catalogo/dist/catalogo.html` y `catalogo/dist/admin.html`.
- Pruebas: `node --test catalogo/tests/*.test.mjs`.

## Límites conocidos
- No hay límite de pedidos por minuto: si recibes spam, activa CAPTCHA/limitación en Supabase.
- Los precios los manda el catálogo; la base solo verifica que el total coincida con los productos enviados.
- El panel se actualiza cada 5 segundos (consulta periódica), no por websockets.
