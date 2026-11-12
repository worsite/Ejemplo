# Mamá Inés · puesta en marcha (una sola vez)

1. En tu proyecto de Supabase abre **SQL Editor → New query**, pega todo `schema.sql` y pulsa **Run**. Es todo lo que hace falta: crea las tablas, las reglas de seguridad, registra la clave del panel y carga los menús iniciales. Se puede ejecutar varias veces y actualiza solo desde versiones anteriores sin perder pedidos ni los menús que ya hayas editado.
2. Abre `admin.html`: **entra directo, sin correo ni contraseña.**
3. Ve a la pestaña **Menú de la semana**, revisa cada día y pulsa **Guardar menú**.
4. Haz un pedido de prueba desde el catálogo y mira que aparezca en el panel.

## Menú del día
- Cada día de la semana tiene su menú. El catálogo siempre muestra primero **el menú de hoy** (la fecha la decide el servidor, hora de Bogotá, así que no depende del reloj del celular). Los otros días se pueden ver, pero solo se puede pedir el de hoy.
- **Domingo y Viernes** salen de tus folletos. **Lunes, martes, miércoles, jueves y sábado son ejemplos** armados con los mismos platos y precios: edítalos o vacíalos desde el panel.
- Un menú se arma con **secciones** (por ejemplo "Sancocho de gallina", "Carnes", "Limonadas"). Cada sección puede tener un **precio** (la estrella amarilla, vale para todos sus platos) y una lista de **"incluye"** (por ejemplo "Sancocho de gallina", que el cliente puede quitar). Cada plato puede tener su propio precio, una lista **"qué lleva"** (el cliente desmarca lo que no quiere), una **elección** obligatoria (por ejemplo el sabor de la limonada) y una **imagen**.
- Al pedir un plato el cliente ve qué lleva, desmarca lo que no quiere, escoge si hay elección y puede escribir una nota. Eso le llega al panel en cada pedido ("Sin ensalada · poca sal").
- Los **precios los pone el servidor**: el catálogo solo manda qué plato y cuántos. Si cambias un precio mientras alguien tiene el catálogo abierto, su pedido se rechaza con un aviso y se actualiza el menú; su carrito no se pierde.

## Importante sobre el acceso directo
- La clave del panel (`ADMIN_KEY`) está dentro de `config.js` y, por tanto, dentro de `admin.html`. **Cualquiera que abra `admin.html` entra al panel, ve nombres, teléfonos y direcciones de los clientes y puede editar el menú.** Por eso conviene:
  - No publicar ni enlazar `admin.html` desde el catálogo ni redes sociales.
  - Guardarlo con un nombre difícil de adivinar (por ejemplo `panel-7k2x9.html`) y compartir la dirección solo con el personal.
- La base **sigue protegida por dentro**: las tablas no se pueden leer ni escribir directamente (ni con la clave pública del proyecto); solo se entra por las funciones del panel con `ADMIN_KEY`, o se crean pedidos y se consulta el estado de uno por su identificador.
- Para cambiar la clave: genera una nueva, ponla en `config.js`, agrega su huella `sha256` al paso 6 de `schema.sql`, borra la anterior de `admin_keys` y vuelve a publicar.

## Archivos para publicar
- Versión modular: la carpeta `catalogo/` (`index.html` = catálogo, `admin.html` = panel). Necesita un servidor web (cualquier hosting estático sirve).
- Versión de un solo archivo: `python3 catalogo/build.py` genera `catalogo/dist/catalogo.html` y `catalogo/dist/admin.html` (con el logo y las ilustraciones incrustados).
- Pruebas: `node --test catalogo/tests/*.test.mjs`.

## Límites conocidos
- Si dos personas editan el mismo día a la vez, gana quien guarde de último.
- No hay límite de pedidos por minuto: si recibes spam, activa CAPTCHA/limitación en Supabase.
- El panel y el catálogo se actualizan solos (pedidos cada 5 s, menús cada minuto), no por websockets.
- Las tipografías (Playfair Display, Yellowtail, Karla) se cargan de Google Fonts; sin internet se usa una letra parecida del sistema.
