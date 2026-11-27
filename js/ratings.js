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

/* ============================================================
   NOTE DU MATCH SUR 10 (façon Sofascore) ET HOMME DU MATCH
   Comme Sofascore : chaque joueur part de 6,5 et chaque action fait monter ou descendre la note (3,0 à 10,0).
   - buts +0,45, passes décisives +0,30 (plafonné à +2,4 au total), CSC -0,40 ;
   - résultat : victoire +0,25, défaite -0,25 ;
   - si le five a des stats vidéo (IA) : on compare chaque joueur aux autres joueurs du MÊME match
     (par 60 min jouées) sur touches, passes réussies, précision des passes, récupérations, duels, distance.
     Ça ajoute entre -1,2 et +1,2 ;
   - gardien (repéré par l'IA) : +0,3, puis -0,05 par but encaissé.
   Seuls les fives qui ont des stats vidéo (IA) sont notés : sans elles, la note ne dirait presque rien.
   Calculée à chaque affichage : changer la formule ne demande aucune nouvelle saisie.
   ============================================================ */
const RATING_BASE=6.5;
const RATING_AI_WEIGHTS={touches:.2, passesOk:.25, passAcc:.1, interceptions:.2, duels:.1, dist:.15};
function aiStatsForFive(fiveId){ return (STATE.aiStats||{})[fiveId] || null; }
function aiPlayerStats(fiveId,playerId){
  const s=aiStatsForFive(fiveId);
  return s? (s.players||[]).find(p=>p.playerId===playerId) || null : null;
}
function matchRatings(fiveId){
  return cached('ratings:'+fiveId,()=>{
    const five=getFive(fiveId);
    if(!five || isFutureFive(five) || !goalsForFive(fiveId).length || !aiStatsForFive(fiveId)) return null;
    const sc=fiveScore(fiveId);
    const parts=participationsForFive(fiveId).filter(p=>p.teamId==='A'||p.teamId==='B');
    const ai=aiStatsForFive(fiveId);
    // part IA : écart à la moyenne du match (en écarts-types), pondéré
    const z={};
    if(ai){
      const feats={};
      parts.forEach(p=>{ const s=aiPlayerStats(fiveId,p.playerId); if(!s) return;
        const f=60/Math.max(s.minutes||0,20);
        feats[p.playerId]={touches:s.touches*f, passesOk:s.passesOk*f, passAcc:(s.passesOk+1)/(s.passesOk+s.passesLost+2),
          interceptions:s.interceptions*f, duels:(s.duelsWon-s.duelsLost)*f, dist:(s.distanceKm||0)*f}; });
      const ids=Object.keys(feats);
      if(ids.length>=4) Object.entries(RATING_AI_WEIGHTS).forEach(([k,w])=>{
        const vals=ids.map(id=>feats[id][k]); const mu=vals.reduce((a,b)=>a+b,0)/vals.length;
        const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mu)*(b-mu),0)/vals.length)||1;
        ids.forEach(id=>{ z[id]=(z[id]||0)+w*(feats[id][k]-mu)/sd; });
      });
    }
    const out={};
    parts.forEach(p=>{
      const st=playerStatsForFive(p.playerId,fiveId);
      const mine= p.teamId==='A'? sc.a : sc.b, theirs= p.teamId==='A'? sc.b : sc.a;
      const result= mine>theirs? .25 : mine<theirs? -.25 : 0;
      const ga=Math.min(2.4, .45*st.goals+.3*st.assists) - .4*st.ownGoals;
      const aiPart= p.playerId in z? Math.max(-1.2,Math.min(1.2,.9*z[p.playerId])) : 0;
      const s=aiPlayerStats(fiveId,p.playerId);
      const gk= s&&s.goalkeeper? .3-.05*theirs : 0;
      const r=Math.max(3,Math.min(10,RATING_BASE+result+ga+aiPart+gk));
      out[p.playerId]={rating:Math.round(r*10)/10, teamId:p.teamId, parts:{base:RATING_BASE,result,ga,ai:aiPart,gk}, hasAi:!!s};
    });
    return out;
  });
}
/* Homme du match : la meilleure note (tous les ex-aequo) */
function manOfTheMatch(fiveId){
  const r=matchRatings(fiveId); if(!r) return [];
  const best=Math.max(...Object.values(r).map(x=>x.rating));
  return Object.keys(r).filter(id=>r[id].rating===best);
}
function teamAvgRating(fiveId,team){
  const r=matchRatings(fiveId); if(!r) return null;
  const v=Object.values(r).filter(x=>x.teamId===team).map(x=>x.rating);
  return v.length? Math.round(v.reduce((a,b)=>a+b,0)/v.length*100)/100 : null;
}
/* Note moyenne d'un joueur sur tous ses fives notés + nombre de fois homme du match */
function playerRatingSummary(playerId){
  return cached('rsum:'+playerId,()=>{
    const games=[];
    fivesSorted().forEach(f=>{ const r=matchRatings(f.id); if(r && r[playerId]) games.push({five:f, rating:r[playerId].rating, motm:manOfTheMatch(f.id).includes(playerId), hasAi:r[playerId].hasAi}); });
    const avg=games.length? games.reduce((a,g)=>a+g.rating,0)/games.length : null;
    return {games, avg:avg===null? null : Math.round(avg*100)/100, motm:games.filter(g=>g.motm).length};
  });
}
/* Couleur de la note (mêmes paliers que Sofascore) */
function ratingClass(r){
  if(r===null||r===undefined) return 'r-none';
  return r>=9? 'r-9' : r>=8? 'r-8' : r>=7? 'r-7' : r>=6.5? 'r-65' : r>=6? 'r-6' : 'r-3';
}
function ratingPill(r,cls,dec){ return `<span class="rating ${ratingClass(r)} ${cls||''}">${r===null||r===undefined? '–' : r.toFixed(dec||1)}</span>`; }
