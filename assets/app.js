
const SIGRED = {
  demoUsers: {
    "estudiante@udep.edu.pe": {password:"123456", role:"ESTUDIANTE", name:"Estudiante Demo", code:"20260001", phone:"999111222"},
    "docente@udep.edu.pe": {password:"123456", role:"DOCENTE", name:"Docente Demo", code:"DOC001", phone:"999222333"},
    "admin@udep.edu.pe": {password:"admin123", role:"ADMIN_DEPORTES", name:"Administrador Deportes", code:"ADM001", phone:"999333444"}
  },
  spaces: [
    {id:1,name:"Plataforma multiusos",capacity:425,location:"Campus Piura",dimensions:"44 x 44 m",disciplines:["Básquet","Vóley","Futsal","Balonmano","Tenis de campo"],hours:"07:00 – 22:00",rules:"Usar indumentaria deportiva, respetar aforo y dejar el espacio limpio.",state:"DISPONIBLE"},
    {id:2,name:"Cancha de fútbol",capacity:150,location:"Zona deportiva",dimensions:"Dimensiones reglamentarias",disciplines:["Fútbol","Futsal"],hours:"07:00 – 22:00",rules:"Uso deportivo, respetar turnos y condiciones del campo.",state:"DISPONIBLE"},
    {id:3,name:"Polideportivo",capacity:300,location:"Campus Piura",dimensions:"Espacio multideportivo",disciplines:["Básquet","Vóley","Futsal"],hours:"07:00 – 22:00",rules:"Respetar las normas del Área de Deportes.",state:"DISPONIBLE"}
  ],
  reservations: JSON.parse(localStorage.getItem("sigred_reservations") || "[]"),
  blocks: JSON.parse(localStorage.getItem("sigred_blocks") || "[]"),
  current: JSON.parse(localStorage.getItem("sigred_user") || "null")
};

function saveData(){
  localStorage.setItem("sigred_reservations", JSON.stringify(SIGRED.reservations));
  localStorage.setItem("sigred_blocks", JSON.stringify(SIGRED.blocks));
}
function saveUser(){ localStorage.setItem("sigred_user", JSON.stringify(SIGRED.current)); }
function qs(s){return document.querySelector(s)}
function qsa(s){return [...document.querySelectorAll(s)]}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(msg){const t=qs("#toast"); if(!t)return; t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function formatDate(v){if(!v)return ""; const d=new Date(v+"T00:00:00"); return d.toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"})}
function uid(){return Date.now()+Math.floor(Math.random()*1000)}
function getSpace(id){return SIGRED.spaces.find(s=>String(s.id)===String(id))||SIGRED.spaces[0]}
function roleLabel(r){return ({ESTUDIANTE:"Estudiante",DOCENTE:"Docente",ADMINISTRATIVO:"Administrativo",ADMIN_DEPORTES:"Administrador"}[r]||r)}
function requireAuth(admin=false){
  if(!SIGRED.current){location.href="P01-login.html";return false}
  if(admin && SIGRED.current.role!=="ADMIN_DEPORTES"){location.href="P03-disponibilidad.html";return false}
  return true
}
function logout(){SIGRED.current=null;saveUser();location.href="P01-login.html"}
function initNav(active){
  const nav=qs("#nav");
  if(!nav)return;
  const admin=SIGRED.current?.role==="ADMIN_DEPORTES";
  nav.innerHTML=admin ? `
    <a href="P03-disponibilidad.html" class="${active==="P03"?"active":""}">Disponibilidad</a>
    <a href="P11-solicitudes.html" class="${active==="P11"?"active":""}">Solicitudes</a>
    <a href="P12-espacios.html" class="${active==="P12"?"active":""}">Espacios</a>
    <a href="P13-bloqueos.html" class="${active==="P13"?"active":""}">Bloqueos</a>
    <a href="P14-reportes.html" class="${active==="P14"?"active":""}">Reportes</a>
  ` : `
    <a href="P03-disponibilidad.html" class="${active==="P03"?"active":""}">Disponibilidad</a>
    <a href="P07-mis-reservas.html" class="${active==="P07"?"active":""}">Mis reservas</a>
    <a href="P09-perfil.html" class="${active==="P09"?"active":""}">Mi perfil</a>
  `;
  const um=qs("#userMenu");
  if(um && SIGRED.current) um.innerHTML=`${esc(SIGRED.current.name)} <span>▾</span> <button onclick="logout()">Salir</button>`;
}
function shell(title,active,content){
  document.body.innerHTML=`<div class="app-shell">
    <header class="topbar"><div class="brand">SIGRED</div><nav class="nav" id="nav"></nav><div class="user-menu" id="userMenu"></div></header>
    <main class="container"><h1 class="page-title">${title}</h1>${content}</main>
    <div id="toast" class="toast"></div>
  </div>`;
  initNav(active);
}
function seedDemo(){
  if(SIGRED.reservations.length===0){
    SIGRED.reservations=[
      {id:101,user:"estudiante@udep.edu.pe",spaceId:1,discipline:"Vóley",date:"2026-10-07",start:"16:00",end:"18:00",participants:12,purpose:"Entrenamiento",state:"PENDIENTE",observation:"",createdAt:new Date().toISOString()},
      {id:102,user:"docente@udep.edu.pe",spaceId:1,discipline:"Básquet",date:"2026-10-07",start:"08:00",end:"09:00",participants:20,purpose:"Actividad académica",state:"CONFIRMADA",observation:"",createdAt:new Date().toISOString()},
      {id:103,user:"estudiante@udep.edu.pe",spaceId:2,discipline:"Fútbol",date:"2026-10-09",start:"10:00",end:"12:00",participants:22,purpose:"Entrenamiento",state:"RECHAZADA",observation:"Horario no disponible",createdAt:new Date().toISOString()}
    ];
    saveData();
  }
}
function overlaps(aStart,aEnd,bStart,bEnd){return aStart < bEnd && bStart < aEnd}
function hasConflict(spaceId,date,start,end,ignoreId=null){
  const rs=SIGRED.reservations.filter(r=>r.spaceId==spaceId&&r.date===date&&["PENDIENTE","CONFIRMADA"].includes(r.state)&&r.id!=ignoreId);
  const bs=SIGRED.blocks.filter(b=>b.spaceId==spaceId&&b.date===date);
  return rs.some(r=>overlaps(start,end,r.start,r.end)) || bs.some(b=>overlaps(start,end,b.start,b.end));
}
function statusClass(s){return s.toLowerCase().replace("_","-")}
function statusBadge(s){return `<span class="status ${statusClass(s)}">${esc(s)}</span>`}
function todayISO(){return new Date().toISOString().slice(0,10)}
function addDays(dateStr,n){const d=new Date(dateStr+"T00:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function mondayOf(dateStr){
  const d=new Date(dateStr+"T00:00:00"); const day=d.getDay(); const diff=day===0?-6:1-day; d.setDate(d.getDate()+diff); return d.toISOString().slice(0,10);
}
function renderCalendar(spaceId,startDate){
  const days=[]; for(let i=0;i<6;i++)days.push(addDays(startDate,i));
  const hours=["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00"];
  let html=`<div class="calendar-wrap"><table class="calendar"><thead><tr><th class="time">Hora</th>${days.map(d=>`<th>${new Date(d+"T00:00:00").toLocaleDateString("es-PE",{weekday:"short",day:"2-digit"})}</th>`).join("")}</tr></thead><tbody>`;
  for(let h=0;h<hours.length;h++){
    const start=hours[h], end=(h<7?String(8+h).padStart(2,"0"):"15")+":00";
    html+=`<tr><td class="time">${start}</td>`;
    for(const d of days){
      let state="LIBRE";
      const r=SIGRED.reservations.find(x=>x.spaceId==spaceId&&x.date===d&&["PENDIENTE","CONFIRMADA"].includes(x.state)&&overlaps(start,end,x.start,x.end));
      const b=SIGRED.blocks.find(x=>x.spaceId==spaceId&&x.date===d&&overlaps(start,end,x.start,x.end));
      if(b)state="BLOQUEADO"; else if(r)state=r.state==="PENDIENTE"?"PENDIENTE":"OCUPADO";
      html+=`<td class="cal-${state.toLowerCase()}" data-date="${d}" data-start="${start}" data-end="${end}" onclick="${state==="LIBRE" ? `location.href='P04-espacio.html?id=${spaceId}&date=${d}&start=${start}&end=${end}'` : ""}">${state[0]+state.slice(1).toLowerCase()}</td>`;
    }
    html+="</tr>";
  }
  html+="</tbody></table></div><div class='legend'><span><i style='background:#cfe8bb'></i>Libre</span><span><i style='background:#f3b4b7'></i>Ocupado</span><span><i style='background:#ffe3a3'></i>Pendiente</span><span><i style='background:#c8c8c8'></i>Bloqueado</span></div>";
  return html;
}
function apiConfig(){
  return localStorage.getItem("SIGRED_API_URL") || "";
}
async function api(action,payload={}){
  const url=apiConfig();
  if(!url) return {demo:true};
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,payload})});
  return await res.json();
}
seedDemo();
