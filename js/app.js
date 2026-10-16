/* SIGRED · Interfaz y controladores de pantalla */
(() => {
  const API=window.SIGRED_API, CFG=window.SIGRED_CONFIG;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const qs=()=>new URLSearchParams(location.search);
  const today=()=>new Date().toISOString().slice(0,10);
  const addDays=(d,n)=>{const x=new Date(`${d}T00:00:00`);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
  const monday=d=>{const x=new Date(`${d}T00:00:00`),day=x.getDay(),diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);return x.toISOString().slice(0,10)};
  const fmtDate=d=>d?new Date(`${d}T00:00:00`).toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"}):"—";
  const fmtDay=d=>new Date(`${d}T00:00:00`).toLocaleDateString("es-PE",{weekday:"short",day:"2-digit",month:"short"});
  const roleLabel=r=>({ESTUDIANTE:"Estudiante",DOCENTE:"Docente",ADMINISTRATIVO:"Administrativo",ADMIN_DEPORTES:"Administrador · Deportes"}[r]||r);
  const initials=n=>String(n||"U").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  const statusBadge=s=>`<span class="badge ${esc(s)}">${esc(String(s||"").replaceAll("_"," "))}</span>`;
  const icon=n=>({calendar:"▦",space:"◇",request:"↗",report:"▥",lock:"⌾",user:"○",block:"⊘",check:"✓",clock:"◷",settings:"⚙",plus:"＋",mail:"✉",key:"⌁",home:"⌂"}[n]||"•");
  const page=()=>document.body.dataset.page||"";
  const user=()=>API.currentUser();
  const isAdmin=()=>user()?.role==="ADMIN_DEPORTES";
  const isAuthPage=()=>["register","login","recover","reset"].includes(page());

  /* -------------------------------------------------------------------------
   * Recursos visuales y utilidades UI
   * -------------------------------------------------------------------------
   * - UDEP_MEDIA se configura en js/config.js para que cambiar una fotografía
   *   no obligue a modificar la lógica de las pantallas.
   * - img() añade lazy-loading y un fallback local para que el sistema siga
   *   viéndose correctamente incluso si una imagen remota no está disponible.
   */
  const MEDIA = CFG.UDEP_MEDIA || {};
  const localFallback = "assets/deportes-udep.jpg";
  function safeImage(src){ return src || localFallback; }
  function img(src,alt,extraClass=""){
    return `<img class="${esc(extraClass)}" src="${esc(safeImage(src))}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${localFallback}'">`;
  }
  function defaultSpaceImage(space){
    const n=String(space?.name||"").toLowerCase();
    if(n.includes("fútbol") || n.includes("futbol")) return MEDIA.futbolCampus || localFallback;
    if(n.includes("plataforma")) return MEDIA.polideportivoInterior || localFallback;
    if(n.includes("polideportivo")) return MEDIA.polideportivoExterior || MEDIA.polideportivoInterior || localFallback;
    return MEDIA.campusPiura || localFallback;
  }
  function spaceImage(space){ return space?.image || defaultSpaceImage(space); }

  /** Galería institucional usada en Disponibilidad. */
  function campusGalleryMarkup(){
    const items=[
      [MEDIA.futbolCampus,"Cancha de fútbol UDEP","Zona deportiva · Campus Piura"],
      [MEDIA.polideportivoInterior,"Interior del polideportivo","Espacio multideportivo"],
      [MEDIA.campusPiura,"Campus Piura","Universidad de Piura"],
      [MEDIA.gobiernoPiura,"Edificio de Gobierno","Campus Piura"],
      [MEDIA.edificioEPiura,"Edificio E","Campus Piura"]
    ].filter(x=>x[0]);
    if(!items.length) return "";
    return `<section class="campus-showcase reveal" aria-label="Galería del Campus Piura">
      <div class="showcase-head">
        <div><div class="eyebrow">Conoce los espacios</div><h2>Campus Piura · entorno UDEP</h2><p>Referencias visuales de páginas oficiales de la Universidad de Piura.</p></div>
        <div class="gallery-controls"><button class="icon-btn" id="galleryPrev" type="button" aria-label="Imagen anterior">←</button><button class="icon-btn" id="galleryNext" type="button" aria-label="Imagen siguiente">→</button></div>
      </div>
      <div class="campus-gallery" id="campusGallery">${items.map(([src,title,sub])=>`<article class="campus-shot">${img(src,title)}<div class="campus-shot-copy"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div></article>`).join("")}</div>
    </section>`;
  }

  /** Microinteracciones progresivas. No son necesarias para la funcionalidad. */
  function enhanceUI(){
    const nodes=$$(".card,.availability-hero,.campus-showcase,.campus-shot").filter(n=>!n.dataset.revealReady);
    if("IntersectionObserver" in window){
      const ob=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("is-visible");ob.unobserve(e.target)}}),{threshold:.08});
      nodes.forEach(n=>{n.dataset.revealReady="1";n.classList.add("reveal");ob.observe(n)});
    }else nodes.forEach(n=>n.classList.add("is-visible"));
    $$('img').forEach(im=>{if(im.complete)im.classList.add('image-ready');else im.addEventListener('load',()=>im.classList.add('image-ready'),{once:true})});
  }

  function bindGallery(){
    const g=$("#campusGallery"); if(!g)return;
    const step=()=>Math.min(g.clientWidth*.82,360);
    $("#galleryPrev")?.addEventListener("click",()=>g.scrollBy({left:-step(),behavior:"smooth"}));
    $("#galleryNext")?.addEventListener("click",()=>g.scrollBy({left:step(),behavior:"smooth"}));
  }

  function bindMobileCalendar(){
    const buttons=$$("[data-mobile-day]"); if(!buttons.length)return;
    const activate=(d)=>{buttons.forEach(b=>{const on=b.dataset.mobileDay===d;b.classList.toggle("active",on);b.setAttribute("aria-selected",on?"true":"false")});$$('[data-mobile-day-panel]').forEach(p=>p.classList.toggle("active",p.dataset.mobileDayPanel===d))};
    buttons.forEach(b=>b.onclick=()=>activate(b.dataset.mobileDay));
    const todayBtn=buttons.find(b=>b.dataset.mobileDay===today());activate((todayBtn||buttons[0]).dataset.mobileDay);
  }

  function toast(message,type="success",title){
    let host=$("#toastHost"); if(!host){host=document.createElement("div");host.id="toastHost";host.className="toast-host";document.body.appendChild(host)}
    const t=document.createElement("div");t.className=`toast ${type}`;t.innerHTML=`<div>${type==="error"?"!":"✓"}</div><div><strong>${esc(title|| (type==="error"?"Atención":"SIGRED"))}</strong><span>${esc(message)}</span></div><button class="toast-x" aria-label="Cerrar">×</button>`;
    host.appendChild(t);$(".toast-x",t).onclick=()=>t.remove();setTimeout(()=>t.remove(),4300);
  }
  window.sigredToast=toast;

  function modal(html){
    let m=$("#modalRoot");if(!m){m=document.createElement("div");m.id="modalRoot";m.className="modal";document.body.appendChild(m)}
    m.innerHTML=`<div class="modal-card">${html}</div>`;m.classList.add("show");m.onclick=e=>{if(e.target===m)closeModal()};return m;
  }
  function closeModal(){const m=$("#modalRoot");if(m)m.classList.remove("show")}
  window.closeSigredModal=closeModal;

  function navItems(){
    return isAdmin()?[
      ["P10-admin.html","admin","Panel"],["P03-disponibilidad.html","availability","Disponibilidad"],["P11-solicitudes.html","requests","Solicitudes"],["P12-espacios.html","spaces","Espacios"],["P13-bloqueos.html","blocks","Bloqueos"],["P14-reportes.html","reports","Reportes"]
    ]:[
      ["P03-disponibilidad.html","availability","Disponibilidad"],["P07-mis-reservas.html","my","Mis reservas"],["P09-perfil.html","profile","Mi perfil"]
    ];
  }
  function shell(title,subtitle,active,actions=""){
    const u=user();
    document.body.innerHTML=`<div class="app">
      <header class="topbar" id="topbar">
        <a class="brand" href="${isAdmin()?"P10-admin.html":"P03-disponibilidad.html"}" aria-label="Ir al inicio de SIGRED"><img src="assets/lsigred.png" alt="SIGRED"><div><span class="brand-name">SIGRED</span><span class="brand-sub">Gestión deportiva UDEP</span></div></a>
        <button class="icon-btn mobile-toggle" id="mobileToggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="mainNav">☰</button>
        <nav class="nav" id="mainNav" aria-label="Navegación principal">${navItems().map(([href,id,label])=>`<a href="${href}" class="${active===id?"active":""}">${label}</a>`).join("")}</nav>
        <div class="nav-scrim" id="navScrim" aria-hidden="true"></div>
        <div class="userbox"><div class="user-avatar" aria-hidden="true">${esc(initials(u?.name))}</div><div class="user-meta"><strong>${esc(u?.name||"")}</strong><span>${esc(roleLabel(u?.role))}</span></div><button class="icon-btn" id="logoutBtn" title="Cerrar sesión" aria-label="Cerrar sesión">↪</button></div>
      </header>
      <main class="main"><div class="page-head"><div><div class="breadcrumbs">SIGRED / ${esc(title)}</div><h1>${esc(title)}</h1><p>${esc(subtitle||"")}</p></div><div class="page-actions">${actions}</div></div><div id="mainContent"></div></main>
      <div id="toastHost" class="toast-host"></div><div id="modalRoot" class="modal"></div>
    </div>`;
    $("#logoutBtn").onclick=()=>{API.clearSession();location.href="P01-login.html"};

    // Menú móvil accesible: abre como panel flotante y se cierra al navegar o tocar fuera.
    const nav=$("#mainNav"),toggle=$("#mobileToggle"),scrim=$("#navScrim");
    const setMenu=(open)=>{nav.classList.toggle("open",open);scrim.classList.toggle("show",open);document.body.classList.toggle("nav-open",open);toggle.setAttribute("aria-expanded",open?"true":"false");toggle.textContent=open?"×":"☰"};
    toggle.onclick=()=>setMenu(!nav.classList.contains("open"));
    scrim.onclick=()=>setMenu(false);
    $$("a",nav).forEach(a=>a.addEventListener("click",()=>setMenu(false)));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")setMenu(false)},{once:false});

    // Sombra sutil al desplazarse: ayuda a separar la cabecera del contenido.
    const bar=$("#topbar"),syncHeader=()=>bar?.classList.toggle("scrolled",window.scrollY>8);
    window.addEventListener("scroll",syncHeader,{passive:true});syncHeader();
  }
  function requireAuth(admin=false){
    const u=user(); if(!u){location.replace("P01-login.html");return false}
    if(admin&&u.role!=="ADMIN_DEPORTES"){location.replace("P03-disponibilidad.html");return false}return true;
  }
  function setBusy(btn,busy,label="Procesando…"){ if(!btn)return; if(busy){btn.dataset.old=btn.innerHTML;btn.disabled=true;btn.textContent=label}else{btn.disabled=false;btn.innerHTML=btn.dataset.old||btn.innerHTML} }

  function authScaffold(inner,copy={}){
    document.body.innerHTML=`<div class="auth-page"><section class="auth-visual">
      <div class="auth-visual-photo" aria-hidden="true">${img(MEDIA.campusPiura||MEDIA.futbolCampus,"Campus Piura")}</div><div class="auth-visual-overlay" aria-hidden="true"></div>
      <div class="auth-brand"><img src="assets/logo-udep.png" alt="Universidad de Piura"><div><strong>SIGRED</strong><span>Universidad de Piura · Campus Piura</span></div></div>
      <div class="auth-copy"><div class="eyebrow auth-eyebrow">Sistema web de reservas</div><h1>${esc(copy.title||"Reserva deporte. Gana tiempo.")}</h1><p>${esc(copy.text||"Consulta disponibilidad, solicita espacios y da seguimiento a tus reservas desde una plataforma centralizada, clara y responsiva.")}</p>
      <div class="auth-feature-grid"><div class="auth-feature"><b>Calendario centralizado</b><span>Franjas libres, ocupadas, pendientes y bloqueadas.</span></div><div class="auth-feature"><b>Sin cruces</b><span>Validación de disponibilidad antes de registrar solicitudes.</span></div><div class="auth-feature"><b>Trazabilidad</b><span>Estados, historial y control para usuarios y Deportes.</span></div></div></div>
      <div class="auth-footnote">SIGRED · Prototipo académico navegable</div>
      </section><section class="auth-panel"><div class="auth-card"><img class="auth-logo-mobile" src="assets/logo-udep.png" alt="UDEP">${inner}</div></section></div><div id="toastHost" class="toast-host"></div>`;
  }
  function passwordField(id,label="Contraseña",placeholder="Mínimo 8 caracteres"){
    return `<div class="field"><label for="${id}">${label}</label><div class="input-wrap"><input id="${id}" type="password" placeholder="${placeholder}" required><button class="input-action" type="button" data-eye="${id}" aria-label="Mostrar contraseña">◉</button></div></div>`;
  }
  function bindEyes(){ $$('[data-eye]').forEach(b=>b.onclick=()=>{const i=$("#"+b.dataset.eye);i.type=i.type==="password"?"text":"password"}) }

  async function loginPage(){
    if(user()){location.replace(isAdmin()?"P10-admin.html":"P03-disponibilidad.html");return}
    authScaffold(`<h2>Bienvenido a SIGRED</h2><p class="sub">Ingresa con tu correo institucional para acceder según tu perfil.</p>
      <form id="loginForm" class="grid" style="gap:15px"><div class="field"><label>Correo institucional</label><input id="email" type="email" autocomplete="username" placeholder="usuario@udep.edu.pe" required></div>${passwordField("password")}
      <label class="small" style="display:flex;align-items:center;gap:8px;color:var(--muted)"><input id="remember" type="checkbox" checked style="width:auto;min-height:auto"> Mantener sesión en este equipo</label><button class="btn block" id="loginBtn">Ingresar al sistema</button></form>
      <div class="auth-links"><a href="P02-recuperar.html">¿Olvidaste tu contraseña?</a><a href="P00-crear-cuenta.html">Crear cuenta</a></div>
      <details class="demo-credentials"><summary>Credenciales de demostración</summary><table>${API.demoCredentials.map(x=>`<tr><td><b>${x[0]}</b></td><td><code>${x[1]}</code></td><td><code>${x[2]}</code></td></tr>`).join("")}</table><div class="small muted mt-1">Modo actual: <b>${API.mode()}</b></div></details>`,{title:"Tu espacio, en un clic.",text:"SIGRED transforma la gestión manual de reservas en un flujo digital con calendario, validación y seguimiento de solicitudes."});
    bindEyes();
    $("#loginForm").onsubmit=async e=>{e.preventDefault();const b=$("#loginBtn");setBusy(b,true,"Validando…");try{const r=await API.call("login",{email:$("#email").value,password:$("#password").value});API.setSession(r.token,r.user,$("#remember").checked);location.href=r.user.role==="ADMIN_DEPORTES"?"P10-admin.html":"P03-disponibilidad.html"}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
  }

  async function registerPage(){
    authScaffold(`<h2>Crear cuenta</h2><p class="sub">Registra una cuenta para solicitar espacios. El rol administrador no puede autoasignarse.</p><form id="regForm" class="grid" style="gap:14px">
      <div class="form-grid"><div class="field full"><label>Nombres y apellidos</label><input id="name" required placeholder="Nombres y apellidos"></div><div class="field"><label>Código institucional</label><input id="code" required placeholder="Código alumno/trabajador"></div><div class="field"><label>Perfil</label><select id="role"><option value="ESTUDIANTE">Estudiante</option><option value="DOCENTE">Docente</option><option value="ADMINISTRATIVO">Administrativo</option></select></div><div class="field full"><label>Correo institucional</label><input id="email" type="email" required placeholder="usuario@udep.edu.pe"></div><div class="field full"><label>Teléfono (opcional)</label><input id="phone" inputmode="tel" placeholder="999 999 999"></div>${passwordField("password","Contraseña")}${passwordField("password2","Confirmar contraseña")}</div>
      <div class="notice info">La cuenta se crea activa en este prototipo. Para producción, la UDEP puede incorporar verificación institucional y alta centralizada.</div><button class="btn block" id="regBtn">Crear cuenta</button></form><div class="auth-links"><a href="P01-login.html">← Volver al inicio de sesión</a></div>`,{title:"Empieza con una cuenta segura.",text:"Los perfiles de estudiante, docente y administrativo acceden al mismo flujo de consulta y reserva, con permisos definidos por rol."});
    bindEyes();
    $("#regForm").onsubmit=async e=>{e.preventDefault();if($("#password").value!==$("#password2").value){toast("Las contraseñas no coinciden.","error");return}const b=$("#regBtn");setBusy(b,true);try{await API.call("register",{name:$("#name").value,code:$("#code").value,role:$("#role").value,email:$("#email").value,phone:$("#phone").value,password:$("#password").value});toast("Cuenta creada. Ya puedes iniciar sesión.");setTimeout(()=>location.href="P01-login.html",900)}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
  }

  async function recoverPage(){
    authScaffold(`<h2>Recuperar contraseña</h2><p class="sub">Te enviaremos un enlace de restablecimiento al correo institucional registrado.</p><form id="recoverForm" class="grid" style="gap:15px"><div class="field"><label>Correo institucional</label><input id="email" type="email" required placeholder="usuario@udep.edu.pe"></div><button id="recoverBtn" class="btn block">Enviar enlace</button></form><div id="recoverResult" class="mt-2"></div><div class="auth-links"><a href="P01-login.html">← Volver al inicio</a></div>`,{title:"Recupera el acceso sin perder el ritmo.",text:"El flujo de recuperación genera un token temporal. Con Google Apps Script, SIGRED puede enviar el enlace por correo automáticamente."});
    $("#recoverForm").onsubmit=async e=>{e.preventDefault();const b=$("#recoverBtn");setBusy(b,true);try{const r=await API.call("requestPasswordReset",{email:$("#email").value});$("#recoverResult").innerHTML=`<div class="notice success">${esc(r.message||"Revisa tu correo institucional.")}${r.debugToken?`<br><span class="small">Modo demo: <a style="font-weight:800;text-decoration:underline" href="P02-restablecer.html?token=${encodeURIComponent(r.debugToken)}">abrir enlace de prueba</a></span>`:""}</div>`}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
  }

  async function resetPage(){
    const token=qs().get("token")||"";
    authScaffold(`<h2>Nueva contraseña</h2><p class="sub">Define una contraseña nueva para tu cuenta institucional.</p>${!token?'<div class="notice error">Falta el token de recuperación en el enlace.</div>':`<form id="resetForm" class="grid" style="gap:15px">${passwordField("password","Nueva contraseña")}${passwordField("password2","Confirmar nueva contraseña")}<button class="btn block" id="resetBtn">Actualizar contraseña</button></form>`}<div class="auth-links"><a href="P01-login.html">← Volver al inicio</a></div>`,{title:"Crea una nueva clave.",text:"Los enlaces de recuperación tienen vigencia limitada y se invalidan una vez utilizados."});
    bindEyes(); if(!token)return;
    $("#resetForm").onsubmit=async e=>{e.preventDefault();if($("#password").value!==$("#password2").value){toast("Las contraseñas no coinciden.","error");return}const b=$("#resetBtn");setBusy(b,true);try{await API.call("resetPassword",{token,newPassword:$("#password").value});toast("Contraseña actualizada.");setTimeout(()=>location.href="P01-login.html",900)}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
  }

  function getSpace(spaces,id){return spaces.find(x=>String(x.id)===String(id))||spaces[0]}
  function overlap(a,b,c,d){return a<d&&c<b}
  function slotState(space,date,start,end,reservations,blocks){
    if(space.state!=="DISPONIBLE")return "BLOQUEADO";
    if(blocks.some(b=>String(b.spaceId)===String(space.id)&&b.date===date&&overlap(start,end,b.start,b.end)))return "BLOQUEADO";
    const rs=reservations.filter(r=>String(r.spaceId)===String(space.id)&&r.date===date&&["PENDIENTE","CONFIRMADA"].includes(r.state)&&overlap(start,end,r.start,r.end));
    if(rs.some(r=>r.state==="CONFIRMADA"))return "OCUPADO"; if(rs.length)return "PENDIENTE"; return "LIBRE";
  }
  function nextHour(h){const n=Number(h.slice(0,2))+1;return `${String(n).padStart(2,"0")}:00`}
  function renderCalendar(space,startDate,reservations,blocks){
    const days=Array.from({length:7},(_,i)=>addDays(startDate,i));
    const hours=Array.from({length:(CFG.CALENDAR_END_HOUR-CFG.CALENDAR_START_HOUR)},(_,i)=>`${String(CFG.CALENDAR_START_HOUR+i).padStart(2,"0")}:00`);
    const admin=isAdmin();
    const slot=(d,st,en,mobile=false)=>{const state=slotState(space,d,st,en,reservations,blocks),cl={LIBRE:"free",OCUPADO:"busy",PENDIENTE:"pending",BLOQUEADO:"blocked"}[state];const clickable=state==="LIBRE"&&!admin;const body=mobile?`<span class="mobile-slot-time">${st}–${en}</span><span class="mobile-slot-state">${state[0]+state.slice(1).toLowerCase()}</span>`:(state[0]+state.slice(1).toLowerCase());return `<${clickable?"a":"div"} class="slot ${cl}${mobile?" mobile-slot":""}" ${clickable?`href="P04-espacio.html?id=${encodeURIComponent(space.id)}&date=${d}&start=${st}&end=${en}"`:""}>${body}</${clickable?"a":"div"}>`};

    return `<div class="calendar-shell">
      <div class="calendar-headline"><div><strong>Semana del ${fmtDate(startDate)}</strong><span>${esc(space.name)}</span></div><div class="legend"><span><i class="l-libre"></i>Libre</span><span><i class="l-ocupado"></i>Ocupado</span><span><i class="l-pendiente"></i>Pendiente</span><span><i class="l-bloqueado"></i>Bloqueado</span></div></div>
      <div class="calendar-desktop-view"><div class="calendar-scroll"><table class="calendar"><thead><tr><th>Hora</th>${days.map(d=>`<th>${fmtDay(d)}</th>`).join("")}</tr></thead><tbody>${hours.map(st=>{const en=nextHour(st);return `<tr><td class="time">${st}</td>${days.map(d=>`<td>${slot(d,st,en)}</td>`).join("")}</tr>`}).join("")}</tbody></table></div></div>
      <div class="calendar-mobile-view">
        <div class="mobile-day-tabs" role="tablist" aria-label="Días de la semana">${days.map(d=>`<button type="button" role="tab" data-mobile-day="${d}" aria-selected="false"><b>${new Date(`${d}T00:00:00`).toLocaleDateString("es-PE",{weekday:"short"})}</b><span>${new Date(`${d}T00:00:00`).toLocaleDateString("es-PE",{day:"2-digit",month:"short"})}</span></button>`).join("")}</div>
        <div class="mobile-day-panels">${days.map(d=>`<section class="mobile-day-panel" data-mobile-day-panel="${d}" role="tabpanel"><div class="mobile-day-title"><strong>${fmtDay(d)}</strong><span>Toca una franja libre para reservar</span></div><div class="mobile-slot-list">${hours.map(st=>slot(d,st,nextHour(st),true)).join("")}</div></section>`).join("")}</div>
      </div>
    </div>`;
  }

  async function availabilityPage(){
    if(!requireAuth())return;
    shell("Consulta de disponibilidad","Revisa el calendario semanal por espacio y selecciona únicamente franjas libres.","availability",!isAdmin()?`<a class="btn" href="P05-reserva.html">${icon("plus")} Nueva solicitud</a>`:"");
    const c=$("#mainContent");c.innerHTML='<div class="card skeleton-card">Cargando disponibilidad…</div>';
    try{
      const [spR,reR,blR]=await Promise.all([API.call("listSpaces"),API.call("listReservations"),API.call("listBlocks")]);
      const spaces=spR.data||[],reservations=reR.data||[],blocks=blR.data||[];
      c.innerHTML=`<section class="availability-hero reveal"><div class="availability-hero-photo">${img(MEDIA.futbolCampus||MEDIA.campusPiura,"Zona deportiva UDEP")}</div><div class="availability-hero-overlay"></div><div class="availability-hero-copy"><div class="eyebrow">Reserva inteligente</div><h2>Encuentra tu horario en segundos</h2><p>Selecciona un espacio, revisa su disponibilidad y registra tu solicitud desde cualquier dispositivo.</p><div class="hero-pills"><span>✓ Calendario semanal</span><span>✓ Validación de cruces</span><span>✓ Seguimiento de estado</span></div></div></section>
      <div class="section-heading"><div><div class="eyebrow">Espacios deportivos</div><h2>Elige dónde quieres reservar</h2></div><p>Las tarjetas se adaptan a móvil, tablet y escritorio. Toca una para cargar su calendario.</p></div>
      <div class="grid grid-3 space-grid" id="spaceCards">${spaces.map(s=>`<article class="card space-card floating" tabindex="0" role="button" aria-label="Consultar ${esc(s.name)}" data-spacecard="${esc(s.id)}"><div class="space-media">${img(spaceImage(s),s.name)}<div class="space-media-label">${esc(s.name)}</div><div class="space-state">${statusBadge(s.state)}</div></div><div class="space-body"><h3>${esc(s.name)}</h3><p class="space-location">${esc(s.location||"Campus Piura")}</p><div class="space-meta"><span>👥 ${esc(s.capacity)} personas</span><span>◷ ${esc(s.open)}–${esc(s.close)}</span></div><div class="chip-row">${(s.disciplines||[]).slice(0,4).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><div class="space-card-action">Ver disponibilidad <span>→</span></div></div></article>`).join("")}</div>
      <section class="card calendar-card mt-3"><div class="toolbar"><div class="field"><label>Espacio deportivo</label><select id="spaceSelect">${spaces.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div><div class="field compact"><label>Disciplina</label><select id="disciplineSelect"></select></div><div class="field compact"><label>Semana</label><input id="weekInput" type="date" value="${monday(today())}"></div><button class="btn secondary" id="todayBtn">Semana actual</button></div><div id="calendarSummary" class="calendar-filter-summary"></div><div id="cal"></div></section>
      ${campusGalleryMarkup()}`;
      const sp=$("#spaceSelect"),di=$("#disciplineSelect"),wk=$("#weekInput");
      const refreshDisc=()=>{const s=getSpace(spaces,sp.value);di.innerHTML='<option value="">Todas las disciplinas</option>'+s.disciplines.map(x=>`<option>${esc(x)}</option>`).join("")};
      const render=()=>{const s=getSpace(spaces,sp.value);$("#cal").innerHTML=renderCalendar(s,monday(wk.value||today()),reservations,blocks);$("#calendarSummary").innerHTML=`<span class="chip strong">${esc(s.name)}</span><span class="chip">${esc(di.value||"Todas las disciplinas")}</span><span class="chip">Semana: ${fmtDate(monday(wk.value||today()))}</span>`;$$('[data-spacecard]').forEach(x=>x.classList.toggle('selected',String(x.dataset.spacecard)===String(s.id)));bindMobileCalendar();enhanceUI()};
      sp.onchange=()=>{refreshDisc();render()};di.onchange=render;wk.onchange=render;$("#todayBtn").onclick=()=>{wk.value=monday(today());render()};
      $$('[data-spacecard]').forEach(x=>{const choose=()=>{sp.value=x.dataset.spacecard;refreshDisc();render();$(".calendar-card").scrollIntoView({behavior:"smooth",block:"start"})};x.onclick=choose;x.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose()}}});
      refreshDisc();render();bindGallery();enhanceUI();
    }catch(err){c.innerHTML=`<div class="notice error">${esc(err.message)}</div>`}
  }

  async function spaceDetailPage(){
    if(!requireAuth())return;const id=qs().get("id");const sr=await API.call("listSpaces");const s=getSpace(sr.data||[],id);shell("Detalle del espacio","Consulta condiciones, disciplinas y reglas antes de iniciar una solicitud.","availability");
    const p=qs();$("#mainContent").innerHTML=`<div class="detail-layout"><article class="card"><div class="hero-image">${img(spaceImage(s),s.name)}</div><div class="card-title mt-2"><div><div class="eyebrow">Espacio deportivo</div><h2>${esc(s.name)}</h2></div>${statusBadge(s.state)}</div><div class="chip-row">${s.disciplines.map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div></article><article class="card"><div class="card-title"><h2>Información del espacio</h2></div><dl class="detail-list"><dt>Dimensiones</dt><dd>${esc(s.dimensions)}</dd><dt>Capacidad máxima</dt><dd>${esc(s.capacity)} personas</dd><dt>Ubicación</dt><dd>${esc(s.location)}</dd><dt>Horario de atención</dt><dd>${esc(s.open)} – ${esc(s.close)}</dd><dt>Estado operativo</dt><dd>${statusBadge(s.state)}</dd></dl><hr style="border:0;border-top:1px solid var(--line);margin:22px 0"><h3>Reglas de uso</h3><p class="muted small" style="line-height:1.7">${esc(s.rules)}</p><div class="actions mt-3">${!isAdmin()&&s.state==="DISPONIBLE"?`<a class="btn" href="P05-reserva.html?space=${encodeURIComponent(s.id)}&date=${encodeURIComponent(p.get("date")||today())}&start=${encodeURIComponent(p.get("start")||"16:00")}&end=${encodeURIComponent(p.get("end")||"17:00")}">Solicitar este espacio</a>`:""}<a class="btn secondary" href="P03-disponibilidad.html">Volver al calendario</a></div></article></div>`;
  }

  async function reservationPage(){
    if(!requireAuth()||isAdmin()){if(isAdmin())location.replace("P03-disponibilidad.html");return}const sr=await API.call("listSpaces"),spaces=sr.data||[],p=qs();let s=getSpace(spaces,p.get("space"));shell("Solicitud de reserva","Completa los datos; SIGRED valida cruces, capacidad, horario y bloqueos antes de registrar.","availability");
    const render=()=>{$("#mainContent").innerHTML=`<div class="detail-layout"><article class="card"><div class="hero-image">${img(spaceImage(s),s.name)}</div><div class="card-title mt-2"><div><div class="eyebrow">Espacio seleccionado</div><h2>${esc(s.name)}</h2></div>${statusBadge(s.state)}</div><dl class="detail-list"><dt>Capacidad</dt><dd>${s.capacity} personas</dd><dt>Horario</dt><dd>${s.open} – ${s.close}</dd><dt>Disciplinas</dt><dd>${esc(s.disciplines.join(", "))}</dd></dl></article><article class="card"><form id="reserveForm"><div class="form-grid"><div class="field full"><label>Espacio</label><select id="space">${spaces.filter(x=>x.state==="DISPONIBLE").map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(s.id)?"selected":""}>${esc(x.name)}</option>`).join("")}</select></div><div class="field"><label>Fecha</label><input id="date" type="date" min="${today()}" value="${esc(p.get("date")||today())}" required></div><div class="field"><label>Disciplina</label><select id="discipline">${s.disciplines.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div><div class="field"><label>Hora de inicio</label><input id="start" type="time" value="${esc(p.get("start")||"16:00")}" min="${s.open}" max="${s.close}" required></div><div class="field"><label>Hora de fin</label><input id="end" type="time" value="${esc(p.get("end")||"17:00")}" min="${s.open}" max="${s.close}" required></div><div class="field"><label>N.º de participantes</label><input id="participants" type="number" min="1" max="${s.capacity}" value="12" required></div><div class="field full"><label>Finalidad de la actividad</label><textarea id="purpose" maxlength="240" required placeholder="Ej.: entrenamiento de vóley, actividad académica…"></textarea></div></div><div class="notice info mt-2">La solicitud se registra inicialmente como <b>PENDIENTE</b>. El Área de Deportes la aprobará o rechazará.</div><div class="actions mt-3"><button class="btn" id="sendBtn">Enviar solicitud</button><a class="btn secondary" href="P03-disponibilidad.html">Cancelar</a></div></form></article></div>`;
      $("#space").onchange=()=>{s=getSpace(spaces,$("#space").value);p.set("space",s.id);history.replaceState(null,"",`${location.pathname}?${p}`);render()};
      $("#reserveForm").onsubmit=async e=>{e.preventDefault();const b=$("#sendBtn");setBusy(b,true,"Validando…");try{const data={spaceId:s.id,date:$("#date").value,start:$("#start").value,end:$("#end").value,discipline:$("#discipline").value,participants:+$("#participants").value,purpose:$("#purpose").value};const r=await API.call("createReservation",data);sessionStorage.setItem("sigred_last_reservation",JSON.stringify(r.data));location.href=`P06-confirmacion.html?id=${encodeURIComponent(r.data.id)}`}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
    };render();
  }

  async function confirmationPage(){
    if(!requireAuth())return;shell("Solicitud registrada","Tu solicitud fue enviada y ya forma parte del historial de SIGRED.","my");let r=null;try{r=JSON.parse(sessionStorage.getItem("sigred_last_reservation")||"null")}catch{};
    if(!r){$("#mainContent").innerHTML='<div class="notice warning">No se encontró la última solicitud. Revisa “Mis reservas”.</div>';return}
    $("#mainContent").innerHTML=`<div class="card" style="max-width:760px;margin:auto;text-align:center;padding:38px"><div class="icon-tile" style="margin:auto;width:64px;height:64px;border-radius:20px;font-size:1.6rem">✓</div><div class="eyebrow mt-2">Solicitud ${esc(r.id)}</div><h2 style="font-size:1.65rem;margin:5px 0 8px">¡Solicitud enviada!</h2><p class="muted" style="line-height:1.6">El Área de Deportes revisará la información. El estado inicial es ${statusBadge(r.state)}</p><div class="grid grid-2 mt-3" style="text-align:left"><div class="notice info"><b>Espacio</b><br>${esc(r.spaceName)}</div><div class="notice info"><b>Fecha y horario</b><br>${fmtDate(r.date)} · ${esc(r.start)}–${esc(r.end)}</div></div><div class="actions mt-3" style="justify-content:center"><a class="btn" href="P07-mis-reservas.html">Ver mis reservas</a><a class="btn secondary" href="P03-disponibilidad.html">Volver al calendario</a></div></div>`;
  }

  async function myReservationsPage(){
    if(!requireAuth()||isAdmin()){if(isAdmin())location.replace("P10-admin.html");return}shell("Mis reservas","Consulta próximas reservas, solicitudes anteriores y el estado de cada gestión.","my",`<a class="btn" href="P03-disponibilidad.html">${icon("calendar")} Consultar disponibilidad</a>`);const r=await API.call("myReservations");const rs=r.data||[];const future=rs.filter(x=>["PENDIENTE","CONFIRMADA"].includes(x.state)&&`${x.date}T${x.end}`>=new Date().toISOString().slice(0,16)),history=rs.filter(x=>!future.includes(x));
    const table=list=>list.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Espacio</th><th>Fecha</th><th>Horario</th><th>Disciplina</th><th>Estado</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td><b>${esc(x.spaceName)}</b></td><td>${fmtDate(x.date)}</td><td>${esc(x.start)}–${esc(x.end)}</td><td>${esc(x.discipline)}</td><td>${statusBadge(x.state)}</td><td><a class="btn small secondary" href="P08-detalle.html?id=${encodeURIComponent(x.id)}">Ver detalle</a></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">◷</div><h3>Sin registros</h3><p>No hay reservas en esta sección.</p></div>`;
    $("#mainContent").innerHTML=`<div class="grid grid-2"><div class="card"><div class="card-title"><h2>Próximas</h2><span class="chip">${future.length} registros</span></div>${table(future)}</div><div class="card"><div class="card-title"><h2>Historial</h2><span class="chip">${history.length} registros</span></div>${table(history)}</div></div>`;
  }

  async function reservationDetailPage(){
    if(!requireAuth())return;const id=qs().get("id"),res=await API.call(isAdmin()?"listReservations":"myReservations"),r=(res.data||[]).find(x=>String(x.id)===String(id));shell("Detalle de reserva","Revisa todos los datos y la trazabilidad del estado.",isAdmin()?"requests":"my");if(!r){$("#mainContent").innerHTML='<div class="notice error">Reserva no encontrada.</div>';return}
    const canCancel=["PENDIENTE","CONFIRMADA"].includes(r.state)&&new Date(`${r.date}T${r.start}:00`)>new Date();
    $("#mainContent").innerHTML=`<div class="grid grid-2"><article class="card"><div class="card-title"><div><div class="eyebrow">Reserva ${esc(r.id)}</div><h2>${esc(r.spaceName)}</h2></div>${statusBadge(r.state)}</div><dl class="detail-list"><dt>Solicitante</dt><dd>${esc(r.userName||r.userEmail||"")}</dd><dt>Fecha</dt><dd>${fmtDate(r.date)}</dd><dt>Horario</dt><dd>${esc(r.start)} – ${esc(r.end)}</dd><dt>Disciplina</dt><dd>${esc(r.discipline)}</dd><dt>Participantes</dt><dd>${esc(r.participants)}</dd><dt>Finalidad</dt><dd>${esc(r.purpose)}</dd><dt>Observación</dt><dd>${esc(r.observation||"Sin observaciones")}</dd></dl></article><article class="card"><div class="eyebrow">Estado de la gestión</div><h2 class="mt-0">${esc(r.state)}</h2><p class="muted small" style="line-height:1.65">Las solicitudes nacen pendientes y solo el Administrador del Área de Deportes puede confirmarlas o rechazarlas. Los cambios quedan registrados para mantener trazabilidad.</p>${canCancel&&!isAdmin()?'<div class="notice warning mt-2">Puedes cancelar antes del inicio de la actividad.</div><button class="btn danger mt-2" id="cancelBtn">Cancelar reserva</button>':''}<div class="mt-3"><a class="btn secondary" href="${isAdmin()?"P11-solicitudes.html":"P07-mis-reservas.html"}">Volver</a></div></article></div>`;
    if($("#cancelBtn"))$("#cancelBtn").onclick=()=>{modal(`<div class="modal-head"><div><h3>Cancelar reserva</h3><p>Esta acción actualizará el estado y la trazabilidad.</p></div><button class="icon-btn" onclick="closeSigredModal()">×</button></div><div class="notice warning">¿Confirmas la cancelación de ${esc(r.spaceName)} el ${fmtDate(r.date)}?</div><div class="actions mt-3"><button class="btn danger" id="confirmCancel">Sí, cancelar</button><button class="btn secondary" onclick="closeSigredModal()">No</button></div>`);$("#confirmCancel").onclick=async()=>{try{await API.call("cancelReservation",{id:r.id});closeModal();toast("Reserva cancelada.");setTimeout(()=>location.reload(),500)}catch(err){toast(err.message,"error")}}};
  }

  async function profilePage(){
    if(!requireAuth())return;shell("Mi perfil","Mantén actualizados tus datos de contacto y gestiona las credenciales de acceso.","profile",`<a class="btn secondary" href="P15-cambiar-contrasena.html">${icon("key")} Cambiar contraseña</a>`);const r=await API.call("getProfile"),u=r.data||user();
    $("#mainContent").innerHTML=`<div class="grid grid-2"><article class="card"><div class="card-title"><div><div class="eyebrow">Datos institucionales</div><h2>${esc(u.name)}</h2></div><div class="user-avatar" style="width:54px;height:54px">${esc(initials(u.name))}</div></div><form id="profileForm"><div class="form-grid"><div class="field full"><label>Nombres y apellidos</label><input id="name" value="${esc(u.name)}" required></div><div class="field"><label>Código institucional</label><input value="${esc(u.code)}" disabled></div><div class="field"><label>Rol</label><input value="${esc(roleLabel(u.role))}" disabled></div><div class="field full"><label>Correo institucional</label><input value="${esc(u.email)}" disabled></div><div class="field full"><label>Teléfono</label><input id="phone" value="${esc(u.phone||"")}" inputmode="tel"></div></div><button class="btn mt-3" id="saveProfile">Guardar cambios</button></form></article><article class="card glow"><div class="eyebrow">Seguridad de la cuenta</div><h2>Credenciales y acceso</h2><p class="muted small" style="line-height:1.65">La versión con Google Sheets almacena la contraseña mediante hash derivado y utiliza tokens de sesión con expiración. No compartas tu contraseña.</p><div class="grid mt-2"><div class="notice info"><b>Correo de acceso</b><br>${esc(u.email)}</div><div class="notice info"><b>Perfil</b><br>${esc(roleLabel(u.role))}</div></div><a class="btn secondary mt-3" href="P15-cambiar-contrasena.html">Cambiar contraseña</a></article></div>`;
    $("#profileForm").onsubmit=async e=>{e.preventDefault();const b=$("#saveProfile");setBusy(b,true);try{const x=await API.call("updateProfile",{name:$("#name").value,phone:$("#phone").value});API.setSession(API.token(),x.data,true);toast("Perfil actualizado.");setTimeout(()=>location.reload(),500)}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
  }

  async function changePasswordPage(){
    if(!requireAuth())return;shell("Cambiar contraseña","Actualiza tus credenciales de forma segura.",isAdmin()?"admin":"profile");$("#mainContent").innerHTML=`<div class="card" style="max-width:640px"><form id="passForm" class="grid" style="gap:15px">${passwordField("current","Contraseña actual")}${passwordField("new","Nueva contraseña")}${passwordField("confirm","Confirmar nueva contraseña")}<div class="notice info">Usa al menos 8 caracteres. Evita reutilizar contraseñas de otros servicios.</div><div class="actions"><button class="btn" id="passBtn">Actualizar contraseña</button><a class="btn secondary" href="P09-perfil.html">Cancelar</a></div></form></div>`;bindEyes();$("#passForm").onsubmit=async e=>{e.preventDefault();if($("#new").value!==$("#confirm").value){toast("Las nuevas contraseñas no coinciden.","error");return}const b=$("#passBtn");setBusy(b,true);try{await API.call("changePassword",{currentPassword:$("#current").value,newPassword:$("#new").value});toast("Contraseña actualizada.");e.target.reset()}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
  }

  async function adminPage(){
    if(!requireAuth(true))return;shell("Panel de administración","Supervisa solicitudes, espacios, bloqueos y trazabilidad desde un único punto.","admin",`<button class="btn secondary" id="backendBtn">${icon("settings")} Conexión backend</button>`);const r=await API.call("dashboard"),d=r.data||{};
    $("#mainContent").innerHTML=`<article class="card admin-hero"><div class="admin-hero-media">${img(MEDIA.polideportivoInterior||MEDIA.campusPiura,"Polideportivo UDEP")}</div><div class="admin-hero-shade"></div><div class="admin-hero-content"><div class="backend-pill"><i></i>${API.mode()==="GOOGLE_SHEETS"?"Google Sheets conectado":"Modo DEMO local"}</div><h2>Control operativo de reservas</h2><p>Centraliza el flujo que antes dependía de WhatsApp, correo y atención presencial. Las solicitudes pendientes pueden revisarse y resolverse desde el panel.</p></div></article><div class="grid grid-4 mt-3"><article class="card kpi floating glow"><div class="icon-tile">${icon("request")}</div><div class="kpi-value">${d.pending??0}</div><div class="kpi-label">Solicitudes pendientes</div></article><article class="card kpi floating glow"><div class="icon-tile">${icon("check")}</div><div class="kpi-value">${d.confirmed??0}</div><div class="kpi-label">Reservas confirmadas</div></article><article class="card kpi floating glow"><div class="icon-tile">${icon("space")}</div><div class="kpi-value">${d.spaces??0}</div><div class="kpi-label">Espacios registrados</div></article><article class="card kpi floating glow"><div class="icon-tile">${icon("block")}</div><div class="kpi-value">${d.blocks??0}</div><div class="kpi-label">Bloqueos próximos</div></article></div>
    <div class="grid grid-3 mt-3"><a class="card floating quick-card" href="P11-solicitudes.html"><div class="icon-tile">${icon("request")}</div><div class="copy"><h3>Gestionar solicitudes</h3><p>Aprobar o rechazar solicitudes pendientes y registrar observaciones.</p></div><div class="arrow">→</div></a><a class="card floating quick-card" href="P12-espacios.html"><div class="icon-tile">${icon("space")}</div><div class="copy"><h3>Gestionar espacios</h3><p>Alta, edición, disciplinas, capacidad, reglas y estado operativo.</p></div><div class="arrow">→</div></a><a class="card floating quick-card" href="P14-reportes.html"><div class="icon-tile">${icon("report")}</div><div class="copy"><h3>Historial y reportes</h3><p>Consulta el uso de espacios por periodo y estado.</p></div><div class="arrow">→</div></a></div>`;
    $("#backendBtn").onclick=backendModal;
  }

  function backendModal(){
    modal(`<div class="modal-head"><div><h3>Conexión con Google Sheets</h3><p>Configura la URL de la Web App de Google Apps Script.</p></div><button class="icon-btn" onclick="closeSigredModal()">×</button></div><div class="field"><label>URL del backend</label><input id="apiUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(API.apiUrl())}"><span class="hint">Déjalo vacío para trabajar en modo DEMO con localStorage.</span></div><div id="apiStatus" class="mt-2"></div><div class="actions mt-3"><button class="btn" id="saveApi">Guardar y probar</button><button class="btn secondary" id="demoApi">Usar modo DEMO</button></div>`);
    $("#saveApi").onclick=async()=>{API.setApiUrl($("#apiUrl").value);try{const h=await API.call("health");$("#apiStatus").innerHTML=`<div class="notice success">Backend activo: ${esc(h.service||"SIGRED")}</div>`;toast("Conexión guardada.");setTimeout(()=>location.reload(),650)}catch(err){$("#apiStatus").innerHTML=`<div class="notice error">${esc(err.message)}</div>`}};
    $("#demoApi").onclick=()=>{API.setApiUrl("");toast("Modo DEMO activado.");setTimeout(()=>location.reload(),500)};
  }

  async function requestsPage(){
    if(!requireAuth(true))return;shell("Solicitudes pendientes","Revisa los datos, aprueba o rechaza y registra una observación cuando sea necesario.","requests");const r=await API.call("pendingReservations"),rs=r.data||[];
    $("#mainContent").innerHTML=`<div class="grid grid-4"><article class="card kpi"><div class="kpi-value">${rs.length}</div><div class="kpi-label">Pendientes por revisar</div></article><article class="card kpi"><div class="kpi-value">${new Set(rs.map(x=>x.spaceId)).size}</div><div class="kpi-label">Espacios involucrados</div></article><article class="card kpi"><div class="kpi-value">${rs.reduce((a,x)=>a+(+x.participants||0),0)}</div><div class="kpi-label">Participantes solicitados</div></article><article class="card kpi"><div class="kpi-value">${rs.filter(x=>x.date===today()).length}</div><div class="kpi-label">Solicitudes para hoy</div></article></div><div class="card mt-3"><div class="card-title"><h2>Bandeja de solicitudes</h2><span class="chip">${rs.length} pendientes</span></div>${rs.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Solicitante</th><th>Espacio</th><th>Fecha</th><th>Horario</th><th>Disciplina</th><th>Participantes</th><th>Acciones</th></tr></thead><tbody>${rs.map(x=>`<tr><td><b>${esc(x.userName||x.userEmail)}</b><br><span class="muted small">${esc(x.userEmail||"")}</span></td><td>${esc(x.spaceName)}</td><td>${fmtDate(x.date)}</td><td>${esc(x.start)}–${esc(x.end)}</td><td>${esc(x.discipline)}</td><td>${esc(x.participants)}</td><td><div class="table-actions"><button class="btn small success" data-resolve="${esc(x.id)}" data-state="CONFIRMADA">Aprobar</button><button class="btn small danger" data-resolve="${esc(x.id)}" data-state="RECHAZADA">Rechazar</button></div></td></tr>`).join("")}</tbody></table></div>`:'<div class="empty"><div class="empty-icon">✓</div><h3>Sin solicitudes pendientes</h3><p>La bandeja está al día.</p></div>'}</div>`;
    $$('[data-resolve]').forEach(b=>b.onclick=()=>resolveModal(rs.find(x=>String(x.id)===String(b.dataset.resolve)),b.dataset.state));
  }
  function resolveModal(r,state){modal(`<div class="modal-head"><div><h3>${state==="CONFIRMADA"?"Aprobar":"Rechazar"} solicitud</h3><p>${esc(r.spaceName)} · ${fmtDate(r.date)} · ${esc(r.start)}–${esc(r.end)}</p></div><button class="icon-btn" onclick="closeSigredModal()">×</button></div><div class="notice ${state==="CONFIRMADA"?"success":"warning"}"><b>Solicitante:</b> ${esc(r.userName||r.userEmail)}<br><b>Finalidad:</b> ${esc(r.purpose||"—")}</div><div class="field mt-2"><label>Observación (opcional)</label><textarea id="resolveObs" placeholder="Comentario para el solicitante"></textarea></div><div class="actions mt-3"><button class="btn ${state==="CONFIRMADA"?"success":"danger"}" id="resolveConfirm">Confirmar decisión</button><button class="btn secondary" onclick="closeSigredModal()">Cancelar</button></div>`);$("#resolveConfirm").onclick=async()=>{try{await API.call("resolveReservation",{id:r.id,state,observation:$("#resolveObs").value});closeModal();toast(`Solicitud ${state==="CONFIRMADA"?"aprobada":"rechazada"}.`);setTimeout(()=>location.reload(),500)}catch(err){toast(err.message,"error")}}}

  async function spacesPage(){
    if(!requireAuth(true))return;shell("Gestión de espacios","Administra información, disciplinas, capacidad, reglas y estado operativo.","spaces",`<button class="btn" id="newSpace">${icon("plus")} Nuevo espacio</button>`);const r=await API.call("listSpaces"),spaces=r.data||[];const draw=()=>{$("#mainContent").innerHTML=`<div class="grid grid-3">${spaces.map(s=>`<article class="card space-card floating"><div class="space-media">${img(spaceImage(s),s.name)}<div class="space-state">${statusBadge(s.state)}</div></div><div class="space-body"><div class="card-title"><div><h3>${esc(s.name)}</h3><p>${esc(s.location)}</p></div></div><div class="space-meta"><span>👥 ${esc(s.capacity)}</span><span>◷ ${esc(s.open)}–${esc(s.close)}</span></div><div class="chip-row">${s.disciplines.map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><button class="btn secondary small mt-2" data-editspace="${esc(s.id)}">Editar espacio</button></div></article>`).join("")}</div>`;$$('[data-editspace]').forEach(b=>b.onclick=()=>spaceModal(spaces.find(s=>String(s.id)===String(b.dataset.editspace))))};draw();$("#newSpace").onclick=()=>spaceModal(null);
  }
  function spaceModal(s){
    modal(`<div class="modal-head"><div><h3>${s?"Editar":"Nuevo"} espacio deportivo</h3><p>Configura los datos utilizados por el calendario y las validaciones.</p></div><button class="icon-btn" onclick="closeSigredModal()">×</button></div><form id="spaceForm"><div class="form-grid"><div class="field full"><label>Nombre</label><input id="spName" value="${esc(s?.name||"")}" required></div><div class="field"><label>Capacidad máxima</label><input id="spCapacity" type="number" min="1" value="${esc(s?.capacity||"")}" required></div><div class="field"><label>Estado</label><select id="spState">${["DISPONIBLE","NO_DISPONIBLE","MANTENIMIENTO"].map(x=>`<option ${s?.state===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="field full"><label>Ubicación</label><input id="spLocation" value="${esc(s?.location||"")}" required></div><div class="field"><label>Dimensiones</label><input id="spDimensions" value="${esc(s?.dimensions||"")}"></div><div class="field"><label>Horario</label><div style="display:flex;gap:8px"><input id="spOpen" type="time" value="${esc(s?.open||"07:00")}"><input id="spClose" type="time" value="${esc(s?.close||"22:00")}"></div></div><div class="field full"><label>Disciplinas (separadas por coma)</label><input id="spDisc" value="${esc((s?.disciplines||[]).join(", "))}" required></div><div class="field full"><label>URL de imagen (opcional)</label><input id="spImage" type="url" value="${esc(s?.image||defaultSpaceImage(s))}" placeholder="https://..."><span class="hint">Puedes usar una imagen institucional o dejar el fallback local.</span></div><div class="field full"><label>Reglas de uso</label><textarea id="spRules">${esc(s?.rules||"")}</textarea></div></div><div class="actions mt-3"><button class="btn" id="spaceSave">Guardar espacio</button><button type="button" class="btn secondary" onclick="closeSigredModal()">Cancelar</button></div></form>`);
    $("#spaceForm").onsubmit=async e=>{e.preventDefault();const b=$("#spaceSave");setBusy(b,true);try{await API.call("saveSpace",{id:s?.id||"",name:$("#spName").value,capacity:+$("#spCapacity").value,state:$("#spState").value,location:$("#spLocation").value,dimensions:$("#spDimensions").value,open:$("#spOpen").value,close:$("#spClose").value,disciplines:$("#spDisc").value,image:$("#spImage").value,rules:$("#spRules").value});closeModal();toast("Espacio guardado.");setTimeout(()=>location.reload(),450)}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
  }

  async function blocksPage(){
    if(!requireAuth(true))return;shell("Bloqueos de horario","Registra mantenimientos, actividades institucionales u otros motivos que deben bloquear el calendario.","blocks");const [sr,br]=await Promise.all([API.call("listSpaces"),API.call("listBlocks")]);const spaces=sr.data||[],blocks=(br.data||[]).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    $("#mainContent").innerHTML=`<div class="grid grid-2"><article class="card"><div class="card-title"><h2>Registrar bloqueo</h2></div><form id="blockForm"><div class="form-grid"><div class="field full"><label>Espacio</label><select id="bSpace">${spaces.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div><div class="field"><label>Fecha</label><input id="bDate" type="date" min="${today()}" value="${today()}" required></div><div class="field"><label>Tipo</label><select id="bType"><option>MANTENIMIENTO</option><option>ACTIVIDAD_INSTITUCIONAL</option><option>OTRO</option></select></div><div class="field"><label>Desde</label><input id="bStart" type="time" value="14:00" required></div><div class="field"><label>Hasta</label><input id="bEnd" type="time" value="16:00" required></div><div class="field full"><label>Motivo</label><textarea id="bReason" required placeholder="Describe el motivo del bloqueo"></textarea></div></div><button class="btn mt-3" id="blockBtn">Registrar bloqueo</button></form></article><article class="card"><div class="card-title"><h2>Bloqueos registrados</h2><span class="chip">${blocks.length}</span></div>${blocks.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Espacio</th><th>Fecha</th><th>Horario</th><th>Motivo</th><th></th></tr></thead><tbody>${blocks.map(b=>`<tr><td>${esc(b.spaceName)}</td><td>${fmtDate(b.date)}</td><td>${esc(b.start)}–${esc(b.end)}</td><td>${esc(b.reason||b.type)}</td><td><button class="btn small danger" data-delblock="${esc(b.id)}">Eliminar</button></td></tr>`).join("")}</tbody></table></div>`:'<div class="empty"><h3>Sin bloqueos</h3><p>No hay bloqueos registrados.</p></div>'}</article></div>`;
    $("#blockForm").onsubmit=async e=>{e.preventDefault();const b=$("#blockBtn");setBusy(b,true);try{await API.call("createBlock",{spaceId:$("#bSpace").value,date:$("#bDate").value,start:$("#bStart").value,end:$("#bEnd").value,type:$("#bType").value,reason:$("#bReason").value});toast("Bloqueo registrado.");setTimeout(()=>location.reload(),450)}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}};
    $$('[data-delblock]').forEach(b=>b.onclick=async()=>{if(!confirm("¿Eliminar este bloqueo?"))return;try{await API.call("deleteBlock",{id:b.dataset.delblock});toast("Bloqueo eliminado.");setTimeout(()=>location.reload(),400)}catch(err){toast(err.message,"error")}});
  }

  async function reportsPage(){
    if(!requireAuth(true))return;shell("Historial y reportes","Analiza el uso de los espacios por periodo, estado y espacio deportivo.","reports");const sr=await API.call("listSpaces"),spaces=sr.data||[];$("#mainContent").innerHTML=`<div class="card"><div class="toolbar"><div class="field"><label>Espacio</label><select id="rSpace"><option value="">Todos</option>${spaces.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div><div class="field compact"><label>Desde</label><input id="rFrom" type="date" value="${addDays(today(),-30)}"></div><div class="field compact"><label>Hasta</label><input id="rTo" type="date" value="${today()}"></div><button class="btn" id="runReport">Actualizar reporte</button></div></div><div id="reportBody" class="mt-3"></div>`;
    const run=async()=>{const rb=$("#reportBody");rb.innerHTML='<div class="card">Generando reporte…</div>';try{const rr=await API.call("historyReport",{spaceId:$("#rSpace").value,from:$("#rFrom").value,to:$("#rTo").value}),rs=rr.data?.reservations||[];const count=st=>rs.filter(x=>x.state===st).length;const bySpace=spaces.map(s=>({name:s.name,n:rs.filter(x=>String(x.spaceId)===String(s.id)).length})).sort((a,b)=>b.n-a.n),max=Math.max(1,...bySpace.map(x=>x.n));rb.innerHTML=`<div class="grid grid-4"><article class="card kpi"><div class="kpi-value">${rs.length}</div><div class="kpi-label">Solicitudes del periodo</div></article><article class="card kpi"><div class="kpi-value">${count("CONFIRMADA")}</div><div class="kpi-label">Confirmadas</div></article><article class="card kpi"><div class="kpi-value">${count("PENDIENTE")}</div><div class="kpi-label">Pendientes</div></article><article class="card kpi"><div class="kpi-value">${count("RECHAZADA")+count("CANCELADA")}</div><div class="kpi-label">Rechazadas / canceladas</div></article></div><div class="grid grid-2 mt-3"><article class="card"><div class="card-title"><h2>Uso por espacio</h2></div><div class="chart">${bySpace.map(x=>`<div class="bar-col"><div class="bar-value">${x.n}</div><div class="bar" style="height:${Math.max(5,(x.n/max)*175)}px"></div><div class="bar-label">${esc(x.name)}</div></div>`).join("")}</div></article><article class="card"><div class="card-title"><h2>Detalle de reservas</h2><span class="chip">${rs.length}</span></div>${rs.length?`<div class="table-wrap" style="max-height:355px"><table class="table"><thead><tr><th>Fecha</th><th>Espacio</th><th>Estado</th><th>Usuario</th></tr></thead><tbody>${rs.sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start)).map(x=>`<tr><td>${fmtDate(x.date)}<br><span class="small muted">${x.start}–${x.end}</span></td><td>${esc(x.spaceName)}</td><td>${statusBadge(x.state)}</td><td>${esc(x.userName||x.userEmail||"")}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty"><h3>Sin datos</h3><p>No hay reservas para los filtros seleccionados.</p></div>'}</article></div>`}catch(err){rb.innerHTML=`<div class="notice error">${esc(err.message)}</div>`}};$("#runReport").onclick=run;run();
  }

  const routes={login:loginPage,register:registerPage,recover:recoverPage,reset:resetPage,availability:availabilityPage,space:spaceDetailPage,reserve:reservationPage,confirmation:confirmationPage,my:myReservationsPage,detail:reservationDetailPage,profile:profilePage,changePassword:changePasswordPage,admin:adminPage,requests:requestsPage,spaces:spacesPage,blocks:blocksPage,reports:reportsPage};
  async function init(){try{const fn=routes[page()];if(!fn)throw new Error(`Pantalla no reconocida: ${page()}`);await fn();enhanceUI()}catch(err){console.error(err);if(isAuthPage())toast(err.message,"error");else{if(!$("#mainContent"))shell("Error","No se pudo cargar la pantalla.","");$("#mainContent").innerHTML=`<div class="notice error">${esc(err.message)}</div>`}}}
  document.addEventListener("DOMContentLoaded",init);
})();
