// GESTOR DE OBRAS - CONECTADO - FINAL
const SUPABASE_URL = "https://wybgqdreqylrojdxijey.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9WipqtAt_5CwaKdc1hbPOA_0O43S7go";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let modo = 'login';
function showTab(t){
  modo = t;
  document.getElementById('tabLogin').classList.toggle('active', t==='login');
  document.getElementById('tabCad').classList.toggle('active', t==='cadastro');
  document.querySelector('#authBox .btn-primary').textContent = t==='cadastro' ? 'Cadastrar' : 'Entrar no App';
}

async function handleAuth(){
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();
  const msg = document.getElementById('msg');
  if(!email || senha.length<6){ msg.textContent='Digite e-mail válido e senha com 6+ caracteres'; return; }
  msg.textContent='Aguarde...';
  try{
    if(modo==='cadastro'){
      const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
      if(error) throw error;
      msg.textContent = '✅ Usuário criado! Agora clica em Entrar.';
      showTab('login');
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
      if(error) throw error;
      entrarApp(data.user);
    }
  }catch(e){ msg.textContent = 'Erro: '+e.message; }
}

function entrarApp(user){
  document.getElementById('authBox').classList.add('hidden');
  document.getElementById('appBox').classList.remove('hidden');
  document.getElementById('userEmail').textContent = user.email;
  listarClientes();
}

async function checkSession(){
  const { data } = await supabaseClient.auth.getSession();
  if(data.session){ entrarApp(data.session.user); }
}
checkSession();

async function logout(){
  await supabaseClient.auth.signOut();
  location.reload();
}

async function salvarCliente(){
  const nome = document.getElementById('cliNome').value;
  const telefone = document.getElementById('cliTel').value;
  const endereco = document.getElementById('cliEnd').value;
  if(!nome){ alert('Digite nome'); return; }
  const { data: { user } } = await supabaseClient.auth.getUser();
  const { error } = await supabaseClient.from('clientes').insert([{ nome, telefone, endereco, created_by: user?.id }]);
  if(error){ alert('Erro: '+error.message); } else { alert('Cliente salvo!'); listarClientes(); document.getElementById('cliNome').value=''; }
}

async function salvarServico(){
  const nome = document.getElementById('servNome').value;
  const categoria = document.getElementById('servCat').value;
  const unidade = document.getElementById('servUn').value || 'm²';
  const preco_base = parseFloat(document.getElementById('servPreco').value) || 0;
  if(!nome){ alert('Digite nome'); return; }
  const { error } = await supabaseClient.from('servicos').insert([{ nome, categoria, unidade, preco_base }]);
  if(error){ alert('Erro: '+error.message); } else { alert('Serviço salvo!'); }
}

async function salvarOrcamento(){
  const titulo = document.getElementById('orcTitulo').value;
  const cliente_id = document.getElementById('orcClienteId').value || null;
  const total = parseFloat(document.getElementById('orcTotal').value) || 0;
  let itens = [];
  try { itens = JSON.parse(document.getElementById('orcItens').value || '[]'); } catch(e){ alert('Itens JSON inválido'); return; }
  const { data: { user } } = await supabaseClient.auth.getUser();
  const { error } = await supabaseClient.from('orcamentos').insert([{ titulo, cliente_id: cliente_id || null, itens, total, status: 'rascunho', created_by: user?.id }]);
  if(error){ alert('Erro: '+error.message); } else { alert('Orçamento salvo!'); }
}

async function listarClientes(){
  const { data, error } = await supabaseClient.from('clientes').select('*').order('created_at', { ascending: false }).limit(15);
  const div = document.getElementById('listaClientes');
  if(error){ div.textContent = error.message; return; }
  if(!data.length){ div.innerHTML = '<small>Nenhum cliente ainda</small>'; return; }
  div.innerHTML = data.map(c=> `<div class="item"><b>${c.nome}</b> - ${c.telefone||''}<br><small>ID: ${c.id} | ${c.endereco||''}</small></div>`).join('');
}
