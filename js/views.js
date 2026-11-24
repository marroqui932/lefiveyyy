'use strict';
/* ============================================================
   VUES
   ============================================================ */

// ---------- Dashboard ----------
function viewDashboard(){
  const s=dashboardStats();
  const recentFives=fivesSorted().slice(-5).reverse();
  return `
  <div class="hero-banner">
    <div class="hero-pitch"></div>
    <div style="position:relative;">
      <h1>⚽ LeFiveyyy</h1>
    </div>
    <a href="#/five" class="btn btn-primary" style="position:relative;">+ Voir les Five</a>
  </div>

  <div class="grid grid-3">
    ${statCard('⚽','Buts', s.totalGoals, 'green')}
    ${statCard('👥','Joueurs', s.totalPlayers, 'purple')}
    ${statCard('🏟️','Five joués', s.totalFives, 'gold')}
  </div>

  ${s.nextFive? `
  <div class="section-title">🔜 Prochain Five</div>
  <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-color:rgba(251,191,36,.4);">
    <div>
      <div style="font-weight:800;font-size:18px;">FIVE #${pad2(fiveNumber(s.nextFive.id))} - ${fmtDateLong(s.nextFive.date)} <span class="badge badge-gold" style="margin-left:6px;">🔜 À venir</span></div>
      <div class="page-sub" style="margin-top:4px;">📍 ${esc(s.nextFive.location||'-')} ${s.nextFive.timeStart? `· ⏱️ ${s.nextFive.timeStart}${s.nextFive.timeEnd?' - '+s.nextFive.timeEnd:''}`:''}</div>
    </div>
    <a href="#/five/${s.nextFive.id}" class="btn btn-primary">Voir le détail</a>
  </div>
  ` : ''}

  <div class="section-title">📌 Dernier Five joué</div>
  <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
    ${s.lastFive? `
      <div>
        <div style="font-weight:800;font-size:18px;">FIVE #${pad2(fiveNumber(s.lastFive.id))} - ${fmtDateLong(s.lastFive.date)}</div>
        <div class="page-sub" style="margin-top:4px;">📍 ${esc(s.lastFive.location||'-')} ${s.lastFive.timeStart? `· ⏱️ ${s.lastFive.timeStart}${s.lastFive.timeEnd?' - '+s.lastFive.timeEnd:''}`:''}</div>
      </div>
      <a href="#/five/${s.lastFive.id}" class="btn btn-primary">Voir le détail</a>
    ` : `<div class="page-sub">Aucun Five enregistré pour le moment.</div>`}
  </div>

  <div class="section-title">🌟 Meilleurs joueurs</div>
  <div class="grid grid-3">
    ${leaderCard('⚽ Meilleur buteur', s.topScorer, 'buts')}
    ${leaderCard('🎯 Meilleur passeur', s.topAssister, 'passes')}
    ${leaderCard('⭐ Meilleur G+A', s.topGA, 'G+A')}
  </div>
  ${(()=>{
    const lastMvp= s.lastFive? fiveMvp(s.lastFive.id) : null;
    const inForm=playerInForm();
    const elo=eloRanking()[0];
    if(!lastMvp && !inForm && !elo) return '';
    const card=(title,player,line,badge)=>`<div class="card" style="cursor:pointer;" onclick="navigate('player/${player.id}')">
      <div class="stat-label">${title}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px;">
        ${avatarHTML(player,44)}
        <div style="flex:1;"><div style="font-weight:700;">${esc(player.name)}</div><div class="page-sub">${line}</div></div>
        ${badge||''}
      </div>
    </div>`;
    return `<div class="grid grid-3" style="margin-top:14px;">
      ${lastMvp? card('👑 Homme du dernier match', getPlayer(lastMvp.playerId), `Five #${pad2(fiveNumber(s.lastFive.id))} · ${lastMvp.goals} B · ${lastMvp.assists} P`, ratingBadgeHTML(lastMvp.rating,false)) : ''}
      ${inForm? card('🔥 Joueur en forme', inForm.player, `Moyenne sur ses ${inForm.n} derniers Five`, ratingBadgeHTML(Math.round(inForm.avg*10)/10,false)) : ''}
      ${elo? card('📈 N°1 au classement Elo', elo.player, `${Math.round(elo.value)} points`, '') : ''}
    </div>`;
  })()}

  <div class="section-title">🗺️ Carte des actions (tous les Five, comme si tout attaquait en haut)</div>
  ${allFivesActionsMapHTML()}

  <div class="section-title">⏱️ Buts par minute (tous les Five)</div>
  <div class="card" style="padding:12px;">${minuteHistogramSVG(playedGoalMinutes(),MINUTE_BIN)}</div>
  <div class="hint" style="margin:6px 0 0 4px;">${playedGoalMinutes().length} but${playedGoalMinutes().length>1?'s':''} sur ${STATE.goals.length} ont une minute enregistrée.</div>

  <div class="section-title">🕓 Five récents</div>
  ${recentFives.length? `<div class="grid grid-3">${recentFives.map(f=>fiveCardHTML(f)).join('')}</div>` : emptyState('🏟️','Aucun Five pour le moment')}
  `;
}
const STAT_COLORS={
  green:{color:'#22c55e',glow:'rgba(34,197,94,.16)'},
  blue:{color:'#3b82f6',glow:'rgba(59,130,246,.16)'},
  purple:{color:'#8b5cf6',glow:'rgba(139,92,246,.16)'},
  gold:{color:'#fbbf24',glow:'rgba(251,191,36,.16)'},
  red:{color:'#ef4444',glow:'rgba(239,68,68,.14)'}
};
function statChip(icon,label,val,colorKey){
  const c=STAT_COLORS[colorKey]||STAT_COLORS.green;
  return `<div class="stat-chip" style="--stat-color:${c.color};--stat-glow:${c.glow};">
    <div class="sc-icon">${icon}</div>
    <div class="sc-val">${val}</div>
    <div class="sc-label">${label}</div>
  </div>`;
}
function statCard(icon,label,val,colorKey){
  const c=STAT_COLORS[colorKey]||STAT_COLORS.green;
  return `<div class="stat-card" style="--stat-color:${c.color};--stat-glow:${c.glow};">
    <div class="stat-icon-wrap">${icon}</div>
    <div class="stat-val">${val}</div>
    <div class="stat-label">${label}</div>
  </div>`;
}
function leaderCard(title,entries,unit){
  if(!entries || !entries.length) return `<div class="card"><div class="stat-label">${title}</div><div class="page-sub" style="margin-top:8px;">Pas encore de données</div></div>`;
  const isTie=entries.length>1;
  return `<div class="card">
    <div class="stat-label">${title} ${isTie? `<span class="badge badge-gold" style="margin-left:6px;">Égalité</span>` : ''}</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
      ${entries.map(entry=>`<div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="navigate('player/${entry.player.id}')">
        ${avatarHTML(entry.player,44)}
        <div><div style="font-weight:700;">${esc(entry.player.name)}</div><div class="page-sub">${entry.value} ${unit}</div></div>
      </div>`).join('')}
    </div>
  </div>`;
}
const PLAYER_SILHOUETTE='<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 12.2c2.76 0 5-2.35 5-5.25S14.76 1.7 12 1.7 7 4.05 7 6.95s2.24 5.25 5 5.25Zm0 2.5c-3.5 0-10.5 1.8-10.5 5.4v2.2h21v-2.2c0-3.6-7-5.4-10.5-5.4Z"/></svg>';
function avatarHTML(player,size,ringClass){
  size=size||40;
  const ring=ringClass? ' '+ringClass : '';
  if(player && player.photo){
    return `<div class="avatar${ring}" style="width:${size}px;height:${size}px;"><img src="${player.photo}" alt=""></div>`;
  }
  return `<div class="avatar avatar-placeholder${ring}" style="width:${size}px;height:${size}px;">${PLAYER_SILHOUETTE}</div>`;
}
function barChart(data,color){
  if(!data.length) return '';
  const max=Math.max(...data.map(d=>d.value),1);
  const w=Math.max(320,data.length*70), h=180, barW=40, gap=(w-data.length*barW)/(data.length+1);
  let bars='';
  data.forEach((d,i)=>{
    const bh=Math.round((d.value/max)*120);
    const x=gap+i*(barW+gap);
    const y=150-bh;
    bars+=`<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="6" fill="${color}" opacity="0.9"/>
           <text x="${x+barW/2}" y="${y-8}" text-anchor="middle" fill="#e5e9f0" font-size="13" font-weight="700">${d.value}</text>
           <text x="${x+barW/2}" y="168" text-anchor="middle" fill="#93a0b8" font-size="11">${esc(d.label.slice(0,8))}</text>`;
  });
  return `<svg viewBox="0 0 ${w} 180" width="100%" height="180" style="min-width:${w}px;">${bars}</svg>`;
}

// ---------- Five list ----------
function fiveCardHTML(f){
  const score=fiveScore(f.id);
  const parts=participationsForFive(f.id);
  const goals=goalsForFive(f.id);
  const future=isFutureFive(f);
  return `<div class="five-card" onclick="navigate('five/${f.id}')" ${future?'style="border-style:dashed;"':''}>
    <div class="five-num">FIVE #${pad2(fiveNumber(f.id))} ${future? '<span class="badge badge-gold" style="margin-left:6px;">🔜 À venir</span>':''}</div>
    <div class="five-date">${fmtDateLong(f.date)}</div>
    <div class="five-meta"><span>📍 ${esc(f.location||'-')}</span>${f.timeStart? `<span>⏱️ ${f.timeStart}${f.timeEnd? ' - '+f.timeEnd : ''}</span>`:''}</div>
    ${future
      ? `<div class="page-sub" style="text-align:center;padding:10px 0;">Match pas encore joué</div>`
      : `<div class="five-score"><span class="badge-a" style="font-weight:800;">${score.a}</span><span class="vs">-</span><span class="badge-b" style="font-weight:800;">${score.b}</span></div>`}
    ${(()=>{ const m=future? null : fiveMvp(f.id); return m? `<div class="five-mvp">👑 ${esc(playerName(getPlayer(m.playerId)))} ${ratingBadgeHTML(m.rating,false)}</div>` : ''; })()}
    <div class="five-footer"><span>👥 ${parts.length} joueurs</span>${future? `<span>📅 À venir</span>` : `<span>⚽ ${goals.length} buts</span>`}</div>
  </div>`;
}
function viewFiveList(){
  const list=fivesSorted().reverse();
  return `
  <div class="page-header">
    <div><h1>🏟️ Five</h1><div class="page-sub">${list.length} Five enregistré${list.length>1?'s':''}</div></div>
    ${isAdmin()? `<button class="btn btn-primary" onclick="openFiveForm()">+ Ajouter un Five</button>` : ''}
  </div>
  ${list.length? `<div class="grid grid-3">${list.map(fiveCardHTML).join('')}</div>` : emptyState('🏟️','Aucun Five pour le moment','Ajoute ton premier Five pour commencer.')}
  `;
}

// ---------- Five detail ----------
function viewFiveDetail(fiveId){
  const five=getFive(fiveId);
  if(!five) return emptyState('❓','Five introuvable');
  const score=fiveScore(fiveId);
  const parts=playersInFive(fiveId);
  const teamA=parts.filter(p=>p.teamId==='A');
  const teamB=parts.filter(p=>p.teamId==='B');
  const noTeam=parts.filter(p=>!p.teamId);
  const goalsTL=fiveGoalsWithScore(fiveId);
  const future=isFutureFive(five);

  function teamColumn(list,label,badgeClass){
    return `<div class="team-col">
      <div class="team-col-head ${badgeClass}">${label} <span class="page-sub">${list.length} joueur${list.length>1?'s':''}</span></div>
      ${list.length? list.map(p=>{
        const st=playerStatsForFive(p.playerId, fiveId);
        const rt=playerRatingInFive(p.playerId, fiveId);
        return `<div class="player-row" onclick="navigate('player/${p.playerId}')">
          ${avatarHTML(p.player,42)}
          <div><div class="pname">${esc(playerName(p.player))}</div>${rt? `<div style="margin-top:3px;">${ratingBadgeHTML(rt.rating,rt.isMvp)}</div>` : ''}</div>
          <div class="pstats">
            <div><b>${st.goals}</b><span>BUTS</span></div>
            <div><b>${st.assists}</b><span>PASSES</span></div>
          </div>
        </div>`;
      }).join('') : '<div class="page-sub" style="padding:10px 0;">Aucun joueur</div>'}
    </div>`;
  }

  return `
  <div class="page-header">
    <div><h1>🏟️ FIVE #${pad2(fiveNumber(fiveId))} ${future? '<span class="badge badge-gold" style="margin-left:6px;">🔜 À venir</span>':''}</h1></div>
    ${isAdmin()? `<div style="display:flex;gap:8px;">
      <button class="btn btn-ghost btn-sm" onclick="openFiveForm('${fiveId}')">✏️ Modifier</button>
      <button class="btn btn-danger btn-sm" onclick="deleteFive('${fiveId}')">🗑️ Supprimer</button>
    </div>` : ''}
  </div>

  <div class="five-info-bar">
    <div class="five-info-item"><div class="fi-icon">📅</div><div><div class="fi-val">${fmtDateLong(five.date)}</div><div class="fi-label">Date</div></div></div>
    <div class="five-info-item"><div class="fi-icon">⏱️</div><div><div class="fi-val">${five.timeStart? `${five.timeStart}${five.timeEnd?' - '+five.timeEnd:''}` : '-'}</div><div class="fi-label">Horaire</div></div></div>
    <div class="five-info-item"><div class="fi-icon">📍</div><div><div class="fi-val">${esc(five.location||'-')}</div><div class="fi-label">Lieu</div></div></div>
  </div>

  ${future? `
  <div class="notice">🔜 <b>Ce Five n'a pas encore eu lieu.</b> Les équipes sont déjà connues ci-dessous. Reviens après le match pour ajouter les buts : le score et les statistiques se calculeront automatiquement.</div>
  ` : `
  <div class="card" style="text-align:center;">
    <div class="five-score" style="font-size:48px;">
      <span class="badge-a" style="font-size:22px;padding:7px 14px;">${score.a}</span>
      <span class="vs">-</span>
      <span class="badge-b" style="font-size:22px;padding:7px 14px;">${score.b}</span>
    </div>
  </div>
  ${(()=>{
    const mvp=fiveMvp(fiveId); if(!mvp) return '';
    const pl=getPlayer(mvp.playerId);
    return `<div class="card mvp-card" onclick="navigate('player/${mvp.playerId}')">
      ${avatarHTML(pl,56,'ring-gold')}
      <div style="flex:1;">
        <div class="stat-label">👑 Homme du match</div>
        <div style="font-weight:800;font-size:18px;">${esc(playerName(pl))}</div>
        <div class="page-sub">${mvp.goals} but${mvp.goals>1?'s':''} · ${mvp.assists} passe${mvp.assists>1?'s':''}${mvp.clutch? ` · ${mvp.clutch} clutch` : ''}</div>
      </div>
      ${ratingBadgeHTML(mvp.rating,false)}
    </div>`;
  })()}
  `}

  <div class="section-title">👥 Composition des équipes</div>
  <div class="teams-grid">
    ${teamColumn(teamA,'🔵 Équipe A','badge-a')}
    ${teamColumn(teamB,'🟣 Équipe B','badge-b')}
  </div>
  ${noTeam.length? `<div class="notice" style="margin-top:14px;">${noTeam.length} joueur(s) sans équipe assignée : ${noTeam.map(p=>esc(playerName(p.player))).join(', ')}</div>` : ''}

  ${future? '' : `
  <div class="section-title">🗺️ Carte des actions du match</div>
  ${matchActionsMapHTML(fiveId)}

  ${goalsTL.some(g=>g.minute!==null&&g.minute!==undefined)? `<div class="section-title">📈 Évolution du score</div>${fiveScoreCurveSVG(fiveId)}` : ''}

  <div class="section-title">⚽ Buts du match (${goalsTL.length})</div>
  ${goalsTL.length? `<div class="match-feed">
    ${goalsTL.map(g=>{
      const scorer=getPlayer(g.scorerId);
      const assister=g.assisterId? getPlayer(g.assisterId) : null;
      const video=videoForGoal(g.id);
      const isA=g.team==='A';
      const isB=g.team==='B';
      const cardHtml=`<div class="feed-card ${isA?'team-a':isB?'team-b':'team-none'}">
        <div class="feed-score-chip">${g.minute!==null&&g.minute!==undefined? g.minute+"' · " : ''}${g.after.a}-${g.after.b}</div>
        <div class="feed-scorer">${g.isOwnGoal? '🥅 CSC '+esc(playerName(scorer)) : '⚽ '+esc(playerName(scorer))}</div>
        <div class="feed-assist">${g.isOwnGoal? 'But contre son camp' : (assister? '🎯 '+esc(playerName(assister)) : '🎯 Sans passe décisive')}</div>
        ${video? `<button class="play-btn" onclick="playVideo('${video.id}')">▶️ Voir le but</button>` : ''}
      </div>`;
      return `<div class="feed-row">
        <div class="feed-side feed-left">${isA? cardHtml : ''}</div>
        <div class="feed-center">${g.isOwnGoal?'🥅':'⚽'}</div>
        <div class="feed-side feed-right">${!isA? cardHtml : ''}</div>
      </div>`;
    }).join('')}
  </div>` : emptyState('⚽','Aucun but enregistré pour ce Five')}
  `}
  `;
}

// ---------- Players list ----------
function viewPlayerList(){
  const q=(document.getElementById('playerSearchInput')?.value || '').toLowerCase().trim();
  let list=[...STATE.players];
  if(q) list=list.filter(p=>p.name.toLowerCase().includes(q));
  list.sort((a,b)=>a.name.localeCompare(b.name));
  return `
  <div class="page-header">
    <div><h1>👥 Joueurs</h1><div class="page-sub">${STATE.players.length} joueur${STATE.players.length>1?'s':''}</div></div>
    <div style="display:flex;gap:8px;">
      <a href="#/compare" class="btn btn-ghost">⚖️ Comparer</a>
      ${isAdmin()? `<button class="btn btn-primary" onclick="openPlayerForm()">+ Ajouter un joueur</button>` : ''}
    </div>
  </div>
  <div class="search-bar">
    <input class="input" id="playerSearchInput" placeholder="🔎 Rechercher un joueur..." value="${esc(q)}" style="max-width:320px;">
  </div>
  ${list.length? `<div class="grid grid-4 player-cards-grid">${list.map(p=>{
    return `<div class="player-card" onclick="navigate('player/${p.id}')">
      ${avatarHTML(p,88)}
      <div class="pc-name">${esc(p.name)}${p.country?' '+flagImgHTML(p.country,16):''}</div>
    </div>`;
  }).join('')}</div>` : emptyState('👥','Aucun joueur trouvé')}
  `;
}

function personalRecordRow(icon,label,value,five,unit,colorKey){
  const c=STAT_COLORS[colorKey]||STAT_COLORS.gold;
  if(!value || value<=0){
    return `<div class="record-row">
      <div class="record-label"><div class="record-icon" style="--stat-color:${c.color};--stat-glow:${c.glow};">${icon}</div>${label}</div>
      <div class="page-sub">Aucune donnée</div>
    </div>`;
  }
  return `<div class="record-row">
    <div class="record-label"><div class="record-icon" style="--stat-color:${c.color};--stat-glow:${c.glow};">${icon}</div>${label}</div>
    <div class="record-right">
      ${five? `<div class="record-holders">
        <div class="record-holder" onclick="navigate('five/${five.id}')">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:16px;">🏟️</div>
          <div class="rh-info">
            <div class="rh-name">FIVE #${pad2(fiveNumber(five.id))}</div>
            <div class="rh-five">${fmtDateShort(five.date)}</div>
          </div>
        </div>
      </div>` : ''}
      <div class="record-val">${value}<span class="record-unit">${unit}</span></div>
    </div>
  </div>`;
}
function rivalRow(icon,label,entries,colorKey){
  const c=STAT_COLORS[colorKey]||STAT_COLORS.gold;
  if(!entries || !entries.length){
    return `<div class="record-row">
      <div class="record-label"><div class="record-icon" style="--stat-color:${c.color};--stat-glow:${c.glow};">${icon}</div>${label}</div>
      <div class="page-sub">Pas assez de matchs avec équipes connues face à un adversaire</div>
    </div>`;
  }
  return `<div class="record-row">
    <div class="record-label"><div class="record-icon" style="--stat-color:${c.color};--stat-glow:${c.glow};">${icon}</div>${label}</div>
    <div class="record-right">
      <div class="record-holders">
        ${entries.map(e=>{
          const opp=getPlayer(e.opponentId);
          return `<div class="record-holder" onclick="navigate('player/${e.opponentId}')">
            ${avatarHTML(opp,40)}
            <div class="rh-info">
              <div class="rh-name">${esc(playerName(opp))}</div>
              <div class="rh-five">${e.wins}V ${e.draws}N ${e.losses}D</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="record-val">${entries[0].winPct}<span class="record-unit">%</span></div>
    </div>
  </div>`;
}
// ---------- Player profile ----------
function viewPlayerProfile(playerId){
  const p=getPlayer(playerId);
  if(!p) return emptyState('❓','Joueur introuvable');
  const fs=playerFullStats(playerId);
  const rivals=nemesisAndFavoriteTarget(playerId);

  const resultBadge=(result)=>{
    if(!result) return '';
    if(result==='win') return '<div class="result-badge win" title="Victoire">V</div>';
    if(result==='draw') return '<div class="result-badge draw" title="Nul">N</div>';
    return '<div class="result-badge loss" title="Défaite">D</div>';
  };

  const historyRows=fs.perFive.slice().reverse().map(pf=>{
    const score=fiveScore(pf.five.id);
    const rt=playerRatingInFive(playerId,pf.five.id);
    return `<div class="tl-card" style="cursor:pointer;margin-bottom:8px;" onclick="navigate('five/${pf.five.id}')">
      ${resultBadge(pf.result)}
      ${rt? ratingBadgeHTML(rt.rating,rt.isMvp) : ''}
      <div style="min-width:110px;">
        <div style="font-weight:800;font-size:13px;">FIVE #${pad2(fiveNumber(pf.five.id))}</div>
        <div class="page-sub" style="font-size:12px;">${fmtDateShort(pf.five.date)}</div>
        <div class="page-sub" style="font-size:12px;">📍 ${esc(pf.five.location||'-')}</div>
      </div>
      <div style="font-weight:800;color:var(--primary);">${score.a}-${score.b}</div>
      <div class="pstats" style="margin-left:auto;">
        <div><b>${pf.goals}</b><span>BUTS</span></div>
        <div><b>${pf.assists}</b><span>PASSES</span></div>
        <div><b>${pf.ga}</b><span>G+A</span></div>
      </div>
    </div>`;
  }).join('');

  // Tous les buts du joueur (chronologique, plus récent en premier)
  let myGoals=[];
  let myOwnGoals=[];
  fs.perFive.forEach(pf=>{
    goalsForFive(pf.five.id).filter(g=>g.scorerId===playerId).forEach(g=>{
      const wScore=fiveGoalsWithScore(pf.five.id).find(x=>x.id===g.id);
      if(g.isOwnGoal) myOwnGoals.push({goal:g, five:pf.five, wScore});
      else myGoals.push({goal:g, five:pf.five, wScore});
    });
  });
  myGoals.reverse();
  myOwnGoals.reverse();

  // Toutes les passes décisives du joueur (chronologique, plus récent en premier)
  let myAssistEvents=[];
  fs.perFive.forEach(pf=>{
    goalsForFive(pf.five.id).filter(g=>g.assisterId===playerId).forEach(g=>{
      const wScore=fiveGoalsWithScore(pf.five.id).find(x=>x.id===g.id);
      myAssistEvents.push({goal:g, five:pf.five, wScore});
    });
  });
  myAssistEvents.reverse();

  // Buts clutch : égalisation ou prise d'avantage
  const myClutch=myGoals.map(m=>Object.assign({},m,{kind:clutchKind(m.wScore)})).filter(m=>m.kind);
  const clutchEqualizers=myClutch.filter(m=>m.kind==='equalizer').length;
  const clutchLeads=myClutch.filter(m=>m.kind==='lead').length;

  function eventCard(m, mode){
    const video=videoForGoal(m.goal.id);
    const scorer=getPlayer(m.goal.scorerId);
    const assister=m.goal.assisterId? getPlayer(m.goal.assisterId):null;
    const subLine = mode==='clutch' ? (m.kind==='equalizer'? '⚖️ But de l\'égalisation' : '🚀 But de la prise d\'avantage')
      : mode==='owngoal' ? '🥅 But contre son camp'
      : mode==='goals'
      ? (assister? '🎯 Assisté par '+esc(assister.name) : '🎯 Sans passe décisive')
      : ('⚽ But de '+esc(playerName(scorer)));
    return `<div class="tl-card" style="margin-bottom:8px;">
      <div style="min-width:90px;font-weight:800;color:var(--primary);cursor:pointer;" onclick="navigate('five/${m.five.id}')">FIVE #${pad2(fiveNumber(m.five.id))}</div>
      <div class="tl-body">
        <div class="tl-scorer">${m.wScore.before.a}-${m.wScore.before.b} → ${m.wScore.after.a}-${m.wScore.after.b}</div>
        <div class="tl-assist">${subLine}</div>
      </div>
      ${video? `<button class="play-btn" onclick="playVideo('${video.id}')">▶️ Vidéo</button>` : ''}
    </div>`;
  }

  return `
  <div class="page-header">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="#/compare/${playerId}" class="btn btn-ghost btn-sm">⚖️ Comparer</a>
      ${isAdmin()? `<button class="btn btn-ghost btn-sm" onclick="openPlayerForm('${playerId}')">✏️ Modifier</button>
      <button class="btn btn-danger btn-sm" onclick="deletePlayer('${playerId}')">🗑️ Supprimer</button>` : ''}
    </div>
  </div>
  <div class="card profile-head">
    ${avatarHTML(p,96)}
    <div>
      <h1>${esc(p.name)}</h1>
      ${p.country? `<div class="profile-flagline">
        <span>${flagImgHTML(p.country,20)} ${esc(countryName(p.country)||p.country)}</span>
      </div>` : ''}
      ${p.notes? `<div class="page-sub" style="margin-top:8px;max-width:480px;">${esc(p.notes)}</div>` : ''}
    </div>
  </div>

  <div class="section-title">📊 Statistiques</div>
  <div class="card" style="padding:0;">
    <div class="stat-strip">
      ${statChip('🏟️','Matchs', fs.matches, 'gold')}
      ${statChip('⚽','Buts', fs.goals, 'green')}
      ${statChip('🎯','Passes', fs.assists, 'blue')}
      ${statChip('⭐','G+A', fs.ga, 'purple')}
    </div>
  </div>

  <div class="card" style="padding:0;margin-top:14px;">
    <div class="stat-strip">
      ${statChip('✅','Victoires', fs.wins, 'green')}
      ${statChip('➖','Nuls', fs.draws, 'gold')}
      ${statChip('❌','Défaites', fs.losses, 'red')}
      ${statChip('📈','% Victoires', fs.winPct===null?'-':fs.winPct+'%', 'blue')}
    </div>
  </div>
  ${fs.withResult===0 ? `<div class="notice">ℹ️ Les équipes ne sont pas renseignées pour les Five joués par ce joueur : le résultat individuel (victoire/nul/défaite) ne peut pas être calculé.</div>` : ''}

  ${(()=>{
    const fm=playerForm(playerId);
    if(!fm.ratedCount) return '';
    const elo=eloHistory(), eloRank=eloRanking().find(r=>r.player.id===playerId);
    const eloVal=Math.round(elo.rating[playerId]);
    const lastDelta=(elo.byPlayer[playerId]||[]).slice(-1)[0];
    const trend= fm.last5Avg!==null && fm.ratedCount>=2 ? fm.last5Avg-fm.avgRating : 0;
    const sign=(v,d)=>(v>0?'+':'')+v.toFixed(d);
    const streakTxt= fm.winStreak.current>=2? `🔥 ${fm.winStreak.current} victoires d'affilée`
      : fm.unbeatenStreak.current>=2? `🛡️ ${fm.unbeatenStreak.current} matchs sans défaite`
      : fm.lossStreak.current>=2? `🥶 ${fm.lossStreak.current} défaites d'affilée`
      : fm.scoringStreak.current>=2? `⚽ a marqué lors des ${fm.scoringStreak.current} derniers Five` : '';
    const mates=bestAndWorstTeammates(playerId);
    const mateRow=(icon,label,list,colorKey)=>{
      const c=STAT_COLORS[colorKey];
      return `<div class="record-row">
        <div class="record-label"><div class="record-icon" style="--stat-color:${c.color};--stat-glow:${c.glow};">${icon}</div>${label}</div>
        ${list.length? `<div class="record-right"><div class="record-holders">${list.map(m=>{ const mp=getPlayer(m.mateId); return `<div class="record-holder" onclick="navigate('player/${m.mateId}')">
          ${avatarHTML(mp,40)}<div class="rh-info"><div class="rh-name">${esc(playerName(mp))}</div><div class="rh-five">${m.wins}V ${m.draws}N ${m.losses}D ensemble</div></div></div>`; }).join('')}</div>
          <div class="record-val">${list[0].winPct}<span class="record-unit">%</span></div></div>`
        : `<div class="page-sub">Pas encore ${PAIR_MIN_MATCHES} matchs ensemble avec un même coéquipier</div>`}
      </div>`;
    };
    return `
    <div class="section-title">📈 Forme &amp; niveau</div>
    <div class="card" style="padding:0;">
      <div class="stat-strip">
        ${statChip('🌟','Note moyenne', fm.avgRating.toFixed(1), 'gold')}
        ${statChip('📈','Elo'+(eloRank?` · #${eloRank.rank}`:''), eloVal, 'purple')}
        ${statChip('👑','Homme du match', fm.mvpCount, 'gold')}
        ${statChip('➕','Diff. buts / match', fm.avgPlusMinus===null?'-':sign(fm.avgPlusMinus,1), fm.avgPlusMinus>0?'green':fm.avgPlusMinus<0?'red':'blue')}
      </div>
    </div>
    <div class="card form-card">
      <div><div class="stat-label">Forme (5 derniers)</div>${formChipsHTML(fm.last5)}</div>
      <div><div class="stat-label">Note récente</div><b>${fm.last5Avg!==null? fm.last5Avg.toFixed(1) : '-'}</b>${Math.abs(trend)>=0.05? ` <span class="${trend>0?'trend-up':'trend-down'}">${trend>0?'▲':'▼'} ${Math.abs(trend).toFixed(1)}</span>` : ''}</div>
      <div><div class="stat-label">Meilleure note</div><b>${fm.bestRating.toFixed(1)}</b> <span class="page-sub" style="cursor:pointer;" onclick="navigate('five/${fm.bestRatingFive.id}')">Five #${pad2(fiveNumber(fm.bestRatingFive.id))}</span></div>
      ${lastDelta? `<div><div class="stat-label">Dernier Elo</div><b class="${lastDelta.delta>=0?'trend-up':'trend-down'}">${sign(lastDelta.delta,0)}</b></div>` : ''}
      ${streakTxt? `<div class="streak-pill">${streakTxt}</div>` : ''}
    </div>
    <div class="card" style="padding:12px;margin-top:14px;">
      <div class="stat-label" style="margin:0 0 6px 4px;">Évolution de l'Elo</div>
      ${eloChartSVG(playerId)}
    </div>

    <div class="section-title">🤝 Partenaires</div>
    <div class="card records-card">
      ${mateRow('💚','Meilleur partenaire (le plus de victoires ensemble)', mates.best, 'green')}
      ${mates.worst.length? mateRow('💔','Partenaire le moins chanceux', mates.worst, 'red') : ''}
    </div>
    <div class="hint" style="margin:-6px 0 0 4px;">Calculé sur les coéquipiers avec qui ${esc(p.name)} a joué au moins ${PAIR_MIN_MATCHES} Five dans la même équipe (3 pts la victoire, 1 le nul).</div>`;
  })()}

  ${(()=>{
    const all=playerCriteriaRankings();
    const mine=all[playerId];
    if(!mine) return '';
    const medal=(rk)=> rk===1?'🥇' : rk===2?'🥈' : rk===3?'🥉' : '';
    const rows=PLAYER_CRITERIA.map(c=>{
      const r=mine[c.key];
      const rankTxt= r.rank===null? '-' : (medal(r.rank)||'')+' #'+r.rank+'<span style="color:var(--text-faint);font-weight:500;"> sur '+r.total+'</span>';
      return `<div style="display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid var(--border-soft);flex-wrap:wrap;">
        <div style="flex:1;min-width:170px;">
          <div style="font-weight:700;font-size:14px;">${c.icon} ${c.label}</div>
          ${c.hint? `<div class="page-sub" style="font-size:11.5px;">${esc(c.hint)}</div>` : ''}
        </div>
        <div style="color:var(--text-dim);font-size:13.5px;">${r.display}</div>
        <div style="min-width:96px;text-align:right;font-weight:800;font-size:15px;">${rankTxt}</div>
      </div>`;
    }).join('');
    return `<div class="section-title">📊 Mes classements</div>
    <div class="card" style="padding:4px 16px;">${rows}</div>
    <div class="hint" style="margin:6px 0 0 4px;">Rang parmi tous les joueurs ayant disputé au moins un Five (totaux, pas de moyenne). Impact = part des buts de son équipe auxquels il a contribué (buts + passes).</div>`;
  })()}

  <div class="section-title">📐 Moyennes</div>
  <div class="card" style="padding:0;">
    <div class="stat-strip">
      ${statChip('⚽','Buts/match', fmtNum(fs.avgGoals,2), 'green')}
      ${statChip('🎯','Passes/match', fmtNum(fs.avgAssists,2), 'blue')}
      ${statChip('⭐','G+A/match', fmtNum(fs.avgGA,2), 'purple')}
      ${statChip('🎟️','Participation', fs.participationRate===null?'-':fs.participationRate+'%', 'gold')}
    </div>
  </div>

  <div class="section-title">🔥 Clutch (${myClutch.length})</div>
  <div class="card" style="padding:0;">
    <div class="stat-strip">
      ${statChip('🔥','Buts clutch', myClutch.length, 'red')}
      ${statChip('⚖️','Égalisations', clutchEqualizers, 'gold')}
      ${statChip('🚀','Prises d\'avantage', clutchLeads, 'green')}
      ${statChip('📊','% de ses buts', fs.goals? Math.round(myClutch.length/fs.goals*100)+'%' : '-', 'purple')}
    </div>
  </div>
  <div class="hint" style="margin:6px 0 0 4px;">But qui permet à son équipe d'égaliser ou de passer devant (hors CSC).</div>
  ${myClutch.length? myClutch.map(m=>eventCard(m,'clutch')).join('') : ''}

  <div class="section-title">🏅 Records personnels</div>
  <div class="card records-card">
    ${personalRecordRow('⚽','Meilleur Five (buts)', fs.bestFiveGoals, fs.bestFiveGoalsFive, fs.bestFiveGoals>1?'buts':'but', 'green')}
    ${personalRecordRow('🎯','Meilleur Five (passes)', fs.bestFiveAssists, fs.bestFiveAssistsFive, fs.bestFiveAssists>1?'passes':'passe', 'blue')}
    ${personalRecordRow('⭐','Meilleur Five (G+A)', fs.bestFiveGA, fs.bestFiveGAFive, 'G+A', 'purple')}
  </div>

  <div class="section-title">😈 Face-à-face</div>
  <div class="card records-card">
    ${rivalRow('💀','Bête noire (adversaire le + difficile)', rivals.nemesis, 'red')}
    ${rivalRow('🎯','Cible favorite (adversaire dominé)', rivals.favoriteTarget, 'green')}
  </div>
  <div class="hint" style="margin:-6px 0 0 4px;">Calculé sur les Five où les équipes des deux joueurs sont connues. Le pourcentage affiché est le taux de victoire de ${esc(p.name)} face à cet adversaire.</div>

  <div class="section-title">📜 Historique (${fs.perFive.length})</div>
  ${historyRows || emptyState('📜','Aucun Five joué')}

  ${(()=>{
    const mins=myGoals.filter(m=>m.goal.minute!==null&&m.goal.minute!==undefined).map(m=>m.goal.minute);
    if(!mins.length) return '';
    const avg=mins.reduce((a,b)=>a+b,0)/mins.length;
    return `<div class="section-title">⏱️ Timing de mes buts</div>
    <div class="card" style="padding:0;">
      <div class="stat-strip">
        ${statChip('⏱️','Minute moyenne', fmtNum(avg,1)+"'", 'blue')}
        ${statChip('⚡','Plus tôt', Math.min(...mins)+"'", 'green')}
        ${statChip('🕓','Plus tard', Math.max(...mins)+"'", 'gold')}
      </div>
    </div>
    <div class="card" style="padding:12px;margin-top:14px;">${minuteHistogramSVG(mins,5,'#f97316')}</div>`;
  })()}

  <div class="section-title">🗺️ Carte des actions (buts &amp; passes décisives)</div>
  ${playerActionsMapHTML(playerId,myGoals,myAssistEvents)}

  <div class="section-title">⚽ Mes buts (${myGoals.length})</div>
  ${myGoals.length? myGoals.map(m=>eventCard(m,'goals')).join('') : emptyState('⚽','Aucun but enregistré')}

  ${myOwnGoals.length? `
  <div class="section-title">🥅 Buts contre son camp (${myOwnGoals.length})</div>
  ${myOwnGoals.map(m=>eventCard(m,'owngoal')).join('')}
  ` : ''}

  <div class="section-title">🎯 Mes passes décisives (${myAssistEvents.length})</div>
  ${myAssistEvents.length? myAssistEvents.map(m=>eventCard(m,'assists')).join('') : emptyState('🎯','Aucune passe décisive enregistrée')}
  `;
}


// ---------- Rankings ----------
let rankingFilter='total';
function viewRankings(){
  const filterOptions=[
    {v:'total',l:'Total'},{v:'avg',l:'Moyenne/match'}
  ];
  const scorers=rankPlayers('goals',rankingFilter).filter(r=>r.value>0 || rankingFilter==='total');
  const assisters=rankPlayers('assists',rankingFilter);
  const gaList=rankPlayers('ga',rankingFilter);
  const winsList=rankPlayers('wins',rankingFilter);
  return `
  <div class="page-header"><div><h1>🏆 Classements</h1><div class="page-sub">Classements dynamiques calculés automatiquement${rankingFilter==='avg'?' · moyennes : joueurs avec au moins 50% des Fives joués':''}</div></div></div>
  <div class="filter-pills">${filterOptions.map(o=>`<div class="pill ${o.v===rankingFilter?'active':''}" onclick="rankingFilter='${o.v}';render();">${o.l}</div>`).join('')}</div>
  <div class="grid grid-4">
    <div class="card"><div class="section-title" style="margin-top:0;">⚽ Meilleurs buteurs</div>${rankListHTML(scorers,rankingFilter.startsWith('avg')?2:0)}</div>
    <div class="card"><div class="section-title" style="margin-top:0;">🎯 Meilleurs passeurs</div>${rankListHTML(assisters,rankingFilter.startsWith('avg')?2:0)}</div>
    <div class="card"><div class="section-title" style="margin-top:0;">⭐ Plus décisifs (G+A)</div>${rankListHTML(gaList,rankingFilter.startsWith('avg')?2:0)}</div>
    <div class="card"><div class="section-title" style="margin-top:0;">✅ Plus de victoires</div>${rankListHTML(winsList,0,rankingFilter.startsWith('avg')?'%':'')}</div>
  </div>
  <div class="section-title">📈 Niveau &amp; performances</div>
  <div class="grid grid-4">
    <div class="card"><div class="section-title" style="margin-top:0;">🌟 Note moyenne</div>${rankListHTML(ratingRanking(),1,'',null)}</div>
    <div class="card"><div class="section-title" style="margin-top:0;">📈 Classement Elo</div>${rankListHTML(eloRanking(),0)}</div>
    <div class="card"><div class="section-title" style="margin-top:0;">👑 Hommes du match</div>${rankListHTML(mvpRanking(),0)}</div>
    <div class="card"><div class="section-title" style="margin-top:0;">➕ Différence de buts / match</div>${rankListHTML(plusMinusRanking(),2,'',v=>(v>0?'+':'')+v.toFixed(2))}</div>
  </div>
  <div class="hint" style="margin:6px 0 0 4px;">Note /10 : calculée à chaque Five d'après les buts, passes, buts clutch et le résultat, comparés aux autres joueurs du match. Elo : niveau qui monte quand ton équipe gagne (surtout contre plus fort) et baisse quand elle perd (départ ${ELO_START}). Note moyenne et différence de buts : joueurs ayant disputé au moins ${Math.round(AVG_MIN_PARTICIPATION*100)}% des Five.</div>
  `;
}
function rankListHTML(rows,decimals,suffix,fmt){
  if(!rows.length) return emptyState('📉','Aucune donnée');
  const rowHTML=(r)=>{
    let medalClass='', medal=r.rank+'.', ringClass='';
    if(r.rank===1){medalClass='g';medal='🥇';ringClass='ring-gold';} else if(r.rank===2){medalClass='s';medal='🥈';ringClass='ring-silver';} else if(r.rank===3){medalClass='b';medal='🥉';ringClass='ring-bronze';}
    return `<div class="rank-row" style="cursor:pointer;" onclick="navigate('player/${r.player.id}')">
      <div class="rank-medal ${medalClass}">${medal}</div>
      ${avatarHTML(r.player,34,ringClass)}
      <div style="font-weight:700;font-size:14px;">${esc(r.player.name)}</div>
      <div class="rank-val">${fmt? fmt(r.value) : fmtNum(r.value,decimals)}${suffix||''}</div>
    </div>`;
  };
  return rows.map(rowHTML).join('');
}

// ---------- Duos ----------
function viewDuos(){
  const duos=duosData();
  return `
  <div class="page-header"><div><h1>🤝 Duos passeur ⇄ buteur</h1><div class="page-sub">${duos.length} relation${duos.length>1?'s':''} détectée${duos.length>1?'s':''}</div></div></div>
  ${duos.length? duos.map(d=>{
    const a=getPlayer(d.playerA), b=getPlayer(d.playerB);
    return `<div class="duo-row duo-row-combined" style="margin-bottom:10px;cursor:pointer;" onclick="navigate('duo/${d.playerA}/${d.playerB}')">
      <div class="duo-combined-head">
        ${avatarHTML(a,32)}<span style="font-weight:700;">${esc(playerName(a))}</span>
        <span class="duo-arrow">⇄</span>
        ${avatarHTML(b,32)}<span style="font-weight:700;">${esc(playerName(b))}</span>
        <span class="duo-count">${d.total} passe${d.total>1?'s':''} au total</span>
      </div>
      <div class="duo-combined-sub">
        <span>${esc(playerName(a))} → ${esc(playerName(b))} : <b>${d.aToB}</b></span>
        <span>${esc(playerName(b))} → ${esc(playerName(a))} : <b>${d.bToA}</b></span>
      </div>
    </div>`;
  }).join('') : emptyState('🤝','Aucun duo pour le moment','Les duos apparaissent dès qu\'un but est assisté.')}
  ${duoTogetherSectionHTML()}
  `;
}
/* Associations dans la même équipe : meilleures et pires paires (au moins PAIR_MIN_MATCHES matchs ensemble) */
function duoTogetherSectionHTML(){
  const pairs=pairTogetherStats().filter(p=>p.matches>=PAIR_MIN_MATCHES);
  if(!pairs.length) return '';
  const best=pairs.slice().sort((a,b)=>b.ppm-a.ppm || b.matches-a.matches).slice(0,8);
  const worst=pairs.slice().sort((a,b)=>a.ppm-b.ppm || b.matches-a.matches).slice(0,5);
  const rowHTML=(p)=>{
    const a=getPlayer(p.a), b=getPlayer(p.b);
    return `<div class="rank-row">
      ${avatarHTML(a,30)}${avatarHTML(b,30)}
      <div style="font-weight:700;font-size:14px;"><span style="cursor:pointer;" onclick="navigate('player/${p.a}')">${esc(playerName(a))}</span> &amp; <span style="cursor:pointer;" onclick="navigate('player/${p.b}')">${esc(playerName(b))}</span>
        <div class="page-sub" style="font-weight:500;font-size:12px;">${p.matches} Five ensemble · ${p.wins}V ${p.draws}N ${p.losses}D</div></div>
      <div class="rank-val">${p.winPct}%</div>
    </div>`;
  };
  return `
  <div class="section-title">💚 Meilleures associations (même équipe)</div>
  <div class="grid grid-2">
    <div class="card"><div class="stat-label" style="margin-bottom:6px;">Ensemble, ils gagnent</div>${best.map(rowHTML).join('')}</div>
    <div class="card"><div class="stat-label" style="margin-bottom:6px;">Ensemble, ça coince</div>${worst.map(rowHTML).join('')}</div>
  </div>
  <div class="hint" style="margin:6px 0 0 4px;">Paires ayant joué au moins ${PAIR_MIN_MATCHES} Five dans la même équipe, triées par points par match (3 la victoire, 1 le nul).</div>`;
}
function viewDuoDetail(playerAId,playerBId){
  const a=getPlayer(playerAId), b=getPlayer(playerBId);
  const goalsAtoB=STATE.goals.filter(g=>g.assisterId===playerAId && g.scorerId===playerBId);
  const goalsBtoA=STATE.goals.filter(g=>g.assisterId===playerBId && g.scorerId===playerAId);
  const total=goalsAtoB.length+goalsBtoA.length;

  function goalCard(g){
    const five=getFive(g.fiveId);
    const wScore=fiveGoalsWithScore(g.fiveId).find(x=>x.id===g.id);
    const video=videoForGoal(g.id);
    return `<div class="tl-card" style="margin-bottom:8px;">
      <div style="min-width:110px;cursor:pointer;font-weight:800;color:var(--primary);" onclick="navigate('five/${g.fiveId}')">FIVE #${pad2(fiveNumber(g.fiveId))}</div>
      <div class="tl-body"><div class="tl-scorer">${wScore.before.a}-${wScore.before.b} → ${wScore.after.a}-${wScore.after.b}</div><div class="tl-assist">${five? fmtDateShort(five.date):''}</div></div>
      ${video? `<button class="play-btn" onclick="playVideo('${video.id}')">▶️ Vidéo</button>` : ''}
    </div>`;
  }

  return `
  <div class="page-header"><div><h1>🤝 ${esc(playerName(a))} ⇄ ${esc(playerName(b))}</h1><div class="page-sub">${total} but${total>1?'s':''} au total sur passe décisive entre les deux</div></div>
  <a href="#/duos" class="btn btn-ghost btn-sm">← Retour aux duos</a></div>

  <div class="section-title">${esc(playerName(a))} → ${esc(playerName(b))} (${goalsAtoB.length})</div>
  ${goalsAtoB.length? goalsAtoB.map(goalCard).join('') : emptyState('⚽','Aucun but')}

  <div class="section-title">${esc(playerName(b))} → ${esc(playerName(a))} (${goalsBtoA.length})</div>
  ${goalsBtoA.length? goalsBtoA.map(goalCard).join('') : emptyState('⚽','Aucun but')}
  `;
}

// ---------- Comparateur ----------
function playerSelectOptions(selectedId,excludeId){
  const list=[...STATE.players].sort((a,b)=>a.name.localeCompare(b.name));
  return `<option value="">- Choisir un joueur -</option>` + list
    .filter(p=>p.id!==excludeId)
    .map(p=>`<option value="${p.id}" ${p.id===selectedId?'selected':''}>${esc(p.name)}</option>`).join('');
}
function compareBar(label,valA,valB,decimals,suffix){
  const max=Math.max(Math.abs(valA),Math.abs(valB),0.0001);
  const pctA=Math.max(4,Math.round(Math.abs(valA)/max*100));
  const pctB=Math.max(4,Math.round(Math.abs(valB)/max*100));
  const winA = valA>valB, winB = valB>valA;
  return `
  <div class="cmp-row">
    <div class="cmp-val ${winA?'cmp-win':''}">${fmtNum(valA,decimals)}${suffix||''}</div>
    <div class="cmp-mid">
      <div class="cmp-label">${label}</div>
      <div class="cmp-bars">
        <div class="cmp-bar-a"><div class="cmp-fill-a ${winA?'lead':''}" style="width:${pctA}%"></div></div>
        <div class="cmp-bar-b"><div class="cmp-fill-b ${winB?'lead':''}" style="width:${pctB}%"></div></div>
      </div>
    </div>
    <div class="cmp-val ${winB?'cmp-win':''}">${fmtNum(valB,decimals)}${suffix||''}</div>
  </div>`;
}
function viewCompare(idA,idB){
  const a=idA? getPlayer(idA):null;
  const b=idB? getPlayer(idB):null;

  const selectorHTML=`
  <div class="card cmp-selector">
    <div class="cmp-selector-side">
      <label>Joueur A</label>
      <select class="input" id="cmpSelectA">${playerSelectOptions(idA,idB)}</select>
    </div>
    <div class="cmp-vs-badge">VS</div>
    <div class="cmp-selector-side">
      <label>Joueur B</label>
      <select class="input" id="cmpSelectB">${playerSelectOptions(idB,idA)}</select>
    </div>
  </div>
  <button class="btn btn-primary btn-block" style="margin-top:12px;" onclick="launchCompare()">⚖️ Comparer</button>
  `;

  if(!a || !b || a.id===b.id){
    return `
    <div class="page-header"><div><h1>⚖️ Comparateur de joueurs</h1><div class="page-sub">Choisis deux joueurs à comparer côte à côte</div></div></div>
    ${selectorHTML}
    ${STATE.players.length<2? emptyState('👥','Il faut au moins 2 joueurs pour comparer') : ''}
    `;
  }

  const fsA=playerFullStats(a.id), fsB=playerFullStats(b.id);
  const h2hA = headToHeadStats(a.id).find(h=>h.opponentId===b.id);

  return `
  <div class="page-header"><div><h1>⚖️ Comparateur de joueurs</h1><div class="page-sub">Statistiques calculées automatiquement</div></div></div>
  ${selectorHTML}

  <div class="cmp-head">
    <div class="cmp-head-side">
      ${avatarHTML(a,150)}
      <div class="cmp-name">${esc(a.name)}</div>
    </div>
    <div class="cmp-vs-badge cmp-vs-big">VS</div>
    <div class="cmp-head-side">
      ${avatarHTML(b,150)}
      <div class="cmp-name">${esc(b.name)}</div>
    </div>
  </div>

  <div class="section-title">📊 Statistiques cumulées</div>
  <div class="card">
    ${compareBar('🏟️ Matchs joués', fsA.matches, fsB.matches)}
    ${compareBar('⚽ Buts', fsA.goals, fsB.goals)}
    ${compareBar('🎯 Passes décisives', fsA.assists, fsB.assists)}
    ${compareBar('⭐ G+A', fsA.ga, fsB.ga)}
    ${compareBar('✅ Victoires', fsA.wins, fsB.wins)}
    ${compareBar('➖ Nuls', fsA.draws, fsB.draws)}
    ${compareBar('❌ Défaites', fsA.losses, fsB.losses)}
  </div>

  <div class="section-title">📐 Moyennes & séries</div>
  <div class="card">
    ${compareBar('⚽ Buts / match', fsA.avgGoals, fsB.avgGoals, 2)}
    ${compareBar('🎯 Passes / match', fsA.avgAssists, fsB.avgAssists, 2)}
    ${compareBar('⭐ G+A / match', fsA.avgGA, fsB.avgGA, 2)}
    ${compareBar('📈 % Victoires', fsA.winPct||0, fsB.winPct||0, 0, '%')}
    ${compareBar('🏆 Meilleur Five (buts)', fsA.bestFiveGoals, fsB.bestFiveGoals)}
    ${compareBar('🏆 Meilleur Five (passes)', fsA.bestFiveAssists, fsB.bestFiveAssists)}
    ${compareBar('🏆 Meilleur Five (G+A)', fsA.bestFiveGA, fsB.bestFiveGA)}
  </div>

  ${(()=>{
    const fA=playerForm(a.id), fB=playerForm(b.id), elo=eloHistory();
    const together=teammateStats(a.id).find(m=>m.mateId===b.id);
    return `<div class="section-title">📈 Niveau &amp; forme</div>
    <div class="card">
      ${compareBar('🌟 Note moyenne', fA.avgRating||0, fB.avgRating||0, 1)}
      ${compareBar('📈 Elo', elo.rating[a.id]||ELO_START, elo.rating[b.id]||ELO_START, 0)}
      ${compareBar('👑 Homme du match', fA.mvpCount, fB.mvpCount)}
      ${compareBar('➕ Diff. buts / match', fA.avgPlusMinus||0, fB.avgPlusMinus||0, 1)}
      ${compareBar('✅ Meilleure série de victoires', fA.winStreak.best, fB.winStreak.best)}
    </div>
    ${together? `<div class="notice" style="margin-top:12px;">🤝 Dans la même équipe : <b>${together.matches} Five</b> ensemble, ${together.wins}V ${together.draws}N ${together.losses}D (${together.winPct}% de victoires).</div>` : ''}`;
  })()}

  ${h2hA? `
  <div class="section-title">⚔️ Face-à-face direct</div>
  <div class="card">
    <div class="hint" style="margin:-2px 0 10px 4px;">Sur les ${h2hA.matches} Five où ${esc(a.name)} et ${esc(b.name)} étaient dans des équipes opposées.</div>
    ${compareBar('✅ Victoires face à face', h2hA.wins, h2hA.losses)}
    ${compareBar('➖ Nuls', h2hA.draws, h2hA.draws)}
  </div>` : `
  <div class="notice" style="margin-top:16px;">ℹ️ ${esc(a.name)} et ${esc(b.name)} n'ont jamais été dans des équipes opposées (avec équipes connues) - pas de face-à-face direct à afficher.</div>
  `}
  `;
}
function launchCompare(){
  const a=document.getElementById('cmpSelectA').value;
  const b=document.getElementById('cmpSelectB').value;
  if(!a||!b){ toast('Choisis deux joueurs','error'); return; }
  if(a===b){ toast('Choisis deux joueurs différents','error'); return; }
  navigate('compare/'+a+'/'+b);
}

// ---------- Records ----------
function viewRecords(){
  const rec=computeRecords();
  function unitFor(value,singular,pluralWord){
    return value>1? (pluralWord||singular+'s') : singular;
  }
  function row(icon,label,record,unitSingular,unitPlural,colorKey){
    const c=STAT_COLORS[colorKey]||STAT_COLORS.gold;
    if(!record || !record.holders.length) return `<div class="record-row">
      <div class="record-label"><div class="record-icon" style="--stat-color:${c.color};--stat-glow:${c.glow};">${icon}</div>${label}</div>
      <div class="page-sub">Aucune donnée</div>
    </div>`;
    const holders=record.holders;
    const unit=unitFor(record.value,unitSingular,unitPlural);
    return `<div class="record-row">
      <div class="record-label"><div class="record-icon" style="--stat-color:${c.color};--stat-glow:${c.glow};">${icon}</div>${label}</div>
      <div class="record-right">
        <div class="record-holders">
          ${holders.map(h=>`<div class="record-holder" onclick="navigate('player/${h.player.id}')">
            ${avatarHTML(h.player,40)}
            <div class="rh-info">
              <div class="rh-name">${esc(h.player.name)}</div>
              ${h.five? `<div class="rh-five">Five #${pad2(fiveNumber(h.five.id))}</div>` : ''}
            </div>
          </div>`).join('')}
        </div>
        <div class="record-val">${record.value}<span class="record-unit">${unit}</span></div>
      </div>
    </div>`;
  }
  return `
  <div class="page-header"><div><h1>🏅 Records</h1><div class="page-sub">Calculés automatiquement à partir de toutes les données - les égalités sont affichées</div></div></div>
  <div class="card records-card">
    ${row('⚽','Plus de buts dans un Five', rec.mostGoalsInFive,'but','buts','green')}
    ${row('🎯','Plus de passes dans un Five', rec.mostAssistsInFive,'passe','passes','blue')}
    ${row('⭐','Meilleur G+A dans un Five', rec.mostGAInFive,'G+A','G+A','purple')}
    ${row('🏟️','Plus de Five joués', rec.mostFivesPlayed,'Five','Five','gold')}
    ${row('⚽','Meilleur total de buts', rec.mostTotalGoals,'but','buts','green')}
    ${row('🎯','Meilleur total de passes', rec.mostTotalAssists,'passe','passes','blue')}
    ${row('⭐','Meilleur total G+A', rec.mostTotalGA,'G+A','G+A','purple')}
    ${row('🔥','Plus longue série avec un but', rec.longestGoalStreak,'Five','Five','red')}
    ${row('🔥','Plus longue série avec une contribution (G+A)', rec.longestGAStreak,'Five','Five','red')}
    ${row('⚡','But le plus rapide', rec.fastestGoal,'minute','minutes','green')}
    ${row('🕓','But le plus tardif', rec.latestGoal,'minute','minutes','gold')}
  </div>
  <div class="section-title">📈 Notes, séries &amp; niveau</div>
  <div class="card records-card">
    ${row('🌟','Meilleure note dans un Five', rec.bestRating,'/10','/10','gold')}
    ${row('👑','Plus de titres d\'homme du match', rec.mostMvp,'fois','fois','gold')}
    ${row('✅','Plus longue série de victoires', rec.longestWinStreak,'Five','Five','green')}
    ${row('🛡️','Plus longue série sans défaite', rec.longestUnbeaten,'Five','Five','blue')}
    ${row('📈','Elo le plus haut atteint', rec.peakElo,'pts','pts','purple')}
  </div>
  `;
}

// ---------- Admin ----------
let adminTab='five';
function viewAdmin(){
  if(!isAdmin()){
    return `
    <div class="page-header"><div><h1>🗃️ Données</h1><div class="page-sub">Réservé à l'admin</div></div></div>
    <div class="card" style="text-align:center;padding:40px 20px;">
      <div style="font-size:36px;margin-bottom:10px;">🔒</div>
      <div style="font-weight:700;margin-bottom:6px;">Connexion requise</div>
      <div class="page-sub" style="margin-bottom:16px;">Seul l'administrateur peut ajouter, modifier ou supprimer des données.</div>
      <button class="btn btn-primary" onclick="openLoginModal()">🔑 Se connecter</button>
    </div>
    `;
  }
  return `
  <div class="page-header">
    <div><h1>🗃️ Données</h1><div class="page-sub">Gestion complète - ajout, modification, suppression</div></div>
    <a href="https://github.com/marroqui932/lefiveyyy/edit/main/index.html" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">✏️ Modifier le code sur GitHub</a>
  </div>
  <div class="notice">☁️ Les données sont stockées en ligne sur <b>Supabase</b> et visibles par tous les visiteurs. Seul ton compte connecté peut les modifier.</div>
  <div class="tabs">
    <div class="tab ${adminTab==='five'?'active':''}" onclick="adminTab='five';render();">🏟️ Five</div>
    <div class="tab ${adminTab==='players'?'active':''}" onclick="adminTab='players';render();">👥 Joueurs</div>
    <div class="tab ${adminTab==='backup'?'active':''}" onclick="adminTab='backup';render();">💾 Sauvegarde</div>
  </div>
  ${adminTab==='five'? adminFiveTab() : adminTab==='players'? adminPlayersTab() : adminBackupTab()}
  `;
}
function adminFiveTab(){
  const list=fivesSorted().reverse();
  return `
  <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openFiveForm()">+ Ajouter un Five</button>
  ${list.map(f=>{
    const score=fiveScore(f.id);
    const goals=goalsForFive(f.id).length;
    return `<div class="admin-item">
      <div class="info"><b>FIVE #${pad2(fiveNumber(f.id))} - ${fmtDateShort(f.date)}</b><div>📍 ${esc(f.location||'-')} · ${score.a}-${score.b} · ${goals} buts</div></div>
      <div class="admin-actions">
        <button class="btn btn-sm btn-ghost" onclick="navigate('five/${f.id}')">👁️</button>
        <button class="btn btn-sm btn-ghost" onclick="openFiveForm('${f.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteFive('${f.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('') || emptyState('🏟️','Aucun Five')}
  `;
}
function adminPlayersTab(){
  const list=[...STATE.players].sort((a,b)=>a.name.localeCompare(b.name));
  return `
  <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openPlayerForm()">+ Ajouter un joueur</button>
  ${list.map(p=>{
    const fs=playerFullStats(p.id);
    return `<div class="admin-item">
      ${avatarHTML(p,40)}
      <div class="info"><b>${esc(p.name)}</b><div>${fs.matches} matchs · ${fs.goals} buts · ${fs.assists} passes</div></div>
      <div class="admin-actions">
        <button class="btn btn-sm btn-ghost" onclick="navigate('player/${p.id}')">👁️</button>
        <button class="btn btn-sm btn-ghost" onclick="openPlayerForm('${p.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deletePlayer('${p.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('') || emptyState('👥','Aucun joueur')}
  `;
}
function adminBackupTab(){
  const videosWithFile=STATE.goals.filter(g=>g.videoUrl);
  const totalVideoSize=videosWithFile.reduce((s,g)=>s+(g.videoSize||0),0);
  const quotaBytes=1024*1024*1024; // 1 Go, quota gratuit Supabase Storage
  const pct=Math.min(100, Math.round((totalVideoSize/quotaBytes)*100));
  return `
  <div class="card" style="margin-bottom:16px;">
    <h3 style="margin-top:0;">💽 Espace de stockage vidéo (Supabase)</h3>
    <div class="page-sub">🎬 ${videosWithFile.length} vidéo${videosWithFile.length>1?'s':''} en ligne - ${fmtFileSize(totalVideoSize)} utilisés sur 1 Go gratuit (${pct}%).</div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <h3 style="margin-top:0;">🖼️ Photos des joueurs</h3>
    <div class="page-sub" style="margin-bottom:10px;">${fmtFileSize(STATE.players.reduce((s,p)=>s+(p.photo?p.photo.length:0),0))} de photos téléchargées à chaque visite. Les réduire (${PHOTO_MAX_PX} px max) accélère le chargement du site.</div>
    <button class="btn btn-primary" id="optimizePhotosBtn" onclick="optimizeAllPhotos()">Réduire les photos existantes</button>
  </div>
  <div class="grid grid-2">
    <div class="card">
      <h3 style="margin-top:0;">📤 Exporter les données</h3>
      <p class="page-sub">Génère un fichier JSON (joueurs, Five, buts). Les vidéos restent hébergées sur Supabase ; seuls leurs liens sont inclus.</p>
      <button class="btn btn-primary btn-block" onclick="exportData()">Exporter (.json)</button>
    </div>
    <div class="card">
      <h3 style="margin-top:0;">📥 Importer les données</h3>
      <p class="page-sub">Restaure une sauvegarde JSON. <b>Remplace toutes les données actuelles, pour tous les visiteurs.</b></p>
      <input type="file" id="importFileInput" accept="application/json" class="input" style="margin-bottom:10px;">
      <button class="btn btn-danger btn-block" onclick="importData()">Importer et remplacer</button>
    </div>
  </div>
  <div class="notice" style="margin-top:16px;">🎥 <b>À propos des vidéos :</b> chaque vidéo de but est envoyée sur Supabase Storage (1 Go gratuit, 50 Mo max par fichier). Le bouton <b>🗜️ Compresser</b> apparaît automatiquement pour les vidéos de plus de 15 Mo lors de l'ajout d'un but.</div>
  `;
}

async function optimizeAllPhotos(){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const btn=document.getElementById('optimizePhotosBtn');
  if(btn){ btn.disabled=true; btn.textContent='Réduction en cours…'; }
  let done=0, saved=0, failed=0;
  for(const p of STATE.players){
    if(!p.photo) continue;
    try{
      const small=await resizePhotoDataURL(p.photo);
      if(small.length<p.photo.length){
        await PlayersRepo.save(Object.assign({},p,{photo:small}));
        saved+=p.photo.length-small.length; done++;
      }
    }catch(e){ console.error('Photo de',p.name,e); failed++; }
  }
  await loadAll();
  render();
  toast(`${done} photo${done>1?'s':''} réduite${done>1?'s':''} (${fmtFileSize(saved)} gagnés)${failed?` · ${failed} échec${failed>1?'s':''}`:''}`, failed?'error':'success');
}

function emptyState(icon,title,sub){
  return `<div class="empty-state"><div class="e-icon">${icon}</div><div style="font-weight:700;font-size:15px;color:var(--text);">${title}</div>${sub?`<div style="margin-top:6px;">${sub}</div>`:''}</div>`;
}

