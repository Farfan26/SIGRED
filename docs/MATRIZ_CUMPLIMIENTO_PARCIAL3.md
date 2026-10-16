# Matriz de cumplimiento · Informe Parcial 3

| Requisito del informe | Implementación en el prototipo |
|---|---|
| RF-01 Inicio de sesión institucional | P01 + acción `login` |
| RF-02 Recuperación de contraseña | P02 + P02-restablecer + token temporal + MailApp |
| RF-03 Control por roles | Navegación y endpoints diferenciados para usuario / administrador |
| RF-04 Alta/edición/estado de espacios | P12 |
| RF-05 Disciplinas, capacidad, ubicación y reglas | P12 + hoja `espacios` |
| RF-06 Calendario semanal con estados | P03 |
| RF-07 Bloqueos temporales | P13 |
| RF-08 Información de espacios | P04 |
| RF-09 Solicitud de reserva | P05 |
| RF-10 Validación de cruces/capacidad/horario/bloqueos | Frontend + backend Apps Script |
| RF-11 Próximas reservas e historial | P07 |
| RF-12 Cancelación antes del inicio | P08 |
| RF-13 Aprobar/rechazar con observación | P11 |
| RF-14 Notificación por correo | Apps Script `notifyReservation_` |
| RF-15 Trazabilidad | hoja `historial` |
| RF-16 Reportes por periodo y espacio | P14 |
| RNF-02 Hash de contraseñas | HMAC-SHA256 iterativo + salt + pepper (prototipo Sheets) |
| RNF-03 HTTPS | Netlify + URL HTTPS de Apps Script |
| RNF-06 Evitar duplicidad concurrente | validación de cruce + `LockService` en prototipo |
| RNF-09 Responsive | CSS para PC, tablet y móvil |
| RNF-10 Diseño centrado en usuario | navegación consistente, mensajes, estados por texto+color, prevención de errores |

## Aclaración técnica

La solución con Google Sheets sirve para demostrar el flujo y persistencia del prototipo. El Informe Parcial 3 propone PostgreSQL y una API REST para la arquitectura final; esa propuesta no ha sido sustituida.
