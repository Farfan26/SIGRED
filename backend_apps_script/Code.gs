/**
 * SIGRED - Backend de prototipo con Google Sheets + Google Apps Script
 * -------------------------------------------------------------------
 * Alcance: prototipo académico / validación funcional.
 * La arquitectura de producción propuesta en el Informe Parcial 3 sigue siendo
 * API REST + base de datos relacional (PostgreSQL). Este backend permite probar
 * el flujo completo sin contratar servidor.
 *
 * PASO 1: crea un Google Sheet y abre Extensiones > Apps Script.
 * PASO 2: pega este archivo completo y ejecuta setupSIGRED() una vez.
 * PASO 3: ejecuta setFrontendUrl('https://TU-SITIO.netlify.app').
 * PASO 4: Implementar > Nueva implementación > Aplicación web.
 *         Ejecutar como: tú. Acceso: cualquiera (para prototipo).
 * PASO 5: pega la URL /exec en js/config.js o en el panel de administrador.
 */

const SIGRED = {
  VERSION: '3.0',
  SESSION_HOURS: 8,
  RESET_MINUTES: 30,
  HASH_ROUNDS: 4000,
  SHEETS: {
    USERS: 'usuarios', SPACES: 'espacios', RESERVATIONS: 'reservas', BLOCKS: 'bloqueos',
    HISTORY: 'historial', SESSIONS: 'sesiones', RESET: 'recuperacion', NOTIFICATIONS: 'notificaciones'
  },
  HEADERS: {
    usuarios: ['id','email','name','code','phone','role','status','password_salt','password_hash','created_at','updated_at'],
    espacios: ['id','name','capacity','location','dimensions','disciplines','open','close','rules','state','image'],
    reservas: ['id','user_id','user_email','user_name','space_id','discipline','date','start','end','participants','purpose','state','observation','manager_id','created_at','resolved_at'],
    bloqueos: ['id','space_id','date','start','end','type','reason','created_by','created_at'],
    historial: ['id','reservation_id','actor_id','from_state','to_state','comment','changed_at'],
    sesiones: ['token','user_id','expires_at','created_at'],
    recuperacion: ['token','user_id','expires_at','used','created_at'],
    notificaciones: ['id','user_id','reservation_id','subject','message','sent','created_at']
  }
};

function doGet() {
  return json_({ok:true, service:'SIGRED Google Sheets', version:SIGRED.VERSION, message:'Backend activo'});
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(req.action || '');
    const p = req.payload || {};
    const token = String(req.token || '');

    switch (action) {
      case 'health': return json_({ok:true, service:'SIGRED Google Sheets', version:SIGRED.VERSION, time:new Date().toISOString()});
      case 'register': return json_(register_(p));
      case 'login': return json_(login_(p));
      case 'requestPasswordReset': return json_(requestPasswordReset_(p));
      case 'resetPassword': return json_(resetPassword_(p));
      case 'changePassword': return json_(changePassword_(token,p));
      case 'getProfile': return json_({ok:true,data:publicUser_(requireUser_(token))});
      case 'updateProfile': return json_(updateProfile_(token,p));
      case 'listSpaces': return json_({ok:true,data:listSpaces_()});
      case 'saveSpace': return json_(saveSpace_(token,p));
      case 'listReservations': return json_(listReservations_(token));
      case 'myReservations': return json_(myReservations_(token));
      case 'createReservation': return json_(createReservation_(token,p));
      case 'cancelReservation': return json_(cancelReservation_(token,p));
      case 'pendingReservations': return json_(pendingReservations_(token));
      case 'resolveReservation': return json_(resolveReservation_(token,p));
      case 'listBlocks': return json_({ok:true,data:listBlocks_()});
      case 'createBlock': return json_(createBlock_(token,p));
      case 'deleteBlock': return json_(deleteBlock_(token,p));
      case 'historyReport': return json_(historyReport_(token,p));
      case 'dashboard': return json_(dashboard_(token));
      default: return json_({ok:false,error:'Acción no implementada: '+action});
    }
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return json_({ok:false,error:String(err && err.message ? err.message : err)});
  }
}

/* ========================= CONFIGURACIÓN ========================= */

function setupSIGRED() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Ejecuta setupSIGRED desde un Apps Script vinculado a un Google Sheet.');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SIGRED_SPREADSHEET_ID', ss.getId());
  if (!props.getProperty('SIGRED_PEPPER')) props.setProperty('SIGRED_PEPPER', Utilities.getUuid()+Utilities.getUuid());
  if (!props.getProperty('SIGRED_EMAIL_DOMAIN')) props.setProperty('SIGRED_EMAIL_DOMAIN','udep.edu.pe');
  if (!props.getProperty('SIGRED_DEBUG_RESET')) props.setProperty('SIGRED_DEBUG_RESET','true');

  Object.keys(SIGRED.HEADERS).forEach(name => ensureSheet_(name, SIGRED.HEADERS[name]));
  seedSpaces_();
  seedAdmin_();
  formatSheets_();
  return 'SIGRED configurado. Admin: admin@udep.edu.pe / SigredAdmin2026! (cámbiala al primer ingreso).';
}

function setFrontendUrl(url) {
  const clean = String(url || '').trim().replace(/\/$/,'');
  if (!/^https:\/\//i.test(clean) && !/^http:\/\/localhost/i.test(clean)) throw new Error('Usa una URL https:// válida.');
  PropertiesService.getScriptProperties().setProperty('SIGRED_FRONTEND_URL', clean);
  return 'URL frontend guardada: '+clean;
}

function setDebugReset(enabled) {
  PropertiesService.getScriptProperties().setProperty('SIGRED_DEBUG_RESET', enabled ? 'true' : 'false');
  return 'SIGRED_DEBUG_RESET='+String(!!enabled);
}

function setEmailDomain(domain) {
  const d = String(domain||'').trim().toLowerCase().replace(/^@/,'');
  if (!d || d.indexOf('.')<0) throw new Error('Dominio no válido.');
  PropertiesService.getScriptProperties().setProperty('SIGRED_EMAIL_DOMAIN', d);
  return 'Dominio institucional: @'+d;
}

/* ========================= AUTENTICACIÓN ========================= */

function register_(p) {
  const email = normalizeEmail_(p.email), domain = getProp_('SIGRED_EMAIL_DOMAIN','udep.edu.pe');
  if (!email.endsWith('@'+domain)) throw new Error('Usa un correo institucional @'+domain+'.');
  if (findOne_('usuarios','email',email)) throw new Error('El correo ya está registrado.');
  const name = clean_(p.name,120), code = clean_(p.code,30), phone = clean_(p.phone,20);
  if (!name || !code) throw new Error('Completa nombres y código institucional.');
  if (findOne_('usuarios','code',code)) throw new Error('El código institucional ya está registrado.');
  const role = ['ESTUDIANTE','DOCENTE','ADMINISTRATIVO'].includes(String(p.role)) ? String(p.role) : 'ESTUDIANTE';
  validatePassword_(p.password);
  const salt = Utilities.getUuid(), now = new Date().toISOString();
  append_('usuarios', {id:id_('u'),email,name,code,phone,role,status:'ACTIVO',password_salt:salt,password_hash:hashPassword_(String(p.password),salt),created_at:now,updated_at:now});
  return {ok:true,message:'Cuenta creada correctamente.'};
}

function login_(p) {
  purgeExpired_();
  const email=normalizeEmail_(p.email), u=findOne_('usuarios','email',email);
  if (!u || u.status!=='ACTIVO' || !safeEqual_(u.password_hash,hashPassword_(String(p.password||''),u.password_salt))) throw new Error('Correo o contraseña incorrectos.');
  deleteRowsWhere_('sesiones', r => String(r.user_id)===String(u.id));
  const token = token_(), expires=Date.now()+SIGRED.SESSION_HOURS*60*60*1000;
  append_('sesiones',{token,user_id:u.id,expires_at:expires,created_at:new Date().toISOString()});
  return {ok:true,token,user:publicUser_(u)};
}

function requestPasswordReset_(p) {
  const email=normalizeEmail_(p.email), u=findOne_('usuarios','email',email);
  const generic={ok:true,message:'Si el correo está registrado, se enviarán las instrucciones de recuperación.'};
  if (!u || u.status!=='ACTIVO') return generic;
  deleteRowsWhere_('recuperacion',r=>String(r.user_id)===String(u.id));
  const token=token_(), expires=Date.now()+SIGRED.RESET_MINUTES*60*1000;
  append_('recuperacion',{token,user_id:u.id,expires_at:expires,used:false,created_at:new Date().toISOString()});
  const base=getProp_('SIGRED_FRONTEND_URL',''), link=base ? `${base}/P02-restablecer.html?token=${encodeURIComponent(token)}` : '';
  let sent=false;
  if (link) {
    try {
      MailApp.sendEmail({to:u.email,subject:'SIGRED · Restablecer contraseña',htmlBody:`<p>Hola ${html_(u.name)},</p><p>Se solicitó restablecer tu contraseña de SIGRED.</p><p><a href="${html_(link)}">Restablecer contraseña</a></p><p>El enlace vence en ${SIGRED.RESET_MINUTES} minutos. Si no realizaste esta solicitud, ignora este correo.</p>`});
      sent=true;
    } catch (err) { console.error('No se pudo enviar correo de recuperación: '+err); }
  }
  if (getProp_('SIGRED_DEBUG_RESET','false')==='true') return Object.assign(generic,{debugToken:token,debugMailSent:sent});
  return generic;
}

function resetPassword_(p) {
  validatePassword_(p.newPassword);
  const rec=findOne_('recuperacion','token',String(p.token||''));
  if (!rec || String(rec.used)==='true' || Number(rec.expires_at)<Date.now()) throw new Error('El enlace es inválido o ha vencido.');
  const u=findOne_('usuarios','id',rec.user_id); if(!u) throw new Error('Usuario no encontrado.');
  const salt=Utilities.getUuid();
  updateById_('usuarios',u.id,{password_salt:salt,password_hash:hashPassword_(String(p.newPassword),salt),updated_at:new Date().toISOString()});
  updateByField_('recuperacion','token',rec.token,{used:true});
  deleteRowsWhere_('sesiones',r=>String(r.user_id)===String(u.id));
  return {ok:true,message:'Contraseña actualizada.'};
}

function changePassword_(token,p) {
  const u=requireUser_(token); validatePassword_(p.newPassword);
  if (!safeEqual_(u.password_hash,hashPassword_(String(p.currentPassword||''),u.password_salt))) throw new Error('La contraseña actual no coincide.');
  const salt=Utilities.getUuid();
  updateById_('usuarios',u.id,{password_salt:salt,password_hash:hashPassword_(String(p.newPassword),salt),updated_at:new Date().toISOString()});
  return {ok:true,message:'Contraseña actualizada.'};
}

function updateProfile_(token,p) {
  const u=requireUser_(token), name=clean_(p.name,120), phone=clean_(p.phone,20);
  if (!name) throw new Error('El nombre no puede quedar vacío.');
  updateById_('usuarios',u.id,{name,phone,updated_at:new Date().toISOString()});
  const updated=findOne_('usuarios','id',u.id);
  return {ok:true,data:publicUser_(updated)};
}

function requireUser_(token) {
  purgeExpired_();
  if (!token) throw new Error('Sesión no válida. Inicia sesión nuevamente.');
  const s=findOne_('sesiones','token',token); if(!s || Number(s.expires_at)<Date.now()) throw new Error('La sesión ha vencido.');
  const u=findOne_('usuarios','id',s.user_id); if(!u || u.status!=='ACTIVO') throw new Error('Usuario no disponible.');
  return u;
}
function requireAdmin_(token){const u=requireUser_(token);if(u.role!=='ADMIN_DEPORTES')throw new Error('No tienes permisos para esta operación.');return u;}
function publicUser_(u){return {id:u.id,email:u.email,name:u.name,code:u.code,phone:u.phone||'',role:u.role};}

/* ========================= ESPACIOS ========================= */

function listSpaces_(){return rows_('espacios').map(x=>Object.assign(x,{capacity:Number(x.capacity)||0,disciplines:splitDisc_(x.disciplines)}));}

function saveSpace_(token,p){
  requireAdmin_(token);
  const data={name:clean_(p.name,100),capacity:Number(p.capacity),location:clean_(p.location,140),dimensions:clean_(p.dimensions,100),disciplines:Array.isArray(p.disciplines)?p.disciplines.join('|'):String(p.disciplines||'').split(',').map(x=>x.trim()).filter(Boolean).join('|'),open:String(p.open||'07:00'),close:String(p.close||'22:00'),rules:clean_(p.rules,800),state:String(p.state||'DISPONIBLE'),image:clean_(p.image||'assets/deportes-udep.jpg',500)};
  if(!data.name||!data.capacity||data.capacity<1)throw new Error('Completa nombre y capacidad.');
  if(data.open>=data.close)throw new Error('El horario de apertura debe ser anterior al cierre.');
  if(!['DISPONIBLE','NO_DISPONIBLE','MANTENIMIENTO'].includes(data.state))throw new Error('Estado de espacio no válido.');
  if(p.id){if(!findOne_('espacios','id',p.id))throw new Error('Espacio no encontrado.');updateById_('espacios',p.id,data);data.id=p.id;}else{data.id=id_('esp');append_('espacios',data);}
  data.disciplines=splitDisc_(data.disciplines);return {ok:true,data};
}

/* ========================= RESERVAS ========================= */

function listReservations_(token){const u=requireUser_(token), data=rows_('reservas').map(enrichReservation_);if(u.role==='ADMIN_DEPORTES')return {ok:true,data};return {ok:true,data:data.map(r=>({id:r.id,spaceId:r.spaceId,date:r.date,start:r.start,end:r.end,state:r.state}))};}

function myReservations_(token){
  const u=requireUser_(token), data=rows_('reservas').filter(r=>String(r.user_id)===String(u.id)).map(enrichReservation_).sort((a,b)=>(String(b.date)+String(b.start)).localeCompare(String(a.date)+String(a.start)));
  return {ok:true,data};
}

function createReservation_(token,p){
  const u=requireUser_(token), lock=LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const s=findOne_('espacios','id',String(p.spaceId)); if(!s)throw new Error('Espacio no encontrado.');
    if(s.state!=='DISPONIBLE')throw new Error('El espacio no está disponible para reservas.');
    const disciplines=splitDisc_(s.disciplines), discipline=clean_(p.discipline,60); if(!disciplines.includes(discipline))throw new Error('La disciplina no está habilitada en este espacio.');
    const date=String(p.date||''), start=String(p.start||''), end=String(p.end||''), participants=Number(p.participants);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end)||start>=end)throw new Error('Revisa fecha y horario.');
    if(start<String(s.open)||end>String(s.close))throw new Error(`El horario debe estar entre ${s.open} y ${s.close}.`);
    if(!participants||participants<1||participants>Number(s.capacity))throw new Error('El número de participantes supera la capacidad permitida.');
    const conflict=rows_('reservas').some(r=>String(r.space_id)===String(s.id)&&String(r.date)===date&&['PENDIENTE','CONFIRMADA'].includes(String(r.state))&&overlap_(start,end,String(r.start),String(r.end))) || rows_('bloqueos').some(b=>String(b.space_id)===String(s.id)&&String(b.date)===date&&overlap_(start,end,String(b.start),String(b.end)));
    if(conflict)throw new Error('Ese horario se cruza con una reserva o bloqueo existente.');
    const r={id:id_('r'),user_id:u.id,user_email:u.email,user_name:u.name,space_id:s.id,discipline,date,start,end,participants,purpose:clean_(p.purpose,240),state:'PENDIENTE',observation:'',manager_id:'',created_at:new Date().toISOString(),resolved_at:''};
    append_('reservas',r); appendHistory_(r.id,u.id,'','PENDIENTE','Solicitud registrada');
    return {ok:true,data:enrichReservation_(r)};
  } finally { lock.releaseLock(); }
}

function cancelReservation_(token,p){
  const u=requireUser_(token), r=findOne_('reservas','id',String(p.id)); if(!r)throw new Error('Reserva no encontrada.');
  if(u.role!=='ADMIN_DEPORTES'&&String(r.user_id)!==String(u.id))throw new Error('No puedes cancelar esta reserva.');
  if(!['PENDIENTE','CONFIRMADA'].includes(r.state))throw new Error('La reserva ya no se puede cancelar.');
  const startAt=new Date(`${r.date}T${r.start}:00`);if(startAt<=new Date())throw new Error('No se puede cancelar una reserva que ya inició.');
  const obs=clean_(p.observation||'Cancelada por el usuario',300),before=r.state;
  updateById_('reservas',r.id,{state:'CANCELADA',observation:obs,resolved_at:new Date().toISOString()});appendHistory_(r.id,u.id,before,'CANCELADA',obs);notifyReservation_(r,'CANCELADA',obs);
  return {ok:true,data:enrichReservation_(findOne_('reservas','id',r.id))};
}

function pendingReservations_(token){requireAdmin_(token);return {ok:true,data:rows_('reservas').filter(r=>r.state==='PENDIENTE').map(enrichReservation_).sort((a,b)=>(String(a.date)+String(a.start)).localeCompare(String(b.date)+String(b.start)))};}

function resolveReservation_(token,p){
  const admin=requireAdmin_(token), state=String(p.state||''); if(!['CONFIRMADA','RECHAZADA'].includes(state))throw new Error('Estado no permitido.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const r=findOne_('reservas','id',String(p.id));if(!r)throw new Error('Solicitud no encontrada.');if(r.state!=='PENDIENTE')throw new Error('La solicitud ya fue resuelta.');
    if(state==='CONFIRMADA'){
      const conflict=rows_('reservas').some(x=>String(x.id)!==String(r.id)&&String(x.space_id)===String(r.space_id)&&String(x.date)===String(r.date)&&x.state==='CONFIRMADA'&&overlap_(String(r.start),String(r.end),String(x.start),String(x.end))) || rows_('bloqueos').some(b=>String(b.space_id)===String(r.space_id)&&String(b.date)===String(r.date)&&overlap_(String(r.start),String(r.end),String(b.start),String(b.end)));
      if(conflict)throw new Error('No se puede confirmar: el horario ahora presenta un cruce.');
    }
    const obs=clean_(p.observation,300);updateById_('reservas',r.id,{state,observation:obs,manager_id:admin.id,resolved_at:new Date().toISOString()});appendHistory_(r.id,admin.id,'PENDIENTE',state,obs);notifyReservation_(r,state,obs);
    return {ok:true,data:enrichReservation_(findOne_('reservas','id',r.id))};
  }finally{lock.releaseLock();}
}

/* ========================= BLOQUEOS ========================= */

function listBlocks_(){const names=spaceMap_();return rows_('bloqueos').map(b=>Object.assign(b,{spaceId:b.space_id,spaceName:names[b.space_id]||'Espacio'}));}

function createBlock_(token,p){
  const admin=requireAdmin_(token), date=String(p.date||''),start=String(p.start||''),end=String(p.end||'');if(!date||!start||!end||start>=end)throw new Error('Revisa fecha y horario del bloqueo.');
  const s=findOne_('espacios','id',String(p.spaceId));if(!s)throw new Error('Espacio no encontrado.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{const conflict=rows_('reservas').some(r=>String(r.space_id)===String(s.id)&&String(r.date)===date&&['PENDIENTE','CONFIRMADA'].includes(r.state)&&overlap_(start,end,String(r.start),String(r.end)));if(conflict)throw new Error('Existe una reserva activa en ese horario.');
    const b={id:id_('b'),space_id:s.id,date,start,end,type:clean_(p.type,60)||'OTRO',reason:clean_(p.reason,240),created_by:admin.id,created_at:new Date().toISOString()};append_('bloqueos',b);return {ok:true,data:Object.assign(b,{spaceId:b.space_id,spaceName:s.name})};
  }finally{lock.releaseLock();}
}

function deleteBlock_(token,p){requireAdmin_(token);const count=deleteRowsWhere_('bloqueos',b=>String(b.id)===String(p.id));if(!count)throw new Error('Bloqueo no encontrado.');return {ok:true};}

/* ========================= REPORTES ========================= */

function historyReport_(token,p){requireAdmin_(token);let rs=rows_('reservas').map(enrichReservation_);if(p.spaceId)rs=rs.filter(r=>String(r.spaceId)===String(p.spaceId));if(p.from)rs=rs.filter(r=>String(r.date)>=String(p.from));if(p.to)rs=rs.filter(r=>String(r.date)<=String(p.to));return {ok:true,data:{reservations:rs,history:rows_('historial')}};}
function dashboard_(token){requireAdmin_(token);const rs=rows_('reservas'),bs=rows_('bloqueos'),t=today_();return {ok:true,data:{pending:rs.filter(r=>r.state==='PENDIENTE').length,confirmed:rs.filter(r=>r.state==='CONFIRMADA').length,blocks:bs.filter(b=>String(b.date)>=t).length,spaces:rows_('espacios').length,reservations:rs.length}};}

/* ========================= NOTIFICACIONES ========================= */

function notifyReservation_(reservation,state,obs){
  const user=findOne_('usuarios','id',reservation.user_id);if(!user)return;
  const space=findOne_('espacios','id',reservation.space_id), subject=`SIGRED · Reserva ${state.toLowerCase()}`;
  const message=`Tu solicitud para ${space?space.name:'el espacio deportivo'} del ${reservation.date}, ${reservation.start}-${reservation.end}, fue actualizada a ${state}.${obs?' Observación: '+obs:''}`;
  let sent=false;try{MailApp.sendEmail({to:user.email,subject,htmlBody:`<p>Hola ${html_(user.name)},</p><p>${html_(message)}</p><p>Ingresa a SIGRED para revisar el detalle.</p>`});sent=true;}catch(err){console.error('Correo no enviado: '+err);}
  append_('notificaciones',{id:id_('n'),user_id:user.id,reservation_id:reservation.id,subject,message,sent,created_at:new Date().toISOString()});
}

/* ========================= HELPERS DE DATOS ========================= */

function getSS_(){const id=getProp_('SIGRED_SPREADSHEET_ID','');if(id)return SpreadsheetApp.openById(id);const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('No se configuró SIGRED_SPREADSHEET_ID. Ejecuta setupSIGRED().');return ss;}
function sh_(name){const sh=getSS_().getSheetByName(name);if(!sh)throw new Error('Falta la hoja '+name+'. Ejecuta setupSIGRED().');return sh;}
function ensureSheet_(name,headers){const ss=getSS_(),sh=ss.getSheetByName(name)||ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers);else{const existing=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getValues()[0];headers.forEach((h,i)=>{if(existing[i]!==h)sh.getRange(1,i+1).setValue(h)});}sh.setFrozenRows(1);return sh;}
function rows_(name){const sh=sh_(name);if(sh.getLastRow()<2)return[];const values=sh.getDataRange().getValues(),headers=values.shift().map(String);return values.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>{const o={};headers.forEach((h,i)=>o[h]=cell_(h,r[i]));return o;});}
function cell_(h,v){if(v instanceof Date){if(h==='date')return Utilities.formatDate(v,Session.getScriptTimeZone()||'America/Lima','yyyy-MM-dd');return v.toISOString();}return v;}
function append_(name,obj){const sh=sh_(name),headers=SIGRED.HEADERS[name];sh.appendRow(headers.map(h=>obj[h]!==undefined?obj[h]:''));}
function findOne_(name,field,value){return rows_(name).find(r=>String(r[field])===String(value))||null;}
function updateById_(name,id,patch){return updateByField_(name,'id',id,patch);}
function updateByField_(name,field,value,patch){const sh=sh_(name),values=sh.getDataRange().getValues(),headers=values[0].map(String),fi=headers.indexOf(field);if(fi<0)throw new Error('Campo '+field+' no encontrado en '+name);for(let i=1;i<values.length;i++){if(String(cell_(field,values[i][fi]))===String(value)){Object.keys(patch).forEach(k=>{const ci=headers.indexOf(k);if(ci>=0)sh.getRange(i+1,ci+1).setValue(patch[k])});return true;}}return false;}
function deleteRowsWhere_(name,predicate){const sh=sh_(name),all=rows_(name);let count=0;for(let i=all.length-1;i>=0;i--){if(predicate(all[i])){sh.deleteRow(i+2);count++;}}return count;}
function appendHistory_(reservationId,actorId,from,to,comment){append_('historial',{id:id_('h'),reservation_id:reservationId,actor_id:actorId,from_state:from,to_state:to,comment:comment||'',changed_at:new Date().toISOString()});}
function enrichReservation_(r){const s=findOne_('espacios','id',r.space_id);return {id:r.id,userId:r.user_id,userEmail:r.user_email,userName:r.user_name,spaceId:r.space_id,spaceName:s?s.name:'Espacio',discipline:r.discipline,date:String(r.date),start:String(r.start),end:String(r.end),participants:Number(r.participants)||0,purpose:r.purpose,state:r.state,observation:r.observation||'',managerId:r.manager_id||'',createdAt:r.created_at,resolvedAt:r.resolved_at||''};}
function spaceMap_(){const m={};rows_('espacios').forEach(s=>m[s.id]=s.name);return m;}
function splitDisc_(v){return String(v||'').split('|').map(x=>x.trim()).filter(Boolean);}

/* ========================= HELPERS DE SEGURIDAD ========================= */

function hashPassword_(password,salt){let x=String(password);const key=String(salt)+getProp_('SIGRED_PEPPER','');for(let i=0;i<SIGRED.HASH_ROUNDS;i++){x=Utilities.base64Encode(Utilities.computeHmacSha256Signature(x,key));}return x;}
function validatePassword_(p){const s=String(p||'');if(s.length<8)throw new Error('La contraseña debe tener al menos 8 caracteres.');if(s.length>128)throw new Error('La contraseña es demasiado larga.');}
function safeEqual_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let out=0;for(let i=0;i<a.length;i++)out|=a.charCodeAt(i)^b.charCodeAt(i);return out===0;}
function purgeExpired_(){deleteRowsWhere_('sesiones',r=>Number(r.expires_at)<Date.now());deleteRowsWhere_('recuperacion',r=>Number(r.expires_at)<Date.now()||String(r.used)==='true');}
function token_(){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,Utilities.getUuid()+Date.now()+Math.random())).replace(/=+$/,'');}
function getProp_(k,d){return PropertiesService.getScriptProperties().getProperty(k)||d;}

/* ========================= HELPERS GENERALES ========================= */

function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function id_(p){return p+'_'+Date.now()+'_'+Utilities.getUuid().slice(0,8);}
function normalizeEmail_(v){return String(v||'').trim().toLowerCase();}
function clean_(v,max){return String(v||'').trim().slice(0,max||1000);}
function overlap_(a,b,c,d){return a<d&&c<b;}
function today_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Lima','yyyy-MM-dd');}
function html_(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ========================= DATOS INICIALES ========================= */

function seedAdmin_(){if(findOne_('usuarios','email','admin@udep.edu.pe'))return;const salt=Utilities.getUuid(),now=new Date().toISOString();append_('usuarios',{id:id_('u'),email:'admin@udep.edu.pe',name:'Administrador de Deportes',code:'DEP001',phone:'',role:'ADMIN_DEPORTES',status:'ACTIVO',password_salt:salt,password_hash:hashPassword_('SigredAdmin2026!',salt),created_at:now,updated_at:now});}
function seedSpaces_(){if(rows_('espacios').length)return;append_('espacios',{id:'esp_1',name:'Plataforma multiusos',capacity:425,location:'Zona deportiva · Campus Piura',dimensions:'44 × 44 m',disciplines:'Básquet|Vóley|Futsal|Balonmano|Tenis de campo',open:'07:00',close:'22:00',rules:'Usar indumentaria deportiva, respetar aforo, horario y dejar el espacio limpio.',state:'DISPONIBLE',image:'https://www.udep.edu.pe/vidauniversitaria/wp-content/uploads/sites/3/2024/02/Polideportivo-por-dentro-1024x576.jpg'});append_('espacios',{id:'esp_2',name:'Cancha de fútbol',capacity:150,location:'Zona deportiva · Campus Piura',dimensions:'Dimensiones reglamentarias',disciplines:'Fútbol|Futsal',open:'07:00',close:'22:00',rules:'Respetar turnos, condiciones del campo e indicaciones del Área de Deportes.',state:'DISPONIBLE',image:'https://www.udep.edu.pe/dircom/wp-content/uploads/sites/20/2022/08/52163182248_0a6ae7219b_o-1-1024x683.jpg'});append_('espacios',{id:'esp_3',name:'Polideportivo',capacity:300,location:'Campus Piura',dimensions:'Espacio multideportivo',disciplines:'Básquet|Vóley|Futsal',open:'07:00',close:'22:00',rules:'Respetar las normas del Área de Deportes, aforo y equipamiento asignado.',state:'MANTENIMIENTO',image:'https://www.udep.edu.pe/vidauniversitaria/wp-content/uploads/sites/3/2024/02/Polideportivo-por-fuera-300x169.jpg'});}
function formatSheets_(){Object.keys(SIGRED.HEADERS).forEach(name=>{const sh=sh_(name);sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#00467a').setFontColor('#ffffff');sh.autoResizeColumns(1,sh.getLastColumn());});}
