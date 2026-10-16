# SETUP RÁPIDO DEL BACKEND

1. Crea un Google Sheet: `SIGRED_DB`.
2. Extensiones → Apps Script.
3. Pega el contenido completo de `Code.gs`.
4. Ejecuta `setupSIGRED()` una vez.
5. Autoriza los permisos solicitados.
6. Publica como **Aplicación web**.
7. Copia la URL que termina en `/exec`.
8. Pégala en `js/config.js` o en Panel → Conexión backend.
9. Cuando tengas URL pública de Netlify, ejecuta:

```javascript
setFrontendUrl('https://TU-SITIO.netlify.app')
```

10. Para desactivar el token visible de recuperación usado durante pruebas:

```javascript
setDebugReset(false)
```

Administrador creado por `setupSIGRED()`:

- `admin@udep.edu.pe`
- `SigredAdmin2026!`

Consulta la guía completa en `docs/GUIA_GOOGLE_SHEETS_Y_NETLIFY.md`.
