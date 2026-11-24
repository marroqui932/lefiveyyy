'use strict';
/* ============================================================
   ROUTER
   ============================================================ */
const ROUTES=[
  {key:'five', label:'Five', icon:'🏟️'},
  {key:'players', label:'Joueurs', icon:'👥'},
  {key:'rankings', label:'Classements', icon:'🏆'},
  {key:'duos', label:'Duos', icon:'🤝'},
  {key:'compare', label:'Comparer', icon:'⚖️'},
  {key:'teams', label:'Équipes', icon:'🎲'},
  {key:'records', label:'Records', icon:'🏅'},
  {key:'admin', label:'Données', icon:'🗃️'}
];

function parseHash(){
  const h=(location.hash||'#/dashboard').replace(/^#\/?/,'');
  const parts=h.split('/').filter(Boolean);
  return {page: parts[0]||'dashboard', id: parts[1]||null, extra: parts[2]||null};
}
function navigate(path){ location.hash='#/'+path; }

function renderNav(){
  const r=parseHash();
  const navDesktop=document.getElementById('navDesktop');
  const navMobile=document.getElementById('navMobile');
  navDesktop.innerHTML=ROUTES.map(rt=>`<a href="#/${rt.key}" class="${r.page===rt.key?'active':''}">${rt.icon} ${rt.label}</a>`).join('');
  navMobile.innerHTML=ROUTES.map(rt=>`<a href="#/${rt.key}" class="${r.page===rt.key?'active':''}">${rt.icon} ${rt.label}</a>`).join('') +
    `<div style="border-top:1px solid var(--border-soft);margin-top:8px;padding-top:8px;">
      ${isAdmin()? `<a href="#" onclick="event.preventDefault();handleLogoutClick();">🔓 Déconnexion</a>` : `<a href="#" onclick="event.preventDefault();openLoginModal();">🔑 Connexion admin</a>`}
    </div>`;
  const cur=ROUTES.find(rt=>rt.page===r.page) || ROUTES.find(rt=>rt.key===r.page);
  document.getElementById('mobilePageTitle').textContent = cur? cur.label : '';
  const authControl=document.getElementById('authControl');
  if(authControl){
    authControl.innerHTML=isAdmin()
      ? `<button class="btn btn-ghost btn-sm" onclick="handleLogoutClick()">🔓 Déconnexion</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="openLoginModal()">🔑 Connexion</button>`;
  }
}
function openLoginModal(){
  openModal(`
    <h2>🔑 Connexion admin<button class="modal-close" onclick="closeModal()">✕</button></h2>
    <form id="loginForm" onsubmit="return submitLoginForm(event)">
      <div class="form-row"><label>Email</label><input class="input" type="email" name="email" required autocomplete="username"></div>
      <div class="form-row"><label>Mot de passe</label><input class="input" type="password" name="password" required autocomplete="current-password"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Se connecter</button>
      </div>
    </form>
  `);
}
async function submitLoginForm(ev){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  const submitBtn=ev.target.querySelector('button[type="submit"]');
  submitBtn.disabled=true; submitBtn.textContent='Connexion...';
  try{
    await loginAdmin(fd.get('email'), fd.get('password'));
    closeModal();
    toast('Connecté','success');
    renderNav();
    render();
  }catch(err){
    submitBtn.disabled=false; submitBtn.textContent='Se connecter';
    toast('Identifiants incorrects','error');
  }
  return false;
}
async function handleLogoutClick(){
  await logoutAdmin();
  toast('Déconnecté','success');
  renderNav();
  navigate('dashboard');
}

async function render(){
  renderNav();
  const r=parseHash();
  const view=document.getElementById('view');
  try{
    if(r.page==='dashboard') view.innerHTML=viewDashboard();
    else if(r.page==='five' && r.id) view.innerHTML=viewFiveDetail(r.id);
    else if(r.page==='five') view.innerHTML=viewFiveList();
    else if(r.page==='players') view.innerHTML=viewPlayerList();
    else if(r.page==='player' && r.id) view.innerHTML=viewPlayerProfile(r.id);
    else if(r.page==='rankings') view.innerHTML=viewRankings();
    else if(r.page==='duos') view.innerHTML=viewDuos();
    else if(r.page==='duo' && r.id && r.extra) view.innerHTML=viewDuoDetail(r.id,r.extra);
    else if(r.page==='compare') view.innerHTML=viewCompare(r.id,r.extra);
    else if(r.page==='records') view.innerHTML=viewRecords();
    else if(r.page==='teams') view.innerHTML=viewTeams();
    else if(r.page==='admin') view.innerHTML=viewAdmin();
    else view.innerHTML=viewDashboard();
  }catch(err){
    console.error(err);
    view.innerHTML=`<div class="empty-state"><div class="e-icon">⚠️</div><p>Une erreur est survenue.<br><small>${esc(err.message)}</small></p></div>`;
  }
  window.scrollTo(0,0);
  afterRenderHooks();
}
function afterRenderHooks(){
  const search=document.getElementById('playerSearchInput');
  if(search){ search.addEventListener('input', debounce(()=>render(),180)); }
}

