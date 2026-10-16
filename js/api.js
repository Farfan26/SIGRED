/* SIGRED · Capa de acceso a datos.
   Si existe una URL de Apps Script usa el backend; si no, usa una base DEMO local. */
(() => {
  const CFG = window.SIGRED_CONFIG || {};
  const K = {
    api: "sigred_api_url",
    token: "sigred_token",
    user: "sigred_user",
    db: "sigred_demo_db"
  };

  const nowIso = () => new Date().toISOString();
  const uid = (p="id") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const normalizeEmail = v => String(v||"").trim().toLowerCase();
  const dateOnly = d => new Date(d).toISOString().slice(0,10);
  const addDays = (d,n) => { const x=new Date(`${d}T00:00:00`); x.setDate(x.getDate()+n); return dateOnly(x); };

  function apiUrl(){ return localStorage.getItem(K.api) || CFG.API_URL || ""; }
  function setApiUrl(url){
    const clean=String(url||"").trim();
    if(clean) localStorage.setItem(K.api,clean); else localStorage.removeItem(K.api);
  }
  function token(){ return sessionStorage.getItem(K.token) || localStorage.getItem(K.token) || ""; }
  function currentUser(){
    try { return JSON.parse(sessionStorage.getItem(K.user) || localStorage.getItem(K.user) || "null"); } catch { return null; }
  }
  function setSession(t,u,remember=true){
    clearSession();
    const store=remember?localStorage:sessionStorage;
    if(t) store.setItem(K.token,t);
    if(u) store.setItem(K.user,JSON.stringify(u));
  }
  function clearSession(){
    [localStorage,sessionStorage].forEach(s=>{s.removeItem(K.token);s.removeItem(K.user)});
  }

  function seedDb(){
    let db=null;
    try{ db=JSON.parse(localStorage.getItem(K.db)||"null"); }catch{}
    if(db && db.version===4) return db;
    const today=dateOnly(new Date());
    db={
      version:4,
      users:[
        {id:"u_est",email:"estudiante@udep.edu.pe",password:"123456",role:"ESTUDIANTE",name:"Estudiante Demo",code:"20260001",phone:"999111222",status:"ACTIVO",createdAt:nowIso()},
        {id:"u_doc",email:"docente@udep.edu.pe",password:"123456",role:"DOCENTE",name:"Docente Demo",code:"DOC001",phone:"999222333",status:"ACTIVO",createdAt:nowIso()},
        {id:"u_adm",email:"administrativo@udep.edu.pe",password:"123456",role:"ADMINISTRATIVO",name:"Administrativo Demo",code:"ADM-UDEP-01",phone:"999222111",status:"ACTIVO",createdAt:nowIso()},
        {id:"u_admin",email:"admin@udep.edu.pe",password:"admin123",role:"ADMIN_DEPORTES",name:"Administrador de Deportes",code:"DEP001",phone:"999333444",status:"ACTIVO",createdAt:nowIso()}
      ],
      spaces:[
        {id:"esp_1",name:"Plataforma multiusos",capacity:425,location:"Zona deportiva · Campus Piura",dimensions:"44 × 44 m",disciplines:["Básquet","Vóley","Futsal","Balonmano","Tenis de campo"],open:"07:00",close:"22:00",rules:"Usar indumentaria deportiva, respetar el aforo, cumplir el horario asignado y dejar el espacio limpio.",state:"DISPONIBLE",image:(CFG.UDEP_MEDIA?.polideportivoInterior||"assets/deportes-udep.jpg")},
        {id:"esp_2",name:"Cancha de fútbol",capacity:150,location:"Zona deportiva · Campus Piura",dimensions:"Dimensiones reglamentarias",disciplines:["Fútbol","Futsal"],open:"07:00",close:"22:00",rules:"Respetar turnos, condiciones del campo y las indicaciones del personal del Área de Deportes.",state:"DISPONIBLE",image:(CFG.UDEP_MEDIA?.futbolCampus||"assets/deportes-udep.jpg")},
        {id:"esp_3",name:"Polideportivo",capacity:300,location:"Campus Piura",dimensions:"Espacio multideportivo",disciplines:["Básquet","Vóley","Futsal"],open:"07:00",close:"22:00",rules:"Respetar las normas del Área de Deportes, aforo y equipamiento asignado.",state:"MANTENIMIENTO",image:(CFG.UDEP_MEDIA?.polideportivoExterior||"assets/deportes-udep.jpg")}
      ],
      reservations:[
        {id:"r_101",userId:"u_est",userEmail:"estudiante@udep.edu.pe",userName:"Estudiante Demo",spaceId:"esp_1",discipline:"Vóley",date:addDays(today,1),start:"16:00",end:"18:00",participants:12,purpose:"Entrenamiento",state:"PENDIENTE",observation:"",createdAt:nowIso()},
        {id:"r_102",userId:"u_doc",userEmail:"docente@udep.edu.pe",userName:"Docente Demo",spaceId:"esp_1",discipline:"Básquet",date:addDays(today,2),start:"08:00",end:"10:00",participants:20,purpose:"Actividad académica",state:"CONFIRMADA",observation:"",createdAt:nowIso()},
        {id:"r_103",userId:"u_est",userEmail:"estudiante@udep.edu.pe",userName:"Estudiante Demo",spaceId:"esp_2",discipline:"Fútbol",date:addDays(today,-3),start:"10:00",end:"12:00",participants:22,purpose:"Entrenamiento",state:"RECHAZADA",observation:"Horario reservado para selección",createdAt:nowIso()}
      ],
      blocks:[
        {id:"b_1",spaceId:"esp_2",date:addDays(today,3),start:"14:00",end:"17:00",type:"MANTENIMIENTO",reason:"Mantenimiento preventivo",createdBy:"u_admin",createdAt:nowIso()}
      ],
      history:[],
      resetTokens:[]
    };
    localStorage.setItem(K.db,JSON.stringify(db));
    return db;
  }
  function saveDb(db){ localStorage.setItem(K.db,JSON.stringify(db)); }
  function overlaps(a,b,c,d){ return a<d && c<b; }
  function spaceName(db,id){ return db.spaces.find(s=>String(s.id)===String(id))?.name || "Espacio"; }
  function authDemo(){
    const u=currentUser(); if(!u) throw new Error("Sesión no válida. Vuelve a iniciar sesión."); return u;
  }
  function isAdmin(u){ return u?.role==="ADMIN_DEPORTES"; }
  function requireAdminDemo(){ const u=authDemo(); if(!isAdmin(u)) throw new Error("No tienes permisos para esta operación."); return u; }
  function enrichReservation(db,r){ return {...r,spaceName:spaceName(db,r.spaceId)}; }

  async function demo(action,p={}){
    await new Promise(r=>setTimeout(r,90));
    const db=seedDb();
    switch(action){
      case "health": return {ok:true,mode:"DEMO",service:"SIGRED Demo",time:nowIso()};
      case "register": {
        const email=normalizeEmail(p.email);
        if(!email.endsWith(`@${CFG.EMAIL_DOMAIN||"udep.edu.pe"}`)) throw new Error("Usa un correo institucional @udep.edu.pe.");
        if(db.users.some(u=>u.email===email)) throw new Error("El correo ya está registrado.");
        if(String(p.password||"").length<8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        const u={id:uid("u"),email,password:p.password,role:p.role&&["ESTUDIANTE","DOCENTE","ADMINISTRATIVO"].includes(p.role)?p.role:"ESTUDIANTE",name:String(p.name||"").trim(),code:String(p.code||"").trim(),phone:String(p.phone||"").trim(),status:"ACTIVO",createdAt:nowIso()};
        if(!u.name||!u.code) throw new Error("Completa nombres y código institucional.");
        db.users.push(u); saveDb(db); return {ok:true,message:"Cuenta creada correctamente."};
      }
      case "login": {
        const email=normalizeEmail(p.email), u=db.users.find(x=>x.email===email&&x.password===p.password&&x.status==="ACTIVO");
        if(!u) throw new Error("Correo o contraseña incorrectos.");
        const publicUser={id:u.id,email:u.email,role:u.role,name:u.name,code:u.code,phone:u.phone};
        return {ok:true,token:uid("demo_token"),user:publicUser};
      }
      case "requestPasswordReset": {
        const email=normalizeEmail(p.email), u=db.users.find(x=>x.email===email);
        if(u){ const t=uid("reset"); db.resetTokens.push({token:t,userId:u.id,expiresAt:Date.now()+30*60*1000,used:false}); saveDb(db); return {ok:true,message:"Modo demo: token generado.",debugToken:t}; }
        return {ok:true,message:"Si el correo existe, se enviarán las instrucciones."};
      }
      case "resetPassword": {
        const rec=db.resetTokens.find(x=>x.token===p.token&&!x.used&&x.expiresAt>Date.now()); if(!rec) throw new Error("El enlace es inválido o ha vencido.");
        if(String(p.newPassword||"").length<8) throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
        const u=db.users.find(x=>x.id===rec.userId); u.password=p.newPassword; rec.used=true; saveDb(db); return {ok:true,message:"Contraseña actualizada."};
      }
      case "changePassword": {
        const cu=authDemo(), u=db.users.find(x=>x.id===cu.id); if(u.password!==p.currentPassword) throw new Error("La contraseña actual no coincide.");
        if(String(p.newPassword||"").length<8) throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
        u.password=p.newPassword; saveDb(db); return {ok:true,message:"Contraseña actualizada."};
      }
      case "getProfile": return {ok:true,data:authDemo()};
      case "updateProfile": {
        const cu=authDemo(), u=db.users.find(x=>x.id===cu.id); u.name=String(p.name||u.name); u.phone=String(p.phone||"");
        const pub={id:u.id,email:u.email,role:u.role,name:u.name,code:u.code,phone:u.phone}; saveDb(db); return {ok:true,data:pub};
      }
      case "listSpaces": return {ok:true,data:db.spaces};
      case "saveSpace": {
        requireAdminDemo();
        const data={...p}; data.disciplines=Array.isArray(data.disciplines)?data.disciplines:String(data.disciplines||"").split(",").map(x=>x.trim()).filter(Boolean);
        if(data.id){ const i=db.spaces.findIndex(x=>String(x.id)===String(data.id)); if(i<0) throw new Error("Espacio no encontrado."); db.spaces[i]={...db.spaces[i],...data}; }
        else { data.id=uid("esp"); data.image=data.image||"assets/deportes-udep.jpg"; db.spaces.push(data); }
        saveDb(db); return {ok:true,data};
      }
      case "listReservations": { const u=authDemo(); const data=db.reservations.map(r=>enrichReservation(db,r)); return {ok:true,data:isAdmin(u)?data:data.map(r=>({id:r.id,spaceId:r.spaceId,date:r.date,start:r.start,end:r.end,state:r.state}))}; }
      case "myReservations": {
        const u=authDemo(); return {ok:true,data:db.reservations.filter(r=>r.userId===u.id||r.userEmail===u.email).map(r=>enrichReservation(db,r)).sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start))};
      }
      case "createReservation": {
        const u=authDemo(), s=db.spaces.find(x=>String(x.id)===String(p.spaceId)); if(!s) throw new Error("Espacio no encontrado.");
        if(s.state!=="DISPONIBLE") throw new Error("El espacio no está disponible para reservas.");
        if(!s.disciplines.includes(p.discipline)) throw new Error("La disciplina no está habilitada en este espacio.");
        if(+p.participants<1||+p.participants>+s.capacity) throw new Error("El número de participantes no respeta la capacidad del espacio.");
        if(!p.date||!p.start||!p.end||p.start>=p.end) throw new Error("Revisa la fecha y el rango horario.");
        if(p.start<s.open||p.end>s.close) throw new Error(`El horario debe estar entre ${s.open} y ${s.close}.`);
        const conflict=db.reservations.some(r=>String(r.spaceId)===String(s.id)&&r.date===p.date&&["PENDIENTE","CONFIRMADA"].includes(r.state)&&overlaps(p.start,p.end,r.start,r.end)) || db.blocks.some(b=>String(b.spaceId)===String(s.id)&&b.date===p.date&&overlaps(p.start,p.end,b.start,b.end));
        if(conflict) throw new Error("Ese horario se cruza con una reserva o bloqueo existente.");
        const r={id:uid("r"),userId:u.id,userEmail:u.email,userName:u.name,spaceId:s.id,discipline:p.discipline,date:p.date,start:p.start,end:p.end,participants:+p.participants,purpose:String(p.purpose||"").trim(),state:"PENDIENTE",observation:"",createdAt:nowIso()};
        db.reservations.push(r); db.history.push({id:uid("h"),reservationId:r.id,actorId:u.id,from:"",to:"PENDIENTE",comment:"Solicitud registrada",changedAt:nowIso()}); saveDb(db); return {ok:true,data:enrichReservation(db,r)};
      }
      case "cancelReservation": {
        const u=authDemo(), r=db.reservations.find(x=>String(x.id)===String(p.id)); if(!r) throw new Error("Reserva no encontrada.");
        if(!isAdmin(u)&&r.userId!==u.id&&r.userEmail!==u.email) throw new Error("No puedes cancelar esta reserva.");
        if(!["PENDIENTE","CONFIRMADA"].includes(r.state)) throw new Error("La reserva ya no se puede cancelar.");
        const startAt=new Date(`${r.date}T${r.start}:00`); if(startAt<=new Date()) throw new Error("No se puede cancelar una reserva que ya inició.");
        const before=r.state; r.state="CANCELADA"; r.observation=p.observation||"Cancelada por el usuario"; db.history.push({id:uid("h"),reservationId:r.id,actorId:u.id,from:before,to:"CANCELADA",comment:r.observation,changedAt:nowIso()}); saveDb(db); return {ok:true,data:enrichReservation(db,r)};
      }
      case "pendingReservations": {
        requireAdminDemo(); return {ok:true,data:db.reservations.filter(r=>r.state==="PENDIENTE").map(r=>enrichReservation(db,r)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))};
      }
      case "resolveReservation": {
        const u=requireAdminDemo(), r=db.reservations.find(x=>String(x.id)===String(p.id)); if(!r) throw new Error("Solicitud no encontrada.");
        if(r.state!=="PENDIENTE") throw new Error("La solicitud ya fue resuelta.");
        if(!["CONFIRMADA","RECHAZADA"].includes(p.state)) throw new Error("Estado no permitido.");
        const before=r.state; r.state=p.state; r.observation=String(p.observation||""); r.managerId=u.id; r.resolvedAt=nowIso(); db.history.push({id:uid("h"),reservationId:r.id,actorId:u.id,from:before,to:r.state,comment:r.observation,changedAt:nowIso()}); saveDb(db); return {ok:true,data:enrichReservation(db,r)};
      }
      case "listBlocks": return {ok:true,data:db.blocks.map(b=>({...b,spaceName:spaceName(db,b.spaceId)}))};
      case "createBlock": {
        const u=requireAdminDemo(); if(!p.date||!p.start||!p.end||p.start>=p.end) throw new Error("Revisa fecha y horario del bloqueo.");
        const conflict=db.reservations.some(r=>String(r.spaceId)===String(p.spaceId)&&r.date===p.date&&["PENDIENTE","CONFIRMADA"].includes(r.state)&&overlaps(p.start,p.end,r.start,r.end)); if(conflict) throw new Error("Existe una reserva activa en ese horario.");
        const b={id:uid("b"),spaceId:p.spaceId,date:p.date,start:p.start,end:p.end,type:p.type||"OTRO",reason:p.reason||"",createdBy:u.id,createdAt:nowIso()}; db.blocks.push(b); saveDb(db); return {ok:true,data:{...b,spaceName:spaceName(db,b.spaceId)}};
      }
      case "deleteBlock": { requireAdminDemo(); db.blocks=db.blocks.filter(x=>String(x.id)!==String(p.id)); saveDb(db); return {ok:true}; }
      case "historyReport": {
        requireAdminDemo();
        let rs=db.reservations.map(r=>enrichReservation(db,r)); if(p.spaceId) rs=rs.filter(r=>String(r.spaceId)===String(p.spaceId)); if(p.from) rs=rs.filter(r=>r.date>=p.from); if(p.to) rs=rs.filter(r=>r.date<=p.to);
        return {ok:true,data:{reservations:rs,history:db.history}};
      }
      case "dashboard": {
        requireAdminDemo(); const t=dateOnly(new Date()), pending=db.reservations.filter(r=>r.state==="PENDIENTE").length, confirmed=db.reservations.filter(r=>r.state==="CONFIRMADA").length, blocks=db.blocks.filter(b=>b.date>=t).length;
        return {ok:true,data:{pending,confirmed,blocks,spaces:db.spaces.length,reservations:db.reservations.length}};
      }
      default: throw new Error(`Acción no implementada en demo: ${action}`);
    }
  }

  async function remote(action,payload={}){
    const url=apiUrl(); if(!url) return demo(action,payload);
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),CFG.REQUEST_TIMEOUT_MS||12000);
    try{
      const res=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,payload,token:token()}),signal:controller.signal,redirect:"follow"});
      const text=await res.text(); let data; try{data=JSON.parse(text)}catch{throw new Error("El backend devolvió una respuesta no válida.")}
      if(!data.ok) throw new Error(data.error||"No se pudo completar la operación."); return data;
    }catch(err){ if(err.name==="AbortError") throw new Error("El backend tardó demasiado en responder."); throw err; }
    finally{clearTimeout(timer)}
  }

  window.SIGRED_API={
    call:remote, apiUrl, setApiUrl, mode:()=>apiUrl()?"GOOGLE_SHEETS":"DEMO", token, currentUser, setSession, clearSession,
    demoReset:()=>{localStorage.removeItem(K.db); clearSession(); seedDb();},
    demoCredentials:[
      ["Estudiante","estudiante@udep.edu.pe","123456"],
      ["Docente","docente@udep.edu.pe","123456"],
      ["Administrativo","administrativo@udep.edu.pe","123456"],
      ["Administrador","admin@udep.edu.pe","admin123"]
    ]
  };
  seedDb();
})();
