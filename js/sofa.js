'use strict';
/* ============================================================
   FICHE DE MATCH FAÇON SOFASCORE
   Compos sur le terrain avec notes /10, buts, passes D et homme du match ; fiche du joueur pour le match ;
   statistiques d'équipe ; heatmaps ; import des stats de l'analyse vidéo (onglet admin « Stats IA »).
   Les notes viennent de matchRatings() (ratings.js), les stats vidéo de STATE.aiStats (data.js).
   ============================================================ */

let fiveTab='compos';
function setFiveTab(t){ fiveTab=t; render(); }
const normName=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const fmtDec=(v,d)=>v===null||v===undefined? '–' : Number(v).toFixed(d===undefined?1:d).replace('.',',');

/* ---------- petits éléments ---------- */
function evIconsHTML(st){
  let h='';
  if(st.goals) h+=`<span class="sf-ev g" title="${plural(st.goals,'but')}">${ic('ball')}${st.goals>1? `<b>${st.goals}</b>`:''}</span>`;
  if(st.assists) h+=`<span class="sf-ev a" title="${plural(st.assists,'passe décisive','passes décisives')}">${ic('boot')}${st.assists>1? `<b>${st.assists}</b>`:''}</span>`;
  if(st.ownGoals) h+=`<span class="sf-ev og" title="But contre son camp">${ic('goalNet')}</span>`;
  return h;
}
function motmBadge(){ return `<span class="sf-motm" title="Homme du match">${ic('star')}</span>`; }

/* ---------- bandeau homme du match ---------- */
function motmCardHTML(fiveId){
  const ids=manOfTheMatch(fiveId), r=matchRatings(fiveId);
  if(!ids.length) return '';
  return `<div class="sf-motm-card">${ids.map(id=>{
    const p=getPlayer(id), st=playerStatsForFive(id,fiveId), ai=aiPlayerStats(fiveId,id);
    const bits=[st.goals? plural(st.goals,'but'):'', st.assists? plural(st.assists,'passe D','passes D'):'',
      ai&&ai.distanceKm? fmtDec(ai.distanceKm,2)+' km':'', ai&&ai.maxSpeedKmh? fmtDec(ai.maxSpeedKmh)+' km/h':''].filter(Boolean);
    return `<button class="sf-motm-item" onclick="openPlayerMatchSheet('${fiveId}','${id}')">
      ${avatarHTML(p,64)}
      <div class="sf-motm-txt"><div class="sf-motm-lbl">${ic('star')}Homme du match${ids.length>1?' (ex-aequo)':''}</div>
        <div class="sf-motm-name">${esc(playerName(p))}</div><div class="sf-motm-sub">${bits.join(' · ')||'Équipe '+r[id].teamId}</div></div>
      ${ratingPill(r[id].rating,'big')}
    </button>`; }).join('')}</div>`;
}

/* ---------- compos sur le terrain ----------
   Équipe A à gauche (attaque vers la droite), équipe B à droite, retournée (comme sur Sofascore).
   Avec les stats vidéo : gardien au fond, puis les autres rangés selon leur position moyenne réelle.
   Sans : 1-2-2, les plus décisifs devant. */
function lineupSlots(rows,fiveId){
  const n=rows.length;
  const ai=r=>aiPlayerStats(fiveId,r.playerId);
  const withPos=rows.filter(r=>ai(r)&&ai(r).avgPos);
  if(n===5 && withPos.length===5){
    const gk=rows.slice().sort((a,b)=>(ai(b).goalkeeper-ai(a).goalkeeper)||ai(a).avgPos[0]-ai(b).avgPos[0])[0];
    const out=rows.filter(r=>r!==gk).sort((a,b)=>ai(a).avgPos[0]-ai(b).avgPos[0]);
    const mids=[out[1],out[2]].sort((a,b)=>ai(a).avgPos[1]-ai(b).avgPos[1]);
    return [{r:gk,x:7,y:50,gk:!!ai(gk).goalkeeper},{r:out[0],x:19,y:50},{r:mids[0],x:31,y:30},{r:mids[1],x:31,y:70},{r:out[3],x:43,y:50}];
  }
  const ga=r=>{ const s=playerStatsForFive(r.playerId,fiveId); return s.goals*2+s.assists; };
  const sorted=rows.slice().sort((a,b)=>ga(a)-ga(b) || playerName(a.player).localeCompare(playerName(b.player)));
  if(n===5) return [{r:sorted[0],x:9,y:50},{r:sorted[1],x:24,y:33},{r:sorted[2],x:24,y:67},{r:sorted[3],x:39,y:34},{r:sorted[4],x:39,y:66}];
  const cols=lineupColumns(n), out=[]; let k=0;
  cols.forEach((c,ci)=>{ for(let j=0;j<c;j++) out.push({r:sorted[k++], x:9+(cols.length===1?.5:ci/(cols.length-1))*32, y:(j+1)/(c+1)*100}); });
  return out;
}
function sofaLineupHTML(fiveId){
  const parts=playersInFive(fiveId), r=matchRatings(fiveId), motm=manOfTheMatch(fiveId);
  const team=t=>parts.filter(p=>p.teamId===t);
  const node=(s,side)=>{
    const p=s.r, st=playerStatsForFive(p.playerId,fiveId), rt=r&&r[p.playerId]? r[p.playerId].rating : null;
    const x= side==='a'? s.x : 100-s.x, y= side==='a'? s.y : 100-s.y;
    return `<button class="sf-pl ${side}" style="--x:${x}%;--y:${y}%" onclick="openPlayerMatchSheet('${fiveId}','${p.playerId}')">
      <span class="sf-av">${avatarHTML(p.player,60)}${rt!==null? ratingPill(rt,'sf-rt'):''}${motm.includes(p.playerId)? motmBadge():''}
        <span class="sf-evs">${evIconsHTML(st)}</span>${s.gk? '<span class="sf-gk">G</span>':''}</span>
      <span class="sf-nm">${esc(playerName(p.player))}</span></button>`;
  };
  const head=t=>{ const avg=teamAvgRating(fiveId,t); const sc=fiveScore(fiveId);
    return `<div class="sf-team-head ${t.toLowerCase()}"><span class="sb-dot ${t.toLowerCase()}"></span><b>Équipe ${t}</b>
      ${t==='A'? `<span class="sf-th-score num">${sc.a}</span>`:`<span class="sf-th-score num">${sc.b}</span>`}${avg!==null? ratingPill(avg,'avg',2):''}</div>`; };
  const list=t=>team(t).map(p=>({p, rt:r&&r[p.playerId]? r[p.playerId].rating : null}))
    .sort((a,b)=>(b.rt||0)-(a.rt||0)).map(({p,rt})=>{
      const st=playerStatsForFive(p.playerId,fiveId), ai=aiPlayerStats(fiveId,p.playerId);
      return `<button class="sf-row" onclick="openPlayerMatchSheet('${fiveId}','${p.playerId}')">${avatarHTML(p.player,34)}
        <span class="sf-row-name">${esc(playerName(p.player))}${ai&&ai.goalkeeper? ' <span class="sf-pos">G</span>':''}</span>
        <span class="sf-row-ev">${motm.includes(p.playerId)? motmBadge():''}${evIconsHTML(st)}</span>${ratingPill(rt)}</button>`; }).join('');
  return `<div class="sf-lineup-card">
    <div class="sf-heads">${head('A')}${head('B')}</div>
    <div class="sf-pitch">${PITCH_LINES_SVG_SOFA}
      ${lineupSlots(team('A'),fiveId).map(s=>node(s,'a')).join('')}${lineupSlots(team('B'),fiveId).map(s=>node(s,'b')).join('')}</div>
    <div class="sf-lists"><div>${list('A')}</div><div>${list('B')}</div></div>
    <div class="sf-legend">${ic('ball')} but · ${ic('boot')} passe décisive · ${motmBadge()} homme du match · clique sur un joueur pour sa fiche du match ·
      <button class="linklike" onclick="openRatingInfo()">comment est calculée la note ?</button></div>
  </div>`;
}
const PITCH_LINES_SVG_SOFA=`<svg class="sf-lines" viewBox="0 0 300 160" preserveAspectRatio="none"><g fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.2">
  <rect x="3" y="3" width="294" height="154"/><line x1="150" y1="3" x2="150" y2="157"/><circle cx="150" cy="80" r="22"/>
  <rect x="3" y="45" width="34" height="70"/><rect x="263" y="45" width="34" height="70"/></g></svg>`;

/* ---------- heatmap (grille 1 m, joueur qui attaque vers la droite) ---------- */
function heatmapSVG(grid,flip){
  if(!grid||!grid.length) return '<div class="page-sub">Pas de heatmap</div>';
  const H=grid.length, W=grid[0].length, cell=10, id='hm'+Math.random().toString(36).slice(2,8);
  const col=v=> v>75?'#dc0c00': v>50?'#ed7e07': v>28?'#d9af00':'#2fd06a';
  let dots='';
  grid.forEach((row,y)=>row.forEach((v,x)=>{ if(v<12) return;
    const X= flip? W-1-x : x, Y= flip? H-1-y : y;
    dots+=`<circle cx="${X*cell+5}" cy="${Y*cell+5}" r="${8+v/12}" fill="${col(v)}" fill-opacity="${Math.min(.9,(v-12)/70)}"/>`; }));
  return `<svg class="sf-heat" viewBox="0 0 ${W*cell} ${H*cell}"><defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <rect width="100%" height="100%" fill="#173a2a"/><g filter="url(#${id})">${dots}</g>
    <g fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"><rect x="1" y="1" width="${W*cell-2}" height="${H*cell-2}"/><line x1="${W*cell/2}" y1="0" x2="${W*cell/2}" y2="${H*cell}"/>
    <circle cx="${W*cell/2}" cy="${H*cell/2}" r="22"/><rect x="1" y="${H*cell/2-35}" width="34" height="70"/><rect x="${W*cell-35}" y="${H*cell/2-35}" width="34" height="70"/></g></svg>`;
}

/* ---------- fiche du joueur pour ce match (modale) ---------- */
function openPlayerMatchSheet(fiveId,playerId){
  const p=getPlayer(playerId), r=matchRatings(fiveId), rr=r&&r[playerId], st=playerStatsForFive(playerId,fiveId);
  const ai=aiPlayerStats(fiveId,playerId), aiF=aiStatsForFive(fiveId), team=teamOfPlayerInFive(fiveId,playerId);
  const res=playerResultInFive(playerId,fiveId), motm=manOfTheMatch(fiveId).includes(playerId);
  const row=(l,v,sub)=>`<div class="sf-srow"><span>${l}</span><b>${v}${sub? ` <small>${sub}</small>`:''}</b></div>`;
  const grp=(t,rows)=>`<div class="sf-sgrp"><div class="sf-sgrp-t">${t}</div>${rows}</div>`;
  const tried=ai? ai.passesOk+ai.passesLost : 0;
  const sign=v=>(v>=0?'+':'')+v.toFixed(2).replace('.',',');
  let body=grp('Match', row('Résultat',{win:'Victoire',draw:'Nul',loss:'Défaite'}[res]||'–')+row('Buts',st.goals)+row('Passes décisives',st.assists)
    +(st.ownGoals? row('Contre son camp',st.ownGoals):'')+(ai? row('Minutes vues à l\'image',fmtDec(ai.minutes,0)+' min'):''));
  if(ai){
    body+=grp('Ballon', row('Touches de balle',ai.touches)+row('Passes réussies',ai.passesOk)+row('Passes reçues',ai.passesReceived)
      +row('Passes interceptées',ai.passesLost)+row('Précision des passes',tried? Math.round(100*ai.passesOk/tried)+' %':'–', tried? `${ai.passesOk}/${tried}`:''));
    body+=grp('Défense', row('Récupérations',ai.interceptions)+row('Duels gagnés',`${ai.duelsWon}/${ai.duelsWon+ai.duelsLost}`));
    body+=grp('Physique', row('Distance parcourue',fmtDec(ai.distanceKm,2)+' km')+row('Vitesse max',fmtDec(ai.maxSpeedKmh)+' km/h', ai.maxSpeedMinute!=null? `à la ${ai.maxSpeedMinute}e`:'')
      +row('Sprints (> 20 km/h)',ai.sprints));
    body+=`<div class="sf-sgrp"><div class="sf-sgrp-t">Heatmap <small>(attaque vers la droite →)</small></div>${heatmapSVG(ai.heatmap)}</div>`;
  } else body+=`<div class="notice" style="margin-top:10px;">${ic('info')}<div>Pas encore de stats vidéo pour ce five : la note ne tient compte que des buts, passes décisives et du résultat.</div></div>`;
  if(rr){
    const pp=rr.parts;
    body+=grp('Calcul de la note', row('Départ',fmtDec(pp.base,1))+row('Résultat',sign(pp.result))+row('Buts et passes D',sign(pp.ga))
      +(rr.hasAi? row('Jeu (stats vidéo, comparé aux autres)',sign(pp.ai)):'')+(pp.gk? row('Gardien',sign(pp.gk)):'')+row('Note',ratingPill(rr.rating)));
  }
  if(ai) body+=`<div class="ft-note">${aiReliabilityNote(aiF)}</div>`;
  openModal(`<h2>${fiveTitle(fiveId)} · fiche du match<button class="modal-close" onclick="closeModal()" aria-label="Fermer">${ic('x')}</button></h2>
    <div class="sf-sheet-head">${avatarHTML(p,64)}<div class="sf-sheet-info"><div class="sf-sheet-name">${esc(playerName(p))}</div>
      <div class="page-sub" style="margin:0;"><span class="sb-dot ${(team||'').toLowerCase()}"></span> Équipe ${team||'–'}${ai&&ai.goalkeeper? ' · gardien':''}</div>
      ${motm? `<div class="sf-motm-lbl" style="margin-top:4px;">${ic('star')}Homme du match</div>`:''}</div>
      ${rr? ratingPill(rr.rating,'big'):''}</div>
    <div class="sf-sheet-body">${body}</div>
    <div class="modal-actions"><a class="btn btn-ghost" href="#/player/${playerId}" onclick="closeModal()">${ic('user')}Fiche du joueur</a></div>`);
}
function openRatingInfo(){
  openModal(`<h2>La note du match<button class="modal-close" onclick="closeModal()" aria-label="Fermer">${ic('x')}</button></h2>
  <div class="sf-sheet-body" style="line-height:1.55">
  <p>Inspirée de la note Sofascore : chaque joueur part de <b>6,5</b> et chaque action la fait monter ou descendre, entre 3,0 et 10,0.</p>
  <ul><li><b>Buts</b> +0,45 chacun, <b>passes décisives</b> +0,30 (au plus +2,4 au total), <b>contre son camp</b> -0,40</li>
  <li><b>Résultat</b> : victoire +0,25, défaite -0,25</li>
  <li><b>Stats vidéo</b> (quand le five a été analysé) : comparaison avec les autres joueurs du même match, ramenée à 60 min jouées :
   touches, passes réussies, précision, récupérations, duels, distance, sprints. Entre -1,2 et +1,2.</li>
  <li><b>Gardien</b> : +0,3, puis -0,05 par but encaissé</li></ul>
  <p>Couleurs : ${[3,6,6.5,7,8,9].map(v=>ratingPill(v)).join(' ')} · <b>Homme du match</b> = meilleure note (tous les ex-aequo).</p></div>`);
}
function aiReliabilityNote(ai){
  if(!ai) return '';
  const rel=ai.reliability;
  const base=`Stats calculées par l'analyse vidéo (IA) · ballon vu sur ${fmtDec(ai.ballSeenPct,0)} % des images. Buts et passes décisives : saisis à la main.`;
  if(!rel) return base+' Passes, récupérations et duels : estimations, pas encore vérifiées à la main.';
  return base+' Vérifié à la main : '+Object.entries(rel).map(([k,v])=>`${k} ${v.pct_juste} % justes`).join(' · ')+'.';
}

/* ---------- onglet Stats : comparaison d'équipes + tableau des joueurs + heatmaps ---------- */
let fiveStatsSort='rating';
function setFiveStatsSort(k){ fiveStatsSort=k; render(); }
function fiveStatsTabHTML(fiveId){
  const ai=aiStatsForFive(fiveId), r=matchRatings(fiveId)||{}, parts=playersInFive(fiveId).filter(p=>p.teamId);
  const sc=fiveScore(fiveId);
  const sum=(t,k)=>parts.filter(p=>p.teamId===t).reduce((a,p)=>{ const s=aiPlayerStats(fiveId,p.playerId); return a+(s&&s[k]||0); },0);
  const mx=(t,k)=>Math.max(0,...parts.filter(p=>p.teamId===t).map(p=>{ const s=aiPlayerStats(fiveId,p.playerId); return s&&s[k]||0; }));
  const cmp=(l,a,b,fmt,pct)=>{ const f=fmt||(v=>v); const tot=(a+b)||1;
    return `<div class="sf-cmp"><div class="sf-cmp-v ${a>b?'lead':''}">${f(a)}</div><div class="sf-cmp-l">${l}</div><div class="sf-cmp-v ${b>a?'lead':''}">${f(b)}</div>
      <div class="sf-cmp-bar a"><i style="width:${(pct? a : 100*a/tot)}%"></i></div><div class="sf-cmp-bar b"><i style="width:${(pct? b : 100*b/tot)}%"></i></div></div>`; };
  const gA=goalsForFive(fiveId);
  let teamCmp=cmp('Buts',sc.a,sc.b);
  const assists=t=>gA.filter(g=>g.assisterId && teamOfPlayerInFive(fiveId,g.assisterId)===t && !g.isOwnGoal).length;
  teamCmp+=cmp('Passes décisives',assists('A'),assists('B'));
  const avgA=teamAvgRating(fiveId,'A'), avgB=teamAvgRating(fiveId,'B');
  if(avgA!==null) teamCmp+=cmp('Note moyenne',avgA,avgB,v=>fmtDec(v,2));
  if(ai){
    teamCmp=cmp('Possession',ai.possession.A||0,ai.possession.B||0,v=>v+' %',true)+teamCmp
      +cmp('Touches de balle',sum('A','touches'),sum('B','touches'))+cmp('Passes réussies',sum('A','passesOk'),sum('B','passesOk'))
      +cmp('Passes interceptées',sum('A','passesLost'),sum('B','passesLost'))+cmp('Récupérations',sum('A','interceptions'),sum('B','interceptions'))
      +cmp('Duels gagnés',sum('A','duelsWon'),sum('B','duelsWon'))+cmp('Distance totale',sum('A','distanceKm'),sum('B','distanceKm'),v=>fmtDec(v,1)+' km')
      +cmp('Sprints',sum('A','sprints'),sum('B','sprints'))+cmp('Vitesse max',mx('A','maxSpeedKmh'),mx('B','maxSpeedKmh'),v=>fmtDec(v)+' km/h');
  }
  const cols=[{k:'rating',l:'Note'},{k:'goals',l:'Buts'},{k:'assists',l:'Passes D'}]
    .concat(ai? [{k:'minutes',l:'Min.',d:0},{k:'touches',l:'Touches'},{k:'passesOk',l:'Passes'},{k:'acc',l:'% passes'},{k:'interceptions',l:'Récup.'},
      {k:'duelsWon',l:'Duels G'},{k:'distanceKm',l:'Km',d:2},{k:'maxSpeedKmh',l:'Vmax',d:1},{k:'sprints',l:'Sprints'}] : []);
  const rows=parts.map(p=>{ const st=playerStatsForFive(p.playerId,fiveId), s=aiPlayerStats(fiveId,p.playerId)||{};
    const tried=(s.passesOk||0)+(s.passesLost||0);
    return {p, v:Object.assign({}, s, {rating:r[p.playerId]? r[p.playerId].rating : null, goals:st.goals, assists:st.assists, acc:tried? Math.round(100*s.passesOk/tried):null})}; });
  rows.sort((a,b)=>(b.v[fiveStatsSort]??-1)-(a.v[fiveStatsSort]??-1));
  const motm=manOfTheMatch(fiveId);
  const table=`<div class="league-wrap"><table class="league sf-table"><thead><tr><th class="l-player">Joueur</th>${cols.map(c=>
      `<th class="${fiveStatsSort===c.k?'sorted':''}" onclick="setFiveStatsSort('${c.k}')">${c.l}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(({p,v})=>`<tr onclick="openPlayerMatchSheet('${fiveId}','${p.playerId}')" style="cursor:pointer"><td class="l-player"><span class="sb-dot ${p.teamId.toLowerCase()}"></span>${esc(playerName(p.player))}${motm.includes(p.playerId)? ' '+motmBadge():''}</td>
      ${cols.map(c=>`<td>${c.k==='rating'? ratingPill(v.rating) : v[c.k]===null||v[c.k]===undefined? '–' : c.k==='acc'? v[c.k]+' %' : c.d!==undefined? fmtDec(v[c.k],c.d) : v[c.k]}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
  const heat= ai? `${sectionTitle('map','Heatmaps','<span class="count">chaque joueur attaque vers la droite →</span>')}
    <div class="sf-heat-grid">${parts.slice().sort((a,b)=>a.teamId.localeCompare(b.teamId)).map(p=>{ const s=aiPlayerStats(fiveId,p.playerId);
      return s? `<button class="sf-heat-card" onclick="openPlayerMatchSheet('${fiveId}','${p.playerId}')"><div class="sf-heat-h"><span class="sb-dot ${p.teamId.toLowerCase()}"></span>${esc(playerName(p.player))}${r[p.playerId]? ratingPill(r[p.playerId].rating):''}</div>${heatmapSVG(s.heatmap)}</button>` : ''; }).join('')}</div>` : '';
  return `<div class="sf-stats-card"><div class="sf-cmp-head"><span><span class="sb-dot a"></span>Équipe A</span><span>Équipe B<span class="sb-dot b"></span></span></div>${teamCmp}</div>
    ${ai? `<div class="ft-note" style="margin:6px 0 0;">${aiReliabilityNote(ai)}</div>` : `<div class="notice" style="margin-top:12px;">${ic('info')}<div>Pas encore de stats vidéo pour ce five. Elles s'ajoutent depuis <b>Données › Stats IA</b>.</div></div>`}
    ${sectionTitle('users','Joueurs','<span class="count">clique sur une colonne pour trier</span>')}${table}${heat}`;
}

/* ---------- profil joueur : notes ---------- */
function playerRatingsSectionHTML(playerId){
  const s=playerRatingSummary(playerId);
  if(!s.games.length) return '';
  const aiGames=s.games.filter(g=>g.hasAi).map(g=>({g, a:aiPlayerStats(g.five.id,playerId)}));
  const best=k=>aiGames.length? Math.max(...aiGames.map(x=>x.a[k]||0)) : null;
  return `${sectionTitle('star','Notes de match')}
  <div class="sf-prof">
    <div class="sf-prof-kpi"><div>${ratingPill(s.avg,'big',2)}<span>Note moyenne</span></div>
      <div><b class="num">${s.motm}</b><span>Homme du match</span></div>
      ${aiGames.length? `<div><b class="num">${fmtDec(best('maxSpeedKmh'))}</b><span>Vitesse max (km/h)</span></div>
      <div><b class="num">${fmtDec(aiGames.reduce((a,x)=>a+(x.a.distanceKm||0),0)/aiGames.length,2)}</b><span>Km par match analysé</span></div>`:''}</div>
    <div class="sf-prof-games">${s.games.slice().reverse().map(g=>`<button class="sf-prof-game" onclick="openPlayerMatchSheet('${g.five.id}','${playerId}')">
      <span>${fiveTitle(g.five.id)}<small>${fmtDateShort(g.five.date)}${g.hasAi? ' · vidéo':''}</small></span>${g.motm? motmBadge():''}${ratingPill(g.rating)}</button>`).join('')}</div>
  </div>`;
}

/* ---------- admin : import des stats de l'analyse vidéo ---------- */
let aiImport=null;   // {data, fiveId, map:{index: playerId}}
function adminAiTab(){
  if(!STATE.aiStatsReady) return `<div class="notice">${ic('alert')}<div><b>La table des stats IA n'existe pas encore.</b> Dans Supabase : SQL Editor › New query, colle le contenu de <code>supabase/ai_stats.sql</code> (dans le code sur GitHub) puis Run. Recharge ensuite cette page.</div></div>`;
  const done=Object.keys(STATE.aiStats).filter(id=>getFive(id));
  let h=`<div class="card" style="margin-bottom:14px;"><div class="card-title">${ic('upload')}Importer les stats d'une analyse vidéo</div>
    <div class="page-sub" style="margin:4px 0 10px;">Fichier <code>site_stats.json</code> créé par l'outil d'analyse (<code>export_site.py</code>). Buts et passes décisives ne changent pas : ce sont ceux du site.</div>
    <input type="file" accept=".json,application/json" onchange="aiImportFile(this)"></div>`;
  if(aiImport){
    const d=aiImport.data, five=getFive(aiImport.fiveId);
    const opts=fivesSorted().map(f=>`<option value="${f.id}" ${f.id===aiImport.fiveId?'selected':''}>${fiveTitle(f.id)} · ${fmtDateShort(f.date)}${STATE.aiStats[f.id]? ' (déjà des stats)':''}</option>`).join('');
    const players=[...STATE.players].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    h+=`<div class="card" style="margin-bottom:14px;"><div class="card-title">${ic('check')}Vérifie avant d'enregistrer</div>
      <div class="form-row"><label>Five concerné</label><select class="input" onchange="aiImport.fiveId=this.value;aiAutoMap();render();">${opts}</select></div>
      <div class="page-sub">${plural(d.players.length,'joueur')} · possession A ${d.possession.A} % – B ${d.possession.B} % · ${fmtDec(d.analysedMinutes,0)} min de vidéo</div>
      <table class="league" style="margin-top:10px;"><thead><tr><th class="l-player">Dans la vidéo</th><th>Éq.</th><th class="l-player">Joueur du site</th><th>Contrôle</th></tr></thead><tbody>
      ${d.players.map((p,i)=>{ const pid=aiImport.map[i]; const t=pid&&five? teamOfPlayerInFive(five.id,pid) : null;
        const warn=!pid? 'à choisir' : !t? 'pas dans ce five' : t!==p.team? `équipe ${t} sur le site` : '✔';
        return `<tr><td class="l-player">${esc(p.name)}${p.goalkeeper?' (gardien)':''}</td><td>${p.team}</td>
          <td class="l-player"><select onchange="aiImport.map[${i}]=this.value;render();"><option value="">–</option>${players.map(x=>`<option value="${x.id}" ${x.id===pid?'selected':''}>${esc(x.name)}</option>`).join('')}</select></td>
          <td style="color:${warn==='✔'?'var(--primary)':'#e5a50a'}">${warn}</td></tr>`; }).join('')}</tbody></table>
      <div class="modal-actions" style="justify-content:flex-start;"><button class="btn btn-primary" onclick="saveAiImport()">${ic('save')}Enregistrer pour ${five? fiveTitle(five.id):'ce five'}</button>
      <button class="btn btn-ghost" onclick="aiImport=null;render();">Annuler</button></div></div>`;
  }
  h+=done.length? done.map(id=>`<div class="admin-item"><div class="info"><b>${fiveTitle(id)} · ${fmtDateShort(getFive(id).date)}</b><div>Stats vidéo importées le ${fmtDateShort((STATE.aiStats[id].updatedAt||'').slice(0,10))}</div></div>
    <div class="admin-actions"><button class="btn btn-sm btn-ghost btn-icon" title="Voir" onclick="navigate('five/${id}')">${ic('eye')}</button>
    <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteAiStats('${id}')">${ic('trash')}</button></div></div>`).join('') : emptyState('chart','Aucun five analysé pour l\'instant');
  return h;
}
async function aiImportFile(input){
  try{
    const d=JSON.parse(await input.files[0].text());
    if(d.kind!=='lefiveyyy-ai-stats' || !Array.isArray(d.players)) throw new Error('ce n\'est pas un fichier de stats IA');
    aiImport={data:d, fiveId:null, map:{}};
    // five le plus probable : celui dont les joueurs correspondent le mieux aux noms de la vidéo
    let best=null, bestN=-1;
    fivesSorted().forEach(f=>{ const names=playersInFive(f.id).map(p=>normName(playerName(p.player)));
      const n=d.players.filter(p=>names.includes(normName(p.name))).length; if(n>bestN){ best=f.id; bestN=n; } });
    aiImport.fiveId=best; aiAutoMap(); render();
  }catch(e){ toast('Fichier illisible : '+e.message,'error'); }
}
function aiAutoMap(){
  const inFive=playersInFive(aiImport.fiveId).map(p=>p.player).filter(Boolean);
  aiImport.data.players.forEach((p,i)=>{
    const m=inFive.find(x=>normName(x.name)===normName(p.name)) || STATE.players.find(x=>normName(x.name)===normName(p.name));
    aiImport.map[i]=m? m.id : '';
  });
}
async function saveAiImport(){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const d=aiImport.data, ids=Object.values(aiImport.map);
  if(ids.some(x=>!x)){ toast('Choisis un joueur du site pour chaque joueur de la vidéo','error'); return; }
  if(new Set(ids).size!==ids.length){ toast('Un même joueur du site est choisi deux fois','error'); return; }
  if(STATE.aiStats[aiImport.fiveId] && !confirm('Ce five a déjà des stats vidéo : les remplacer ?')) return;
  const data=Object.assign({}, d, {players:d.players.map((p,i)=>Object.assign({}, p, {playerId:aiImport.map[i]}))});
  try{ await AiStatsRepo.save(aiImport.fiveId,data); const fid=aiImport.fiveId; aiImport=null; await loadAll();
    toast('Stats vidéo enregistrées','success'); navigate('five/'+fid); }
  catch(e){ console.error(e); toast('Erreur : '+e.message,'error'); }
}
async function deleteAiStats(fiveId){
  if(!confirm('Supprimer les stats vidéo de '+fiveTitle(fiveId)+' ? (buts et passes décisives ne bougent pas)')) return;
  try{ await AiStatsRepo.remove(fiveId); await loadAll(); toast('Stats vidéo supprimées','success'); render(); }
  catch(e){ toast('Erreur : '+e.message,'error'); }
}
