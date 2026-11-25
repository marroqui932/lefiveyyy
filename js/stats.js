'use strict';
/* ============================================================
   MOTEUR DE STATISTIQUES - fonctions pures sur STATE
   (aucune statistique n'est stockée : tout est recalculé depuis
   les entités brutes Player / Five / Participation / Goal)
   ============================================================ */

/* Cache des calculs : STATE ne change que dans loadAll(), qui vide ce cache.
   Les valeurs mises en cache sont partagées : les appelants ne doivent pas les modifier. */
const _statsCache=new Map();
function cached(key,fn){
  if(!_statsCache.has(key)) _statsCache.set(key,fn());
  return _statsCache.get(key);
}
function clearStatsCache(){ _statsCache.clear(); }

function fivesSorted(){
  return cached('fivesSorted',()=>[...STATE.fives].sort((a,b)=> (a.date||'').localeCompare(b.date||'') || (a.createdAt||0)-(b.createdAt||0))).slice();
}
function fiveNumber(fiveId){
  const idx=fivesSorted().findIndex(f=>f.id===fiveId);
  return idx===-1? null : idx+1;
}
function goalsForFive(fiveId){
  return cached('goals:'+fiveId,()=>STATE.goals.filter(g=>g.fiveId===fiveId).sort((a,b)=>a.order-b.order)).slice();
}
function participationsForFive(fiveId){
  return STATE.participations.filter(p=>p.fiveId===fiveId);
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function isFutureFive(f){ return !!(f && f.date && f.date>todayISO() && goalsForFive(f.id).length===0); }
function teamOfPlayerInFive(fiveId,playerId){
  const p=STATE.participations.find(x=>x.fiveId===fiveId && x.playerId===playerId);
  return p? p.teamId : null;
}
function playerAttackEndInFive(five,playerId){
  if(!five) return null;
  const team=teamOfPlayerInFive(five.id,playerId);
  if(!team) return null;
  const aSide=five.attackingEndA||'top';
  const bSide=aSide==='top'?'bottom':'top';
  return team==='A'? aSide : bSide;
}
function fiveGoalsWithScore(fiveId){
  return cached('gws:'+fiveId,()=>_fiveGoalsWithScore(fiveId)).slice();
}
function _fiveGoalsWithScore(fiveId){
  let a=0,b=0;
  const goals=goalsForFive(fiveId);
  return goals.map(g=>{
    const before={a,b};
    const scorerTeam=teamOfPlayerInFive(fiveId,g.scorerId);
    // un CSC compte pour l'équipe adverse du buteur
    const team = g.isOwnGoal ? (scorerTeam==='A'?'B':scorerTeam==='B'?'A':null) : scorerTeam;
    if(team==='A') a++; else if(team==='B') b++;
    const after={a,b};
    return Object.assign({},g,{before,after,team});
  });
}
/* Clutch : but (hors CSC) qui permet à son équipe d'égaliser (elle était menée d'1 but)
   ou de prendre l'avantage (score nul juste avant le but). wScore vient de fiveGoalsWithScore. */
const CLUTCH_MIN_MINUTE=70; // avant cette minute, un but n'est pas "clutch" (ex: ouvrir le score)
function clutchKind(wScore){
  if(!wScore || !wScore.team) return null;
  // Minute connue : il faut avoir atteint la minute seuil. Minute inconnue (anciens buts) : on exclut au moins le tout 1er but du match (0-0).
  if(wScore.minute!=null){ if(wScore.minute<CLUTCH_MIN_MINUTE) return null; }
  else if(wScore.before.a===0 && wScore.before.b===0) return null;
  const mine = wScore.team==='A'? wScore.before.a : wScore.before.b;
  const theirs = wScore.team==='A'? wScore.before.b : wScore.before.a;
  const diff = mine-theirs;
  if(diff===-1) return 'equalizer';
  if(diff===0) return 'lead';
  return null;
}
function fiveScore(fiveId){
  const list=fiveGoalsWithScore(fiveId);
  if(!list.length) return {a:0,b:0};
  return list[list.length-1].after;
}
function playersInFive(fiveId){
  return participationsForFive(fiveId).map(p=>Object.assign({},p,{player:getPlayer(p.playerId)}));
}
function playerFiveIds(playerId){
  return STATE.participations.filter(p=>p.playerId===playerId).map(p=>p.fiveId);
}
function playerStatsForFive(playerId,fiveId){
  const goals=goalsForFive(fiveId);
  const g=goals.filter(x=>x.scorerId===playerId && !x.isOwnGoal).length;
  const og=goals.filter(x=>x.scorerId===playerId && x.isOwnGoal).length;
  const as=goals.filter(x=>x.assisterId===playerId && !x.isOwnGoal).length;
  return {goals:g,assists:as,ga:g+as,ownGoals:og};
}
function playerResultInFive(playerId,fiveId){
  const team=teamOfPlayerInFive(fiveId,playerId);
  if(!team) return null;
  const score=fiveScore(fiveId);
  if(score.a===score.b) return 'draw';
  if((team==='A'&&score.a>score.b) || (team==='B'&&score.b>score.a)) return 'win';
  return 'loss';
}
function playerFullStats(playerId){
  return cached('pfs:'+playerId,()=>_playerFullStats(playerId));
}
function _playerFullStats(playerId){
  const fiveIds=[...new Set(playerFiveIds(playerId))];
  // Un Five "pas encore déroulé" n'est qu'une annonce : il ne doit jamais compter dans les stats
  // (pas un match joué, pas un résultat, pas de but/passe).
  const list=fiveIds.map(id=>getFive(id)).filter(Boolean).filter(f=>!isFutureFive(f)).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||0)-(b.createdAt||0));
  let goals=0, assists=0, wins=0, draws=0, losses=0, withResult=0, goalsWithAssist=0, goalsNoAssist=0, ownGoals=0, clutch=0;
  const perFive=[];
  for(const five of list){
    const s=playerStatsForFive(playerId,five.id);
    goals+=s.goals; assists+=s.assists; ownGoals+=s.ownGoals;
    const result=playerResultInFive(playerId,five.id);
    if(result){ withResult++; if(result==='win') wins++; else if(result==='draw') draws++; else losses++; }
    const goalsOfPlayer=goalsForFive(five.id).filter(g=>g.scorerId===playerId && !g.isOwnGoal);
    goalsOfPlayer.forEach(g=>{ if(g.assisterId) goalsWithAssist++; else goalsNoAssist++; });
    clutch+=fiveGoalsWithScore(five.id).filter(g=>g.scorerId===playerId && !g.isOwnGoal && clutchKind(g)).length;
    perFive.push({five,goals:s.goals,assists:s.assists,ga:s.goals+s.assists,ownGoals:s.ownGoals,result});
  }
  const matches=list.length;
  const ga=goals+assists;
  const winPct=withResult? Math.round(wins/withResult*100):null;
  const noLossPct=withResult? Math.round((wins+draws)/withResult*100):null;
  let curG=0,bestG=0,curGA=0,bestGA=0;
  for(const pf of perFive){
    if(pf.goals>0) curG++; else curG=0;
    bestG=Math.max(bestG,curG);
    if(pf.ga>0) curGA++; else curGA=0;
    bestGA=Math.max(bestGA,curGA);
  }
  const last5=perFive.slice(-5), last10=perFive.slice(-10);
  const sum=(arr,k)=>arr.reduce((s,x)=>s+x[k],0);
  const bestFiveGoals=perFive.reduce((m,x)=>Math.max(m,x.goals),0);
  const bestFiveAssists=perFive.reduce((m,x)=>Math.max(m,x.assists),0);
  const bestFiveGA=perFive.reduce((m,x)=>Math.max(m,x.ga),0);
  const bestFiveGoalsFive=perFive.find(x=>x.goals===bestFiveGoals && bestFiveGoals>0)?.five || null;
  const bestFiveAssistsFive=perFive.find(x=>x.assists===bestFiveAssists && bestFiveAssists>0)?.five || null;
  const bestFiveGAFive=perFive.find(x=>x.ga===bestFiveGA && bestFiveGA>0)?.five || null;
  const totalFivesCount=STATE.fives.filter(f=>!isFutureFive(f)).length;
  const participationRate=totalFivesCount? Math.round(matches/totalFivesCount*100):null;
  return {
    matches,goals,assists,ga,wins,draws,losses,withResult,winPct,noLossPct,ownGoals,
    avgGoals:matches?goals/matches:0, avgAssists:matches?assists/matches:0, avgGA:matches?ga/matches:0,
    last5Goals:sum(last5,'goals'), last5Assists:sum(last5,'assists'), last5GA:sum(last5,'ga'),
    last10Goals:sum(last10,'goals'), last10Assists:sum(last10,'assists'), last10GA:sum(last10,'ga'),
    goalsWithAssist, goalsNoAssist, clutch, avgClutch:matches?clutch/matches:0,
    bestGoalStreak:bestG, bestGAStreak:bestGA,
    bestFiveGoals, bestFiveAssists, bestFiveGA,
    bestFiveGoalsFive, bestFiveAssistsFive, bestFiveGAFive,
    participationRate, perFive
  };
}
function statFromFilter(playerId,statKey,filter){
  const fs=playerFullStats(playerId);
  if(filter==='total') return fs[statKey];
  if(filter==='avg'){
    if(statKey==='goals') return fs.avgGoals;
    if(statKey==='assists') return fs.avgAssists;
    if(statKey==='wins') return fs.winPct||0;
    if(statKey==='clutch') return fs.avgClutch;
    return fs.avgGA;
  }
  if(filter==='last5'){
    if(statKey==='goals') return fs.last5Goals;
    if(statKey==='assists') return fs.last5Assists;
    return fs.last5GA;
  }
  if(filter==='last10'){
    if(statKey==='goals') return fs.last10Goals;
    if(statKey==='assists') return fs.last10Assists;
    return fs.last10GA;
  }
  if(filter && filter.startsWith('season:')){
    const year=filter.split(':')[1];
    const filtered=fs.perFive.filter(pf=>pf.five.date && pf.five.date.startsWith(year));
    const g=filtered.reduce((s,x)=>s+x.goals,0);
    const a=filtered.reduce((s,x)=>s+x.assists,0);
    if(statKey==='goals') return g;
    if(statKey==='assists') return a;
    return g+a;
  }
  return fs[statKey];
}
function availableSeasons(){
  const years=new Set();
  STATE.fives.forEach(f=>{ if(f.date) years.add(f.date.slice(0,4)); });
  return [...years].sort().reverse();
}
const AVG_MIN_PARTICIPATION=0.5;
function rankPlayers(statKey,filter){
  // Ne classer que les joueurs ayant participé à au moins un Five déjà joué
  // (un Five à venir où les équipes sont déjà faites ne doit pas suffire à apparaître dans un classement).
  const playedPlayers=STATE.players.filter(p=>playerFiveIds(p.id).map(getFive).filter(Boolean).some(f=>!isFutureFive(f)));
  // Moyennes : seulement les joueurs ayant joué au moins 50% des Fives (sinon 1 match = moyenne gonflée)
  const eligible=(filter==='avg')? playedPlayers.filter(p=>{ const r=playerFullStats(p.id).participationRate; return r!==null && r>=AVG_MIN_PARTICIPATION*100; }) : playedPlayers;
  const rows=eligible.map(p=>({player:p, value:statFromFilter(p.id,statKey,filter)||0}));
  rows.sort((a,b)=>b.value-a.value);
  let rank=0, prev=null;
  return rows.map((r,i)=>{ if(r.value!==prev){ rank=i+1; prev=r.value; } return Object.assign({},r,{rank}); });
}
function duosData(){
  const directional={};
  for(const g of STATE.goals){
    if(g.assisterId){
      const key=g.assisterId+'|'+g.scorerId;
      directional[key]=(directional[key]||0)+1;
    }
  }
  const pairs={};
  for(const key in directional){
    const [assisterId,scorerId]=key.split('|');
    if(assisterId===scorerId) continue;
    const sorted=[assisterId,scorerId].sort();
    const pairKey=sorted[0]+'|'+sorted[1];
    if(!pairs[pairKey]) pairs[pairKey]={playerA:sorted[0], playerB:sorted[1], aToB:0, bToA:0};
    if(assisterId===sorted[0]) pairs[pairKey].aToB=directional[key];
    else pairs[pairKey].bToA=directional[key];
  }
  const list=Object.values(pairs).map(p=>Object.assign({},p,{total:p.aToB+p.bToA}));
  list.sort((a,b)=>b.total-a.total);
  return list;
}
function assistsBreakdownForScorer(playerId){
  const goals=STATE.goals.filter(g=>g.scorerId===playerId);
  const map={};
  let none=0;
  for(const g of goals){
    if(g.assisterId) map[g.assisterId]=(map[g.assisterId]||0)+1;
    else none++;
  }
  return {map, none, total:goals.length};
}
/* Face-à-face : pour chaque adversaire déjà affronté (équipes opposées
   dans un même Five, résultat connu), le bilan V/N/D de playerId. */
function headToHeadStats(playerId){
  // Un Five pas encore joué ne doit jamais compter comme un 0-0 "match nul" en face-à-face.
  const myParts=STATE.participations.filter(p=>p.playerId===playerId && p.teamId && !isFutureFive(getFive(p.fiveId)));
  const opponents={};
  for(const myPart of myParts){
    const result=playerResultInFive(playerId, myPart.fiveId);
    if(!result) continue;
    const oppParts=STATE.participations.filter(p=>p.fiveId===myPart.fiveId && p.teamId && p.teamId!==myPart.teamId && p.playerId!==playerId);
    for(const opp of oppParts){
      if(!opponents[opp.playerId]) opponents[opp.playerId]={wins:0,draws:0,losses:0,matches:0};
      const o=opponents[opp.playerId];
      o.matches++;
      if(result==='win') o.wins++; else if(result==='draw') o.draws++; else o.losses++;
    }
  }
  return Object.entries(opponents).map(([opponentId,s])=>Object.assign({opponentId, winPct:Math.round(s.wins/s.matches*100)}, s));
}
function nemesisAndFavoriteTarget(playerId){
  const h2h=headToHeadStats(playerId);
  if(!h2h.length) return {nemesis:[], favoriteTarget:[]};
  const minPct=Math.min(...h2h.map(x=>x.winPct));
  const maxPct=Math.max(...h2h.map(x=>x.winPct));
  return {
    nemesis: h2h.filter(x=>x.winPct===minPct),
    favoriteTarget: h2h.filter(x=>x.winPct===maxPct)
  };
}
function computeRecords(){
  const played=STATE.players.filter(p=>playerFiveIds(p.id).length>0);
  const fullStats=played.map(p=>({player:p, fs:playerFullStats(p.id)}));

  // topBy : renvoie {value, holders:[{player}]} en gérant les égalités
  function topBy(fn){
    if(!fullStats.length) return null;
    let maxV=-Infinity;
    fullStats.forEach(({fs})=>{ const v=fn(fs); if(v>maxV) maxV=v; });
    if(maxV<=0) return null;
    const holders=fullStats.filter(({fs})=>fn(fs)===maxV).map(({player})=>({player}));
    return {value:maxV, holders};
  }
  // topByFive : renvoie {value, holders:[{player,five}]} - un joueur n'apparaît
  // qu'une fois (avec le premier Five où il a atteint ce record), même s'il l'a
  // égalé plusieurs fois lui-même.
  function topByFive(metric){
    let maxV=-Infinity;
    fullStats.forEach(({fs})=>{ fs.perFive.forEach(pf=>{ const v=metric(pf); if(v>maxV) maxV=v; }); });
    if(maxV<=0) return null;
    const seen=new Set();
    const holders=[];
    fullStats.forEach(({player,fs})=>{
      fs.perFive.forEach(pf=>{
        if(metric(pf)===maxV && !seen.has(player.id)){
          seen.add(player.id);
          holders.push({player,five:pf.five});
        }
      });
    });
    return {value:maxV, holders};
  }
  function goalMinuteRecord(mode){
    const goals=STATE.goals.filter(g=>!g.isOwnGoal && g.minute!==null && g.minute!==undefined && getFive(g.fiveId) && !isFutureFive(getFive(g.fiveId)));
    if(!goals.length) return null;
    const ms=goals.map(g=>g.minute);
    const best= mode==='min'? Math.min(...ms) : Math.max(...ms);
    const seen=new Set(), holders=[];
    goals.filter(g=>g.minute===best).forEach(g=>{
      if(seen.has(g.scorerId)) return; seen.add(g.scorerId);
      const pl=getPlayer(g.scorerId);
      if(pl) holders.push({player:pl, five:getFive(g.fiveId)});
    });
    return {value:best, holders};
  }
  return {
    fastestGoal: goalMinuteRecord('min'),
    latestGoal: goalMinuteRecord('max'),
    mostGoalsInFive: topByFive(pf=>pf.goals),
    mostAssistsInFive: topByFive(pf=>pf.assists),
    mostGAInFive: topByFive(pf=>pf.ga),
    mostFivesPlayed: topBy(fs=>fs.matches),
    mostTotalGoals: topBy(fs=>fs.goals),
    mostTotalAssists: topBy(fs=>fs.assists),
    mostTotalGA: topBy(fs=>fs.ga),
    longestGoalStreak: topBy(fs=>fs.bestGoalStreak),
    longestGAStreak: topBy(fs=>fs.bestGAStreak),
    // Records ajoutés avec ratings.js (homme du match, séries de résultats, Elo)
    mostMvp: topByPlayer(p=>playerForm(p.id).mvpCount),
    longestWinStreak: topByPlayer(p=>playerForm(p.id).winStreak.best),
    longestUnbeaten: topByPlayer(p=>playerForm(p.id).unbeatenStreak.best),
    peakElo: topByPlayer(p=>eloHistory().games[p.id]? Math.round(eloHistory().peak[p.id]) : 0, ELO_START)
  };
  // Valeur max par joueur (égalités incluses), seulement si elle dépasse `floor`.
  function topByPlayer(fn,floor){
    const rows=played.map(p=>({player:p, v:fn(p)}));
    const max=Math.max(0,...rows.map(r=>r.v));
    return max>(floor||0)? {value:max, holders:rows.filter(r=>r.v===max).map(r=>({player:r.player}))} : null;
  }
}
/* ============================================================
   CLASSEMENT DU JOUEUR PAR CRITÈRE (affiché sur son profil)
   Totaux (pas de moyennes : être présent compte). Pour chaque critère, on donne la valeur du joueur
   et son rang parmi tous les joueurs ayant disputé au moins un Five (égalités = même rang).
   Impact = part des buts de son équipe auxquels il a contribué (buts + passes), sur les Five où son
   équipe est connue.
   ============================================================ */
const PLAYER_CRITERIA=[
  {key:'goals',    icon:'ball', label:'Buts'},
  {key:'assists',  icon:'target', label:'Passes décisives'},
  {key:'generous', icon:'link', label:'Généreux',               hint:'partenaires différents servis'},
  {key:'wins',     icon:'check', label:'Victoires'},
  {key:'impact',   icon:'zap', label:'Impact sur son équipe',   hint:'part des buts de son équipe (buts + passes)'},
  {key:'clutch',   icon:'flame', label:'Clutch',                  hint:'buts qui égalisent ou font passer devant (à partir de la 70e minute)'}
];
function playerCriteriaRankings(){
  const players=STATE.players.filter(p=>playerFiveIds(p.id).map(getFive).filter(Boolean).some(f=>!isFutureFive(f)));
  const raw=players.map(p=>{
    const fs=playerFullStats(p.id);
    const mates=new Set();
    let contrib=0, teamGoalsTot=0;
    fs.perFive.forEach(pf=>{
      const list=fiveGoalsWithScore(pf.five.id);
      const team=teamOfPlayerInFive(pf.five.id,p.id);
      if(team){
        teamGoalsTot+=list.filter(g=>g.team===team).length;
        contrib+=pf.goals+pf.assists;
      }
      list.forEach(g=>{ if(!g.isOwnGoal && g.assisterId===p.id) mates.add(g.scorerId); });
    });
    return {id:p.id, v:{
      goals:fs.goals, assists:fs.assists, generous:mates.size, wins:fs.wins, clutch:fs.clutch,
      impact: teamGoalsTot? contrib/teamGoalsTot : null
    }};
  });
  const pl_=(n,a,b)=> n+' '+(n>1?b:a);
  const fmt={
    goals:v=>pl_(v,'but','buts'), assists:v=>pl_(v,'passe','passes'), generous:v=>pl_(v,'partenaire','partenaires'),
    wins:v=>pl_(v,'victoire','victoires'), clutch:v=>pl_(v,'but clutch','buts clutch'),
    impact:v=>Math.round(v*100)+'% des buts de son équipe'
  };
  const out={};
  raw.forEach(r=>{ out[r.id]={}; });
  PLAYER_CRITERIA.forEach(c=>{
    const ranked=raw.filter(r=>r.v[c.key]!==null).sort((a,b)=>b.v[c.key]-a.v[c.key]);
    let rank=0, prev=null;
    ranked.forEach((r,i)=>{
      if(r.v[c.key]!==prev){ rank=i+1; prev=r.v[c.key]; }
      out[r.id][c.key]={value:r.v[c.key], display:fmt[c.key](r.v[c.key]), rank, total:ranked.length};
    });
    raw.filter(r=>r.v[c.key]===null).forEach(r=>{ out[r.id][c.key]={value:null, display:'-', rank:null, total:ranked.length}; });
  });
  return out;
}
/* ============================================================
   MINUTES DES BUTS : histogramme + courbe du score
   ============================================================ */
const MINUTE_BIN=5; /* tranche de minutes des courbes/histogrammes */
function timeToMin(t){ const m=/^(\d{1,2}):(\d{2})/.exec(t||''); return m? (+m[1])*60+(+m[2]) : null; }
function minuteHistogramSVG(minutes,bin,color){
  if(!minutes.length) return emptyState('timer','Aucune minute enregistrée pour le moment');
  const maxMin=Math.max(...minutes);
  // L'axe couvre toujours un match complet (0-90'), même sans but en fin de match ; il s'étend si un but est marqué plus tard
  const nb=Math.max(Math.floor(maxMin/bin)+1, Math.ceil(90/bin));
  const counts=new Array(nb).fill(0);
  minutes.forEach(m=>{ counts[Math.floor(m/bin)]++; });
  const W=600,H=200,padL=26,padR=8,padT=18,padB=30;
  const maxC=Math.max(...counts);
  const bw=(W-padL-padR)/nb;
  const innerH=H-padT-padB;
  const every=Math.max(1,Math.ceil(nb/12));
  let bars='', labels='';
  counts.forEach((c,i)=>{
    const h=c/maxC*innerH, x=padL+i*bw;
    if(c>0){
      bars+=`<rect x="${(x+1).toFixed(1)}" y="${(padT+innerH-h).toFixed(1)}" width="${Math.max(1,bw-2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${color||'var(--primary)'}"><title>${bin>1? (i*bin)+"'-"+((i+1)*bin-1)+"'" : (i*bin)+"'"} : ${c} but${c>1?'s':''}</title></rect>`;
      bars+=`<text x="${(x+bw/2).toFixed(1)}" y="${(padT+innerH-h-4).toFixed(1)}" text-anchor="middle" font-size="10" fill="currentColor">${c}</text>`;
    }
    if(i%every===0) labels+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-12}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">${i*bin}'</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;color:var(--text-dim);">
    <line x1="${padL}" y1="${padT+innerH}" x2="${W-padR}" y2="${padT+innerH}" stroke="currentColor" opacity=".35"/>
    ${bars}${labels}
  </svg>`;
}
function fiveScoreCurveSVG(fiveId){
  const five=getFive(fiveId);
  const all=fiveGoalsWithScore(fiveId);
  const list=all.filter(g=>g.minute!==null && g.minute!==undefined && (g.team==='A'||g.team==='B'))
    .map((g,i)=>Object.assign({},g,{_i:i})).sort((a,b)=>a.minute-b.minute || a._i-b._i);
  if(!list.length) return '';
  const missing=all.filter(g=>g.minute===null||g.minute===undefined).length;
  const dur=(five && timeToMin(five.timeStart)!==null && timeToMin(five.timeEnd)!==null)? timeToMin(five.timeEnd)-timeToMin(five.timeStart) : null;
  const lastMin=list[list.length-1].minute;
  const xMax=Math.max(10, Math.ceil(Math.max(lastMin, dur>0?dur:0)/5)*5);
  let a=0,b=0;
  const pts=[{m:0,a:0,b:0}];
  list.forEach(g=>{ if(g.team==='A') a++; else b++; pts.push({m:g.minute,a,b,g}); });
  const yMax=Math.max(a,b,1);
  const W=600,H=230,padL=30,padR=14,padT=14,padB=28;
  const X=(m)=>padL+m/xMax*(W-padL-padR), Y=(v)=>padT+(1-v/yMax)*(H-padT-padB);
  const stepPath=(key)=>{
    let d=`M ${X(0).toFixed(1)} ${Y(0).toFixed(1)}`;
    let prev=0;
    pts.slice(1).forEach(pt=>{ d+=` L ${X(pt.m).toFixed(1)} ${Y(prev).toFixed(1)} L ${X(pt.m).toFixed(1)} ${Y(pt[key]).toFixed(1)}`; prev=pt[key]; });
    d+=` L ${X(xMax).toFixed(1)} ${Y(prev).toFixed(1)}`;
    return d;
  };
  const COL_A=TEAM_COLORS.A, COL_B=TEAM_COLORS.B, COL_TIE=TEAM_COLORS.tie;
  /* Quand les deux équipes sont à égalité, les deux lignes se superposent : on trace ces tronçons en violet. */
  let tie='';
  pts.forEach((pt,i)=>{
    const end= i<pts.length-1? pts[i+1].m : xMax;
    if(pt.a===pt.b && end>pt.m) tie+=`<line x1="${X(pt.m).toFixed(1)}" y1="${Y(pt.a).toFixed(1)}" x2="${X(end).toFixed(1)}" y2="${Y(pt.a).toFixed(1)}" stroke="${COL_TIE}" stroke-width="3" stroke-linecap="round"/>`;
  });
  let grid='';
  const yStep=yMax>12? 2 : 1;
  for(let v=0; v<=yMax; v+=yStep) grid+=`<line x1="${padL}" y1="${Y(v).toFixed(1)}" x2="${W-padR}" y2="${Y(v).toFixed(1)}" stroke="currentColor" opacity=".12"/><text x="${padL-6}" y="${(Y(v)+3).toFixed(1)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".7">${v}</text>`;
  const xStep= xMax>60? 10 : 5;
  for(let m=0; m<=xMax; m+=xStep) grid+=`<text x="${X(m).toFixed(1)}" y="${H-10}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">${m}'</text>`;
  const dots=pts.slice(1).map(pt=>{
    const g=pt.g, col=g.team==='A'?COL_A:COL_B, sc=getPlayer(g.scorerId);
    return `<circle cx="${X(pt.m).toFixed(1)}" cy="${Y(pt[g.team==='A'?'a':'b']).toFixed(1)}" r="4.5" fill="${col}" stroke="var(--surface)" stroke-width="1.5"><title>${pt.m}' - ${g.isOwnGoal?'CSC ':''}${esc(playerName(sc))} (${g.after.a}-${g.after.b})</title></circle>`;
  }).join('');
  return `<div class="card chart-card">
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;color:var(--text-dim);">
      ${grid}
      <path d="${stepPath('a')}" fill="none" stroke="${COL_A}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="${stepPath('b')}" fill="none" stroke="${COL_B}" stroke-width="2.4" stroke-linejoin="round" stroke-dasharray="1,0"/>
      ${tie}
      ${dots}
    </svg>
    <div class="legend">
      <span><i style="background:${COL_A}"></i>Équipe A</span>
      <span><i style="background:${COL_B}"></i>Équipe B</span>
      ${tie? `<span><i style="background:${COL_TIE}"></i>Égalité</span>`:''}
      ${missing? `<span style="color:var(--text-faint);">${missing} but${missing>1?'s':''} sans minute non affiché${missing>1?'s':''}</span>`:''}
    </div>
  </div>`;
}
function playedGoalMinutes(){
  return STATE.goals.filter(g=>g.minute!==null && g.minute!==undefined && getFive(g.fiveId) && !isFutureFive(getFive(g.fiveId))).map(g=>g.minute);
}
