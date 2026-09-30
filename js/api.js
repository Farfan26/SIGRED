/* api.js - Capa de datos. Toda la app llama a api(accion, datos).
   - CONFIG.API_URL vacío  -> MODO DEMO: base de datos simulada en localStorage.
   - CONFIG.API_URL con URL -> MODO REAL: envía las acciones al Apps Script (Google Sheets). */
async function api(accion, datos = {}) {
  datos.token = sessionStorage.getItem('tk');
  if (!CONFIG.API_URL) return D[accion](datos);
  // text/plain evita el "preflight" CORS con Apps Script
  const r = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ accion, ...datos }) }).then(x => x.json());
  if (!r.ok) throw r.error;
  return r.data;
}

/* ---------- MODO DEMO ---------- */
const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))]
  .map(b => b.toString(16).padStart(2, '0')).join('');           // hash SHA-256 de la contraseña
const iso = d => d.toISOString().slice(0, 10);
function lunesDe(d = new Date()) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

async function bd() {                                            // lee (o crea) la BD simulada
  let db = JSON.parse(localStorage.getItem('sigred_db') || 'null');
  if (db) return db;
  const L = lunesDe(), dia = n => { const x = new Date(L); x.setDate(x.getDate() + n); return iso(x); };
  db = {
    usuarios: [
      { id: 1, rol: 'ESTUDIANTE', nombre: 'Ana Estudiante', correo: 'estudiante@udep.edu.pe', hash: await sha('Estudiante2026') },
      { id: 2, rol: 'DOCENTE', nombre: 'Luis Docente', correo: 'docente@udep.edu.pe', hash: await sha('Docente2026') },
      { id: 3, rol: 'ADMIN_DEPORTES', nombre: 'Admin Deportes', correo: 'admin@udep.edu.pe', hash: await sha('Admin2026') }],
    espacios: [   // Datos de ejemplo: reemplázalos por los oficiales del Área de Deportes
      { id: 1, nombre: 'Plataforma multiusos', capacidad: 40, apertura: 7, cierre: 22, disciplinas: ['Futsal', 'Básquet', 'Vóley'], estado: 'DISPONIBLE' },
      { id: 2, nombre: 'Cancha de fútbol', capacidad: 30, apertura: 7, cierre: 20, disciplinas: ['Fútbol'], estado: 'DISPONIBLE' },
      { id: 3, nombre: 'Polideportivo', capacidad: 60, apertura: 7, cierre: 22, disciplinas: ['Futsal', 'Básquet', 'Vóley'], estado: 'DISPONIBLE' }],
    reservas: [
      { id: 1, usuario: 2, solicitante: 'Luis Docente', espacio: 1, espacioNombre: 'Plataforma multiusos', fecha: dia(0), inicio: 8, fin: 10, disciplina: 'Vóley', participantes: 12, finalidad: 'Clase', estado: 'CONFIRMADA', obs: '' },
      { id: 2, usuario: 1, solicitante: 'Ana Estudiante', espacio: 1, espacioNombre: 'Plataforma multiusos', fecha: dia(2), inicio: 11, fin: 12, disciplina: 'Futsal', participantes: 10, finalidad: 'Club', estado: 'PENDIENTE', obs: '' }],
    bloqueos: [{ id: 1, espacio: 1, fecha: dia(3), inicio: 7, fin: 9, motivo: 'Mantenimiento' }], historial: []
  };
  return guardar(db);
}
const guardar = db => { localStorage.setItem('sigred_db', JSON.stringify(db)); return db; };
const yo = (db, d) => { const u = db.usuarios.find(x => 'demo-' + x.id === d.token); if (!u) throw 'Sesión expirada'; return u; };
const soloAdmin = u => { if (u.rol !== 'ADMIN_DEPORTES') throw 'Acceso solo para el administrador'; };
const cruza = (a, b) => a.fecha === b.fecha && a.inicio < b.fin && a.fin > b.inicio;   // ¿se solapan? (18-19 y 19-20 NO se solapan)

/* Reglas de negocio (sección 5.4.5). El Code.gs aplica las mismas en el servidor. */
function validar(db, d) {
  const e = db.espacios.find(x => x.id == d.espacio), n = { fecha: d.fecha, inicio: +d.inicio, fin: +d.fin };
  if (!e || e.estado !== 'DISPONIBLE') throw 'El espacio no está disponible';
  if (n.fin <= n.inicio) throw 'La hora de fin debe ser posterior a la de inicio';
  if (n.inicio < e.apertura || n.fin > e.cierre) throw `Fuera del horario de atención (${e.apertura}:00 a ${e.cierre}:00)`;
  if (new Date(d.fecha + 'T' + String(n.inicio).padStart(2, '0') + ':00') < new Date()) throw 'No se puede reservar en el pasado';
  if (!e.disciplinas.includes(d.disciplina)) throw 'Disciplina no admitida en este espacio';
  if (!(d.participantes > 0 && d.participantes <= e.capacidad)) throw `Participantes: máximo ${e.capacidad}`;
  if (db.bloqueos.some(b => b.espacio == e.id && cruza(b, n))) throw 'El horario está bloqueado';
  if (db.reservas.some(r => r.espacio == e.id && ['PENDIENTE', 'CONFIRMADA'].includes(r.estado) && cruza(r, n))) throw 'El horario se cruza con otra reserva';
  return e;
}

const D = {
  async login({ correo, clave }) {
    const db = await bd(), u = db.usuarios.find(x => x.correo === correo.trim().toLowerCase());
    if (!u || u.hash !== await sha(clave)) throw 'Correo o contraseña incorrectos';
    return { token: 'demo-' + u.id, usuario: { nombre: u.nombre, rol: u.rol } };
  },
  async espacios() { return (await bd()).espacios; },
  async semana(d) { const db = await bd(); yo(db, d);
    return { reservas: db.reservas.filter(r => r.espacio == d.espacio && ['PENDIENTE', 'CONFIRMADA'].includes(r.estado)), bloqueos: db.bloqueos.filter(b => b.espacio == d.espacio) }; },
  async reservar(d) { const db = await bd(), u = yo(db, d), e = validar(db, d);
    const r = { id: Date.now(), usuario: u.id, solicitante: u.nombre, espacio: e.id, espacioNombre: e.nombre, fecha: d.fecha, inicio: +d.inicio, fin: +d.fin,
      disciplina: d.disciplina, participantes: +d.participantes, finalidad: d.finalidad || '', estado: 'PENDIENTE', obs: '' };
    db.reservas.push(r); db.historial.push({ reserva: r.id, de: '', a: 'PENDIENTE', quien: u.nombre, cuando: new Date().toISOString() }); guardar(db); return r; },
  async mis(d) { const db = await bd(), u = yo(db, d); return db.reservas.filter(r => r.usuario === u.id).sort((a, b) => b.fecha.localeCompare(a.fecha)); },
  async cancelar(d) { const db = await bd(), u = yo(db, d), r = db.reservas.find(x => x.id == d.id && x.usuario === u.id);
    if (!r || !['PENDIENTE', 'CONFIRMADA'].includes(r.estado)) throw 'No se puede cancelar esta reserva';
    db.historial.push({ reserva: r.id, de: r.estado, a: 'CANCELADA', quien: u.nombre, cuando: new Date().toISOString() }); r.estado = 'CANCELADA'; guardar(db); return r; },
  async pendientes(d) { const db = await bd(); soloAdmin(yo(db, d)); return db.reservas.filter(r => r.estado === 'PENDIENTE'); },
  async resolver(d) { const db = await bd(), u = yo(db, d); soloAdmin(u); const r = db.reservas.find(x => x.id == d.id && x.estado === 'PENDIENTE');
    if (!r) throw 'Solicitud no encontrada'; r.estado = d.estado; r.obs = d.obs || '';
    db.historial.push({ reserva: r.id, de: 'PENDIENTE', a: d.estado, quien: u.nombre, cuando: new Date().toISOString() }); guardar(db); return r; },
  async bloquear(d) { const db = await bd(); soloAdmin(yo(db, d)); const b = { id: Date.now(), espacio: +d.espacio, fecha: d.fecha, inicio: +d.inicio, fin: +d.fin, motivo: d.motivo || '' };
    if (b.fin <= b.inicio) throw 'La hora de fin debe ser posterior a la de inicio';
    db.bloqueos.push(b); guardar(db); return b; }
};
