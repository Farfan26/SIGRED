# SIGRED · Sistema web de Gestión y Reserva de Espacios Deportivos

**Versión v5 responsive** del prototipo SIGRED para la Universidad de Piura · Campus Piura.

La interfaz fue reforzada para funcionar con una sola base de código en **celular, tablet, laptop y PC**, e incorpora referencias visuales desde páginas oficiales de UDEP con un fallback local para trabajar sin conexión.

## Qué incluye

- Interfaz profesional y responsiva con tarjetas flotantes, sombras, microinteracciones y navegación adaptativa.
- Hero visual, tarjetas deportivas y galería con fotografías configurables desde `js/config.js`.
- Calendario dual: tabla semanal en escritorio y vista táctil por días en celulares.
- Menú lateral móvil, controles táctiles de al menos ~44 px, tipografía fluida y tarjetas ajustadas a cada breakpoint.
- Imágenes con lazy-loading, fallback local y animaciones compatibles con `prefers-reduced-motion`.
- Calendario semanal con estados **Libre / Ocupado / Pendiente / Bloqueado**.
- Flujo completo de reserva: consulta → detalle → solicitud → confirmación → seguimiento → cancelación.
- Perfiles: estudiante, docente, administrativo y administrador del Área de Deportes.
- Crear cuenta, inicio de sesión, recuperar contraseña, restablecer contraseña y cambiar contraseña.
- Panel de administración con KPI, solicitudes pendientes, gestión de espacios, bloqueos e historial/reportes.
- Modo DEMO funcional con `localStorage`.
- Backend opcional con Google Sheets + Google Apps Script, con sesiones, roles, hash iterativo de contraseñas, recuperación por correo, historial y bloqueo de concurrencia.

## Pantallas del Informe Parcial 3

- P01 Inicio de sesión
- P02 Recuperar contraseña
- P03 Consulta de disponibilidad
- P04 Detalle del espacio
- P05 Solicitud de reserva
- P06 Confirmación de solicitud
- P07 Mis reservas
- P08 Detalle y cancelación
- P09 Mi perfil
- P10 Panel de administración
- P11 Solicitudes pendientes
- P12 Gestión de espacios
- P13 Bloqueos de horario
- P14 Historial y reportes

### Extensiones solicitadas

- P00 Crear cuenta
- P02-restablecer Restablecimiento mediante token
- P15 Cambiar contraseña

## Probar sin backend

Abre `index.html` o publica la carpeta completa en Netlify. Si `API_URL` está vacío, SIGRED trabaja en modo DEMO.

### Credenciales DEMO local

| Perfil | Correo | Contraseña |
|---|---|---|
| Estudiante | estudiante@udep.edu.pe | 123456 |
| Docente | docente@udep.edu.pe | 123456 |
| Administrativo | administrativo@udep.edu.pe | 123456 |
| Administrador | admin@udep.edu.pe | admin123 |

## Personalizar diseño, imágenes y responsive

Lee `docs/GUIA_PERSONALIZACION_UI.md`. El código tiene comentarios por secciones para que puedas cambiar colores, tarjetas, imágenes, breakpoints, calendario, navegación y agregar nuevas páginas.

Las referencias de las imágenes UDEP están documentadas en `assets/IMAGENES_UDEP_FUENTES.md`.

## Conectar Google Sheets

Lee `docs/GUIA_GOOGLE_SHEETS_Y_NETLIFY.md` y `backend_apps_script/Code.gs`.

El script `setupSIGRED()` crea automáticamente todas las pestañas, encabezados, espacios iniciales y la cuenta del administrador.

**Credencial inicial del backend Google Sheets:**

- Correo: `admin@udep.edu.pe`
- Contraseña: `SigredAdmin2026!`

Cámbiala después del primer ingreso desde **Mi perfil / Cambiar contraseña**.

## Nota de arquitectura

El Informe Parcial 3 plantea para una eventual implementación productiva una arquitectura por capas con interfaz web, API REST y PostgreSQL. La integración con Google Sheets incluida en este ZIP es una alternativa de **prototipado y validación funcional**, no un reemplazo de PostgreSQL para un despliegue institucional definitivo.
