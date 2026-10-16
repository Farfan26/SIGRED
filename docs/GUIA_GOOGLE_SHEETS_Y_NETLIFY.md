# Guía paso a paso · SIGRED + Google Sheets + Google Apps Script + Netlify

## 1. Probar primero en modo DEMO

1. Descomprime el ZIP.
2. Abre `index.html`.
3. SIGRED redirige a `P01-login.html`.
4. Ingresa con una credencial DEMO del archivo `CREDENCIALES.txt`.
5. Prueba disponibilidad, solicitudes, reservas, panel administrador, espacios, bloqueos y reportes.

En DEMO los datos quedan en `localStorage` del navegador. Esto permite presentar el prototipo sin depender de Internet ni de una base externa.

---

## 2. Crear la base en Google Sheets

1. Ingresa a Google Drive con la cuenta que administrará el prototipo.
2. Crea una hoja de cálculo nueva llamada, por ejemplo, **SIGRED_DB**.
3. Dentro de esa hoja ve a **Extensiones → Apps Script**.
4. Borra el código que aparece en `Code.gs`.
5. Abre en este proyecto `backend_apps_script/Code.gs`.
6. Copia **todo** su contenido y pégalo en Apps Script.
7. Guarda el proyecto con el nombre **SIGRED Backend**.
8. En el selector de funciones elige `setupSIGRED`.
9. Pulsa **Ejecutar**.
10. Google solicitará autorización la primera vez. Autoriza el acceso a la hoja y al envío de correos.

Al terminar, `setupSIGRED()` crea automáticamente estas pestañas:

- `usuarios`
- `espacios`
- `reservas`
- `bloqueos`
- `historial`
- `sesiones`
- `recuperacion`
- `notificaciones`

También crea dos espacios iniciales y la cuenta administrador.

### Credencial inicial del backend

- Correo: `admin@udep.edu.pe`
- Contraseña: `SigredAdmin2026!`

**Recomendación:** inicia sesión y cambia esa contraseña inmediatamente.

---

## 3. Configurar la URL del frontend para recuperar contraseñas

Cuando ya tengas tu web publicada en Netlify, vuelve a Apps Script y ejecuta manualmente:

```javascript
setFrontendUrl('https://TU-SITIO.netlify.app')
```

Ejemplo:

```javascript
setFrontendUrl('https://sigred-udep.netlify.app')
```

Mientras haces pruebas, `SIGRED_DEBUG_RESET` está activo y el frontend puede mostrar un enlace de recuperación de prueba. Antes de una demostración con datos reales ejecuta:

```javascript
setDebugReset(false)
```

El backend enviará el enlace por correo usando `MailApp`.

---

## 4. Publicar el backend como Web App

1. En Apps Script pulsa **Implementar → Nueva implementación**.
2. En **Seleccionar tipo**, elige **Aplicación web**.
3. Descripción: `SIGRED Backend v1`.
4. **Ejecutar como:** tu cuenta.
5. **Quién tiene acceso:** para un prototipo académico, selecciona una opción que permita que el frontend pueda invocar la Web App. La disponibilidad exacta depende de la política de tu cuenta Google/Workspace.
6. Pulsa **Implementar**.
7. Copia la URL que termina en `/exec`.

Cada vez que modifiques `Code.gs`, crea una nueva versión/implementación o edita la implementación existente para usar la versión nueva.

---

## 5. Conectar el frontend con el backend

Tienes dos formas.

### Opción A · Desde el archivo de configuración

Abre `js/config.js` y cambia:

```javascript
API_URL: "",
```

por:

```javascript
API_URL: "https://script.google.com/macros/s/TU_ID/exec",
```

Guarda el archivo y vuelve a publicar la web.

### Opción B · Desde SIGRED

1. Ingresa como administrador.
2. Abre **Panel**.
3. Pulsa **Conexión backend**.
4. Pega la URL `/exec`.
5. Pulsa **Guardar y probar**.
6. Si la prueba es correcta, el panel mostrará **Google Sheets conectado**.

La opción B guarda la URL en `localStorage` del navegador. Para una entrega fija conviene también dejarla en `js/config.js`.

---

## 6. Publicar en Netlify

### Método sencillo

1. Entra a Netlify.
2. Usa la opción de despliegue manual / arrastrar y soltar.
3. Arrastra la carpeta `SIGRED_Profesional` completa, no solo los HTML.
4. Espera a que finalice la publicación.
5. Abre la URL asignada por Netlify.
6. Comprueba que carguen `assets/`, `css/` y `js/`.

### Con GitHub

1. Crea un repositorio.
2. Sube todos los archivos del proyecto.
3. Conecta el repositorio a Netlify.
4. No necesitas build command: es HTML/CSS/JS estático.
5. Directorio de publicación: raíz del proyecto.

---

## 7. Crear cuentas

Desde `P00-crear-cuenta.html` se puede crear una cuenta de:

- Estudiante
- Docente
- Administrativo

Por seguridad, el rol `ADMIN_DEPORTES` **no se puede autoasignar** desde el formulario público.

Las cuentas requieren correo con dominio `@udep.edu.pe`. Puedes cambiar el dominio del prototipo ejecutando en Apps Script:

```javascript
setEmailDomain('udep.edu.pe')
```

Para crear un segundo administrador, la opción recomendada para el prototipo es registrar al usuario y luego modificar su columna `role` en la pestaña `usuarios` a `ADMIN_DEPORTES`. En una versión productiva esta operación debería realizarse desde un módulo de administración protegido.

---

## 8. Cambiar contraseña

1. Inicia sesión.
2. Ve a **Mi perfil**.
3. Pulsa **Cambiar contraseña**.
4. Escribe la contraseña actual.
5. Escribe la nueva contraseña dos veces.
6. SIGRED actualiza el hash en la hoja `usuarios`.

La contraseña no se almacena en texto plano: el backend guarda un valor derivado mediante HMAC-SHA256 iterativo con sal individual y un secreto del proyecto almacenado en Script Properties.

---

## 9. Recuperar contraseña

1. Desde el login pulsa **¿Olvidaste tu contraseña?**.
2. Escribe el correo institucional.
3. El backend genera un token temporal de 30 minutos.
4. Si `SIGRED_FRONTEND_URL` está configurado, Apps Script envía un correo con el enlace.
5. El usuario abre `P02-restablecer.html?token=...`.
6. Define una contraseña nueva.
7. El token queda invalidado y se eliminan las sesiones anteriores.

---

## 10. Flujo de reservas implementado

1. Usuario inicia sesión.
2. Consulta el calendario semanal.
3. Selecciona una franja **Libre**.
4. Revisa el detalle del espacio.
5. Completa fecha, horario, disciplina, participantes y finalidad.
6. El backend valida:
   - estado operativo del espacio;
   - disciplina permitida;
   - capacidad;
   - horario de atención;
   - cruces con reservas pendientes/confirmadas;
   - cruces con bloqueos.
7. Se crea una solicitud `PENDIENTE`.
8. El administrador la aprueba o rechaza.
9. Se registra el cambio en `historial`.
10. Se intenta enviar una notificación por correo.
11. El usuario consulta el resultado en **Mis reservas**.

El backend de Google Sheets utiliza `LockService` al crear y resolver reservas para reducir el riesgo de que dos solicitudes simultáneas ocupen la misma franja durante el prototipo.

---

## 11. Gestión de espacios

En **Administrador → Espacios** puedes:

- crear un espacio;
- editar nombre, ubicación y dimensiones;
- definir capacidad;
- definir disciplinas;
- definir horario de atención;
- editar reglas de uso;
- marcar `DISPONIBLE`, `NO_DISPONIBLE` o `MANTENIMIENTO`.

Un espacio en mantenimiento/no disponible aparece bloqueado para las reservas.

---

## 12. Bloqueos

En **Administrador → Bloqueos** puedes registrar:

- mantenimiento;
- actividad institucional;
- otro motivo.

Se valida que el bloqueo no se cree encima de una reserva activa. El bloqueo aparece en el calendario como **Bloqueado**.

---

## 13. Reportes

En **Administrador → Reportes** puedes filtrar por:

- espacio;
- fecha desde;
- fecha hasta.

Se muestran KPI, distribución de uso por espacio y tabla de reservas.

---

## 14. Seguridad y alcance real

Este backend es adecuado para **prototipado y validación académica**. La arquitectura del Informe Parcial 3 plantea para producción:

- API REST;
- autenticación por token;
- contraseña con hash;
- HTTPS;
- lógica de negocio separada;
- base de datos relacional PostgreSQL;
- restricciones/transacciones para integridad y concurrencia.

Google Sheets no reemplaza esas capacidades a nivel institucional. Se ha usado aquí como alternativa gratuita y demostrable para conectar el prototipo a datos persistentes.

---

## 15. Solución de problemas

### La web sigue en modo DEMO

- Verifica que `API_URL` termine en `/exec`.
- Abre Panel → Conexión backend y prueba la URL.
- Comprueba que la implementación de Apps Script esté activa.

### Dice “Sesión no válida”

- Cierra sesión y vuelve a entrar.
- Las sesiones del backend tienen duración limitada.

### No llega el correo de recuperación

- Ejecuta `setFrontendUrl(...)`.
- Revisa permisos de MailApp.
- Verifica que el correo de la cuenta exista.
- Revisa el límite diario de envío de Apps Script/Google Workspace.

### Cambié Code.gs pero la web usa el código anterior

- Actualiza la implementación de la Web App a la nueva versión.

### Netlify no carga imágenes/CSS

- Asegúrate de haber subido la carpeta completa y mantener la estructura:
  - `assets/`
  - `css/`
  - `js/`
  - archivos `.html`
