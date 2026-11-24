'use strict';
/* ============================================================
   LEFIVEYYY - scripts classiques (pas de modules, pas de build),
   chargés dans cet ordre par index.html et partageant la portée globale :
     utils.js   helpers (dates, échappement HTML, toasts, images)
     data.js    Supabase : repositories, auth admin, STATE en mémoire
     stats.js   moteur de stats (fonctions pures sur STATE)
     teams.js   générateur d'équipes équilibrées
     ratings.js notes /10, homme du match, forme, séries, Elo, associations
     router.js  navigation par hash + rendu de la page courante
     pitch.js   mini-terrain SVG (buts, passes, zoom)
     views.js   pages (accueil, Five, joueurs, classements, …)
     forms.js   modales et formulaires admin, vidéos, import/export
     main.js    init()
   Les repositories (data.js) sont le SEUL point d'accès aux données.
   ============================================================ */

/* ---------------- Utils ---------------- */
function uid(prefix){return (prefix||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,9);}
function pad2(n){return String(n).padStart(2,'0');}
const MONTHS_FR=['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];
function fmtDateLong(iso){
  if(!iso) return '-';
  const d=new Date(iso+'T00:00:00');
  if(isNaN(d)) return '-';
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateShort(iso){
  if(!iso) return '-';
  const parts=iso.split('-');
  if(parts.length!==3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function computeAge(birth){
  if(!birth) return null;
  const b=new Date(birth+'T00:00:00');
  if(isNaN(b)) return null;
  const now=new Date();
  let age=now.getFullYear()-b.getFullYear();
  const md=now.getMonth()-b.getMonth();
  if(md<0||(md===0&&now.getDate()<b.getDate())) age--;
  return age;
}
// Les emoji drapeaux (indicateurs régionaux unicode) ne s'affichent pas comme des drapeaux
// sur beaucoup de systèmes (Windows notamment affiche juste les 2 lettres) : on utilise donc
// une vraie image de drapeau (flagcdn.com, SVG, gratuit et sans clé) partout où un drapeau
// doit être visible.
function flagImgHTML(code,size){
  if(!code||code.length!==2) return '';
  const w=size||20;
  const c=code.toLowerCase();
  return `<img src="https://flagcdn.com/${c}.svg" width="${w}" style="vertical-align:middle;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.15);" alt="${esc(code.toUpperCase())}" loading="lazy" onerror="this.style.display='none';">`;
}
function countryName(code){
  if(!code) return '';
  try{ return new Intl.DisplayNames(['fr'],{type:'region'}).of(code.toUpperCase()); }
  catch(e){ return code; }
}
// Liste volontairement restreinte pour l'instant (demande explicite) : Maroc, Algérie,
// Russie, Inde, Chili, Tunisie. À élargir plus tard si besoin.
const FALLBACK_COUNTRIES=['MA','DZ','RU','IN','CL','TN'];
function allCountryCodes(){
  return FALLBACK_COUNTRIES;
}
// Un <select> natif ne peut pas afficher d'image dans ses <option> (limitation de tous les
// navigateurs) : pour avoir de vrais drapeaux dans le formulaire, on utilise donc des boutons
// cliquables plutôt qu'un menu déroulant.
let _playerFormCountry=null;
function countryPickerHTML(){
  const codes=allCountryCodes()
    .map(c=>({code:c,name:countryName(c)||c}))
    .filter(c=>c.name)
    .sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button type="button" class="btn btn-sm ${!_playerFormCountry?'btn-primary':'btn-ghost'}" onclick="setCountryPick('')">Non renseigné</button>
    ${codes.map(c=>`<button type="button" class="btn btn-sm ${_playerFormCountry===c.code?'btn-primary':'btn-ghost'}" style="display:inline-flex;align-items:center;gap:6px;" onclick="setCountryPick('${c.code}')">${flagImgHTML(c.code,18)} ${esc(c.name)}</button>`).join('')}
  </div>`;
}
function setCountryPick(code){
  _playerFormCountry=code||null;
  const el=document.getElementById('countryPickerContainer');
  if(el) el.innerHTML=countryPickerHTML();
}
function esc(s){
  if(s===null||s===undefined) return '';
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function initials(name){
  if(!name) return '?';
  return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function playerName(p){ return p? p.name : 'Joueur supprimé'; }
function fmtNum(n,d){ if(n===null||n===undefined||isNaN(n)) return '-'; return d? n.toFixed(d):Math.round(n); }
function fmtPct(n){ return (n===null||n===undefined)? '-' : n+'%'; }
function debounce(fn,ms){ let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),ms);}; }
function toast(msg,type){
  const wrap=document.getElementById('toastWrap');
  const el=document.createElement('div');
  el.className='toast '+(type||'');
  el.textContent=msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); },2200);
}
function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}
// Réduit une photo (data URL) à PHOTO_MAX_PX de côté max, en JPEG : les photos sont stockées
// dans la table players et téléchargées à chaque visite, donc elles doivent rester légères.
const PHOTO_MAX_PX=256;
function resizePhotoDataURL(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1, PHOTO_MAX_PX/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*scale);
      c.height=Math.round(img.height*scale);
      const ctx=c.getContext('2d');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height); // fond blanc pour les PNG transparents
      ctx.drawImage(img,0,0,c.width,c.height);
      const out=c.toDataURL('image/jpeg',0.82);
      resolve(out.length<src.length? out : src);
    };
    img.onerror=reject;
    img.src=src;
  });
}
function dataURLtoBlob(dataurl){
  const arr=dataurl.split(',');
  const mimeMatch=arr[0].match(/:(.*?);/);
  const mime=mimeMatch?mimeMatch[1]:'application/octet-stream';
  const bstr=atob(arr[1]);
  let n=bstr.length;
  const u8=new Uint8Array(n);
  while(n--){ u8[n]=bstr.charCodeAt(n); }
  return new Blob([u8],{type:mime});
}
function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(blob);
  });
}

