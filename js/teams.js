'use strict';
/* ============================================================
   GÉNÉRATEUR D'ÉQUIPES ÉQUILIBRÉES
   - Niveau de chaque joueur : classement type Elo calculé sur tout l'historique (équipes + score,
     avec bonus selon l'écart de buts). Un joueur sans historique est à 1000 (moyen).
   - Contribution offensive : (buts + passes) par Five, lissée vers la moyenne du groupe.
   - Historique des associations : on pénalise les joueurs qui jouent tout le temps ensemble
     (les Five récents comptent plus) et on favorise ceux qui ne se sont jamais ou rarement retrouvés
     dans la même équipe.
   - Contraintes manuelles : "ensemble" / "séparés".
   On teste toutes les répartitions possibles (<= 16 joueurs) et on garde les 3 meilleures, différentes entre elles.
   ============================================================ */
const ELO_START=1000, ELO_K=32, TEAMGEN_MAX_PLAYERS=16;
function eloGoalFactor(gd){ gd=Math.abs(gd); return gd<=1? 1 : gd===2? 1.5 : (11+gd)/8; }
/* Le calcul (avec historique match par match) est dans ratings.js : eloHistory(). */
function computeEloRatings(){
  const h=eloHistory();
  return {rating:h.rating, games:h.games};
}
function pairKey(a,b){ return a<b? a+'|'+b : b+'|'+a; }
/* Historique des associations : pondéré (Five récent = poids 1, puis x0.9 par Five en arrière) */
function pairHistory(){
  const played=fivesSorted().filter(f=>!isFutureFive(f));
  const together={}, both={}, rawTogether={}, rawBoth={};
  played.forEach((five,idx)=>{
    const w=Math.pow(0.9, played.length-1-idx);
    const parts=participationsForFive(five.id).filter(p=>p.teamId==='A'||p.teamId==='B');
    for(let i=0;i<parts.length;i++) for(let j=i+1;j<parts.length;j++){
      const k=pairKey(parts[i].playerId,parts[j].playerId);
      both[k]=(both[k]||0)+w; rawBoth[k]=(rawBoth[k]||0)+1;
      if(parts[i].teamId===parts[j].teamId){ together[k]=(together[k]||0)+w; rawTogether[k]=(rawTogether[k]||0)+1; }
    }
  });
  return {
    familiarity:(a,b)=>{ const k=pairKey(a,b); return both[k]? (together[k]||0)/both[k] : 0; },
    counts:(a,b)=>{ const k=pairKey(a,b); return {together:rawTogether[k]||0, both:rawBoth[k]||0}; }
  };
}
function offenseRates(){
  const rates={}; let totGA=0, totM=0;
  const stats={};
  STATE.players.forEach(p=>{ const fs=playerFullStats(p.id); stats[p.id]=fs; totGA+=fs.ga; totM+=fs.matches; });
  const prior= totM? totGA/totM : 0;
  const K=3;
  STATE.players.forEach(p=>{ const fs=stats[p.id]; rates[p.id]=(fs.ga+K*prior)/(fs.matches+K); });
  return {rates,prior,stats};
}
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function generateBalancedTeams(presentIds,constraints,seed){
  const n=presentIds.length;
  if(n<2) return {error:'Sélectionne au moins 2 joueurs.'};
  if(n>TEAMGEN_MAX_PLAYERS) return {error:'Maximum '+TEAMGEN_MAX_PLAYERS+' joueurs à la fois.'};
  const {rating,games}=computeEloRatings();
  const hist=pairHistory();
  const off=offenseRates();
  const idx={}; presentIds.forEach((id,i)=>{ idx[id]=i; });
  const cons=(constraints||[]).filter(c=>(c.a in idx)&&(c.b in idx)&&c.a!==c.b);
  const sizeA=Math.floor(n/2);
  const offScale=Math.max(0.2, off.prior*0.25);
  const rng=mulberry32(seed||1);
  const cands=[];
  const inA=new Array(n).fill(false);
  function evaluate(){
    for(const c of cons){
      const same=inA[idx[c.a]]===inA[idx[c.b]];
      if(c.type==='together' && !same) return;
      if(c.type==='apart' && same) return;
    }
    const A=[],B=[];
    presentIds.forEach((id,i)=>{ (inA[i]?A:B).push(id); });
    const mean=(ids,f)=>ids.reduce((s,id)=>s+f(id),0)/ids.length;
    const eA=mean(A,id=>rating[id]), eB=mean(B,id=>rating[id]);
    const oA=mean(A,id=>off.rates[id]), oB=mean(B,id=>off.rates[id]);
    let famSum=0, pairs=0;
    [A,B].forEach(T=>{ for(let i=0;i<T.length;i++) for(let j=i+1;j<T.length;j++){ famSum+=hist.familiarity(T[i],T[j]); pairs++; } });
    const fam= pairs? famSum/pairs : 0;
    const cost=Math.pow((eA-eB)/50,2) + 0.5*Math.pow((oA-oB)/offScale,2) + 3*fam + rng()*0.3;
    cands.push({A,B,eA,eB,oA,oB,fam,cost});
  }
  function rec(start,count){
    if(count===0){ evaluate(); return; }
    for(let i=start;i<=n-count;i++){ inA[i]=true; rec(i+1,count-1); inA[i]=false; }
  }
  if(n%2===0){ inA[0]=true; rec(1,sizeA-1); } /* n pair : équipes symétriques, on fixe le 1er joueur dans A */
  else rec(0,sizeA);
  if(!cands.length) return {error:"Ces contraintes sont impossibles à respecter ensemble (vérifie les « ensemble » / « séparés »)."};
  cands.sort((x,y)=>x.cost-y.cost);
  const chosen=[];
  for(const c of cands){
    if(chosen.every(o=>c.A.filter(id=>!o.A.includes(id)).length>=2 || n<=3)) chosen.push(c);
    if(chosen.length>=3) break;
  }
  /* petits groupes : il n'existe pas toujours 3 répartitions très différentes, on complète avec les meilleures restantes */
  for(const c of cands){
    if(chosen.length>=3) break;
    if(!chosen.includes(c)) chosen.push(c);
  }
  const variants=chosen.map(c=>{
    const repeated=[], fresh=[];
    [c.A,c.B].forEach(T=>{ for(let i=0;i<T.length;i++) for(let j=i+1;j<T.length;j++){
      const f=hist.familiarity(T[i],T[j]), ct=hist.counts(T[i],T[j]);
      if(f===0) fresh.push([T[i],T[j]]);
      else if(f>=0.6 && ct.both>=2) repeated.push({a:T[i],b:T[j],together:ct.together,both:ct.both});
    } });
    repeated.sort((x,y)=>y.together-x.together);
    return {teamA:c.A, teamB:c.B, eloA:c.eA, eloB:c.eB, offA:c.oA, offB:c.oB, fam:c.fam,
            pA:1/(1+Math.pow(10,(c.eB-c.eA)/400)), repeated, freshCount:fresh.length};
  });
  return {variants, ratings:{rating,games}, offense:off};
}

/* ---- état et interface ---- */
let _tg={present:new Set(), constraints:[], seed:1, result:null};
function viewTeams(){
  return `
  ${pageHeader("Générateur d'équipes","Équipes équilibrées d'après le niveau de chacun et l'historique des matchs")}
  <div id="teamGenBody">${teamGenBodyHTML()}</div>`;
}
function teamGenRefresh(){
  const el=document.getElementById('teamGenBody');
  if(el) el.innerHTML=teamGenBodyHTML();
}
function toggleTgPlayer(id){
  if(_tg.present.has(id)) _tg.present.delete(id); else _tg.present.add(id);
  _tg.result=null;
  teamGenRefresh();
}
function tgSelectAll(){ _tg.present=new Set(STATE.players.map(p=>p.id)); _tg.result=null; teamGenRefresh(); }
function tgSelectNone(){ _tg.present=new Set(); _tg.result=null; teamGenRefresh(); }
function tgSelectNext(){
  const next=dashboardStats().nextFive;
  if(!next){ toast('Aucun Five à venir','error'); return; }
  const ids=participationsForFive(next.id).map(p=>p.playerId).filter(id=>getPlayer(id));
  if(!ids.length){ toast('Aucun joueur renseigné pour le prochain Five','error'); return; }
  _tg.present=new Set(ids); _tg.result=null; teamGenRefresh();
}
function tgAddConstraint(){
  const a=document.getElementById('tgSelA')?.value, b=document.getElementById('tgSelB')?.value, type=document.getElementById('tgSelType')?.value||'together';
  if(!a||!b){ toast('Choisis deux joueurs','error'); return; }
  if(a===b){ toast('Choisis deux joueurs différents','error'); return; }
  const k=pairKey(a,b);
  const same=_tg.constraints.find(c=>pairKey(c.a,c.b)===k);
  if(same){
    toast(same.type===type? 'Cette contrainte existe déjà' : 'Contradiction : ces deux joueurs ont déjà la contrainte inverse','error');
    return;
  }
  _tg.constraints.push({a,b,type}); _tg.result=null; teamGenRefresh();
}
function tgRemoveConstraint(i){ _tg.constraints.splice(i,1); _tg.result=null; teamGenRefresh(); }
function generateTeams(){
  _tg.seed=1;
  _tg.result=generateBalancedTeams([..._tg.present].sort((x,y)=>(getPlayer(x)?.name||'').localeCompare(getPlayer(y)?.name||'')), _tg.constraints, _tg.seed);
  teamGenRefresh();
}
function rerollTeams(){
  _tg.seed=(_tg.seed||1)+1;
  _tg.result=generateBalancedTeams([..._tg.present].sort((x,y)=>(getPlayer(x)?.name||'').localeCompare(getPlayer(y)?.name||'')), _tg.constraints, _tg.seed);
  teamGenRefresh();
}
function useGeneratedTeams(i){
  const v=_tg.result && _tg.result.variants && _tg.result.variants[i];
  if(!v) return;
  openFiveForm(null,{teamA:v.teamA, teamB:v.teamB});
}
function teamGenBodyHTML(){
  const all=[...STATE.players].sort((a,b)=>a.name.localeCompare(b.name));
  const presentList=all.filter(p=>_tg.present.has(p.id));
  const COL_A=TEAM_COLORS.A, COL_B=TEAM_COLORS.B;
  const pName=(id)=>esc(playerName(getPlayer(id)));
  const chips=all.map(p=>`<button type="button" class="btn btn-sm ${_tg.present.has(p.id)?'btn-primary':'btn-ghost'}" onclick="toggleTgPlayer('${p.id}')">${_tg.present.has(p.id)?ic("check",14):""}${esc(p.name)}</button>`).join('');
  const opts=presentList.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  const consRows=_tg.constraints.map((c,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-soft);">
      <div style="flex:1;font-size:14px;"><b>${pName(c.a)}</b> ${c.type==='together'?'<span style="color:var(--primary);">même équipe que</span>':'<span style="color:var(--danger);">équipe adverse de</span>'} <b>${pName(c.b)}</b>${(_tg.present.has(c.a)&&_tg.present.has(c.b))?'':' <span class="page-sub" style="font-size:11.5px;">(ignorée : un des deux n\'est pas sélectionné)</span>'}</div>
      <button type="button" class="btn btn-sm btn-ghost" onclick="tgRemoveConstraint(${i})" aria-label="Retirer">${ic("x",14)}</button>
    </div>`).join('');

  const r=_tg.result;
  let resultHTML='';
  if(r && r.error) resultHTML=`<div class="notice">${ic("alert")}<div>${esc(r.error)}</div></div>`;
  else if(r && r.variants){
    const {rating,games}=r.ratings;
    const teamCol=(ids,label,color,elo)=>`<div style="flex:1;min-width:200px;">
        <div style="font-weight:800;color:${color};margin-bottom:6px;">${label} <span class="page-sub" style="font-weight:500;">· niveau ${Math.round(elo)}</span></div>
        ${ids.map(id=>{ const p=getPlayer(id); return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;">${avatarHTML(p,28)}<span style="font-weight:600;font-size:14px;">${esc(playerName(p))}</span><span class="page-sub" style="margin-left:auto;font-size:11.5px;">${Math.round(rating[id])}${games[id]<3?' · ?':''}</span></div>`; }).join('')}
      </div>`;
    resultHTML=`${sectionTitle("shuffle","Propositions")}`+r.variants.map((v,i)=>{
      const pA=Math.round(v.pA*100), pB=100-pA;
      const rep=v.repeated.slice(0,3).map(x=>`${pName(x.a)} + ${pName(x.b)} (${x.together}/${x.both} Five ensemble)`).join(', ');
      return `<div class="card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
          <div style="font-weight:800;">Proposition ${i+1}</div>
          <div style="font-size:13px;color:var(--text-dim);">Victoire estimée : <b style="color:${COL_A};">A ${pA}%</b> · <b style="color:${COL_B};">B ${pB}%</b></div>
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;">${teamCol(v.teamA,"Équipe A",COL_A,v.eloA)}${teamCol(v.teamB,"Équipe B",COL_B,v.eloB)}</div>
        <div class="hint" style="margin-top:10px;line-height:1.6;">
          Écart de niveau : ${Math.round(Math.abs(v.eloA-v.eloB))} pts · contribution offensive A ${fmtNum(v.offA,2)} / B ${fmtNum(v.offB,2)} (buts+passes par Five)<br>
          ${v.freshCount} duo${v.freshCount>1?'s':''} qui ne se sont jamais retrouvé${v.freshCount>1?'s':''} dans la même équipe${rep? `<br>Habitués : ${rep}`:''}
        </div>
        ${isAdmin()? `<div style="margin-top:12px;"><button type="button" class="btn btn-sm btn-primary" onclick="useGeneratedTeams(${i})">${ic("plus")}Créer un five avec ces équipes</button></div>` : ''}
      </div>`;
    }).join('') + `<button type="button" class="btn btn-ghost" onclick="rerollTeams()">${ic("refresh")}Autres propositions</button>
      <div class="hint" style="margin-top:6px;">« ? » = moins de 3 Five joués : son niveau est encore peu fiable (compté comme moyen).</div>`;
  }
  const n=presentList.length;
  return `
  <div class="section-title">${ic("users")}<span>Qui est là ?</span><span class="count">${n} sélectionné${n>1?'s':''}</span></div>
  <div class="card">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <button type="button" class="btn btn-sm btn-ghost" onclick="tgSelectAll()">Tout sélectionner</button>
      <button type="button" class="btn btn-sm btn-ghost" onclick="tgSelectNone()">Aucun</button>
      <button type="button" class="btn btn-sm btn-ghost" onclick="tgSelectNext()">${ic("calendar")}Joueurs du prochain match</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">${chips || '<span class="page-sub">Aucun joueur.</span>'}</div>
  </div>

  <div class="section-title">${ic("link")}<span>Contraintes</span><span class="count">optionnel</span></div>
  <div class="card">
    ${consRows || '<div class="page-sub" style="margin-bottom:10px;">Aucune contrainte.</div>'}
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
      <select class="input" id="tgSelA" style="max-width:170px;"><option value="">Joueur 1</option>${opts}</select>
      <select class="input" id="tgSelType" style="max-width:240px;"><option value="together">Ensemble (même équipe)</option><option value="apart">Séparés (équipes adverses)</option></select>
      <select class="input" id="tgSelB" style="max-width:170px;"><option value="">Joueur 2</option>${opts}</select>
      <button type="button" class="btn btn-sm btn-ghost" onclick="tgAddConstraint()">+ Ajouter</button>
    </div>
    ${n<2? '<div class="hint">Sélectionne d\'abord les joueurs présents pour pouvoir ajouter une contrainte.</div>':''}
  </div>

  <div style="margin-top:18px;"><button type="button" class="btn btn-primary" onclick="generateTeams()" ${n<2?'disabled':''}>${ic("shuffle")}Générer les équipes</button></div>
  ${resultHTML}

  <div class="hint" style="margin-top:20px;line-height:1.6;">Comment ça marche : chaque joueur a un niveau (classement type Elo calculé sur vos Five : battre une équipe forte rapporte plus, et l'écart de buts compte). Le site teste toutes les répartitions et garde celles où les deux équipes ont un niveau et une force offensive proches, en évitant de remettre ensemble ceux qui jouent tout le temps dans la même équipe (les Five récents comptent plus) et en favorisant les duos qui ne se sont jamais retrouvés ensemble.</div>`;
}
function dashboardStats(){
  const sorted=fivesSorted();
  const playedSorted=sorted.filter(f=>!isFutureFive(f));
  // "Five joués" et totaux de buts/passes : on ne compte que les Five déjà joués,
  // un Five à venir n'est qu'une annonce et ne doit jamais apparaître dans les stats.
  const totalFives=playedSorted.length;
  const totalPlayers=STATE.players.length;
  const totalGoals=STATE.goals.length;
  const totalAssists=STATE.goals.filter(g=>g.assisterId).length;
  const lastFive=playedSorted.length? playedSorted[playedSorted.length-1] : null;
  const nextFive=sorted.filter(f=>isFutureFive(f)).sort((a,b)=>a.date.localeCompare(b.date))[0] || null;
  const topScorerRanked=rankPlayers('goals','total');
  const topAssisterRanked=rankPlayers('assists','total');
  const topGARanked=rankPlayers('ga','total');
  const topScorer=(topScorerRanked.length && topScorerRanked[0].value>0)? topScorerRanked.filter(r=>r.rank===1) : [];
  const topAssister=(topAssisterRanked.length && topAssisterRanked[0].value>0)? topAssisterRanked.filter(r=>r.rank===1) : [];
  const topGA=(topGARanked.length && topGARanked[0].value>0)? topGARanked.filter(r=>r.rank===1) : [];
  let bestFive=null;
  playedSorted.forEach(f=>{ const n=goalsForFive(f.id).length; if(!bestFive||n>bestFive.count) bestFive={five:f,count:n}; });
  return {totalFives,totalPlayers,totalGoals,totalAssists,lastFive,nextFive,topScorer,topAssister,topGA,bestFive};
}

