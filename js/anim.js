'use strict';
/* ============================================================
   ANIMATIONS - apparition des blocs et chiffres qui défilent,
   seulement quand on arrive sur une page (pas lors d'un simple re-rendu).
   ============================================================ */
const BALL_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#0a120d"/><path d="m12 7.2 4.5 3.3-1.7 5.3H9.2l-1.7-5.3z" fill="#0a120d" stroke="#0a120d"/><path d="M12 2v5.2M22 10.3l-5.5.2M18.3 20l-3.5-4.2M5.7 20l3.5-4.2M2 10.3l5.5.2" stroke="#0a120d"/></svg>';
const REDUCED_MOTION=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Blocs qui apparaissent en glissant, l'un après l'autre */
const REVEAL_SEL=[
  '#view > *:not(.grid):not(.kpis):not(.player-cards-grid)',
  '.grid > *','.kpis > .kpi','.player-cards-grid > *','.rank-row','.tl-card','.feed-row','.record-row','.duo-row','.admin-item'
].join(',');
let _revealObserver=null;
function revealBlocks(view){
  if(REDUCED_MOTION || !('IntersectionObserver' in window)) return;
  if(_revealObserver) _revealObserver.disconnect();
  const els=[...view.querySelectorAll(REVEAL_SEL)].filter(el=>!el.closest('.reveal'));
  _revealObserver=new IntersectionObserver(entries=>{
    // Les blocs visibles en même temps partent en cascade
    entries.filter(e=>e.isIntersecting).forEach((e,i)=>{
      const el=e.target;
      el.style.setProperty('--d',Math.min(i,10)*0.05+'s');
      el.classList.add('in');
      _revealObserver.unobserve(el);
      // Une fois arrivé, on retire l'effet : le survol (carte qui se soulève) reprend la main
      setTimeout(()=>{ el.classList.remove('reveal','in'); el.style.removeProperty('--d'); }, 700+Math.min(i,10)*50);
    });
  },{rootMargin:'0px 0px -6% 0px'});
  els.forEach(el=>{ el.classList.add('reveal'); _revealObserver.observe(el); });
}

/* Chiffres qui défilent jusqu'à leur valeur (seulement les nombres entiers simples) */
const COUNT_SEL='.kpi-val,.profile-kpis b,.leader-val,.pc-stats b,.hh-sub b,.duo-count,.record-val';
function countUp(view){
  if(REDUCED_MOTION) return;
  view.querySelectorAll(COUNT_SEL).forEach(el=>{
    const node=[...el.childNodes].find(n=>n.nodeType===3 && n.textContent.trim());
    if(!node) return;
    const m=node.textContent.trim().match(/^(\d{1,5})(%?)$/);
    if(!m) return;
    const target=parseInt(m[1],10), suffix=m[2];
    if(target<2) return;
    const dur=Math.min(1100, 450+target*12), t0=performance.now();
    const step=(t)=>{
      const k=Math.min(1,(t-t0)/dur), eased=1-Math.pow(1-k,3);
      node.textContent=Math.round(target*eased)+suffix;
      if(k<1) requestAnimationFrame(step);
    };
    node.textContent='0'+suffix;
    requestAnimationFrame(step);
  });
}

function animateView(view){
  revealBlocks(view);
  countUp(view);
}

function loaderHTML(text){
  return `<div class="loading"><div class="loader-ball">${BALL_SVG}</div><div class="loader-shadow"></div><div>${text}</div></div>`;
}
