# SIGRED v5 · Validación técnica del paquete

Antes de empaquetar esta entrega se realizaron las siguientes comprobaciones sobre el código fuente:

- Sintaxis de `js/config.js`: correcta.
- Sintaxis de `js/api.js`: correcta.
- Sintaxis de `js/app.js`: correcta.
- Sintaxis JavaScript de `backend_apps_script/Code.gs`: correcta.
- Estructura JSON de `backend_apps_script/appsscript.json`: correcta.
- Parseo de `css/styles.css`: sin errores de sintaxis detectados.
- Las 18 páginas HTML incluyen etiqueta `viewport`.
- Todas las pantallas P00–P15 referencian `config.js`, `api.js` y `app.js` en el orden correcto.
- Las claves `data-page` de los HTML tienen una ruta correspondiente en `app.js`.
- No se detectaron referencias locales faltantes en los HTML.

## Breakpoints incluidos

- Escritorio grande: > 1180 px.
- Laptop / tablet horizontal: 960–1180 px.
- Tablet y móvil vertical: hasta 760 px.
- Móvil: hasta 520 px.
- Móvil pequeño: hasta 380 px.

## Comportamiento responsive destacado

- Menú lateral táctil en pantallas compactas.
- Tipografía con `clamp()` para escalado progresivo.
- Tarjetas de espacios de 3 columnas → 2 columnas → 1 columna.
- Calendario semanal de tabla para escritorio.
- Calendario por pestañas de día y franjas táctiles para móvil.
- Modales tipo panel inferior en móvil.
- Botones e inputs con dimensiones adecuadas para interacción táctil.
- Galería horizontal con `scroll-snap`.
- Respeto de `prefers-reduced-motion`.

> Las fotografías de UDEP se sirven desde URLs oficiales configuradas en `js/config.js`; se incluye un fallback local para evitar espacios vacíos si no hay conexión.
