# SIGRED v5 · Guía de personalización visual y responsive

Esta guía sirve para editar el proyecto sin tener que volver a construirlo desde cero. La versión v5 separa la configuración, la lógica y los estilos para que los cambios más comunes sean sencillos.

## 1. Archivos que editarás con mayor frecuencia

| Archivo | Para qué sirve |
|---|---|
| `js/config.js` | URL del backend, imágenes institucionales y horario global del calendario. |
| `css/styles.css` | Colores, tamaños, tarjetas, responsive, menú móvil y animaciones. |
| `js/app.js` | Contenido dinámico de pantallas, calendario, formularios y navegación. |
| `js/api.js` | Modo DEMO, datos iniciales y comunicación con Google Apps Script. |
| `backend_apps_script/Code.gs` | Backend de Google Sheets: usuarios, sesiones, reservas, espacios, bloqueos, reportes y recuperación. |

> Consejo: antes de modificar, crea una copia del ZIP. Haz un cambio por vez y prueba en PC y en el modo responsive del navegador.

---

## 2. Cambiar fotografías sin tocar la lógica

Abre `js/config.js` y busca:

```js
UDEP_MEDIA: {
  campusPiura: "...",
  gobiernoPiura: "...",
  edificioEPiura: "...",
  futbolCampus: "...",
  polideportivoExterior: "...",
  polideportivoInterior: "..."
}
```

Solo sustituye la URL. Las pantallas que usen esa clave mostrarán automáticamente la nueva imagen.

### Fallback local

Si una fotografía remota no carga, el sistema usa automáticamente:

```text
assets/deportes-udep.jpg
```

Esto evita tarjetas rotas cuando no hay Internet.

### Imagen específica por espacio

En **Administrador → Espacios → Editar espacio** existe el campo **URL de imagen**. Puedes pegar una URL distinta para cada espacio. Ese dato se guarda en DEMO o en Google Sheets, según el backend activo.

---

## 3. Cambiar los colores principales

Abre `css/styles.css`. Al final encontrarás la sección:

```css
/* SIGRED v5 · CAPA VISUAL RESPONSIVE / UDEP */
```

Dentro de `:root` están las variables principales:

```css
:root {
  --navy: #002856;   /* azul secundario UDEP */
  --blue: #00467a;  /* azul institucional UDEP */
  --blue-2: #005cb9;/* azul secundario UDEP */
  --cyan: #2b86c5;
  --ink: #172638;
  --muted: #64758a;
  --surface: #ffffff;
}
```

La paleta entregada toma como referencia la guía oficial de colores de UDEP: azul institucional `#00467A` y azules secundarios `#002856` y `#005CB9`. Para cambiar toda la identidad visual, modifica primero estas variables en lugar de buscar color por color.

Los colores del calendario deben conservar una lectura inequívoca:

- Verde: libre / confirmada.
- Rojo: ocupado / rechazado / cancelado.
- Amarillo: pendiente.
- Gris: bloqueado / mantenimiento.

El texto acompaña siempre al color para que el estado no dependa solo de la percepción cromática.

---

## 4. Editar tarjetas

Busca en `css/styles.css`:

```css
/* COMPONENTE: TARJETAS */
```

Las clases principales son:

```css
.card            /* tarjeta general */
.card.floating   /* elevación al pasar el puntero */
.space-card      /* tarjeta de espacio deportivo */
.space-media     /* fotografía */
.space-body      /* contenido */
.space-card-action /* enlace visual al calendario */
```

Ejemplo: para hacer las tarjetas menos redondeadas:

```css
:root {
  --radius: 16px;
}
```

Para aumentar o disminuir la imagen de las tarjetas:

```css
.space-media {
  height: 200px;
}
```

La versión entregada usa `clamp(...)` para que el alto cambie progresivamente según el ancho de la pantalla.

---

## 5. Responsive: celular, tablet, laptop y PC

La versión v5 utiliza cuatro zonas de adaptación:

- **Más de 1180 px:** escritorio / PC grande.
- **960–1180 px:** laptop y tablet horizontal.
- **520–760 px:** tablet vertical y celular.
- **Hasta 520 px:** celular.
- **Hasta 380 px:** celular pequeño.

Busca al final del CSS:

```css
/* BREAKPOINTS */
```

### Ejemplo de cambio solo para celular

```css
@media (max-width: 520px) {
  .space-media {
    height: 165px;
  }
}
```

No necesitas duplicar la página HTML. El mismo código se adapta mediante CSS y JavaScript.

---

## 6. Calendario especial para móvil

En escritorio, SIGRED muestra el calendario semanal completo como tabla. En pantallas de hasta 760 px cambia automáticamente a una interfaz móvil por días.

En `js/app.js`, busca:

```js
function renderCalendar(...)
```

La función genera dos vistas:

```text
.calendar-desktop-view
.calendar-mobile-view
```

El CSS decide cuál mostrar. En móvil, el usuario toca el día y después ve franjas horarias grandes, diseñadas para uso táctil.

Si quieres cambiar el rango horario, edita `js/config.js`:

```js
CALENDAR_START_HOUR: 7,
CALENDAR_END_HOUR: 22,
```

---

## 7. Menú móvil

En pantallas pequeñas, el menú superior se transforma en un panel lateral. La lógica está en `shell()` dentro de `js/app.js`.

Clases relacionadas:

```text
.mobile-toggle
.nav.open
.nav-scrim
```

El panel puede cerrarse:

- tocando el fondo oscuro;
- seleccionando una opción;
- presionando `Esc` con teclado.

---

## 8. Cambiar textos de una pantalla

Las pantallas son envoltorios HTML muy ligeros. El contenido dinámico está en `js/app.js`.

Ejemplos:

```js
availabilityPage()     // P03
spaceDetailPage()      // P04
reservationPage()      // P05
myReservationsPage()   // P07
profilePage()          // P09
adminPage()            // P10
requestsPage()         // P11
spacesPage()           // P12
blocksPage()           // P13
reportsPage()          // P14
```

Busca el texto exacto con `Ctrl + F` y edítalo.

---

## 9. Agregar una nueva página

### Paso 1
Copia una pantalla existente, por ejemplo `P14-reportes.html`.

### Paso 2
Cambia en el `body`:

```html
<body data-page="reports">
```

por una nueva clave, por ejemplo:

```html
<body data-page="statistics">
```

### Paso 3
En `js/app.js` crea:

```js
async function statisticsPage() {
  if (!requireAuth(true)) return;

  shell(
    "Estadísticas",
    "Descripción de la nueva pantalla.",
    "statistics"
  );

  $("#mainContent").innerHTML = `
    <article class="card">
      <h2>Nueva pantalla</h2>
      <p>Contenido.</p>
    </article>
  `;
}
```

### Paso 4
Añádela al objeto `routes`:

```js
statistics: statisticsPage
```

### Paso 5
Añade el enlace deseado en `navItems()`.

---

## 10. Agregar otro espacio deportivo

Puedes hacerlo sin editar código:

1. Inicia sesión como administrador.
2. Entra a **Espacios**.
3. Pulsa **Nuevo espacio**.
4. Completa nombre, capacidad, estado, ubicación, dimensiones, horario, disciplinas, imagen y reglas.
5. Guarda.

En modo Google Sheets se almacena en la pestaña `espacios`.

---

## 11. Animaciones y rendimiento

Las animaciones se aplican con `IntersectionObserver`, por lo que los elementos se revelan solo cuando aparecen en pantalla. Las imágenes usan:

```html
loading="lazy"
decoding="async"
```

Esto reduce carga inicial.

Además, el proyecto respeta:

```css
@media (prefers-reduced-motion: reduce)
```

para usuarios que prefieren menos movimiento.

---

## 12. Antes de publicar

Prueba al menos estos anchos desde DevTools del navegador:

- 360 × 800 px
- 390 × 844 px
- 768 × 1024 px
- 1024 × 768 px
- 1366 × 768 px
- 1920 × 1080 px

Y verifica:

1. Inicio de sesión.
2. Menú móvil.
3. Tarjetas de espacios.
4. Calendario de escritorio.
5. Calendario por días en móvil.
6. Registro de reserva.
7. Mis reservas.
8. Panel administrador.
9. Aprobar / rechazar.
10. Crear espacio y bloqueo.
11. Reportes.
12. Cambio y recuperación de contraseña.

---

## 13. Publicación en Netlify

Sube **toda la carpeta** del proyecto, no solo `index.html`. Deben quedar juntos `css/`, `js/`, `assets/` y todas las páginas `Pxx-*.html`.

Para conectar el backend real, pega la Web App de Apps Script en `API_URL` de `js/config.js` o usa el botón **Conexión backend** del panel del administrador.

Consulta también `GUIA_GOOGLE_SHEETS_Y_NETLIFY.md`.
