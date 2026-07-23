
const HEADER_KEY='manoel_header_v4';
const DOCS_KEY='manoel_docs_v4';
const FIREBASE_KEY='manoel_firebase_config_v5';
const AUTH_LOCAL_KEY='manoel_auth_local_v6';
const defaultHeader={logo:'',nome:'',subtitulo:'',email:'',contato:'',cnpj:'',endereco:'',tags:''};
let header=JSON.parse(localStorage.getItem(HEADER_KEY)||'null')||{...defaultHeader};
let docs=JSON.parse(localStorage.getItem(DOCS_KEY)||'[]');
let firebaseConfig=JSON.parse(localStorage.getItem(FIREBASE_KEY)||'null');
let localAuth=JSON.parse(localStorage.getItem(AUTH_LOCAL_KEY)||'null');
let db=null, auth=null;
let firebaseReady=false;
let isLogged=false;
let tab='os';
let showModal=false;
let showFirebaseModal=false;
let captchaCode='';

function fmtBR(d){if(!d)return '';const dt=new Date(d+'T00:00:00');return isNaN(dt)?d:dt.toLocaleDateString('pt-BR');}
function genNumero(tipo,seq){const now=new Date();const mm=String(now.getMonth()+1).padStart(2,'0');const yy=String(now.getFullYear()).slice(-2);return `${tipo}-${mm}${yy}-${String(seq).padStart(3,'0')}`;}
function wa(num){const c=(num||'').replace(/\D/g,'');return c?`https://wa.me/55${c}`:'#';}
let seq=737;
let form={
  orc:{numero:genNumero('ORC',seq),data:new Date().toISOString().slice(0,10),contratante:'',cpf:'',tel:'',loc:'',aut:'',desc:'',itens:[{d:'Mão de obra',u:'vb',q:1,v:0}],forma:'À Vista',codGov:'',linkGov:''},
  os:{numero:genNumero('OS',seq),dataPed:new Date().toISOString().slice(0,10),dataIni:new Date().toISOString().slice(0,10),dataFim:'',contratante:'',tel:'',loc:'',aut:'',descSolic:'',coment:'',descConc:'',realizado:'',mo:0,mat:0,forma:'À Vista',codGov:'',linkGov:'',dataGov:''},
  termo:{numero:genNumero('TER',seq),dataEnt:new Date().toISOString().slice(0,10),contratante:'',loc:'',check:['Serviço executado','Limpeza','Teste'],pend:'',codGov:'',linkGov:'',dataGov:''}
};

// Firebase
function initFirebase(){
  try{
    if(!firebaseConfig || !firebaseConfig.apiKey){ firebaseReady=false; return; }
    if(!firebase.apps.length){ firebase.initializeApp(firebaseConfig); }
    db=firebase.firestore();
    auth=firebase.auth();
    firebaseReady=true;
    auth.onAuthStateChanged(user=>{
      if(user){ isLogged=true; render(); carregarFirebase(); }
      else { isLogged=false; render(); }
    });
    carregarFirebase();
  }catch(e){ console.error('Erro Firebase', e); firebaseReady=false; }
}
async function carregarFirebase(){
  if(!db) return;
  try{
    const snap = await db.collection('obras').orderBy('data','desc').limit(100).get();
    const fbDocs = snap.docs.map(d=>{ const data=d.data(); return { id:d.id, tipo:data.tipo, numero:data.numero, contratante:data.contratante, data:data.dataISO, dados:data.dados } });
    docs = [...fbDocs, ...docs.filter(ld=>!fbDocs.find(f=>f.numero===ld.numero))];
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    if(isLogged) render();
  }catch(e){}
}

// Captcha
function genCaptcha(){
  const chars='ABCDEFGHKMNPQRSTUVWXYZ23456789';
  let c=''; for(let i=0;i<5;i++) c+=chars[Math.floor(Math.random()*chars.length)];
  captchaCode=c;
  return c;
}
function drawCaptcha(){
  const canvas=document.getElementById('captchaCanvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#eef2ff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // noise
  for(let i=0;i<80;i++){ ctx.fillStyle=`rgba(${100+Math.random()*100},${100+Math.random()*100},${150+Math.random()*100},0.3)`; ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2,2); }
  ctx.font='bold 28px monospace'; ctx.fillStyle='#1e293b';
  ctx.save(); ctx.translate(15,35); ctx.rotate((Math.random()-0.5)*0.3); ctx.fillText(captchaCode,0,0); ctx.restore();
  // lines
  ctx.strokeStyle='rgba(0,0,0,0.15)'; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(Math.random()*canvas.width, Math.random()*canvas.height); ctx.lineTo(Math.random()*canvas.width, Math.random()*canvas.height); ctx.stroke(); }
}

function checkCaptcha(input){ return (input||'').toUpperCase().trim() === captchaCode; }

// Auth Local
function checkLocalAuth(email, pass){
  if(!localAuth){ // first time setup
    localAuth={email: email, pass: btoa(pass)}; // simple encode
    localStorage.setItem(AUTH_LOCAL_KEY, JSON.stringify(localAuth));
    return true;
  }
  return localAuth.email===email && localAuth.pass===btoa(pass);
}

async function doLogin(){
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPass').value;
  const cap=document.getElementById('loginCaptcha').value;
  const msg=document.getElementById('loginMsg');
  if(!email || !pass){ msg.textContent='Preencha e-mail e senha'; return; }
  if(!checkCaptcha(cap)){ msg.textContent='Captcha incorreto, tente de novo'; genCaptcha(); drawCaptcha(); return; }
  msg.textContent='Verificando...';
  try{
    if(firebaseReady && auth){
      await auth.signInWithEmailAndPassword(email, pass);
      isLogged=true;
      msg.textContent='';
      render();
    }else{
      if(checkLocalAuth(email, pass)){
        isLogged=true;
        localStorage.setItem('manoel_session_v6','1');
        msg.textContent='';
        render();
      }else{
        msg.textContent='E-mail ou senha local incorreto';
        genCaptcha(); drawCaptcha();
      }
    }
  }catch(e){
    // if firebase user not found, try create for first time?
    if(e.code==='auth/user-not-found'){
      try{
        await auth.createUserWithEmailAndPassword(email, pass);
        msg.textContent='Conta criada! Entrando...';
        return;
      }catch(ce){ msg.textContent=ce.message; }
    }else{
      msg.textContent=e.message;
    }
    genCaptcha(); drawCaptcha();
  }
}

function doLogout(){
  isLogged=false;
  localStorage.removeItem('manoel_session_v6');
  if(auth) auth.signOut();
  genCaptcha();
  render();
  setTimeout(drawCaptcha,100);
}

function copiar(){const o=form.orc;form.os.contratante=o.contratante;form.os.tel=o.tel;form.os.loc=o.loc;form.os.aut=o.aut;form.os.descSolic=o.desc;form.termo.contratante=o.contratante;form.termo.loc=o.loc;render();alert('Dados copiados');}
async function salvar(){
  if(!isLogged){ alert('Faça login'); return; }
  const f=form[tab==='orcamento'?'orc':'os'===tab?'os':'termo'];
  const rec={tipo:tab,numero:f.numero,contratante:f.contratante,data:new Date().toISOString(),dados:JSON.parse(JSON.stringify(f))};
  docs.unshift(rec);
  localStorage.setItem(DOCS_KEY,JSON.stringify(docs));
  if(db && firebaseReady){
    try{
      await db.collection('obras').add({tipo: rec.tipo, numero: rec.numero, contratante: rec.contratante, dataISO: rec.data, data: firebase.firestore.FieldValue.serverTimestamp(), dados: rec.dados});
      alert('Salvo na nuvem: '+rec.numero);
    }catch(e){ alert('Salvo local, erro Firebase: '+e.message); }
  }else{ alert('Salvo local: '+rec.numero); }
  render();
}
async function exportar(){const {jsPDF}=window.jspdf;const doc=new jsPDF();const f=tab==='orcamento'?form.orc:tab==='os'?form.os:form.termo;let y=12;doc.setFontSize(13);doc.text(`GESTOR 3 EM 1 - ${tab.toUpperCase()} - ${f.numero}`,10,y);y+=7;doc.setFontSize(9);doc.text(`${header.nome} - ${header.subtitulo}`,10,y);y+=5;doc.text(`${header.endereco} | ${header.email} | ${header.contato}`,10,y);y+=8;doc.text(`Contratante: ${f.contratante} | Tel: ${f.tel||''}`,10,y);y+=6;doc.text(`Local: ${f.loc||''} | Data: ${fmtBR(f.data||f.dataPed||f.dataEnt)}`,10,y);y+=8;if(f.desc||f.descSolic){doc.text(doc.splitTextToSize(`Descricao: ${f.desc||f.descSolic}`,180),10,y);y+=12;}doc.setFillColor(235,240,255);doc.rect(10,y,190,22,'F');doc.text(`ASSINATURA GOV.BR - Codigo: ${f.codGov||'[inserir apos assinar]'}`,12,y+6);doc.text(`Link: ${f.linkGov||''}`,12,y+12);doc.text(`Validar: https://validar.iti.gov.br`,12,y+18);y+=30;doc.text(`Contratante: ________________________  Contratado: ${header.nome}`,10,y);doc.save(`${f.numero}_govbr.pdf`);}

function salvarFirebaseConfig(){
  try{
    const raw=document.getElementById('fbConfigInput').value;
    const cfg=JSON.parse(raw);
    if(!cfg.apiKey) throw new Error('apiKey faltando');
    localStorage.setItem(FIREBASE_KEY, JSON.stringify(cfg));
    firebaseConfig=cfg;
    showFirebaseModal=false;
    initFirebase();
    alert('Firebase configurado: '+cfg.projectId+' - agora ative Authentication > Email/Senha no console');
    render();
  }catch(e){ alert('Erro JSON: '+e.message); }
}

function renderLogin(){
  genCaptcha();
  const hasLocal = !!localAuth;
  document.getElementById('app').innerHTML=`
  <div class="login-bg flex items-center justify-center p-4">
    <div class="login-card w-full max-w-[420px] rounded-[24px] p-7">
      <div class="text-center mb-6">
        <div class="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center mx-auto font-black text-xl">MP</div>
        <h1 class="font-black text-[22px] text-black mt-3 leading-tight">Gestor de Obras</h1>
        <p class="text-[12px] text-gray-600 mt-1">Acesso restrito - Faça login para gerenciar cabeçalho, abas e documentos</p>
        <p class="text-[10px] mt-2 ${firebaseReady?'text-green-600':'text-amber-600'}">${firebaseReady? '🟢 Firebase Auth ativo - '+firebaseConfig.projectId : '🟡 Modo local - primeira vez cria sua senha'}</p>
      </div>
      <div class="space-y-3">
        <div><label class="label">E-mail</label><input id="loginEmail" type="email" class="input" placeholder="seu@email.com" value="${localAuth?localAuth.email:''}"></div>
        <div><label class="label">Senha</label><input id="loginPass" type="password" class="input" placeholder="••••••••"></div>
        <div>
          <label class="label">Captcha - digite o código da imagem</label>
          <div class="flex gap-2">
            <canvas id="captchaCanvas" width="140" height="44" class="captcha-box rounded-xl"></canvas>
            <button onclick="genCaptcha();drawCaptcha()" class="btn btn-g text-xs">↻ Novo</button>
          </div>
          <input id="loginCaptcha" class="input mt-2 tracking-[6px] font-mono font-bold" placeholder="ABC12">
        </div>
        <div class="flex items-center gap-2 text-[11px]"><input type="checkbox" id="humanCheck"><label for="humanCheck">Não sou um robô</label></div>
        <div id="loginMsg" class="text-[12px] text-red-600 min-h-[18px]"></div>
        <button onclick="doLogin()" class="btn btn-p w-full h-12 text-[15px] font-bold">Entrar no App</button>
        <p class="text-[10px] text-gray-500 text-center">${hasLocal?'Login local ativo':'Primeiro acesso: defina e-mail e senha e será criado seu acesso local. Se conectar Firebase, use o e-mail/senha criado no Firebase Authentication.'}</p>
        <div class="border-t border-gray-200 pt-3 mt-2">
          <button onclick="showFirebaseModal=true;render()" class="text-[11px] text-blue-600 underline">Configurar Firebase + Auth</button>
        </div>
      </div>
    </div>
  </div>
  ${showFirebaseModal?`<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div class="bg-white rounded-2xl p-5 w-full max-w-xl"><h3 class="font-bold text-black mb-2">Conectar Firebase Auth</h3><p class="text-[11px] mb-2">Cole o config JSON do Firebase. Depois vá no console > Authentication > Sign-in method > Ativar Email/Senha</p><textarea id="fbConfigInput" class="input h-32 text-[11px] font-mono">${firebaseConfig?JSON.stringify(firebaseConfig,null,2):''}</textarea><div class="flex gap-2 mt-3"><button onclick="salvarFirebaseConfig()" class="btn btn-p flex-1">Salvar</button><button onclick="showFirebaseModal=false;render()" class="btn btn-g flex-1">Fechar</button></div></div></div>`:''}
  `;
  setTimeout(drawCaptcha,50);
}

function renderApp(){
  const osTotal=(form.os.mo||0)+(form.os.mat||0);
  const orcTotal=form.orc.itens.reduce((s,i)=>s+i.q*i.v,0);
  document.getElementById('app').innerHTML=`
  <header class="bg-white border-b border-gray-200">
    <div class="max-w-[1400px] mx-auto px-4 py-4 flex flex-col md:flex-row gap-3 w-full">
      <div class="flex gap-3 flex-1 min-w-0">
        <div class="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">${header.logo?`<img src="${header.logo}" class="w-full h-full object-cover">`:'MP'}</div>
        <div class="min-w-0 flex-1">
          <h1 class="font-black text-black text-[17px] leading-tight break-words">${header.nome||'Gestor de Obras'}</h1>
          <p class="text-[12px] font-bold text-black break-words leading-snug">${header.subtitulo||'Logado - acesso total'}</p>
          <p class="text-[11px] text-black break-words">${header.endereco||''} | ${header.email||''} | ${header.contato||''}</p>
        </div>
      </div>
      <div class="flex gap-2 h-fit">
        <button onclick="showFirebaseModal=true;render()" class="btn btn-g text-xs">${firebaseReady?'Firebase 🟢':'Firebase 🔴'}</button>
        <button onclick="showModal=true;render()" class="btn btn-g">Editar Cabeçalho</button>
        <button onclick="doLogout()" class="btn bg-red-500 text-white text-xs">Sair</button>
      </div>
    </div>
  </header>
  <main class="max-w-[1400px] mx-auto px-4 py-5">
    <div class="flex gap-2 overflow-x-auto pb-2">
      <button onclick="tab='orcamento';render()" class="tab ${tab==='orcamento'?'tab-a':''}">Orçamento</button>
      <button onclick="tab='os';render()" class="tab ${tab==='os'?'tab-a':''}">OS - Ordem</button>
      <button onclick="tab='termo';render()" class="tab ${tab==='termo'?'tab-a':''}">Termo Entrega</button>
      <button onclick="tab='nfs';render()" class="tab ${tab==='nfs'?'tab-a':''}">NF / gov.br Links</button>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5 mt-5">
      <div class="card p-4">
        ${tab==='orcamento'?`
          <div class="flex justify-between"><b class="text-black text-sm">ORÇAMENTO - ${form.orc.numero}</b><span class="text-[11px] border px-2 py-1 rounded">${fmtBR(form.orc.data)}</span></div>
          <label class="label mt-3">Nome Contratante</label><input class="input" value="${form.orc.contratante}" oninput="form.orc.contratante=this.value">
          <div class="grid grid-cols-2 gap-2 mt-2"><div><label class="label">CPF/CNPJ</label><input class="input" value="${form.orc.cpf}" oninput="form.orc.cpf=this.value"></div><div><label class="label">Telefone</label><input class="input" value="${form.orc.tel}" oninput="form.orc.tel=this.value"></div></div>
          <label class="label mt-2">Localização Obra</label><input class="input" value="${form.orc.loc}" oninput="form.orc.loc=this.value">
          <label class="label mt-2">Descrição Serviço</label><textarea class="input h-20" oninput="form.orc.desc=this.value">${form.orc.desc}</textarea>
        `:''}
        ${tab==='os'?`
          <div class="flex justify-between"><b class="text-black text-sm">ORDEM SERVIÇO - ${form.os.numero}</b><button onclick="copiar()" class="btn btn-g text-[11px]">Copiar do Orçamento</button></div>
          <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="label">Contratante</label><input class="input" value="${form.os.contratante}" oninput="form.os.contratante=this.value"></div><div><label class="label">Telefone</label><input class="input" value="${form.os.tel}" oninput="form.os.tel=this.value"></div></div>
          <label class="label mt-2">Local</label><input class="input" value="${form.os.loc}" oninput="form.os.loc=this.value">
          <label class="label mt-2">Descrição Solicitada</label><textarea class="input h-20" oninput="form.os.descSolic=this.value">${form.os.descSolic}</textarea>
          <div class="grid grid-cols-2 gap-2 mt-2"><div><label class="label">Mão Obra R$</label><input type="number" class="input" value="${form.os.mo}" oninput="form.os.mo=parseFloat(this.value)||0;render()"></div><div><label class="label">Materiais R$</label><input type="number" class="input" value="${form.os.mat}" oninput="form.os.mat=parseFloat(this.value)||0;render()"></div></div>
        `:''}
        ${tab==='termo'?`
          <b class="text-black text-sm">TERMO ENTREGA - ${form.termo.numero}</b>
          <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="label">Contratante</label><input class="input" value="${form.termo.contratante}" oninput="form.termo.contratante=this.value"></div><div><label class="label">Local</label><input class="input" value="${form.termo.loc}" oninput="form.termo.loc=this.value"></div></div>
          <label class="label mt-2">Pendências</label><textarea class="input h-16" oninput="form.termo.pend=this.value">${form.termo.pend}</textarea>
        `:''}
        ${tab==='nfs'?`
          <b class="text-black text-sm">Links + Firebase Auth</b>
          <div class="space-y-2 mt-2">
            <div class="card p-3 text-[11px]">Firebase: Authentication > Email/Senha precisa estar ATIVO para login funcionar com e-mail. O captcha é validação local antes de chamar Firebase.</div>
            <a href="https://assinador.iti.br" target="_blank" class="card p-3 flex justify-between"><span>Assinador gov.br</span><span>↗</span></a>
            <a href="https://validar.iti.gov.br" target="_blank" class="card p-3 flex justify-between"><span>Validar gov.br</span><span>↗</span></a>
          </div>
        `:''}
        <div class="flex gap-2 mt-5">
          <button onclick="salvar()" class="btn btn-p flex-1">Salvar ${firebaseReady?'Firebase':''}</button>
          <button onclick="exportar()" class="btn btn-d flex-1">Gerar PDF gov.br</button>
        </div>
      </div>
      <div class="card p-4 preview">
        <div class="text-center border-b pb-3 mb-3">
          <div class="font-black text-[14px] text-black">PRÉVIA - ${tab.toUpperCase()} - ${form.orc.numero}</div>
          <div class="text-[11px] text-black">${header.nome||'Empresa'} | Logado</div>
        </div>
        <div class="space-y-2 text-[11px] text-black">
          <div><b>CONTRATANTE:</b> ${form.orc.contratante||form.os.contratante||'-'}</div>
          <div class="border p-2 rounded"><b>DESCRIÇÃO:</b><br>${form.orc.desc||form.os.descSolic||'-'}</div>
          <div class="border-2 border-blue-200 bg-blue-50 p-3 rounded-xl"><b>GOV.BR</b> - só aparece após assinatura</div>
        </div>
      </div>
    </div>
  </main>
  ${showModal?`<div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div class="bg-white rounded-2xl p-5 w-full max-w-lg"><h3 class="font-bold text-black mb-2">Editar Cabeçalho (protegido por login)</h3><label class="label">Logo</label><input type="file" accept="image/*" class="input mb-2" onchange="const r=new FileReader();r.onload=e=>{header.logo=e.target.result;render()};r.readAsDataURL(this.files[0])"><label class="label">Nome</label><input class="input mb-2" value="${header.nome}" oninput="header.nome=this.value"><label class="label">Subtitulo</label><input class="input mb-2" value="${header.subtitulo}" oninput="header.subtitulo=this.value"><label class="label">Endereço</label><input class="input mb-2" value="${header.endereco}" oninput="header.endereco=this.value"><label class="label">Email</label><input class="input mb-2" value="${header.email}" oninput="header.email=this.value"><label class="label">Contato</label><input class="input mb-2" value="${header.contato}" oninput="header.contato=this.value"><label class="label">CNPJ</label><input class="input mb-2" value="${header.cnpj}" oninput="header.cnpj=this.value"><div class="flex gap-2 mt-3"><button onclick="localStorage.setItem(HEADER_KEY,JSON.stringify(header));showModal=false;render()" class="btn btn-p flex-1">Salvar</button><button onclick="showModal=false;render()" class="btn btn-g flex-1">Fechar</button></div></div></div>`:''}
  ${showFirebaseModal?`<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div class="bg-white rounded-2xl p-5 w-full max-w-xl"><h3 class="font-bold text-black mb-2">Firebase + Auth</h3><textarea id="fbConfigInput" class="input h-32 text-[11px] font-mono">${firebaseConfig?JSON.stringify(firebaseConfig,null,2):''}</textarea><div class="flex gap-2 mt-3"><button onclick="salvarFirebaseConfig()" class="btn btn-p flex-1">Salvar</button><button onclick="showFirebaseModal=false;render()" class="btn btn-g flex-1">Fechar</button></div></div></div>`:''}
  `;
}

function render(){
  const session = localStorage.getItem('manoel_session_v6');
  if(!isLogged && session && !firebaseReady){ isLogged=true; }
  if(!isLogged){
    renderLogin();
  }else{
    renderApp();
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  initFirebase();
  if(!firebaseReady){
    const sess=localStorage.getItem('manoel_session_v6');
    if(sess) isLogged=true;
  }
  genCaptcha();
  render();
  setTimeout(()=>{ if(!isLogged) drawCaptcha(); },200);
});
