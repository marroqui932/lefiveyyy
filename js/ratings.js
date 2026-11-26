'use strict';
/* ============================================================
   FORME, SÉRIES, ELO (caché, pour les équipes), ASSOCIATIONS
   Tout est calculé à partir de STATE (aucune donnée stockée) et mis en cache
   jusqu'au prochain loadAll().
   ============================================================ */

/* ---------- Écart de buts de chaque joueur sur un Five (pour la différence de buts moyenne) ---------- */
function matchContributions(fiveId){
  return cached('contrib:'+fiveId,()=>{
    const five=getFive(fiveId);
    if(!five || isFutureFive(five) || !goalsForFive(fiveId).length) return [];
    const sc=fiveScore(fiveId);
    return participationsForFive(fiveId).filter(p=>p.teamId==='A'||p.teamId==='B').map(p=>{
      const gd= p.teamId==='A'? sc.a-sc.b : sc.b-sc.a;
      return {playerId:p.playerId, teamId:p.teamId, gd};
    });
  });
}

/* ---------- Résumé par joueur : notes, forme, séries ---------- */
function playerForm(playerId){
  return cached('form:'+playerId,()=>{
    const fs=playerFullStats(playerId);
    const games=fs.perFive.map(pf=>{
      const r=matchContributions(pf.five.id).find(x=>x.playerId===playerId);
      return {five:pf.five, result:pf.result, goals:pf.goals, assists:pf.assists, ga:pf.ga,
              gd:r? r.gd : null};
    });
    const withGd=games.filter(g=>g.gd!==null);

    // Séries (dans l'ordre chronologique). "current" = série en cours à la fin.
    function streak(pred){
      let cur=0,bestS=0;
      games.forEach(g=>{ if(pred(g)) { cur++; bestS=Math.max(bestS,cur); } else cur=0; });
      return {current:cur, best:bestS};
    }
    const withResult=games.filter(g=>g.result);
    function resStreak(pred){
      let cur=0,bestS=0;
      withResult.forEach(g=>{ if(pred(g.result)) { cur++; bestS=Math.max(bestS,cur); } else cur=0; });
      return {current:cur, best:bestS};
    }
    return {
      games,
      last5:withResult.slice(-5),
      plusMinus:withGd.reduce((a,g)=>a+g.gd,0), avgPlusMinus:withGd.length? withGd.reduce((a,g)=>a+g.gd,0)/withGd.length : null,
      winStreak:resStreak(r=>r==='win'), unbeatenStreak:resStreak(r=>r!=='loss'), lossStreak:resStreak(r=>r==='loss'),
      scoringStreak:streak(g=>g.goals>0), gaStreak:streak(g=>g.ga>0)
    };
  });
}
function formChipsHTML(last5){
  if(!last5 || !last5.length) return '<span class="page-sub">-</span>';
  const L={win:'V',draw:'N',loss:'D'};
  return `<span class="form-chips">${last5.map(g=>`<span class="form-chip ${g.result}" title="Five #${pad2(fiveNumber(g.five.id))} · ${fmtDateShort(g.five.date)}">${L[g.result]}</span>`).join('')}</span>`;
}

/* ---------- Elo avec historique ----------
   Même modèle que le générateur d'équipes (ELO_START, ELO_K, eloGoalFactor dans teams.js) :
   moyenne d'équipe vs moyenne d'équipe, bonus selon l'écart de buts. */
function eloHistory(){
  return cached('elo',()=>{
    const rating={}, games={}, peak={}, byPlayer={};
    STATE.players.forEach(p=>{ rating[p.id]=ELO_START; games[p.id]=0; peak[p.id]=ELO_START; byPlayer[p.id]=[]; });
    fivesSorted().filter(f=>!isFutureFive(f)).forEach(five=>{
      if(!goalsForFive(five.id).length) return;
      const parts=participationsForFive(five.id);
      const A=parts.filter(p=>p.teamId==='A').map(p=>p.playerId).filter(id=>id in rating);
      const B=parts.filter(p=>p.teamId==='B').map(p=>p.playerId).filter(id=>id in rating);
      if(!A.length||!B.length) return;
      const sc=fiveScore(five.id);
      const mean=(ids)=>ids.reduce((a,id)=>a+rating[id],0)/ids.length;
      const eA=1/(1+Math.pow(10,(mean(B)-mean(A))/400));
      const sA= sc.a>sc.b? 1 : sc.a<sc.b? 0 : 0.5;
      const delta=ELO_K*eloGoalFactor(sc.a-sc.b)*(sA-eA);
      const apply=(id,d)=>{
        const before=rating[id];
        rating[id]+=d; games[id]++; peak[id]=Math.max(peak[id],rating[id]);
        byPlayer[id].push({five, before, after:rating[id], delta:d});
      };
      A.forEach(id=>apply(id,delta));
      B.forEach(id=>apply(id,-delta));
    });
    return {rating, games, peak, byPlayer};
  });
}
/* ---------- Associations : jouer ENSEMBLE dans la même équipe ---------- */
function teammateStats(playerId){
  return cached('mates:'+playerId,()=>{
    const out={};
    STATE.participations.filter(p=>p.playerId===playerId && p.teamId).forEach(my=>{
      const five=getFive(my.fiveId);
      if(!five || isFutureFive(five)) return;
      const result=playerResultInFive(playerId,my.fiveId);
      if(!result) return;
      STATE.participations.filter(p=>p.fiveId===my.fiveId && p.teamId===my.teamId && p.playerId!==playerId).forEach(m=>{
        const o=out[m.playerId]||(out[m.playerId]={mateId:m.playerId,matches:0,wins:0,draws:0,losses:0});
        o.matches++; o[result==='win'?'wins':result==='draw'?'draws':'losses']++;
      });
    });
    return Object.values(out).map(o=>Object.assign(o,{winPct:Math.round(o.wins/o.matches*100), points:o.wins*3+o.draws}));
  });
}
const PAIR_MIN_MATCHES=2;
function bestAndWorstTeammates(playerId){
  const list=teammateStats(playerId).filter(m=>m.matches>=PAIR_MIN_MATCHES);
  if(!list.length) return {best:[], worst:[]};
  const score=m=>m.points/m.matches;
  const hi=Math.max(...list.map(score)), lo=Math.min(...list.map(score));
  return {
    best: list.filter(m=>score(m)===hi).sort((a,b)=>b.matches-a.matches),
    worst: hi===lo? [] : list.filter(m=>score(m)===lo).sort((a,b)=>b.matches-a.matches)
  };
}
function pairTogetherStats(){
  return cached('pairs',()=>{
    const seen={};
    STATE.players.forEach(p=>{
      teammateStats(p.id).forEach(m=>{
        const k=pairKey(p.id,m.mateId);
        if(!seen[k]) seen[k]=Object.assign({a:p.id<m.mateId?p.id:m.mateId, b:p.id<m.mateId?m.mateId:p.id}, m);
      });
    });
    return Object.values(seen).map(({a,b,matches,wins,draws,losses,winPct,points})=>({a,b,matches,wins,draws,losses,winPct,ppm:points/matches}));
  });
}

/* ---------- Classements génériques ---------- */
function withRanks(sortedRows,keyFn){
  let rank=0, prev;
  const k=keyFn||(v=>v);
  return sortedRows.map((r,i)=>{ const v=k(r.value); if(i===0||v!==prev){ rank=i+1; prev=v; } return Object.assign({},r,{rank}); });
}
function playedEnoughForAverages(playerId){
  const r=playerFullStats(playerId).participationRate;
  return r!==null && r>=AVG_MIN_PARTICIPATION*100;
}
function rankByForm(metric,{avgOnly=false,asc=false,round=1}={}){
  const rows=STATE.players
    .filter(p=>playerFullStats(p.id).matches>0 && (!avgOnly || playedEnoughForAverages(p.id)))
    .map(p=>({player:p, value:metric(playerForm(p.id),p)}))
    .filter(r=>r.value!==null && r.value!==undefined);
  rows.sort((a,b)=>asc? a.value-b.value : b.value-a.value);
  const f=Math.pow(10,round);
  return withRanks(rows, v=>Math.round(v*f)/f);
}
function plusMinusRanking(){ return rankByForm(f=>f.avgPlusMinus,{avgOnly:true}); }

/* Joueurs en forme : le plus de buts + passes sur leurs 3 derniers Five (au moins 2 matchs joués),
   départagés par les victoires sur ces matchs. Les ex-aequo sont tous renvoyés. */
function playersInForm(){
  const rows=STATE.players.map(p=>{
    const g=playerForm(p.id).games.slice(-3);
    return {player:p, n:g.length, ga:g.reduce((a,x)=>a+x.ga,0), wins:g.filter(x=>x.result==='win').length};
  }).filter(r=>r.n>=2 && r.ga>0).sort((a,b)=>b.ga-a.ga || b.wins-a.wins);
  return rows.filter(r=>r.ga===rows[0].ga && r.wins===rows[0].wins);
}
