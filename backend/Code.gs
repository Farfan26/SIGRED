/**
 * SIGRED - Backend en Google Apps Script (gratis). Usa esta hoja de cálculo como base de datos.
 * PASOS: Hoja de cálculo > Extensiones > Apps Script > pega este archivo > ejecuta setup() una vez
 *        > Implementar > Nueva implementación > Aplicación web (ejecutar como: Yo; acceso: Cualquier persona)
 *        > copia la URL en js/config.js (API_URL).
 * Las reglas de negocio son las mismas que el modo demo (js/api.js).
 */
const HOJAS = {
  usuario:  ['id', 'rol', 'nombre', 'correo', 'hash', 'estado'],
  espacio:  ['id', 'nombre', 'capacidad', 'apertura', 'cierre', 'disciplinas', 'estado'],
  reserva:  ['id', 'usuario', 'solicitante', 'espacio', 'espacioNombre', 'fecha', 'inicio', 'fin', 'disciplina', 'participantes', 'finalidad', 'estado', 'obs'],
  bloqueo:  ['id', 'espacio', 'fecha', 'inicio', 'fin', 'motivo'],
  historial:['reserva', 'de', 'a', 'quien', 'cuando']
};
const ACTIVAS = ['PENDIENTE', 'CONFIRMADA'];

/** Crea las hojas y los datos iniciales. Ejecutar UNA vez desde el editor. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  for (const n in HOJAS) {
    const h = ss.getSheetByName(n) || ss.insertSheet(n);
    h.clear(); h.getRange(1, 1, 1, HOJAS[n].length).setValues([HOJAS[n]]).setFontWeight('bold');
    h.getRange(1, 1, 2000, HOJAS[n].length).setNumberFormat('@');   // texto plano: evita que Sheets convierta fechas
  }
  [[1, 'ESTUDIANTE', 'Ana Estudiante', 'estudiante@udep.edu.pe', 'Estudiante2026'],
   [2, 'DOCENTE', 'Luis Docente', 'docente@udep.edu.pe', 'Docente2026'],
   [3, 'ADMIN_DEPORTES', 'Admin Deportes', 'admin@udep.edu.pe', 'Admin2026']]
    .forEach(u => agregar('usuario', { id: u[0], rol: u[1], nombre: u[2], correo: u[3], hash: sha(u[4]), estado: 'ACTIVO' }));
  [[1, 'Plataforma multiusos', 40, 7, 22, 'Futsal,Básquet,Vóley'], [2, 'Cancha de fútbol', 30, 7, 20, 'Fútbol'], [3, 'Polideportivo', 60, 7, 22, 'Futsal,Básquet,Vóley']]
    .forEach(e => agregar('espacio', { id: e[0], nombre: e[1], capacidad: e[2], apertura: e[3], cierre: e[4], disciplinas: e[5], estado: 'DISPONIBLE' }));
}

/* ---------- Utilidades de hoja ---------- */
const sha = t => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t, Utilities.Charset.UTF_8)
  .map(b => ((b < 0 ? b + 256 : b)).toString(16).padStart(2, '0')).join('');
const hoja = n => SpreadsheetApp.getActive().getSheetByName(n);
function leer(n) { const v = hoja(n).getDataRange().getValues(), c = v.shift();
  return v.map(f => Object.fromEntries(c.map((k, i) => [k, f[i]]))); }
function agregar(n, o) { hoja(n).appendRow(HOJAS[n].map(k => o[k] ?? '')); }
function actualizar(n, id, cambios) {           // busca por id (columna A) y modifica campos
  const h = hoja(n), ids = h.getRange(1, 1, h.getLastRow(), 1).getValues().flat().map(String), fila = ids.indexOf(String(id)) + 1;
  for (const k in cambios) h.getRange(fila, HOJAS[n].indexOf(k) + 1).setValue(cambios[k]);
}
const num = r => ({ ...r, inicio: +r.inicio, fin: +r.fin, participantes: +r.participantes });
const cruza = (a, b) => String(a.fecha) === String(b.fecha) && +a.inicio < +b.fin && +a.fin > +b.inicio;

/* ---------- Punto de entrada ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();     // evita que dos solicitudes simultáneas reserven el mismo horario
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    return salida({ ok: true, data: ACCIONES[d.accion](d) });
  } catch (err) { return salida({ ok: false, error: String(err.message || err) }); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}
const salida = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
function usuarioDe(d) {                         // valida el token de sesión (guardado 6 h en caché)
  const id = CacheService.getScriptCache().get('tk_' + d.token);
  const u = id && leer('usuario').find(x => String(x.id) === id); if (!u) throw 'Sesión expirada'; return u;
}
const soloAdmin = u => { if (u.rol !== 'ADMIN_DEPORTES') throw 'Acceso solo para el administrador'; };
const hist = (r, de, a, u) => agregar('historial', { reserva: r.id, de, a, quien: u.nombre, cuando: new Date().toISOString() });

function validar(d) {                           // reglas de negocio (sección 5.4.5)
  const e = leer('espacio').find(x => String(x.id) === String(d.espacio)), n = { fecha: d.fecha, inicio: +d.inicio, fin: +d.fin };
  if (!e || e.estado !== 'DISPONIBLE') throw 'El espacio no está disponible';
  if (n.fin <= n.inicio) throw 'La hora de fin debe ser posterior a la de inicio';
  if (n.inicio < +e.apertura || n.fin > +e.cierre) throw 'Fuera del horario de atención';
  if (!String(e.disciplinas).split(',').includes(d.disciplina)) throw 'Disciplina no admitida en este espacio';
  if (!(+d.participantes > 0 && +d.participantes <= +e.capacidad)) throw 'Participantes: máximo ' + e.capacidad;
  if (leer('bloqueo').some(b => String(b.espacio) === String(e.id) && cruza(b, n))) throw 'El horario está bloqueado';
  if (leer('reserva').some(r => String(r.espacio) === String(e.id) && ACTIVAS.includes(r.estado) && cruza(r, n))) throw 'El horario se cruza con otra reserva';
  return e;
}

const ACCIONES = {
  login(d) {
    const u = leer('usuario').find(x => String(x.correo).toLowerCase() === d.correo.trim().toLowerCase());
    if (!u || u.estado !== 'ACTIVO' || u.hash !== sha(d.clave)) throw 'Correo o contraseña incorrectos';
    const tk = Utilities.getUuid(); CacheService.getScriptCache().put('tk_' + tk, String(u.id), 21600);
    return { token: tk, usuario: { nombre: u.nombre, rol: u.rol } };
  },
  espacios() { return leer('espacio').map(e => ({ ...e, id: +e.id, capacidad: +e.capacidad, apertura: +e.apertura, cierre: +e.cierre, disciplinas: String(e.disciplinas).split(',') })); },
  semana(d) { usuarioDe(d); const esp = String(d.espacio);
    return { reservas: leer('reserva').filter(r => String(r.espacio) === esp && ACTIVAS.includes(r.estado)).map(num),
             bloqueos: leer('bloqueo').filter(b => String(b.espacio) === esp).map(num) }; },
  reservar(d) { const u = usuarioDe(d), e = validar(d);
    const r = { id: Date.now(), usuario: u.id, solicitante: u.nombre, espacio: e.id, espacioNombre: e.nombre, fecha: d.fecha, inicio: +d.inicio, fin: +d.fin,
      disciplina: d.disciplina, participantes: +d.participantes, finalidad: d.finalidad || '', estado: 'PENDIENTE', obs: '' };
    agregar('reserva', r); hist(r, '', 'PENDIENTE', u); return r; },
  mis(d) { const u = usuarioDe(d); return leer('reserva').filter(r => String(r.usuario) === String(u.id)).map(num).reverse(); },
  cancelar(d) { const u = usuarioDe(d), r = leer('reserva').find(x => String(x.id) === String(d.id) && String(x.usuario) === String(u.id));
    if (!r || !ACTIVAS.includes(r.estado)) throw 'No se puede cancelar esta reserva';
    actualizar('reserva', r.id, { estado: 'CANCELADA' }); hist(r, r.estado, 'CANCELADA', u); return true; },
  pendientes(d) { soloAdmin(usuarioDe(d)); return leer('reserva').filter(r => r.estado === 'PENDIENTE').map(num); },
  resolver(d) { const u = usuarioDe(d); soloAdmin(u); const r = leer('reserva').find(x => String(x.id) === String(d.id) && x.estado === 'PENDIENTE');
    if (!r) throw 'Solicitud no encontrada'; actualizar('reserva', r.id, { estado: d.estado, obs: d.obs || '' }); hist(r, 'PENDIENTE', d.estado, u);
    // Opcional (gratis): notificar por correo -> MailApp.sendEmail(correoDelSolicitante, 'SIGRED', 'Su solicitud fue ' + d.estado);
    return true; },
  bloquear(d) { soloAdmin(usuarioDe(d)); if (+d.fin <= +d.inicio) throw 'La hora de fin debe ser posterior a la de inicio';
    agregar('bloqueo', { id: Date.now(), espacio: d.espacio, fecha: d.fecha, inicio: +d.inicio, fin: +d.fin, motivo: d.motivo || '' }); return true; }
};
