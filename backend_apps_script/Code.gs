
/**
 * SIGRED - Backend gratuito con Google Sheets
 * 1) Crea una hoja de cálculo.
 * 2) Extensiones > Apps Script.
 * 3) Pega este código.
 * 4) Cambia SPREADSHEET_ID.
 * 5) Implementa como aplicación web: ejecutar como tú / acceso según tu política.
 *
 * Hojas recomendadas:
 * usuarios, espacios, reservas, bloqueos, historial, notificaciones
 *
 * El frontend puede guardar la URL del Web App en localStorage:
 * localStorage.setItem("SIGRED_API_URL","https://script.google.com/macros/s/.../exec")
 *
 * NOTA: este backend es una versión demostrativa/prototipo. Para producción
 * universitaria se recomienda PostgreSQL + API REST como en el documento.
 */
const SPREADSHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET";

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function sheet_(name){
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}
function rows_(name){
  const sh=sheet_(name); if(!sh) return [];
  const values=sh.getDataRange().getValues();
  if(values.length<2) return [];
  const headers=values.shift();
  return values.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}
function doGet(e){ return json_({ok:true,service:"SIGRED",message:"Backend activo"}); }

function doPost(e){
  try{
    const req=JSON.parse(e.postData.contents||"{}");
    const action=req.action, p=req.payload||{};
    switch(action){
      case "listReservations": return json_({ok:true,data:rows_("reservas")});
      case "listSpaces": return json_({ok:true,data:rows_("espacios")});
      case "listBlocks": return json_({ok:true,data:rows_("bloqueos")});
      case "createReservation": return createReservation_(p);
      case "resolveReservation": return resolveReservation_(p);
      case "createBlock": return createBlock_(p);
      case "deleteBlock": return deleteBlock_(p);
      default: return json_({ok:false,error:"Acción no implementada"});
    }
  }catch(err){ return json_({ok:false,error:String(err)}); }
}
function append_(name,obj){
  const sh=sheet_(name);
  if(!sh) throw new Error("No existe la hoja "+name);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(h=>obj[h]??""));
}
function createReservation_(p){
  // Validación básica de cruce en Sheets.
  const rs=rows_("reservas");
  const conflict=rs.some(r=>String(r.espacio_id)==String(p.espacio_id)&&
    String(r.fecha)==String(p.fecha)&&["PENDIENTE","CONFIRMADA"].includes(String(r.estado))&&
    String(p.hora_inicio)<String(r.hora_fin)&&String(r.hora_inicio)<String(p.hora_fin));
  if(conflict) return json_({ok:false,error:"Existe un cruce de horario"});
  append_("reservas",{id:p.id,usuario:p.usuario,espacio_id:p.espacio_id,disciplina:p.disciplina,
    fecha:p.fecha,hora_inicio:p.hora_inicio,hora_fin:p.hora_fin,participantes:p.participantes,
    finalidad:p.finalidad,estado:"PENDIENTE",observacion:""});
  return json_({ok:true});
}
function resolveReservation_(p){
  const sh=sheet_("reservas"), values=sh.getDataRange().getValues(), h=values[0];
  const idCol=h.indexOf("id"), stateCol=h.indexOf("estado"), obsCol=h.indexOf("observacion");
  for(let i=1;i<values.length;i++){
    if(String(values[i][idCol])===String(p.id)){
      sh.getRange(i+1,stateCol+1).setValue(p.estado);
      if(obsCol>=0) sh.getRange(i+1,obsCol+1).setValue(p.observacion||"");
      return json_({ok:true});
    }
  }
  return json_({ok:false,error:"Reserva no encontrada"});
}
function createBlock_(p){
  append_("bloqueos",{id:p.id,espacio_id:p.espacio_id,fecha:p.fecha,hora_inicio:p.hora_inicio,
    hora_fin:p.hora_fin,tipo:p.tipo,motivo:p.motivo||""});
  return json_({ok:true});
}
function deleteBlock_(p){
  const sh=sheet_("bloqueos"), values=sh.getDataRange().getValues(), h=values[0], idCol=h.indexOf("id");
  for(let i=values.length-1;i>=1;i--){
    if(String(values[i][idCol])===String(p.id)){sh.deleteRow(i+1);return json_({ok:true});}
  }
  return json_({ok:false,error:"Bloqueo no encontrado"});
}
