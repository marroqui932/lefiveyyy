'use strict';
/* ============================================================
   ROUTER + NAVIGATION
   Ordinateur : barre latérale. Mobile : barre d'onglets en bas (main: true)
   + feuille "Plus" pour les autres pages.
   ============================================================ */
const ROUTES=[
  {key:'dashboard', label:'Accueil',     icon:'home',     main:true},
  {key:'five',      label:'Matchs',      icon:'pitch',    main:true, also:['five']},
  {key:'players',   label:'Joueurs',     icon:'users',    main:true, also:['player']},
  {key:'rankings',  label:'Classements', icon:'trophy',   main:true},
  {key:'records',   label:'Records',     icon:'medal'},
  {key:'duos',      label:'Duos',        icon:'link',     also:['duo']},
  {key:'compare',   label:'Comparer',    icon:'scale'},
  {key:'teams',     label:'Équipes',     icon:'shuffle'},
  {key:'admin',     label:'Données',     icon:'database'}
];

function parseHash(){
  const h=(location.hash||'#/dashboard').replace(/^#\/?/,'');
  const parts=h.split('/').filter(Boolean);
  return {page: parts[0]||'dashboard', id: parts[1]||null, extra: parts[2]||null};
}
function navigate(path){ location.hash='#/'+path; }
function currentRoute(){
  const r=parseHash();
  return ROUTES.find(rt=>rt.key===r.page || (rt.also||[]).includes(r.page)) || ROUTES[0];
}

function renderNav(){
  const cur=currentRoute();
  const link=(rt)=>`<a href="#/${rt.key}" class="${rt===cur?'active':''}" ${rt===cur?'aria-current="page"':''}>${ic(rt.icon)}<span>${rt.label}</span></a>`;
  document.getElementById('navDesktop').innerHTML=ROUTES.map(link).join('');
  const moreActive=!cur.main;
  document.getElementById('tabBar').innerHTML=ROUTES.filter(rt=>rt.main).map(link).join('')
    + `<button type="button" class="${moreActive?'active':''}" onclick="toggleMoreSheet(true)">${ic('more')}<span>Plus</span></button>`;
  document.getElementById('moreSheet').innerHTML=`<div class="sheet-handle"></div>
    ${ROUTES.filter(rt=>!rt.main).map(link).join('')}
    <div class="sheet-sep"></div>
    ${isAdmin()? `<a href="#" onclick="event.preventDefault();handleLogoutClick();">${ic('logout')}<span>Déconnexion</span></a>`
               : `<a href="#" onclick="event.preventDefault();openLoginModal();">${ic('login')}<span>Connexion admin</span></a>`}`;
  document.getElementById('mobilePageTitle').textContent = cur.key==='dashboard'? 'LeFiveyyy' : cur.label;
  const authBtn=isAdmin()
    ? `<button class="btn btn-ghost btn-sm" onclick="handleLogoutClick()">${ic('logout')}<span>Déconnexion</span></button>`
    : `<button class="btn btn-ghost btn-sm" onclick="openLoginModal()">${ic('login')}<span>Connexion</span></button>`;
  document.getElementById('authControl').innerHTML=(isAdmin()? `<div class="admin-flag">${ic('shield')} Mode admin</div>` : '')+authBtn;
  document.getElementById('authControlMobile').innerHTML=isAdmin()? `<span class="admin-flag">${ic('shield')} Admin</span>` : '';
}
function toggleMoreSheet(open){
  document.getElementById('moreSheet').classList.toggle('show',open);
  document.getElementById('sheetBackdrop').classList.toggle('show',open);
}
function openLoginModal(){
  toggleMoreSheet(false);
  openModal(`
    <h2>Connexion admin<button class="modal-close" onclick="closeModal()" aria-label="Fermer">${ic('x')}</button></h2>
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

let _lastRenderedHash=null;
async function render(){
  toggleMoreSheet(false);
  renderNav();
  const r=parseHash();
  // Un nouveau rendu de la même page (filtre, onglet, après une sauvegarde) garde la position de défilement.
  const pageChanged= location.hash!==_lastRenderedHash;
  _lastRenderedHash=location.hash;
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
    view.innerHTML=emptyState('alert','Une erreur est survenue',esc(err.message));
  }
  if(pageChanged){ window.scrollTo(0,0); animateView(view); }
  // Bandeau défilant : on ne le remplace que s'il change (sinon le défilement repartirait de zéro)
  const tk=document.getElementById('tickerBar');
  try{ const html=tickerBarHTML(); if(tk.dataset.html!==html){ tk.innerHTML=html; tk.dataset.html=html; } document.body.classList.toggle('has-ticker',!!html); }catch(e){ console.error(e); }
  startCountdowns(view);
  const ft=document.getElementById('siteFooter');
  const ftHtml=siteFooterHTML(); if(ft.dataset.html!==ftHtml){ ft.innerHTML=ftHtml; ft.dataset.html=ftHtml; }
  afterRenderHooks();
}
function afterRenderHooks(){
  // Recherche de joueurs : on filtre les cartes affichées sans re-rendre la page (le champ garde le focus).
  const search=document.getElementById('playerSearchInput');
  if(search){
    search.addEventListener('input',()=>{
      const q=search.value.toLowerCase().trim();
      let shown=0;
      document.querySelectorAll('[data-player-name]').forEach(el=>{
        const ok=!q || el.dataset.playerName.includes(q);
        el.classList.toggle('hidden',!ok); if(ok) shown++;
      });
      const empty=document.getElementById('playerSearchEmpty');
      if(empty) empty.classList.toggle('hidden',shown>0);
    });
  }
}

