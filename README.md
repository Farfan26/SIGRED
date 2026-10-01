# SIGRED · Sistema web de Gestión y Reserva de Espacios Deportivos

Proyecto frontend navegable basado en las pantallas y funcionalidades del documento entregado.

## Pantallas
P01 Login
P02 Recuperar contraseña
P03 Consulta de disponibilidad
P04 Detalle del espacio
P05 Solicitud de reserva
P06 Confirmación
P07 Mis reservas
P08 Detalle y cancelación
P09 Mi perfil
P10 Panel de administración
P11 Solicitudes pendientes
P12 Gestión de espacios
P13 Bloqueos de horario
P14 Historial y reportes

## Cómo probarlo
- Abre `index.html` o publica la carpeta en Netlify.
- Para demo:
  - estudiante@udep.edu.pe / 123456
  - docente@udep.edu.pe / 123456
  - admin@udep.edu.pe / admin123

Los datos de la demo se guardan en localStorage del navegador.

## Netlify
No requiere build ni Node para esta versión frontend. Arrastra la carpeta a Netlify Drop o conéctala a un repositorio.
`index.html` redirige al login.

## Backend gratuito opcional
En `backend_apps_script/` está el backend base para Google Sheets mediante Google Apps Script.
La versión entregada usa localStorage por defecto para que el prototipo sea inmediatamente funcional.
Para conectar Sheets, publica el Apps Script como Web App y configura `SIGRED_API_URL`.

## Nota de arquitectura
El documento propone como arquitectura final una aplicación por capas con HTML5/CSS3/JavaScript, API REST Node.js/Express, PostgreSQL y SMTP. La integración con Google Sheets se incluye aquí como alternativa gratuita para prototipado/validación, no como sustituto de la arquitectura propuesta para producción.
