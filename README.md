# SIGRED – Prototipo funcional (HTML + JavaScript + Google Sheets)

Sistema de reservas de espacios deportivos con login por roles. Gratis: Netlify + Google Sheets/Apps Script.

## 1. Probar en local (VS Code)
1. Abre la carpeta en VS Code, instala la extensión **Live Server** y pulsa "Go Live" sobre `index.html`.
2. Por defecto funciona en **MODO DEMO** (datos en el navegador, sin configurar nada).

## 2. Cuentas de prueba
| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | estudiante@udep.edu.pe | Estudiante2026 |
| Docente | docente@udep.edu.pe | Docente2026 |
| Administrador | admin@udep.edu.pe | Admin2026 |

Tareas de validación (Tabla 5.8): T1 consultar disponibilidad · T2 solicitar una franja libre · T3 ver y cancelar la reserva · T4 aprobar (admin) · T5 bloquear un espacio (admin).
Para reiniciar los datos demo: borra `sigred_db` en DevTools > Application > Local Storage.

## 3. Poner tu logo
Reemplaza `assets/logo.svg` (o sube `assets/logo.png` y cambia `LOGO` en `js/config.js`).

## 4. Conectar Google Sheets (backend real y compartido)
1. Crea una Hoja de cálculo de Google > Extensiones > Apps Script. Pega `backend/Code.gs`.
2. Ejecuta `setup()` una vez (acepta permisos). Crea las hojas y los usuarios/espacios iniciales.
3. Implementar > Nueva implementación > Aplicación web: ejecutar como **Yo**, acceso **Cualquier persona**.
4. Copia la URL `.../exec` en `API_URL` de `js/config.js`. Si cambias `Code.gs`, crea una nueva versión de la implementación.

## 5. Publicar en Netlify
Entra a app.netlify.com/drop y arrastra esta carpeta (o conecta un repositorio de GitHub). Comparte la URL con los evaluadores.

## Estructura
`index.html` (login y contenedores) · `css/styles.css` · `js/config.js` (logo, URL) · `js/api.js` (datos: demo y remoto) · `js/app.js` (pantallas) · `backend/Code.gs` (API sobre Sheets).

## Alcance y límites
- Incluye: login por rol (P01), disponibilidad (P03/P04), solicitud y confirmación (P05/P06), mis reservas y cancelación (P07/P08), solicitudes pendientes (P11), bloqueos (P13), reglas de negocio y sin cruces de horario (con `LockService`).
- No incluido: recuperar contraseña (P02), perfil (P09), gestión de espacios (P12 – se editan en la hoja `espacio`), reportes (P14 – el historial se guarda en la hoja `historial`), envío de correos (hay una línea comentada con `MailApp`).
- Modelo simplificado a 5 hojas (usuario, espacio, reserva, bloqueo, historial) frente a las 10 tablas del diseño.
- Seguridad de prototipo: contraseñas con hash SHA-256 y token de sesión, pero sin sal ni límite de intentos. No usar con datos reales.
