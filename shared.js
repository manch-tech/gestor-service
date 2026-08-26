// Gestor Service - shared.js - 3 em 1 ORC / OS / TER - Supabase + Local
const SUPABASE_CONFIG = {
  url: "https://wybgqdreqylrojdxijey.supabase.co",
  anonKey: "sb_publishable_9WipqtAt_5CwaKdc1hbPOA_0O43S7go",
  enabled: true
};

let supabaseClient = null;
function getSupabase(){
  try{
    if(!SUPABASE_CONFIG.enabled) return null;
    if(supabaseClient) return supabaseClient;
    if(window.supabase && SUPABASE_CONFIG.url){
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      return supabaseClient;
    }
  }catch(e){ console.warn("Supabase init falhou", e); }
  return null;
}

function lsGet(k, p){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):p; }catch{ return p; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

async function sbUpsert(t, r){ const s=getSupabase(); if(!s||!r||!r.length) return; try{ await s.from(t).upsert(r, {onConflict:'id'}); }catch(e){ console.warn("upsert erro", t, e); } }
async function sbDelete(t, id){ const s=getSupabase(); if(!s) return; try{ await s.from(t).delete().eq('id', id); }catch(e){} }
async function sbFetchAll(t){ const s=getSupabase(); if(!s) return null; try{ const {data, error}=await s.from(t).select('*').order('created_at',{ascending:false}).limit(1000); if(error) throw error; return data; }catch(e){ console.warn("fetch erro", t, e); return null; } }

function gerarNumero(tipo){
  const d=new Date();
  const pad=v=>String(v).padStart(2,"0");
  const rnd=Math.floor(100+Math.random()*900);
  // Formato brasileiro ddMMyyyy conforme solicitado: OS-18082026-397
  return `${tipo}-${pad(d.getDate())}${pad(d.getMonth()+1)}${d.getFullYear()}-${rnd}`;
}

const Store = {
  // CONFIG - CABEÇALHO
  getConfig: ()=> lsGet("gestor_config_v1", {
    logo_url: "https://manoelpedra.com.br/files/logo-manoel-pedra.png",
    nome_empresa: "Manoel Pedra - Construção Reforma Manutenção",
    cnpj: "",
    atividades: "Construção, Reforma e Manutenção - Alvenaria, Elétrica, Hidráulica, Montagem e Instalação",
    email: "contato@manoelpedra.com.br",
    telefone: "(47) 99206-9588",
    endereco: "Gaspar - SC",
    link_nota: "",
    link_drive: "",
    google_api_key: "",
    google_client_id: ""
  }),
  setConfig: (v)=>{ 
    lsSet("gestor_config_v1", v); 
    sbUpsert("gestor_config", [{id:"unico", payload:v, created_at:new Date().toISOString()}]);
    window.dispatchEvent(new Event("gestor_sync"));
  },

  // ORÇAMENTOS
  getOrcamentos: ()=> lsGet("gestor_orc_v1", []),
  setOrcamentos: (list)=>{
    lsSet("gestor_orc_v1", list);
    const rows=list.map(o=>({id:o.numero, numero:o.numero, tipo:"ORC", payload:o, created_at:o.criadoEm||new Date().toISOString()}));
    sbUpsert("gestor_orcamentos", rows);
    window.dispatchEvent(new Event("gestor_sync"));
  },

  // OS
  getOS: ()=> lsGet("gestor_os_v1", []),
  setOS: (list)=>{
    lsSet("gestor_os_v1", list);
    const rows=list.map(o=>({id:o.numero, numero:o.numero, tipo:"OS", payload:o, created_at:o.criadoEm||new Date().toISOString()}));
    sbUpsert("gestor_os", rows);
    window.dispatchEvent(new Event("gestor_sync"));
  },

  // TERMOS
  getTermos: ()=> lsGet("gestor_ter_v1", []),
  setTermos: (list)=>{
    lsSet("gestor_ter_v1", list);
    const rows=list.map(o=>({id:o.numero, numero:o.numero, tipo:"TER", payload:o, created_at:o.criadoEm||new Date().toISOString()}));
    sbUpsert("gestor_termos", rows);
    window.dispatchEvent(new Event("gestor_sync"));
  },

  // BUSCA / AUTOCOMPLETE - DADOS REUTILIZÁVEIS
  getTodosClientes: ()=>{
    const orcs=Store.getOrcamentos();
    const oss=Store.getOS();
    const termos=Store.getTermos();
    const map={};
    [...orcs, ...oss, ...termos].forEach(d=>{
      const nome = (d.cliente_nome||"").trim();
      if(nome) map[nome.toLowerCase()] = {nome: d.cliente_nome, telefone: d.cliente_telefone||d.telefone||"", email: d.cliente_email||d.email||"", endereco: d.cliente_endereco||d.endereco_obra||d.endereco||""};
    });
    return Object.values(map);
  },
  getTodosServicos: ()=>{
    const orcs=Store.getOrcamentos();
    const oss=Store.getOS();
    const all=[...orcs.map(o=>o.descricao_servicos), ...oss.map(o=>o.descricao_servicos)].filter(Boolean);
    return [...new Set(all)].slice(0,100);
  },
  getTodosMateriais: ()=>{
    const oss=Store.getOS();
    const all=oss.map(o=>o.materiais_desc||o.materiais).filter(Boolean);
    return [...new Set(all)].slice(0,100);
  },

  // NOVO V11 - Tabela de preços de serviços e materiais
  getServicosPrecos: ()=> lsGet("gestor_servicos_precos_v1", {}),
  setServicosPrecos: (map)=>{
    lsSet("gestor_servicos_precos_v1", map);
    const rows=Object.entries(map).map(([desc, valor])=>({id:desc.toLowerCase().slice(0,100), descricao:desc, valor:valor, tipo:"servico", created_at:new Date().toISOString()}));
    sbUpsert("gestor_servicos", rows);
  },
  addServicoPreco: (desc, valor)=>{
    if(!desc || !valor) return;
    const map=Store.getServicosPrecos();
    const key=desc.trim();
    if(key) { map[key]=valor; Store.setServicosPrecos(map); }
  },
  getMateriaisPrecos: ()=> lsGet("gestor_materiais_precos_v1", {}),
  setMateriaisPrecos: (map)=>{
    lsSet("gestor_materiais_precos_v1", map);
    const rows=Object.entries(map).map(([desc, valor])=>({id:desc.toLowerCase().slice(0,100), descricao:desc, valor:valor, tipo:"material", created_at:new Date().toISOString()}));
    sbUpsert("gestor_materiais", rows);
  },
  addMaterialPreco: (desc, valor)=>{
    if(!desc || !valor) return;
    const map=Store.getMateriaisPrecos();
    const key=desc.trim();
    if(key) { map[key]=valor; Store.setMateriaisPrecos(map); }
  },

  // Busca unificada para autocomplete com preço
  getServicosComPreco: ()=>{
    const map=Store.getServicosPrecos();
    // também extrai de ORCs antigos para compatibilidade
    const orcs=Store.getOrcamentos();
    orcs.forEach(o=>{
      if(o.orc_servicos && Array.isArray(o.orc_servicos)){
        o.orc_servicos.forEach(s=>{ if(s.descricao && s.valor) map[s.descricao]=s.valor; });
      }
    });
    return map;
  },
  getMateriaisComPreco: ()=>{
    const map=Store.getMateriaisPrecos();
    const orcs=Store.getOrcamentos();
    orcs.forEach(o=>{
      if(o.orc_materiais && Array.isArray(o.orc_materiais)){
        o.orc_materiais.forEach(m=>{ if(m.descricao && m.valor) map[m.descricao]=m.valor; });
      }
    });
    return map;
  },

  syncFromSupabase: async()=>{
    const s=getSupabase(); if(!s) return;
    const cfg=await sbFetchAll("gestor_config");
    if(cfg && cfg.length){ const c=cfg[0].payload; if(c) lsSet("gestor_config_v1", c); }
    const orcs=await sbFetchAll("gestor_orcamentos");
    if(orcs && orcs.length){ const l=orcs.map(r=>r.payload).filter(Boolean); if(l.length) lsSet("gestor_orc_v1", l); }
    const oss=await sbFetchAll("gestor_os");
    if(oss && oss.length){ const l=oss.map(r=>r.payload).filter(Boolean); if(l.length) lsSet("gestor_os_v1", l); }
    const ters=await sbFetchAll("gestor_termos");
    if(ters && ters.length){ const l=ters.map(r=>r.payload).filter(Boolean); if(l.length) lsSet("gestor_ter_v1", l); }
    // V11 - servicos e materiais precos
    try{
      const servs=await sbFetchAll("gestor_servicos");
      if(servs && servs.length){
        const map={};
        servs.forEach(r=>{ if(r.descricao) map[r.descricao]=r.valor||r.payload?.valor||""; });
        if(Object.keys(map).length) lsSet("gestor_servicos_precos_v1", map);
      }
      const mats=await sbFetchAll("gestor_materiais");
      if(mats && mats.length){
        const map={};
        mats.forEach(r=>{ if(r.descricao) map[r.descricao]=r.valor||r.payload?.valor||""; });
        if(Object.keys(map).length) lsSet("gestor_materiais_precos_v1", map);
      }
    }catch(e){ console.warn("sync serv/mat erro", e); }
    window.dispatchEvent(new Event("gestor_sync"));
  }
};

setTimeout(()=>{ Store.syncFromSupabase(); }, 800);
