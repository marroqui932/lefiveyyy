'use strict';
/* ============================================================
   HOMME DU MATCH, FORME, SÉRIES, ELO, ASSOCIATIONS
   Tout est calculé à partir de STATE (aucune donnée stockée) et mis en cache
   jusqu'au prochain loadAll().
   ============================================================ */

/* ---------- Homme du match d'un Five ----------
   Pas de note affichée : on désigne seulement le joueur le plus décisif.
   points = buts + 0,75 x passes − 0,75 x CSC + 0,5 x buts clutch, comparés à la moyenne du match,
   + un bonus pour l'équipe gagnante (±0,5, plus ±0,08 par but d'écart, plafonné à ±0,4).
   Départage : G+A, puis buts, puis écart de buts. */
function matchContributions(fiveId){
  return cached('contrib:'+fiveId,()=>{
    const five=getFive(fiveId);
    if(!five || isFutureFive(five) || !goalsForFive(fiveId).length) return [];
    const parts=participationsForFive(fiveId).filter(p=>p.teamId==='A'||p.teamId==='B');
    if(!parts.length) return [];
    const wl=fiveGoalsWithScore(fiveId);
    const sc=fiveScore(fiveId);
    const rows=parts.map(p=>{
      const s=playerStatsForFive(p.playerId,fiveId);
      const clutch=wl.filter(g=>g.scorerId===p.playerId && !g.isOwnGoal && clutchKind(g)).length;
      const gd= p.teamId==='A'? sc.a-sc.b : sc.b-sc.a;
      const points=Math.max(0, s.goals + 0.75*s.assists - 0.75*s.ownGoals + 0.5*clutch);
      return {playerId:p.playerId, teamId:p.teamId, goals:s.goals, assists:s.assists, ownGoals:s.ownGoals, clutch, gd,
              result: gd>0?'win':gd<0?'loss':'draw', points};
    });
    const ref=Math.max(0.5, rows.reduce((a,r)=>a+r.points,0)/rows.length);
    rows.forEach(r=>{ r.mvpScore=1.3*(r.points/ref) + (r.gd>0?0.5:r.gd<0?-0.5:0) + Math.max(-0.4,Math.min(0.4,0.08*r.gd)); });
    const best=rows.slice().sort((a,b)=>b.mvpScore-a.mvpScore || (b.goals+b.assists)-(a.goals+a.assists) || b.goals-a.goals || b.gd-a.gd)[0];
    rows.forEach(r=>{ r.isMvp= r===best; });
    return rows;
  });
}
function fiveMvp(fiveId){ return matchContributions(fiveId).find(r=>r.isMvp) || null; }
function isMvpOfFive(playerId,fiveId){ const m=fiveMvp(fiveId); return !!(m && m.playerId===playerId); }

/* ---------- Résumé par joueur : notes, forme, séries ---------- */
function playerForm(playerId){
  return cached('form:'+playerId,()=>{
    const fs=playerFullStats(playerId);
    const games=fs.perFive.map(pf=>{
      const r=matchContributions(pf.five.id).find(x=>x.playerId===playerId);
      return {five:pf.five, result:pf.result, goals:pf.goals, assists:pf.assists, ga:pf.ga,
              isMvp:!!(r&&r.isMvp), gd:r? r.gd : null};
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
      mvpCount:games.filter(g=>g.isMvp).length,
      plusMinus:withGd.reduce((a,g)=>a+g.gd,0), avgPlusMinus:withGd.length? withGd.reduce((a,g)=>a+g.gd,0)/withGd.length : null,
      winStreak:resStreak(r=>r==='win'), unbeatenStreak:resStreak(r=>r!=='loss'), lossStreak:resStreak(r=>r==='loss'),
      scoringStreak:streak(g=>g.goals>0), gaStreak:streak(g=>g.ga>0)
    };
  });
}
function formChipsHTML(last5){
  if(!last5 || !last5.length) return '<span class="page-sub">-</span>';
  const L={win:'V',draw:'N',loss:'D'};
  return `<span class="form-chips">${last5.map(g=>`<span class="form-chip ${g.result}" title="Five #${pad2(fiveNumber(g.five.id))} · ${fmtDateShort(g.five.date)}${g.isMvp?' · homme du match':''}">${L[g.result]}</span>`).join('')}</span>`;
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
function eloRanking(){
  return cached('eloRank',()=>{
    const h=eloHistory();
    const rows=STATE.players.filter(p=>h.games[p.id]>0).map(p=>({player:p, value:h.rating[p.id]}));
    return withRanks(rows.sort((a,b)=>b.value-a.value), v=>Math.round(v));
  });
}
function eloChartSVG(playerId){
  const hist=eloHistory().byPlayer[playerId]||[];
  if(!hist.length) return '';
  const pts=[{label:'Départ', v:ELO_START}].concat(hist.map(h=>({label:'#'+pad2(fiveNumber(h.five.id)), v:h.after, five:h.five, delta:h.delta})));
  const W=600,H=180,padL=40,padR=16,padT=16,padB=26;
  const vs=pts.map(p=>p.v);
  let lo=Math.min(...vs,ELO_START), hi=Math.max(...vs,ELO_START);
  if(hi-lo<40){ const m=(hi+lo)/2; lo=m-20; hi=m+20; }
  const X=(i)=>padL+(pts.length===1?0.5:i/(pts.length-1))*(W-padL-padR);
  const Y=(v)=>padT+(1-(v-lo)/(hi-lo))*(H-padT-padB);
  const line=pts.map((p,i)=>`${i?'L':'M'} ${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const area=`${line} L ${X(pts.length-1).toFixed(1)} ${(H-padB).toFixed(1)} L ${X(0).toFixed(1)} ${(H-padB).toFixed(1)} Z`;
  const base=Y(ELO_START);
  const dots=pts.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4" fill="var(--primary)" stroke="var(--bg)" stroke-width="1.5"${p.five?` style="cursor:pointer" onclick="navigate('five/${p.five.id}')"`:''}><title>${p.label} : ${Math.round(p.v)}${p.delta!==undefined?` (${p.delta>=0?'+':''}${Math.round(p.delta)})`:''}</title></circle>`).join('');
  const labels=pts.map((p,i)=>`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">${p.label}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;color:var(--text-dim);">
    <defs><linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".28"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
    <line x1="${padL}" y1="${base.toFixed(1)}" x2="${W-padR}" y2="${base.toFixed(1)}" stroke="currentColor" opacity=".25" stroke-dasharray="4 4"/>
    <text x="${padL-6}" y="${(base+3).toFixed(1)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".7">${ELO_START}</text>
    <text x="${padL-6}" y="${(Y(hi)+3).toFixed(1)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".7">${Math.round(hi)}</text>
    <text x="${padL-6}" y="${(Y(lo)+3).toFixed(1)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".7">${Math.round(lo)}</text>
    <path d="${area}" fill="url(#eloFill)"/>
    <path d="${line}" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
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
function mvpRanking(){ return rankByForm(f=>f.mvpCount,{round:0}).filter(r=>r.value>0); }
function plusMinusRanking(){ return rankByForm(f=>f.avgPlusMinus,{avgOnly:true}); }

/* Joueur en forme : le plus de buts + passes sur ses 3 derniers Five (au moins 2 matchs joués),
   départagé par les victoires sur ces matchs. */
function playerInForm(){
  const rows=STATE.players.map(p=>{
    const g=playerForm(p.id).games.slice(-3);
    return {player:p, n:g.length, ga:g.reduce((a,x)=>a+x.ga,0), wins:g.filter(x=>x.result==='win').length};
  }).filter(r=>r.n>=2 && r.ga>0).sort((a,b)=>b.ga-a.ga || b.wins-a.wins);
  return rows[0]||null;
}
