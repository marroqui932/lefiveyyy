'use strict';
/* ============================================================
   SPONSORS - gérés depuis Données > Sponsors (admin), affichés :
   panneaux LED autour du terrain des compos, "présenté par" sur l'accueil,
   bandeau défilant, pied de page. Un sponsor non coché "partenariat réel"
   déclenche la mention "partenariat fictif".
   ============================================================ */
const LOGO_MAX_PX=360;

/* Logo réduit en PNG (garde la transparence, contrairement aux photos de joueurs) */
function resizeLogoDataURL(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1, LOGO_MAX_PX/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      const out=c.toDataURL('image/png');
      resolve(out.length<src.length? out : src);
    };
    img.onerror=reject;
    img.src=src;
  });
}

function sponsorsList(){ return STATE.sponsors||[]; }
function hasFictionalSponsors(){ return sponsorsList().some(x=>!x.isReal); }
const FICTION_NOTE='Partenariats fictifs : les marques affichées ne sponsorisent pas LeFiveyyy et ne lui sont pas associées.';

/* Un sponsor : son logo, ou son nom écrit si pas de logo */
function sponsorMarkHTML(x,cls){
  const inner= x.logo? `<img src="${x.logo}" alt="${esc(x.name)}" loading="lazy">` : `<span class="sp-word">${esc(x.name)}</span>`;
  return x.url? `<a class="${cls}" href="${esc(x.url)}" target="_blank" rel="noopener sponsored" title="${esc(x.name)}" onclick="event.stopPropagation()">${inner}</a>`
              : `<span class="${cls}" title="${esc(x.name)}">${inner}</span>`;
}

/* Panneau LED qui fait défiler les sponsors (bord du terrain) */
function ledBoardHTML(){
  const list=sponsorsList();
  if(!list.length) return '';
  let row=''; while(row.split('led-item').length-1<10) row+=list.map(x=>sponsorMarkHTML(x,'led-item')).join('');
  return `<div class="led-board" aria-label="Sponsors"><div class="led-track">${row}${row}</div></div>`;
}

/* "Présenté par" sur le plateau de l'accueil */
function presentedByHTML(){
  const list=sponsorsList();
  if(!list.length) return '';
  return `<div class="presented-by"><span class="pb-label">Présenté par</span>${list.map(x=>sponsorMarkHTML(x,'pb-item')).join('')}${hasFictionalSponsors()? '<span class="fiction-tag" title="'+FICTION_NOTE+'">fictif</span>' : ''}</div>`;
}

/* Pied de page de toutes les pages */
function siteFooterHTML(){
  const list=sponsorsList();
  return `${list.length? `<div class="ft-sponsors"><span class="pb-label">Nos partenaires</span>${list.map(x=>sponsorMarkHTML(x,'ft-item')).join('')}</div>` : ''}
    <div class="ft-bottom"><span><img src="favicon.svg" alt="" width="18" height="18"> LeFiveyyy · la ligue de nos five</span>
    ${hasFictionalSponsors()? `<span class="ft-note">${ic('info',13)}${FICTION_NOTE}</span>` : ''}</div>`;
}

/* ---------- Admin : onglet Sponsors ---------- */
function adminSponsorsTab(){
  if(!STATE.sponsorsReady){
    return `<div class="notice">${ic('database')}<div><b>Il reste une étape pour activer les sponsors.</b> Dans Supabase, ouvre <b>SQL Editor</b>, colle le contenu du fichier <code>supabase/sponsors.sql</code> du dépôt GitHub, puis clique sur <b>Run</b>. Recharge ensuite cette page.</div></div>`;
  }
  const list=sponsorsList();
  return `
  <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openSponsorForm()">${ic('plus')}Ajouter un sponsor</button>
  ${list.map(x=>`<div class="admin-item">
      <div class="sp-admin-logo">${x.logo? `<img src="${x.logo}" alt="">` : `<span class="sp-word">${esc(x.name)}</span>`}</div>
      <div class="info"><b>${esc(x.name)}</b><div>${x.isReal? 'Partenariat réel' : 'Fictif (mention affichée)'}${x.url? ' · '+esc(x.url) : ''} · ordre ${x.order}</div></div>
      <div class="admin-actions">
        <button class="btn btn-sm btn-ghost btn-icon" title="Modifier" onclick="openSponsorForm('${x.id}')">${ic('edit')}</button>
        <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteSponsor('${x.id}')">${ic('trash')}</button>
      </div>
    </div>`).join('') || emptyState('star','Aucun sponsor','Ajoute un nom et un logo : ils apparaîtront sur le terrain, l\'accueil, le bandeau et le pied de page.')}
  <div class="hint">Coche « partenariat réel » seulement si la marque a donné son accord. Tant qu'un sponsor n'est pas coché, la mention « partenariats fictifs » s'affiche en bas de chaque page.</div>`;
}
function openSponsorForm(id){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const x=id? sponsorsList().find(s=>s.id===id) : null;
  openModal(`
    <h2>${x? 'Modifier le sponsor' : 'Ajouter un sponsor'}<button class="modal-close" onclick="closeModal()" aria-label="Fermer">${ic('x')}</button></h2>
    <form onsubmit="return submitSponsorForm(event,'${id||''}')">
      <div class="form-row"><label>Nom *</label><input class="input" name="name" required value="${x? esc(x.name) : ''}"></div>
      <div class="form-row"><label>Logo (PNG transparent de préférence)</label><input class="input" type="file" accept="image/*" name="logoFile">
        ${x&&x.logo? `<div class="sp-admin-logo" style="margin-top:8px;"><img src="${x.logo}" alt=""></div>` : ''}</div>
      <div class="form-2col">
        <div class="form-row"><label>Lien (facultatif)</label><input class="input" name="url" type="url" placeholder="https://…" value="${x&&x.url? esc(x.url) : ''}"></div>
        <div class="form-row"><label>Ordre d'affichage</label><input class="input" name="order" type="number" value="${x? x.order : sponsorsList().length+1}"></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;text-transform:none;"><input type="checkbox" name="isReal" ${x&&x.isReal? 'checked' : ''}> Partenariat réel : la marque a donné son accord</label></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">${x? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </form>`);
}
async function submitSponsorForm(ev,id){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  const name=(fd.get('name')||'').trim();
  if(!name){ toast('Le nom est obligatoire','error'); return false; }
  const old=id? sponsorsList().find(s=>s.id===id) : null;
  const x={ id:id||uid('sp'), name, url:(fd.get('url')||'').trim(), order:parseInt(fd.get('order'),10)||0, isReal:!!fd.get('isReal'), logo:old? old.logo : null };
  const file=fd.get('logoFile');
  if(file && file.size>0){
    try{ x.logo=await resizeLogoDataURL(await fileToDataURL(file)); }catch(e){ console.error(e); toast('Logo illisible','error'); return false; }
  }
  try{ await SponsorsRepo.save(x); }catch(e){ console.error(e); toast('Enregistrement impossible : '+(e.message||e),'error'); return false; }
  await loadAll(); closeModal(); render(); toast('Sponsor enregistré','success');
  return false;
}
async function deleteSponsor(id){
  const x=sponsorsList().find(s=>s.id===id);
  if(!x || !confirm(`Supprimer le sponsor « ${x.name} » ?`)) return;
  try{ await SponsorsRepo.remove(id); }catch(e){ toast('Suppression impossible','error'); return; }
  await loadAll(); render(); toast('Sponsor supprimé','success');
}
