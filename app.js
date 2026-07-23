// CLOUDFLARE EDITION - sem Google, sem Firebase, sem captcha 54CT
function login(){
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  if(!email || !senha){ alert('Digite e-mail e senha'); return; }
  localStorage.setItem('gestor_user', email);
  localStorage.setItem('gestor_cloudflare', 'ativo');
  alert('Bem-vindo! Login Cloudflare ativo: ' + email);
  // aqui vai pro seu app principal
  window.location.reload();
}

function logout(){
  localStorage.removeItem('gestor_user');
  location.reload();
}

console.log('🟢 Cloudflare Ativo - gestor-service');