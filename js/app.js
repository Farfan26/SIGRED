/* app.js - Interfaz de SIGRED: login, calendario (P03), reserva (P05/P06), mis reservas (P07/P08),
   y para el administrador: pendientes (P11) y bloqueos (P13). */
const $ = q => document.querySelector(q);
let usuario = null, espacios = [], lunes = lunesDe();
const esAdmin = () => usuario.rol === 'ADMIN_DEPORTES';
const aviso = t => { const x = $('#toast'); x.textContent = t; x.style.display = 'block'; setTimeout(() => x.style.display = 'none', 3000); };
const hh = h => String(h).padStart(2, '0') + ':00';

/* ---------- Arranque y login (P01) ---------- */
$('#logo').src = CONFIG.LOGO; $('#brand').textContent = CONFIG.NOMBRE; document.title = CONFIG.NOMBRE;
document.querySelectorAll('.demo a').forEach(a => a.onclick = e => { e.preventDefault(); $('#correo').value = a.dataset.u; $('#clave').value = a.dataset.p; });
$('#f-login').onsubmit = async e => {
  e.preventDefault(); $('#err').textContent = '';
  try { const r = await api('login', { correo: $('#correo').value, clave: $('#clave').value });
    sessionStorage.setItem('tk', r.token); sessionStorage.setItem('us', JSON.stringify(r.usuario)); iniciar(); }
  catch (x) { $('#err').textContent = x; }
};
$('#salir').onclick = () => { sessionStorage.clear(); location.reload(); };

async function iniciar() {
  usuario = JSON.parse(sessionStorage.getItem('us')); espacios = await api('espacios');
  $('#login').hidden = true; $('#app').hidden = false; $('#quien').textContent = usuario.nombre + ' (' + usuario.rol + ')';
  const vistas = esAdmin() ? [['pendientes', 'Solicitudes'], ['disponibilidad', 'Disponibilidad'], ['bloqueos', 'Bloqueos']]
                           : [['disponibilidad', 'Disponibilidad'], ['mis', 'Mis reservas']];
  $('#menu').innerHTML = vistas.map(v => `<a href="#" data-v="${v[0]}">${v[1]}</a>`).join('');
  document.querySelectorAll('#menu a').forEach(a => a.onclick = e => { e.preventDefault(); ir(a.dataset.v); });
  ir(vistas[0][0]);
}
function ir(v) {
  document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  ({ disponibilidad, mis, pendientes, bloqueos })[v]();
}
const opts = (arr, sel) => arr.map(o => `<option value="${o.v ?? o}" ${(o.v ?? o) == sel ? 'selected' : ''}>${o.t ?? o}</option>`).join('');
const horas = (a, c) => Array.from({ length: c - a + 1 }, (_, i) => ({ v: a + i, t: hh(a + i) }));

/* ---------- P03: Consulta de disponibilidad ---------- */
let espSel = null;
async function disponibilidad() {
  espSel = espSel || espacios[0].id;
  const e = espacios.find(x => x.id == espSel), sem = await api('semana', { espacio: espSel });
  const dias = [0, 1, 2, 3, 4, 5].map(n => { const d = new Date(lunes); d.setDate(d.getDate() + n); return d; });
  let filas = '';
  for (let h = e.apertura; h < e.cierre; h++) {
    filas += `<tr><th>${hh(h)}</th>` + dias.map(d => {
      const f = iso(d), c = { fecha: f, inicio: h, fin: h + 1 };
      const bl = sem.bloqueos.some(b => cruza(b, c)), rs = sem.reservas.find(r => cruza(r, c));
      const est = bl ? 'Bloqueado' : rs ? (rs.estado === 'CONFIRMADA' ? 'Ocupado' : 'Pendiente') : 'Libre';
      return `<td class="s ${est}" ${est === 'Libre' ? `data-f="${f}" data-h="${h}"` : ''}>${est}</td>`; // estado con texto, no solo color
    }).join('') + '</tr>';
  }
  $('#main').innerHTML = `<h2>Consulta de disponibilidad</h2><div class="fila">
    <label>Espacio deportivo<select id="esp">${opts(espacios.map(x => ({ v: x.id, t: x.nombre })), espSel)}</select></label>
    <label>Semana del<input id="sem" type="date" value="${iso(lunes)}"></label></div>
    <div style="overflow:auto"><table><tr><th></th>${dias.map(d => `<th>${d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit' })}</th>`).join('')}</tr>${filas}</table></div>
    <p class="leyenda"><span class="Libre">Libre</span><span class="Ocupado">Ocupado</span><span class="Pendiente">Solicitud pendiente</span><span class="Bloqueado">Bloqueado</span></p>
    <p>Haz clic en una franja <b>Libre</b> para solicitarla. Capacidad: ${e.capacidad} · Disciplinas: ${e.disciplinas.join(', ')}</p>`;
  $('#esp').onchange = x => { espSel = x.target.value; disponibilidad(); };
  $('#sem').onchange = x => { lunes = lunesDe(new Date(x.target.value + 'T12:00')); disponibilidad(); };
  document.querySelectorAll('td.Libre').forEach(td => td.onclick = () => formulario(e, td.dataset.f, +td.dataset.h));
}

/* ---------- P05/P06: Solicitud de reserva y confirmación ---------- */
function formulario(e, fecha, h) {
  const d = $('#dlg');
  d.innerHTML = `<h3>Solicitud de reserva</h3><p><b>${e.nombre}</b> · capacidad ${e.capacidad} · atención ${hh(e.apertura)}-${hh(e.cierre)}</p>
    <form id="fr"><label>Fecha<input id="rf" type="date" value="${fecha}"></label>
    <div class="fila"><label>Desde<select id="ri">${opts(horas(e.apertura, e.cierre - 1), h)}</select></label>
    <label>Hasta<select id="rh">${opts(horas(e.apertura + 1, e.cierre), h + 1)}</select></label></div>
    <label>Disciplina<select id="rd">${opts(e.disciplinas)}</select></label>
    <label>Participantes<input id="rp" type="number" min="1" max="${e.capacidad}" value="10"></label>
    <label>Finalidad<input id="rt" maxlength="200"></label><p id="rerr" class="error"></p>
    <button class="btn">Enviar solicitud</button> <button type="button" class="btn sec" id="rc">Cancelar</button></form>`;
  d.showModal(); $('#rc').onclick = () => d.close();
  $('#fr').onsubmit = async ev => { ev.preventDefault();
    try { const r = await api('reservar', { espacio: e.id, fecha: $('#rf').value, inicio: $('#ri').value, fin: $('#rh').value,
        disciplina: $('#rd').value, participantes: $('#rp').value, finalidad: $('#rt').value });
      d.innerHTML = `<h3>Solicitud enviada</h3><p>${r.espacioNombre} · ${r.fecha} · ${hh(r.inicio)}-${hh(r.fin)}</p>
        <p>Estado: <b>${r.estado}</b>. El Área de Deportes la revisará.</p><button class="btn" id="ok">Aceptar</button>`;
      $('#ok').onclick = () => { d.close(); disponibilidad(); };
    } catch (x) { $('#rerr').textContent = x; } };   // muestra el cruce u otra regla incumplida al instante
}

/* ---------- P07/P08: Mis reservas y cancelación ---------- */
async function mis() {
  const rs = await api('mis');
  $('#main').innerHTML = `<h2>Mis reservas</h2>` + tabla(rs, r => ['PENDIENTE', 'CONFIRMADA'].includes(r.estado) ?
    `<button class="btn rojo" data-c="${r.id}">Cancelar</button>` : '');
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => {
    if (!confirm('¿Cancelar esta reserva?')) return; try { await api('cancelar', { id: b.dataset.c }); aviso('Reserva cancelada'); mis(); } catch (x) { aviso(x); } });
}
const tabla = (rs, acciones) => rs.length ? `<table><tr><th>Espacio</th><th>Fecha</th><th>Horario</th><th>Disciplina</th><th>Estado</th><th>Obs.</th><th></th></tr>` +
  rs.map(r => `<tr><td>${r.espacioNombre}</td><td>${r.fecha}</td><td>${hh(r.inicio)}-${hh(r.fin)}</td><td>${r.disciplina}</td><td><b>${r.estado}</b></td><td>${r.obs || ''}</td><td>${acciones(r)}</td></tr>`).join('') + '</table>' : '<p>No hay registros.</p>';

/* ---------- P11: Solicitudes pendientes (administrador) ---------- */
async function pendientes() {
  const rs = await api('pendientes');
  $('#main').innerHTML = `<h2>Solicitudes pendientes (${rs.length})</h2>` + tabla(rs, r =>
    `<button class="btn" data-a="${r.id}|CONFIRMADA">Aprobar</button> <button class="btn rojo" data-a="${r.id}|RECHAZADA">Rechazar</button>`);
  document.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => { const [id, estado] = b.dataset.a.split('|');
    const obs = prompt('Observación (opcional):') ?? ''; try { await api('resolver', { id, estado, obs }); aviso('Solicitud ' + estado.toLowerCase()); pendientes(); } catch (x) { aviso(x); } });
}

/* ---------- P13: Bloqueos de horario (administrador) ---------- */
function bloqueos() {
  $('#main').innerHTML = `<h2>Bloquear horario</h2><form id="fb" class="card"><div class="fila">
    <label>Espacio<select id="be">${opts(espacios.map(x => ({ v: x.id, t: x.nombre })))}</select></label>
    <label>Fecha<input id="bf" type="date" required></label>
    <label>Desde<select id="bi">${opts(horas(7, 21))}</select></label><label>Hasta<select id="bh">${opts(horas(8, 22), 9)}</select></label></div>
    <label>Motivo<input id="bm" placeholder="Mantenimiento, actividad institucional..."></label><button class="btn">Registrar bloqueo</button></form>
    <p>El bloqueo aparece de inmediato como «Bloqueado» en la pestaña Disponibilidad.</p>`;
  $('#fb').onsubmit = async e => { e.preventDefault(); try { await api('bloquear', { espacio: $('#be').value, fecha: $('#bf').value, inicio: $('#bi').value, fin: $('#bh').value, motivo: $('#bm').value }); aviso('Bloqueo registrado'); } catch (x) { aviso(x); } };
}

if (sessionStorage.getItem('tk')) iniciar();   // mantiene la sesión al recargar
