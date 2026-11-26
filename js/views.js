'use strict';
/* ============================================================
   VUES - chaque fonction view*() renvoie le HTML d'une page.
   ============================================================ */

/* ---------- Briques communes ---------- */
const STAT_COLORS={
  green:{color:'#22c55e'}, blue:{color:'#3b82f6'}, purple:{color:'#a78bfa'},
  gold:{color:'#f5c542'}, red:{color:'#ef4444'}, lime:{color:'#2fa66a'}, orange:{color:'#f97316'}
};
const plural=(n,one,many)=>n+' '+(n>1? (many||one+'s') : one);
function pageHeader(title,sub,actions,eyebrow){
  return `<div class="page-header">
    <div>${eyebrow? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1>${sub? `<div class="page-sub">${sub}</div>` : ''}</div>
    ${actions? `<div class="actions">${actions}</div>` : ''}
  </div>`;
}
function sectionTitle(icon,label,extra){
  return `<div class="section-title">${ic(icon)}<span>${label}</span>${extra||''}</div>`;
}
function kpi(icon,label,val,sub){
  return `<div class="kpi"><div class="kpi-label">${ic(icon)}${label}</div><div class="kpi-val">${val}</div>${sub? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
}
function statChip(icon,label,val){
  return `<div class="stat-chip"><div class="sc-label">${label}</div><div class="sc-val">${val}</div></div>`;
}
function emptyState(icon,title,sub){
  const glyph= ICONS[icon]? ic(icon) : (icon||'');
  return `<div class="empty-state"><div class="e-icon">${glyph}</div><div class="e-title">${title}</div>${sub?`<div class="e-sub">${sub}</div>`:''}</div>`;
}
const PLAYER_SILHOUETTE='<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 12.2c2.76 0 5-2.35 5-5.25S14.76 1.7 12 1.7 7 4.05 7 6.95s2.24 5.25 5 5.25Zm0 2.5c-3.5 0-10.5 1.8-10.5 5.4v2.2h21v-2.2c0-3.6-7-5.4-10.5-5.4Z"/></svg>';
function avatarHTML(player,size,ringClass){
  size=size||40;
  const ring=ringClass? ' '+ringClass : '';
  if(player && player.photo){
    return `<div class="avatar${ring}" style="width:${size}px;height:${size}px;"><img src="${player.photo}" alt="" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="avatar avatar-placeholder${ring}" style="width:${size}px;height:${size}px;">${PLAYER_SILHOUETTE}</div>`;
}
function fiveTitle(fiveId){ return 'Five #'+pad2(fiveNumber(fiveId)); }
function timeRange(f){ return f.timeStart? f.timeStart+(f.timeEnd?' – '+f.timeEnd:'') : ''; }
function matchMetaHTML(f){
  return `<div class="match-meta">
    <span>${ic('calendar')}${fmtDateLong(f.date)}</span>
    ${f.timeStart? `<span>${ic('clock')}${timeRange(f)}</span>` : ''}
    ${f.location? `<span>${ic('pin')}${esc(f.location)}</span>` : ''}
  </div>`;
}
function teamNames(fiveId,team){
  return participationsForFive(fiveId).filter(p=>p.teamId===team).map(p=>playerName(getPlayer(p.playerId))).sort((a,b)=>a.localeCompare(b,'fr'));
}
/* Tableau de score : Équipe A (bleu) à gauche, Équipe B (orange) à droite */
function scoreboardHTML(fiveId){
  const s=fiveScore(fiveId);
  const side=(team,score,lose)=>`<div class="sb-team ${team.toLowerCase()}">
    <div class="sb-name"><span class="sb-dot ${team.toLowerCase()}"></span>Équipe ${team}</div>
    <div class="sb-players">${esc(teamNames(fiveId,team).join(', '))}</div>
  </div>`;
  const res= s.a>s.b? 'Victoire équipe A' : s.b>s.a? 'Victoire équipe B' : 'Match nul';
  return `<div class="scoreboard">
    ${side('A',s.a)}
    <div><div class="sb-score"><span class="${s.a<s.b?'lose':''}">${s.a}</span><span class="sep">–</span><span class="${s.b<s.a?'lose':''}">${s.b}</span></div><div class="sb-result">${res}</div></div>
    ${side('B',s.b)}
  </div>`;
}
/* Joueurs ex-aequo : avatars empilés + tous les noms (aucun n'est choisi arbitrairement) */
function avatarStackHTML(players,size){
  size=size||40;
  return `<div class="avatar-stack tied-stack">${players.slice(0,4).map(p=>avatarHTML(p,size)).join('')}${players.length>4? `<div class="avatar more-av" style="width:${size}px;height:${size}px;">+${players.length-4}</div>` : ''}</div>`;
}
function tiedNamesHTML(players){
  return `<div class="tied-names">${players.map(p=>`<a href="#/player/${p.id}" onclick="event.stopPropagation()">${esc(playerName(p))}</a>`).join(' <span class="sep">·</span> ')}</div>`;
}

/* ============================================================
   ACCUEIL
   ============================================================ */
/* Lignes d'un terrain de five vu de haut (craie). Horizontal (ordinateur) et vertical (mobile). */
const PITCH_LINES_SVG=`<svg viewBox="0 0 300 160" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1.2">
  <rect x="1" y="1" width="298" height="158" rx="3"/><path d="M150 1v158"/><circle cx="150" cy="80" r="22"/><circle cx="150" cy="80" r="1.6" fill="currentColor"/>
  <path d="M1 45h34v70H1M299 45h-34v70h34"/><path d="M1 66v28M299 66v28" stroke-width="3"/></svg>`;
const PITCH_LINES_V_SVG=`<svg viewBox="0 0 160 300" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1.2">
  <rect x="1" y="1" width="158" height="298" rx="3"/><path d="M1 150h158"/><circle cx="80" cy="150" r="22"/><circle cx="80" cy="150" r="1.6" fill="currentColor"/>
  <path d="M45 1v34h70V1M45 299v-34h70v34"/><path d="M66 1h28M66 299h28" stroke-width="3"/></svg>`;

/* Bandeau défilant en bas d'écran, façon chaîne d'info sport (contenu doublé pour boucler sans à-coup) */
function tickerBarHTML(){
  const done=fivesSorted().filter(f=>!isFutureFive(f) && goalsForFive(f.id).length).reverse().slice(0,8);
  if(!done.length) return '';
  const s=dashboardStats();
  const names=(entries)=>entries.map(e=>esc(playerName(e.player))).join(', ');
  const items=[];
  done.forEach(f=>{
    const sc=fiveScore(f.id);
    items.push(`<a class="tk-item" href="#/five/${f.id}"><span class="tk-num">#${pad2(fiveNumber(f.id))}</span><span class="tk-score"><span class="a">${sc.a}</span><span class="tk-dash">-</span><span class="b">${sc.b}</span></span>${fmtDateShort(f.date)}</a>`);
  });
  if(s.topScorer.length) items.push(`<a class="tk-item" href="#/rankings"><span class="tk-tag">Buteur${s.topScorer.length>1?'s':''}</span>${names(s.topScorer)} · ${s.topScorer[0].value}</a>`);
  if(s.topAssister.length) items.push(`<a class="tk-item" href="#/rankings"><span class="tk-tag">Passeur${s.topAssister.length>1?'s':''}</span>${names(s.topAssister)} · ${s.topAssister[0].value}</a>`);
  if(sponsorsList().length) items.push(`<span class="tk-item"><span class="tk-tag">Partenaires</span>${sponsorsList().map(x=>esc(x.name)).join(' · ')}</span>`);
  if(s.nextFive) items.push(`<a class="tk-item" href="#/five/${s.nextFive.id}"><span class="tk-tag live">Prochain five</span>${fmtDateLong(s.nextFive.date)}${s.nextFive.timeStart? ' · '+s.nextFive.timeStart : ''}</a>`);
  const row=items.join('<span class="tk-dot"></span>')+'<span class="tk-dot"></span>';
  return `<div class="tk-label">${ic('ball',14)}Résultats</div><div class="tk-viewport"><div class="ticker-track" style="--tk-dur:${items.length*6}s">${row}${row}</div></div>`;
}

/* En-tête "plateau TV" de l'accueil */
function studioHeaderHTML(s){
  return `<section class="studio">
    <div class="studio-lines">${PITCH_LINES_SVG}</div>
    <div class="studio-main">
      <img class="studio-crest" src="favicon.svg" alt="">
      <div>
        <div class="eyebrow">La ligue de nos five</div>
        <h1>LeFive<span>yyy</span></h1>
      </div>
    </div>
    ${presentedByHTML()}
    <div class="studio-stats">
      <div><b class="num">${s.totalFives}</b><span>five joués</span></div>
      <div><b class="num">${s.totalGoals}</b><span>buts</span></div>
      <div><b class="num">${s.totalAssists}</b><span>passes déc.</span></div>
      <div><b class="num">${STATE.players.filter(p=>playerFullStats(p.id).matches>0).length}</b><span>joueurs</span></div>
    </div>
  </section>`;
}
function nextMatchCardHTML(f){
  if(!f) return `<div class="bc-card next-card empty">
    <div class="bc-tag">${ic('calendar',14)}Prochain match</div>
    <div class="next-none">Aucun five programmé</div>
    ${isAdmin()? `<button class="btn btn-primary btn-sm" onclick="openFiveForm()">${ic('plus')}Programmer un five</button>` : `<div class="page-sub">Il apparaîtra ici dès qu'il sera ajouté.</div>`}
  </div>`;
  const start=f.date+'T'+(f.timeStart||'20:00')+':00';
  const parts=participationsForFive(f.id);
  return `<div class="bc-card next-card card-link" onclick="navigate('five/${f.id}')">
    <div class="bc-tag live"><i class="live-dot"></i>Prochain match</div>
    <div class="next-title">${fiveTitle(f.id)}</div>
    <div class="countdown" data-countdown="${start}">
      <div><b class="num" data-u="d">–</b><span>jours</span></div><div><b class="num" data-u="h">–</b><span>h</span></div>
      <div><b class="num" data-u="m">–</b><span>min</span></div><div><b class="num" data-u="s">–</b><span>s</span></div>
    </div>
    ${matchMetaHTML(f)}
    <div class="next-foot">${parts.length? `${avatarStackHTML(parts.map(p=>getPlayer(p.playerId)).filter(Boolean),28)}<span>${plural(parts.length,'inscrit')}</span>` : '<span>Équipes pas encore faites</span>'}</div>
  </div>`;
}
function lastMatchCardHTML(f){
  if(!f) return `<div class="bc-card">${emptyState('pitch','Aucun match joué pour le moment')}</div>`;
  const goals=goalsForFive(f.id);
  return `<div class="bc-card last-card match-hero card-link" onclick="navigate('five/${f.id}')">
    <div class="last-head"><div class="bc-tag">${ic('history',14)}Dernier match · ${fiveTitle(f.id)}</div>${matchMetaHTML(f)}</div>
    ${scoreboardHTML(f.id)}
    <div class="match-hero-foot"><span class="page-sub" style="margin:0;">${plural(goals.length,'but')} · ${plural(participationsForFive(f.id).length,'joueur')}</span><span class="btn btn-ghost btn-sm">Feuille de match ${ic('arrowRight')}</span></div>
  </div>`;
}
function viewDashboard(){
  const s=dashboardStats();
  const played=fivesSorted().filter(f=>!isFutureFive(f));
  const recentFives=played.slice().reverse().slice(0,6);
  const avgGoals= s.totalFives? (s.totalGoals/s.totalFives) : 0;
  const inForm=playersInForm();

  // Leader d'une catégorie : en cas d'égalité, tous les joueurs concernés sont affichés
  const leader=(icon,title,players,value,unit,sub)=>{
    if(!players || !players.length) return `<div class="bc-card leader-card"><div class="bc-tag">${ic(icon,14)}${title}</div><div class="page-sub">Pas encore de données</div></div>`;
    const tie=players.length>1;
    return `<div class="bc-card leader-card card-link" onclick="navigate('${tie? 'rankings' : 'player/'+players[0].id}')">
      <div class="bc-tag">${ic(icon,14)}${title}${tie? `<span class="tie-badge">${players.length} ex-aequo</span>` : ''}</div>
      <div class="leader">
        ${avatarStackHTML(players,tie?38:52)}
        <div class="leader-val">${value}<small>${unit}</small></div>
      </div>
      ${tiedNamesHTML(players)}
      ${sub? `<div class="page-sub" style="margin-top:6px;">${sub}</div>` : ''}
    </div>`;
  };
  const lead=(entries,icon,title,unit)=>leader(icon,title,(entries||[]).map(e=>e.player),entries&&entries.length? entries[0].value : 0,unit);

  return `
  ${studioHeaderHTML(s)}

  <div class="home-top">
    ${lastMatchCardHTML(s.lastFive)}
    ${nextMatchCardHTML(s.nextFive)}
  </div>

  ${sectionTitle('trophy','Les leaders',`<a class="more" href="#/rankings">Classement complet ${ic('arrowRight',14)}</a>`)}
  <div class="grid grid-4 leaders-grid">
    ${lead(s.topScorer,'ball','Meilleur buteur','buts')}
    ${lead(s.topAssister,'target','Meilleur passeur','passes')}
    ${lead(s.topGA,'star','Plus décisif','G+A')}
    ${inForm.length? leader('flame','En forme',inForm.map(r=>r.player),inForm[0].ga,'G+A','sur leurs 3 derniers matchs') : leader('flame','En forme',[],0,'')}
  </div>

  <div class="kpis" style="margin-top:14px;">
    ${kpi('ball','Buts par match',avgGoals.toFixed(1).replace('.',','), played.length? `sur ${plural(played.length,'five')}` : '')}
    ${kpi('target','Buts sur passe',s.totalGoals? Math.round(s.totalAssists/s.totalGoals*100)+'%' : '–', `${s.totalAssists} passes décisives`)}
    ${kpi('flame','Plus gros score',s.bestFive&&s.bestFive.count? s.bestFive.count : '–', s.bestFive&&s.bestFive.count? `buts dans le ${fiveTitle(s.bestFive.five.id)}` : '')}
    ${kpi('users','Effectif',s.totalPlayers, `${STATE.players.filter(p=>playerFullStats(p.id).matches>0).length} ont déjà joué`)}
  </div>

  ${sectionTitle('history','Derniers matchs',`<a class="more" href="#/five">Tout voir ${ic('arrowRight',14)}</a>`)}
  ${recentFives.length? `<div class="grid grid-3">${recentFives.map(f=>fiveCardHTML(f)).join('')}</div>` : emptyState('pitch','Aucun match pour le moment')}

  <div class="grid grid-2" style="margin-top:8px;">
    <div>${sectionTitle('map','Carte des tirs','<span class="count">attaque vers le haut</span>')}${allFivesActionsMapHTML()}</div>
    <div>${sectionTitle('timer','Quand tombent les buts')}<div class="card chart-card">${minuteHistogramSVG(playedGoalMinutes(),MINUTE_BIN)}</div>
      <div class="hint">${playedGoalMinutes().length} but${playedGoalMinutes().length>1?'s':''} sur ${STATE.goals.length} ont une minute enregistrée.</div></div>
  </div>
  `;
}

/* ============================================================
   MATCHS
   ============================================================ */
function fiveCardHTML(f){
  const future=isFutureFive(f);
  const parts=participationsForFive(f.id);
  const goals=goalsForFive(f.id);
  const head=`<div class="fc-head"><span class="fc-num">${fiveTitle(f.id)}</span><span>${fmtDateShort(f.date)}${f.location? ' · '+esc(f.location) : ''}</span></div>`;
  if(future){
    return `<div class="five-card future" onclick="navigate('five/${f.id}')">
      ${head}
      <div class="fc-future"><span class="badge badge-live">${ic('calendar')}À venir</span> ${timeRange(f)? '· '+timeRange(f) : ''}</div>
      <div class="fc-foot"><span>${ic('users')}${parts.length} inscrits</span><span>Voir les équipes ${ic('arrowRight')}</span></div>
    </div>`;
  }
  const s=fiveScore(f.id);
  return `<div class="five-card" onclick="navigate('five/${f.id}')">
    ${head}
    <div class="fc-row ${s.a<s.b?'lose':''}"><span class="sb-dot a"></span>Équipe A<span class="fc-score">${s.a}</span></div>
    <div class="fc-row ${s.b<s.a?'lose':''}"><span class="sb-dot b"></span>Équipe B<span class="fc-score">${s.b}</span></div>
    <div class="fc-foot">
      <span>${ic('ball')}${plural(goals.length,'but')}</span>
      <span>${ic('users')}${parts.length}</span>
    </div>
  </div>`;
}
function viewFiveList(){
  const list=fivesSorted().reverse();
  const played=list.filter(f=>!isFutureFive(f));
  return `
  ${pageHeader('Matchs', `${plural(played.length,'five joué','five joués')}${list.length>played.length? ` · ${list.length-played.length} à venir` : ''}`,
    isAdmin()? `<button class="btn btn-primary" onclick="openFiveForm()">${ic('plus')}Ajouter un five</button>` : '')}
  ${list.length? `<div class="grid grid-3">${list.map(fiveCardHTML).join('')}</div>` : emptyState('pitch','Aucun match pour le moment','Ajoute ton premier five pour commencer.')}
  `;
}

function viewFiveDetail(fiveId){
  const five=getFive(fiveId);
  if(!five) return emptyState('alert','Match introuvable',`<a class="btn btn-ghost" href="#/five">${ic('arrowLeft')}Retour aux matchs</a>`);
  const parts=playersInFive(fiveId);
  const teamA=parts.filter(p=>p.teamId==='A');
  const teamB=parts.filter(p=>p.teamId==='B');
  const noTeam=parts.filter(p=>!p.teamId);
  const goalsTL=fiveGoalsWithScore(fiveId);
  const future=isFutureFive(five);
  const list=fivesSorted(); const idx=list.findIndex(f=>f.id===fiveId);
  const prev=list[idx-1], next=list[idx+1];

  return `
  <div class="page-header">
    <div><a href="#/five" class="eyebrow" style="display:inline-flex;align-items:center;gap:6px;">${ic('arrowLeft',14)}Matchs</a><h1>${fiveTitle(fiveId)}${future? ' <span class="badge badge-live">À venir</span>' : ''}</h1></div>
    <div class="actions">
      ${prev? `<a class="btn btn-ghost btn-sm" href="#/five/${prev.id}" title="Match précédent">${ic('arrowLeft')}#${pad2(idx)}</a>` : ''}
      ${next? `<a class="btn btn-ghost btn-sm" href="#/five/${next.id}" title="Match suivant">#${pad2(idx+2)}${ic('arrowRight')}</a>` : ''}
      ${isAdmin()? `<button class="btn btn-ghost btn-sm" onclick="openFiveForm('${fiveId}')">${ic('edit')}Modifier</button>
      <button class="btn btn-danger btn-sm" onclick="deleteFive('${fiveId}')">${ic('trash')}Supprimer</button>` : ''}
    </div>
  </div>

  <div class="match-hero">
    <div class="match-hero-head">${matchMetaHTML(five)}</div>
    ${future? `<div class="notice" style="margin:0;">${ic('info')}<div><b>Ce five n'a pas encore eu lieu.</b> Les équipes sont déjà connues ci-dessous. Après le match, ajoute les buts : score et stats se calculent tout seuls.</div></div>`
      : scoreboardHTML(fiveId)}
  </div>

  ${sectionTitle('users','Compositions',future? '' : '<span class="count">les plus décisifs devant · rond plein = but, rond vide = passe</span>')}
  ${lineupPitchHTML(fiveId,teamA,teamB)}
  ${noTeam.length? `<div class="notice">${ic('info')}<div>${noTeam.length} joueur(s) sans équipe : ${noTeam.map(p=>esc(playerName(p.player))).join(', ')}</div></div>` : ''}

  ${future? '' : `
  ${sectionTitle('ball','Les buts',`<span class="count">${goalsTL.length}</span>`)}
  ${goalsTL.length? `<div class="match-feed">
    ${goalsTL.map(g=>{
      const scorer=getPlayer(g.scorerId);
      const assister=g.assisterId? getPlayer(g.assisterId) : null;
      const video=videoForGoal(g.id);
      const isA=g.team==='A';
      const cardHtml=`<div class="feed-card ${isA?'team-a':g.team==='B'?'team-b':'team-none'}">
        <div class="feed-score-chip">${g.minute!==null&&g.minute!==undefined? g.minute+"' · " : ''}${g.after.a}–${g.after.b}</div>
        <div class="feed-scorer">${g.isOwnGoal? 'CSC · '+esc(playerName(scorer)) : esc(playerName(scorer))}</div>
        <div class="feed-assist">${g.isOwnGoal? 'But contre son camp' : (assister? 'Passe de '+esc(playerName(assister)) : 'Sans passe décisive')}</div>
        ${video? `<button class="play-btn" onclick="playVideo('${video.id}')">${ic('play')}Voir le but</button>` : ''}
      </div>`;
      return `<div class="feed-row">
        <div class="feed-side feed-left">${isA? cardHtml : ''}</div>
        <div class="feed-center">${g.isOwnGoal? ic('goalNet') : ic('ball')}</div>
        <div class="feed-side feed-right">${!isA? cardHtml : ''}</div>
      </div>`;
    }).join('')}
  </div>` : emptyState('ball','Aucun but enregistré pour ce match')}

  ${goalsTL.some(g=>g.minute!==null&&g.minute!==undefined)? `${sectionTitle('trend','Évolution du score')}${fiveScoreCurveSVG(fiveId)}` : ''}

  ${sectionTitle('map','Carte des actions')}
  ${matchActionsMapHTML(fiveId)}
  `}
  `;
}

/* Les joueurs placés sur un terrain, comme les compositions à la télé.
   Équipe A à gauche (attaque vers la droite), équipe B à droite. Le plus décisif du match est le plus avancé.
   Sur mobile, le terrain passe à la verticale (A en haut, B en bas). */
function lineupColumns(n){
  if(n<=0) return [];
  if(n===1) return [1];
  const cols=[1]; let left=n-1;
  const per= n>8? 3 : 2;
  while(left>0){ const k=Math.min(per,left); cols.push(k); left-=k; }
  return cols;   // du plus reculé au plus avancé
}
function lineupPitchHTML(fiveId,teamA,teamB){
  const ga=(p)=>{ const s=playerStatsForFive(p.playerId,fiveId); return s.goals*2+s.assists; };
  const place=(rows,side)=>{
    const sorted=rows.slice().sort((a,b)=>ga(b)-ga(a) || playerName(a.player).localeCompare(playerName(b.player)));
    const cols=lineupColumns(sorted.length);
    const out=[]; let k=0;
    // On remplit en partant de la colonne la plus avancée
    for(let c=cols.length-1;c>=0;c--){
      const n=cols[c];
      for(let j=0;j<n;j++){
        const p=sorted[k++];
        const depth= cols.length===1? 0.5 : c/(cols.length-1);
        const x0= 9 + depth*34;                       // 9 % (au fond) -> 43 % (milieu de terrain)
        const x= side==='a'? x0 : 100-x0;
        const y= (j+1)/(n+1)*100;
        out.push({p,x,y,i:k});
      }
    }
    return out.map(({p,x,y,i})=>{
      const st=playerStatsForFive(p.playerId,fiveId);
      return `<a class="lu-player ${side}" href="#/player/${p.playerId}" style="--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--i:${i}">
        ${avatarHTML(p.player,56)}
        <span class="lu-name">${esc(playerName(p.player))}</span>
        ${st.goals||st.assists? `<span class="ga-pips">${'<i class="pip-g"></i>'.repeat(Math.min(st.goals,8))}${'<i class="pip-a"></i>'.repeat(Math.min(st.assists,8))}</span>` : ''}
      </a>`;
    }).join('');
  };
  return `${ledBoardHTML()}<div class="lineup">
    <div class="lu-lines h">${PITCH_LINES_SVG}</div><div class="lu-lines v">${PITCH_LINES_V_SVG}</div>
    <div class="lu-team-label a"><span class="sb-dot a"></span>Équipe A</div>
    <div class="lu-team-label b">Équipe B<span class="sb-dot b"></span></div>
    ${place(teamA,'a')}${place(teamB,'b')}
  </div>${ledBoardHTML()}`;
}

/* ============================================================
   JOUEURS
   ============================================================ */
function viewPlayerList(){
  const list=[...STATE.players].sort((a,b)=>{
    const ma=playerFullStats(a.id).matches, mb=playerFullStats(b.id).matches;
    return (mb>0)-(ma>0) || a.name.localeCompare(b.name,'fr');
  });
  return `
  ${pageHeader('Joueurs', plural(STATE.players.length,'joueur'),
    `<a href="#/compare" class="btn btn-ghost">${ic('scale')}Comparer</a>${isAdmin()? `<button class="btn btn-primary" onclick="openPlayerForm()">${ic('plus')}Ajouter</button>` : ''}`)}
  <div class="search-bar">${ic('search')}<input class="input" id="playerSearchInput" placeholder="Rechercher un joueur" autocomplete="off"></div>
  ${list.length? `<div class="tv-grid">${list.map(p=>{
    const fs=playerFullStats(p.id);
    return `<div class="tv-card" data-player-name="${esc(p.name.toLowerCase())}" onclick="navigate('player/${p.id}')">
      <div class="tv-photo">${p.photo? `<img src="${p.photo}" alt="" loading="lazy" decoding="async">` : `<div class="tv-silhouette">${PLAYER_SILHOUETTE}</div>`}
        <span class="tv-big num">${fs.goals}<small>buts</small></span></div>
      <div class="tv-lower"><div class="tv-name">${esc(p.name)}</div>
        <div class="tv-sub">${p.country? flagImgHTML(p.country,14) : ''}${fs.matches? plural(fs.matches,'match','matchs') : 'Pas encore joué'}</div></div>
      <div class="tv-stats">
        <div><b class="num">${fs.assists}</b><span>Passes</span></div>
        <div><b class="num">${fs.ga}</b><span>G+A</span></div>
        <div><b class="num">${fs.winPct===null?'–':fs.winPct+'%'}</b><span>Vict.</span></div>
      </div>
    </div>`;
  }).join('')}</div>
  <div id="playerSearchEmpty" class="hidden">${emptyState('search','Aucun joueur trouvé')}</div>` : emptyState('users','Aucun joueur')}
  `;
}

function recordIcon(icon,colorKey){
  const c=STAT_COLORS[colorKey]||STAT_COLORS.gold;
  return `<div class="record-icon" style="--stat-color:${c.color};">${ic(icon)}</div>`;
}
function personalRecordRow(icon,label,value,fives,unit,colorKey){
  if(!value || value<=0){
    return `<div class="record-row"><div class="record-label">${recordIcon(icon,colorKey)}${label}</div><div class="page-sub">Aucune donnée</div></div>`;
  }
  return `<div class="record-row">
    <div class="record-label">${recordIcon(icon,colorKey)}${label}</div>
    <div class="record-right">
      ${fives&&fives.length? `<div class="record-holders">${fives.map(five=>`<div class="record-holder" onclick="navigate('five/${five.id}')" style="padding-left:10px;">
        <div class="rh-info"><div class="rh-name">${fiveTitle(five.id)}</div><div class="rh-five">${fmtDateShort(five.date)}</div></div>
      </div>`).join('')}</div>` : ''}
      <div class="record-val">${value}<span class="record-unit">${unit}</span></div>
    </div>
  </div>`;
}
function peopleRow(icon,label,entries,colorKey,emptyMsg,subFn,valueFn){
  if(!entries || !entries.length){
    return `<div class="record-row"><div class="record-label">${recordIcon(icon,colorKey)}${label}</div><div class="page-sub">${emptyMsg}</div></div>`;
  }
  return `<div class="record-row">
    <div class="record-label">${recordIcon(icon,colorKey)}${label}</div>
    <div class="record-right">
      <div class="record-holders">${entries.map(e=>{ const pl=getPlayer(e.id); return `<div class="record-holder" onclick="navigate('player/${e.id}')">
        ${avatarHTML(pl,34)}<div class="rh-info"><div class="rh-name">${esc(playerName(pl))}</div><div class="rh-five">${subFn(e)}</div></div></div>`; }).join('')}</div>
      <div class="record-val">${valueFn(entries[0])}</div>
    </div>
  </div>`;
}

function viewPlayerProfile(playerId){
  const p=getPlayer(playerId);
  if(!p) return emptyState('alert','Joueur introuvable',`<a class="btn btn-ghost" href="#/players">${ic('arrowLeft')}Retour aux joueurs</a>`);
  const fs=playerFullStats(playerId);
  const fm=playerForm(playerId);
  const rivals=nemesisAndFavoriteTarget(playerId);
  const mates=bestAndWorstTeammates(playerId);
  const sign=(v,d)=>(v>0?'+':'')+v.toFixed(d).replace('.',',');

  // Buts, CSC et passes du joueur (plus récent en premier)
  const myGoals=[], myOwnGoals=[], myAssistEvents=[];
  fs.perFive.forEach(pf=>{
    const wl=fiveGoalsWithScore(pf.five.id);
    wl.forEach(g=>{
      if(g.scorerId===playerId) (g.isOwnGoal? myOwnGoals : myGoals).push({goal:g, five:pf.five, wScore:g});
      if(g.assisterId===playerId) myAssistEvents.push({goal:g, five:pf.five, wScore:g});
    });
  });
  [myGoals,myOwnGoals,myAssistEvents].forEach(a=>a.reverse());
  const myClutch=myGoals.map(m=>Object.assign({},m,{kind:clutchKind(m.wScore)})).filter(m=>m.kind);
  const clutchEqualizers=myClutch.filter(m=>m.kind==='equalizer').length;

  const resultBadge=(r)=> r? `<div class="result-badge ${r}" title="${r==='win'?'Victoire':r==='draw'?'Nul':'Défaite'}">${r==='win'?'V':r==='draw'?'N':'D'}</div>` : '';
  function eventCard(m,mode){
    const video=videoForGoal(m.goal.id);
    const scorer=getPlayer(m.goal.scorerId);
    const assister=m.goal.assisterId? getPlayer(m.goal.assisterId):null;
    const sub= mode==='clutch'? (m.kind==='equalizer'? `${ic('scale')}But de l'égalisation` : `${ic('trend')}But qui donne l'avantage`)
      : mode==='owngoal'? `${ic('goalNet')}But contre son camp`
      : mode==='goals'? (assister? `${ic('target')}Passe de ${esc(assister.name)}` : `${ic('target')}Sans passe décisive`)
      : `${ic('ball')}But de ${esc(playerName(scorer))}`;
    return `<div class="tl-card">
      <div class="tl-five" onclick="navigate('five/${m.five.id}')">${fiveTitle(m.five.id)}<small>${fmtDateShort(m.five.date)}</small></div>
      <div class="tl-body"><div class="tl-scorer">${m.goal.minute!=null? m.goal.minute+"' · " : ''}${m.wScore.before.a}–${m.wScore.before.b} → ${m.wScore.after.a}–${m.wScore.after.b}</div><div class="tl-assist">${sub}</div></div>
      ${video? `<button class="play-btn" onclick="playVideo('${video.id}')">${ic('play')}Vidéo</button>` : ''}
    </div>`;
  }
  const streakTxt= fm.winStreak.current>=2? `${ic('flame')}${fm.winStreak.current} victoires d'affilée`
    : fm.unbeatenStreak.current>=2? `${ic('shield')}${fm.unbeatenStreak.current} matchs sans défaite`
    : fm.lossStreak.current>=2? `${ic('alert')}${fm.lossStreak.current} défaites d'affilée`
    : fm.scoringStreak.current>=2? `${ic('ball')}Buteur lors des ${fm.scoringStreak.current} derniers matchs` : '';

  const crit=(()=>{
    const mine=playerCriteriaRankings()[playerId];
    if(!mine) return '';
    return `${sectionTitle('trophy','Ses classements','<span class="count">parmi les joueurs ayant joué</span>')}
    <div class="card" style="padding:4px 16px;">${PLAYER_CRITERIA.map(c=>{
      const r=mine[c.key];
      const medal= r.rank===1?'g':r.rank===2?'s':r.rank===3?'b':'';
      return `<div class="crit-row">
        <div style="flex:1;min-width:170px;"><div class="crit-name">${ic(c.icon)}${c.label}</div>${c.hint? `<div class="crit-hint">${esc(c.hint)}</div>` : ''}</div>
        <div class="crit-val">${r.display}</div>
        <div class="crit-rank"><span class="rank-medal ${medal}" style="width:auto;font-size:inherit;">${r.rank===null?'–':'#'+r.rank}</span> <small>/ ${r.total}</small></div>
      </div>`;
    }).join('')}</div>`;
  })();

  return `
  <div class="page-header" style="margin-bottom:14px;">
    <a href="#/players" class="eyebrow" style="display:inline-flex;align-items:center;gap:6px;">${ic('arrowLeft',14)}Joueurs</a>
    <div class="actions">
      <a href="#/compare/${playerId}" class="btn btn-ghost btn-sm">${ic('scale')}Comparer</a>
      ${isAdmin()? `<button class="btn btn-ghost btn-sm" onclick="openPlayerForm('${playerId}')">${ic('edit')}Modifier</button>
      <button class="btn btn-danger btn-sm" onclick="deletePlayer('${playerId}')">${ic('trash')}Supprimer</button>` : ''}
    </div>
  </div>
  <div class="profile-head">
    ${avatarHTML(p,112)}
    <div class="profile-main">
      <h1>${esc(p.name)}</h1>
      <div class="profile-flagline">
        ${p.country? `<span style="display:inline-flex;align-items:center;gap:6px;">${flagImgHTML(p.country,18)} ${esc(countryName(p.country)||p.country)}</span>` : ''}
        ${fm.last5.length? `<span>Forme ${formChipsHTML(fm.last5)}</span>` : ''}
        ${streakTxt? `<span class="streak-pill">${streakTxt}</span>` : ''}
      </div>
      ${p.notes? `<div class="page-sub" style="margin-top:8px;max-width:520px;">${esc(p.notes)}</div>` : ''}
      <div class="profile-kpis">
        <div><b>${fs.matches}</b><span>Matchs</span></div>
        <div><b>${fs.goals}</b><span>Buts</span></div>
        <div><b>${fs.assists}</b><span>Passes</span></div>
        <div><b>${fs.wins}</b><span>Victoires</span></div>
      </div>
    </div>
  </div>

  ${!fs.matches? `<div style="margin-top:14px;">${emptyState('pitch','Pas encore de match joué','Ses stats apparaîtront après son premier five.')}</div>` : `
  ${sectionTitle('chart','Bilan')}
  <div class="card"><div class="stat-strip">
    ${statChip('','Victoires', fs.wins)}
    ${statChip('','Nuls', fs.draws)}
    ${statChip('','Défaites', fs.losses)}
    ${statChip('','% victoires', fs.winPct===null?'–':fs.winPct+'%')}
    ${statChip('','Diff. buts / match', fm.avgPlusMinus===null?'–':sign(fm.avgPlusMinus,1))}
  </div></div>
  <div class="card" style="margin-top:14px;"><div class="stat-strip">
    ${statChip('','Buts / match', fmtNum(fs.avgGoals,2).replace('.',','))}
    ${statChip('','Passes / match', fmtNum(fs.avgAssists,2).replace('.',','))}
    ${statChip('','G+A / match', fmtNum(fs.avgGA,2).replace('.',','))}
    ${statChip('','Participation', fs.participationRate===null?'–':fs.participationRate+'%')}
  </div></div>
  ${fs.withResult===0 ? `<div class="notice">${ic('info')}<div>Les équipes ne sont pas renseignées pour ses matchs : le résultat (victoire, nul, défaite) ne peut pas être calculé.</div></div>` : ''}

  ${fm.games.length? `
  ${sectionTitle('trend','Forme et séries')}
  <div class="card form-card">
    <div><div class="stat-label">G+A (5 derniers)</div><div class="fv">${fm.games.slice(-5).reduce((a,g)=>a+g.ga,0)}</div></div>
    <div><div class="stat-label">Victoires d'affilée (record)</div><div class="fv">${fm.winStreak.best}</div></div>
    <div><div class="stat-label">Sans défaite (record)</div><div class="fv">${fm.unbeatenStreak.best}</div></div>
    <div><div class="stat-label">Buteur d'affilée (record)</div><div class="fv">${fm.scoringStreak.best}</div></div>
  </div>` : ''}

  ${crit}

  ${sectionTitle('link','Partenaires et adversaires')}
  <div class="card records-card">
    ${peopleRow('heart','Meilleur partenaire', mates.best.map(m=>Object.assign({id:m.mateId},m)), 'green', `Pas encore ${PAIR_MIN_MATCHES} matchs avec un même coéquipier`, m=>`${m.wins}V ${m.draws}N ${m.losses}D ensemble`, m=>`${m.winPct}<span class="record-unit">% vict.</span>`)}
    ${mates.worst.length? peopleRow('heartOff','Partenaire le moins chanceux', mates.worst.map(m=>Object.assign({id:m.mateId},m)), 'orange', '', m=>`${m.wins}V ${m.draws}N ${m.losses}D ensemble`, m=>`${m.winPct}<span class="record-unit">% vict.</span>`) : ''}
    ${peopleRow('skull','Bête noire', rivals.nemesis.map(e=>Object.assign({id:e.opponentId},e)), 'red', 'Pas encore assez de matchs face à un adversaire', e=>`${e.wins}V ${e.draws}N ${e.losses}D contre`, e=>`${e.winPct}<span class="record-unit">% vict.</span>`)}
    ${peopleRow('target','Cible favorite', rivals.favoriteTarget.map(e=>Object.assign({id:e.opponentId},e)), 'lime', 'Pas encore assez de matchs face à un adversaire', e=>`${e.wins}V ${e.draws}N ${e.losses}D contre`, e=>`${e.winPct}<span class="record-unit">% vict.</span>`)}
  </div>
  <div class="hint">Partenaires : coéquipiers avec au moins ${PAIR_MIN_MATCHES} matchs dans la même équipe (3 pts la victoire, 1 le nul). Adversaires : taux de victoire de ${esc(p.name)} face à eux.</div>

  ${sectionTitle('history','Historique',`<span class="count">${fs.perFive.length}</span>`)}
  ${fs.perFive.slice().reverse().map(pf=>{
    const s=fiveScore(pf.five.id);
    const team=teamOfPlayerInFive(pf.five.id,playerId);
    return `<div class="tl-card" onclick="navigate('five/${pf.five.id}')">
      ${resultBadge(pf.result)}
      <div class="tl-five">${fiveTitle(pf.five.id)}<small>${fmtDateShort(pf.five.date)}</small></div>
      <div class="tl-score">${team? `<span class="sb-dot ${team.toLowerCase()}" style="display:inline-block;margin-right:6px;"></span>` : ''}${s.a}–${s.b}</div>
      <div class="tl-body"><div class="tl-assist" style="margin:0;">${plural(pf.goals,'but')} · ${plural(pf.assists,'passe')}</div></div>
    </div>`;
  }).join('')}

  ${sectionTitle('flame','Buts clutch',`<span class="count">${myClutch.length}</span>`)}
  <div class="hint" style="margin:-4px 0 10px;">But à partir de la ${CLUTCH_MIN_MINUTE}e minute qui égalise ou donne l'avantage (hors CSC). ${myClutch.length? `${clutchEqualizers} égalisation${clutchEqualizers>1?'s':''}, ${myClutch.length-clutchEqualizers} prise${myClutch.length-clutchEqualizers>1?'s':''} d'avantage.` : ''}</div>
  ${myClutch.length? myClutch.map(m=>eventCard(m,'clutch')).join('') : `<div class="card page-sub" style="margin:0;">Aucun but clutch pour l'instant.</div>`}

  ${sectionTitle('medal','Records personnels')}
  <div class="card records-card">
    ${personalRecordRow('ball','Meilleur match (buts)', fs.bestFiveGoals, fs.bestFiveGoalsFive, fs.bestFiveGoals>1?'buts':'but', 'lime')}
    ${personalRecordRow('target','Meilleur match (passes)', fs.bestFiveAssists, fs.bestFiveAssistsFive, fs.bestFiveAssists>1?'passes':'passe', 'blue')}
    ${personalRecordRow('star','Meilleur match (G+A)', fs.bestFiveGA, fs.bestFiveGAFive, 'G+A', 'purple')}
  </div>

  ${(()=>{
    const mins=myGoals.filter(m=>m.goal.minute!=null).map(m=>m.goal.minute);
    if(!mins.length) return '';
    const avg=mins.reduce((a,b)=>a+b,0)/mins.length;
    return `${sectionTitle('timer','Quand il marque')}
    <div class="card"><div class="stat-strip">
      ${statChip('','Minute moyenne', fmtNum(avg,0)+"'")}
      ${statChip('','Plus tôt', Math.min(...mins)+"'")}
      ${statChip('','Plus tard', Math.max(...mins)+"'")}
    </div></div>
    <div class="card chart-card" style="margin-top:14px;">${minuteHistogramSVG(mins,5,'var(--primary)')}</div>`;
  })()}

  ${sectionTitle('map','Carte de ses actions','<span class="count">buts et passes décisives</span>')}
  ${playerActionsMapHTML(playerId,myGoals,myAssistEvents)}

  ${sectionTitle('ball','Ses buts',`<span class="count">${myGoals.length}</span>`)}
  ${myGoals.length? myGoals.map(m=>eventCard(m,'goals')).join('') : emptyState('ball','Aucun but enregistré')}
  ${myOwnGoals.length? `${sectionTitle('goalNet','Buts contre son camp',`<span class="count">${myOwnGoals.length}</span>`)}${myOwnGoals.map(m=>eventCard(m,'owngoal')).join('')}` : ''}
  ${sectionTitle('target','Ses passes décisives',`<span class="count">${myAssistEvents.length}</span>`)}
  ${myAssistEvents.length? myAssistEvents.map(m=>eventCard(m,'assists')).join('') : emptyState('target','Aucune passe décisive enregistrée')}
  `}
  `;
}

/* ============================================================
   CLASSEMENTS
   ============================================================ */
/* Classement façon tableau de championnat : on trie en cliquant sur une colonne.
   Les ex-aequo sur la colonne triée ont le même rang. */
const LEAGUE_COLS=[
  {k:'matches', l:'MJ',     t:'Matchs joués'},
  {k:'wins',    l:'V',      t:'Victoires'},
  {k:'draws',   l:'N',      t:'Nuls'},
  {k:'losses',  l:'D',      t:'Défaites', asc:true},
  {k:'winPct',  l:'% V',    t:'Pourcentage de victoires', f:v=>v===null?'–':v+'%'},
  {k:'goals',   l:'Buts',   t:'Buts'},
  {k:'assists', l:'Passes', t:'Passes décisives'},
  {k:'ga',      l:'G+A',    t:'Buts + passes décisives', main:true},
  {k:'avgGA',   l:'G+A/m',  t:'Buts + passes par match', f:v=>fmtNum(v,2).replace('.',',')},
  {k:'pm',      l:'Diff/m', t:'Écart moyen au score quand il joue', f:v=>v===null?'–':(v>0?'+':'')+v.toFixed(1).replace('.',',')}
];
let leagueSort='ga';
function setLeagueSort(k){ leagueSort=k; render(); }
function viewRankings(){
  const col=LEAGUE_COLS.find(c=>c.k===leagueSort)||LEAGUE_COLS[7];
  const rows=STATE.players.filter(p=>playerFullStats(p.id).matches>0).map(p=>{
    const fs=playerFullStats(p.id), fm=playerForm(p.id);
    return {player:p, fm, v:Object.assign({}, fs, {pm:fm.avgPlusMinus})};
  });
  const val=r=>{ const v=r.v[col.k]; return v===null||v===undefined? -Infinity : v; };
  rows.sort((a,b)=> col.asc? val(a)-val(b) : val(b)-val(a) || b.v.ga-a.v.ga || a.player.name.localeCompare(b.player.name,'fr'));
  let rank=0, prev;
  rows.forEach((r,i)=>{ const v=Math.round(val(r)*100)/100; if(i===0||v!==prev){ rank=i+1; prev=v; } r.rank=rank; });
  const medal=r=> r===1?'g':r===2?'s':r===3?'b':'';
  return `
  ${pageHeader('Classement','Clique sur une colonne pour trier · les ex-aequo ont le même rang')}
  <div class="league-wrap">
    <table class="league">
      <thead><tr><th class="l-rank">#</th><th class="l-player">Joueur</th>
        ${LEAGUE_COLS.map(c=>`<th class="${c.k===col.k?'sorted':''}${c.main?' main':''}" title="${c.t}" onclick="setLeagueSort('${c.k}')">${c.l}${c.k===col.k? `<i>${col.asc?'▲':'▼'}</i>` : ''}</th>`).join('')}
        <th class="l-form">Forme</th></tr></thead>
      <tbody>${rows.map(r=>`<tr class="${r.rank===1?'top':''}" onclick="navigate('player/${r.player.id}')">
        <td class="l-rank"><span class="rank-medal ${medal(r.rank)}">${r.rank}</span></td>
        <td class="l-player"><div class="l-who">${avatarHTML(r.player,32)}<span>${esc(r.player.name)}</span></div></td>
        ${LEAGUE_COLS.map(c=>`<td class="${c.k===col.k?'sorted':''}${c.main?' main':''}">${c.f? c.f(r.v[c.k]) : r.v[c.k]}</td>`).join('')}
        <td class="l-form">${formChipsHTML(r.fm.last5)}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>
  <div class="hint">MJ : matchs joués · V/N/D : victoires, nuls, défaites · G+A : buts + passes décisives · Diff/m : écart moyen au score final quand il joue (+3 = son équipe gagne de 3 buts en moyenne). Les moyennes sur peu de matchs sont à prendre avec des pincettes.</div>
  `;
}
function rankListHTML(rows,decimals,suffix,fmt,limit){
  if(!rows.length) return `<div class="page-sub" style="padding:8px;">Pas encore de données</div>`;
  const shown= limit? rows.slice(0,limit) : rows;
  return `<div class="rank-list">${shown.map(r=>{
    const medalClass= r.rank===1?'g' : r.rank===2?'s' : r.rank===3?'b' : '';
    const ring= r.rank===1?'ring-gold' : '';
    return `<div class="rank-row${r.rank===1?' top':''}" onclick="navigate('player/${r.player.id}')">
      <div class="rank-medal ${medalClass}">${r.rank}</div>
      ${avatarHTML(r.player,30,ring)}
      <div class="rank-name">${esc(r.player.name)}</div>
      <div class="rank-val">${fmt? fmt(r.value) : fmtNum(r.value,decimals).replace('.',',')}${suffix||''}</div>
    </div>`;
  }).join('')}</div>`;
}

/* ============================================================
   DUOS
   ============================================================ */
function viewDuos(){
  const duos=duosData();
  return `
  ${pageHeader('Duos','Qui fait marquer qui, et qui gagne ensemble')}
  ${duoTogetherSectionHTML()}
  ${sectionTitle('target','Passeur ⇄ buteur',`<span class="count">${duos.length}</span>`)}
  ${duos.length? duos.map(d=>{
    const a=getPlayer(d.playerA), b=getPlayer(d.playerB);
    return `<div class="duo-row duo-row-combined" onclick="navigate('duo/${d.playerA}/${d.playerB}')">
      <div class="duo-combined-head">
        <div class="avatar-stack">${avatarHTML(a,32)}${avatarHTML(b,32)}</div>
        <span style="font-weight:700;">${esc(playerName(a))} <span class="duo-arrow">${ic('swap',15)}</span> ${esc(playerName(b))}</span>
        <span class="duo-count">${d.total}<small>but${d.total>1?'s':''}</small></span>
      </div>
      <div class="duo-combined-sub">
        <span>${esc(playerName(a))} → ${esc(playerName(b))} : <b>${d.aToB}</b></span>
        <span>${esc(playerName(b))} → ${esc(playerName(a))} : <b>${d.bToA}</b></span>
      </div>
    </div>`;
  }).join('') : emptyState('link','Aucun duo pour le moment','Les duos apparaissent dès qu\'un but est assisté.')}
  `;
}
/* Associations dans la même équipe (au moins PAIR_MIN_MATCHES matchs ensemble) */
function duoTogetherSectionHTML(){
  const pairs=pairTogetherStats().filter(p=>p.matches>=PAIR_MIN_MATCHES);
  if(!pairs.length) return '';
  const topWithTies=(arr,key,n)=>arr.length<=n? arr : arr.filter(x=>key(x)>=key(arr[n-1]));
  const best=topWithTies(pairs.slice().sort((a,b)=>b.ppm-a.ppm || b.matches-a.matches),p=>p.ppm,6);
  const worst=topWithTies(pairs.slice().sort((a,b)=>a.ppm-b.ppm || b.matches-a.matches),p=>-p.ppm,6);
  const rowHTML=(p)=>{
    const a=getPlayer(p.a), b=getPlayer(p.b);
    return `<div class="rank-row" style="cursor:default;">
      <div class="avatar-stack">${avatarHTML(a,30)}${avatarHTML(b,30)}</div>
      <div style="min-width:0;"><div class="rank-name"><a href="#/player/${p.a}">${esc(playerName(a))}</a> &amp; <a href="#/player/${p.b}">${esc(playerName(b))}</a></div>
        <div class="rank-sub">${p.matches} matchs · ${p.wins}V ${p.draws}N ${p.losses}D</div></div>
      <div class="rank-val">${p.winPct}%</div>
    </div>`;
  };
  return `
  ${sectionTitle('heart','Associations','<span class="count">même équipe, au moins '+PAIR_MIN_MATCHES+' matchs</span>')}
  <div class="grid grid-2">
    <div class="card"><div class="card-title">${ic('trend')}Ensemble, ils gagnent</div><div class="rank-list">${best.map(rowHTML).join('')}</div></div>
    <div class="card"><div class="card-title">${ic("heartOff")}Ensemble, ça coince</div><div class="rank-list plain">${worst.map(rowHTML).join('')}</div></div>
  </div>
  <div class="hint">Triées par points par match (3 la victoire, 1 le nul).</div>`;
}
function viewDuoDetail(playerAId,playerBId){
  const a=getPlayer(playerAId), b=getPlayer(playerBId);
  const goalsAtoB=STATE.goals.filter(g=>g.assisterId===playerAId && g.scorerId===playerBId);
  const goalsBtoA=STATE.goals.filter(g=>g.assisterId===playerBId && g.scorerId===playerAId);
  const total=goalsAtoB.length+goalsBtoA.length;
  const together=teammateStats(playerAId).find(m=>m.mateId===playerBId);
  function goalCard(g){
    const five=getFive(g.fiveId);
    const wScore=fiveGoalsWithScore(g.fiveId).find(x=>x.id===g.id);
    const video=videoForGoal(g.id);
    return `<div class="tl-card">
      <div class="tl-five" onclick="navigate('five/${g.fiveId}')">${fiveTitle(g.fiveId)}<small>${five? fmtDateShort(five.date):''}</small></div>
      <div class="tl-body"><div class="tl-scorer">${g.minute!=null? g.minute+"' · " : ''}${wScore.before.a}–${wScore.before.b} → ${wScore.after.a}–${wScore.after.b}</div></div>
      ${video? `<button class="play-btn" onclick="playVideo('${video.id}')">${ic('play')}Vidéo</button>` : ''}
    </div>`;
  }
  return `
  ${pageHeader(`${esc(playerName(a))} &amp; ${esc(playerName(b))}`, `${plural(total,'but')} sur passe décisive entre les deux${together? ` · ${together.matches} matchs ensemble (${together.winPct}% de victoires)` : ''}`,
    `<a href="#/duos" class="btn btn-ghost btn-sm">${ic('arrowLeft')}Duos</a>`)}
  ${sectionTitle('arrowRight',`${esc(playerName(a))} → ${esc(playerName(b))}`,`<span class="count">${goalsAtoB.length}</span>`)}
  ${goalsAtoB.length? goalsAtoB.map(goalCard).join('') : emptyState('ball','Aucun but')}
  ${sectionTitle('arrowRight',`${esc(playerName(b))} → ${esc(playerName(a))}`,`<span class="count">${goalsBtoA.length}</span>`)}
  ${goalsBtoA.length? goalsBtoA.map(goalCard).join('') : emptyState('ball','Aucun but')}
  `;
}

/* ============================================================
   COMPARATEUR
   ============================================================ */
function playerSelectOptions(selectedId,excludeId){
  const list=[...STATE.players].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  return `<option value="">Choisir un joueur</option>` + list
    .filter(p=>p.id!==excludeId)
    .map(p=>`<option value="${p.id}" ${p.id===selectedId?'selected':''}>${esc(p.name)}</option>`).join('');
}
function compareBar(label,valA,valB,decimals,suffix){
  const max=Math.max(Math.abs(valA),Math.abs(valB),0.0001);
  const pctA=Math.max(3,Math.round(Math.abs(valA)/max*100));
  const pctB=Math.max(3,Math.round(Math.abs(valB)/max*100));
  const winA=valA>valB, winB=valB>valA;
  const f=(v)=>fmtNum(v,decimals).replace('.',',')+(suffix||'');
  return `<div class="cmp-row">
    <div class="cmp-val ${winA?'cmp-win':''}">${f(valA)}</div>
    <div class="cmp-mid">
      <div class="cmp-label">${label}</div>
      <div class="cmp-bars">
        <div class="cmp-bar-a"><div class="cmp-fill-a ${winA?'lead':''}" style="width:${pctA}%"></div></div>
        <div class="cmp-bar-b"><div class="cmp-fill-b ${winB?'lead':''}" style="width:${pctB}%"></div></div>
      </div>
    </div>
    <div class="cmp-val ${winB?'cmp-win':''}">${f(valB)}</div>
  </div>`;
}
function viewCompare(idA,idB){
  const a=idA? getPlayer(idA):null;
  const b=idB? getPlayer(idB):null;
  const selectorHTML=`
  <div class="card">
    <div class="cmp-selector">
      <div class="cmp-selector-side"><label><span class="sb-dot a"></span>Joueur 1</label><select class="input" id="cmpSelectA" onchange="launchCompare(true)">${playerSelectOptions(idA,idB)}</select></div>
      <div class="cmp-vs-badge">VS</div>
      <div class="cmp-selector-side"><label><span class="sb-dot b"></span>Joueur 2</label><select class="input" id="cmpSelectB" onchange="launchCompare(true)">${playerSelectOptions(idB,idA)}</select></div>
    </div>
  </div>`;
  if(!a || !b || a.id===b.id){
    return `
    ${pageHeader('Comparateur','Choisis deux joueurs pour les comparer côte à côte')}
    ${selectorHTML}
    ${STATE.players.length<2? emptyState('users','Il faut au moins 2 joueurs pour comparer') : ''}`;
  }
  const fsA=playerFullStats(a.id), fsB=playerFullStats(b.id);
  const fA=playerForm(a.id), fB=playerForm(b.id);
  const h2hA=headToHeadStats(a.id).find(h=>h.opponentId===b.id);
  const together=teammateStats(a.id).find(m=>m.mateId===b.id);
  return `
  ${pageHeader('Comparateur',`${esc(a.name)} contre ${esc(b.name)}`)}
  ${selectorHTML}
  <div class="cmp-head">
    <div class="cmp-head-side a" onclick="navigate('player/${a.id}')" style="cursor:pointer;">${avatarHTML(a,110)}<div class="cmp-name">${esc(a.name)}</div>${formChipsHTML(fA.last5)}</div>
    <div class="cmp-vs-badge cmp-vs-big">VS</div>
    <div class="cmp-head-side b" onclick="navigate('player/${b.id}')" style="cursor:pointer;">${avatarHTML(b,110)}<div class="cmp-name">${esc(b.name)}</div>${formChipsHTML(fB.last5)}</div>
  </div>
  <div class="grid grid-2">
    <div>
      ${sectionTitle('chart','Totaux')}
      <div class="card">
        ${compareBar('Matchs joués', fsA.matches, fsB.matches)}
        ${compareBar('Buts', fsA.goals, fsB.goals)}
        ${compareBar('Passes décisives', fsA.assists, fsB.assists)}
        ${compareBar('G+A', fsA.ga, fsB.ga)}
        ${compareBar('Victoires', fsA.wins, fsB.wins)}
      </div>
    </div>
    <div>
      ${sectionTitle('trend','Moyennes')}
      <div class="card">
        ${compareBar('Buts / match', fsA.avgGoals, fsB.avgGoals, 2)}
        ${compareBar('G+A / match', fsA.avgGA, fsB.avgGA, 2)}
        ${compareBar('% victoires', fsA.winPct||0, fsB.winPct||0, 0, '%')}
        ${compareBar('Diff. buts / match', fA.avgPlusMinus||0, fB.avgPlusMinus||0, 1)}
      </div>
    </div>
  </div>
  ${sectionTitle('swords','Face à face et ensemble')}
  <div class="grid grid-2">
    <div class="card">${h2hA? `<div class="card-title">${ic('swords')}Adversaires · ${plural(h2hA.matches,'match','matchs')}</div>
      ${compareBar('Victoires face à face', h2hA.wins, h2hA.losses)}
      <div class="hint">${h2hA.draws? plural(h2hA.draws,'match nul','matchs nuls')+'.' : ''}</div>`
      : `<div class="page-sub">Jamais dans des équipes opposées.</div>`}</div>
    <div class="card">${together? `<div class="card-title">${ic('heart')}Coéquipiers · ${plural(together.matches,'match','matchs')}</div>
      <div class="leader"><div class="leader-val" style="margin-left:0;">${together.winPct}<small>% de victoires</small></div><div class="page-sub" style="margin-left:auto;">${together.wins}V ${together.draws}N ${together.losses}D</div></div>`
      : `<div class="page-sub">Jamais dans la même équipe.</div>`}</div>
  </div>
  `;
}
function launchCompare(auto){
  const a=document.getElementById('cmpSelectA').value;
  const b=document.getElementById('cmpSelectB').value;
  if(!a||!b){ if(!auto) toast('Choisis deux joueurs','error'); return; }
  if(a===b){ toast('Choisis deux joueurs différents','error'); return; }
  navigate('compare/'+a+'/'+b);
}

/* ============================================================
   RECORDS
   ============================================================ */
function viewRecords(){
  const rec=computeRecords();
  const unitFor=(value,one,many)=> value>1? (many||one+'s') : one;
  function row(icon,label,record,one,many,colorKey){
    if(!record || !record.holders.length) return `<div class="record-row"><div class="record-label">${recordIcon(icon,colorKey)}${label}</div><div class="page-sub">Aucune donnée</div></div>`;
    return `<div class="record-row">
      <div class="record-label">${recordIcon(icon,colorKey)}${label}</div>
      <div class="record-right">
        <div class="record-holders">${record.holders.map(h=>`<div class="record-holder" onclick="navigate('player/${h.player.id}')">
          ${avatarHTML(h.player,34)}<div class="rh-info"><div class="rh-name">${esc(h.player.name)}</div>${h.five? `<div class="rh-five">${fiveTitle(h.five.id)}</div>` : ''}</div>
        </div>`).join('')}</div>
        <div class="record-val">${record.value}<span class="record-unit">${unitFor(record.value,one,many)}</span></div>
      </div>
    </div>`;
  }
  return `
  ${pageHeader('Records','Calculés sur tous les matchs · les égalités sont affichées')}
  ${sectionTitle('pitch','Sur un match')}
  <div class="card records-card">
    ${row('ball','Plus de buts', rec.mostGoalsInFive,'but','buts','lime')}
    ${row('target','Plus de passes décisives', rec.mostAssistsInFive,'passe','passes','blue')}
    ${row('star','Meilleur G+A', rec.mostGAInFive,'G+A','G+A','purple')}
    ${row('zap','But le plus rapide', rec.fastestGoal,'minute','minutes','lime')}
    ${row('clock','But le plus tardif', rec.latestGoal,'minute','minutes','orange')}
  </div>
  ${sectionTitle('history','Sur la durée')}
  <div class="card records-card">
    ${row('ball','Total de buts', rec.mostTotalGoals,'but','buts','lime')}
    ${row('target','Total de passes', rec.mostTotalAssists,'passe','passes','blue')}
    ${row('star','Total G+A', rec.mostTotalGA,'G+A','G+A','purple')}
    ${row('pitch','Matchs joués', rec.mostFivesPlayed,'match','matchs','gold')}
  </div>
  ${sectionTitle('flame','Séries')}
  <div class="card records-card">
    ${row('check','Victoires d\'affilée', rec.longestWinStreak,'match','matchs','green')}
    ${row('shield','Matchs sans défaite', rec.longestUnbeaten,'match','matchs','blue')}
    ${row('ball','Matchs de suite avec un but', rec.longestGoalStreak,'match','matchs','lime')}
    ${row('star','Matchs de suite décisif (G+A)', rec.longestGAStreak,'match','matchs','purple')}
  </div>
  `;
}

/* ============================================================
   ADMIN
   ============================================================ */
let adminTab='five';
function viewAdmin(){
  if(!isAdmin()){
    return `
    ${pageHeader('Données','Réservé à l\'administrateur')}
    <div class="card" style="text-align:center;padding:44px 20px;">
      <div class="empty-state" style="padding:0 0 16px;"><div class="e-icon">${ic('lock')}</div><div class="e-title">Connexion requise</div><div class="e-sub">Seul l'administrateur peut ajouter, modifier ou supprimer des données.</div></div>
      <button class="btn btn-primary" onclick="openLoginModal()">${ic('login')}Se connecter</button>
    </div>`;
  }
  return `
  ${pageHeader('Données','Ajout, modification et suppression',`<a href="https://github.com/marroqui932/lefiveyyy" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${ic('github')}Code sur GitHub</a>`)}
  <div class="notice">${ic('cloud')}<div>Les données sont stockées en ligne sur <b>Supabase</b> et visibles par tous les visiteurs. Seul ton compte connecté peut les modifier.</div></div>
  <div class="tabs">
    <div class="tab ${adminTab==='five'?'active':''}" onclick="adminTab='five';render();">${ic('pitch')}Matchs</div>
    <div class="tab ${adminTab==='players'?'active':''}" onclick="adminTab='players';render();">${ic('users')}Joueurs</div>
    <div class="tab ${adminTab==='sponsors'?'active':''}" onclick="adminTab='sponsors';render();">${ic('star')}Sponsors</div>
    <div class="tab ${adminTab==='backup'?'active':''}" onclick="adminTab='backup';render();">${ic('save')}Sauvegarde</div>
  </div>
  ${adminTab==='five'? adminFiveTab() : adminTab==='players'? adminPlayersTab() : adminTab==='sponsors'? adminSponsorsTab() : adminBackupTab()}
  `;
}
function adminFiveTab(){
  const list=fivesSorted().reverse();
  return `
  <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openFiveForm()">${ic('plus')}Ajouter un five</button>
  ${list.map(f=>{
    const score=fiveScore(f.id);
    const goals=goalsForFive(f.id).length;
    return `<div class="admin-item">
      <div class="info"><b>${fiveTitle(f.id)} · ${fmtDateShort(f.date)}</b><div>${esc(f.location||'–')} · ${isFutureFive(f)? 'à venir' : `${score.a}–${score.b} · ${plural(goals,'but')}`}</div></div>
      <div class="admin-actions">
        <button class="btn btn-sm btn-ghost btn-icon" title="Voir" onclick="navigate('five/${f.id}')">${ic('eye')}</button>
        <button class="btn btn-sm btn-ghost btn-icon" title="Modifier" onclick="openFiveForm('${f.id}')">${ic('edit')}</button>
        <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteFive('${f.id}')">${ic('trash')}</button>
      </div>
    </div>`;
  }).join('') || emptyState('pitch','Aucun match')}
  `;
}
function adminPlayersTab(){
  const list=[...STATE.players].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  return `
  <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openPlayerForm()">${ic('plus')}Ajouter un joueur</button>
  ${list.map(p=>{
    const fs=playerFullStats(p.id);
    return `<div class="admin-item">
      ${avatarHTML(p,40)}
      <div class="info"><b>${esc(p.name)}</b><div>${plural(fs.matches,'match','matchs')} · ${plural(fs.goals,'but')} · ${plural(fs.assists,'passe')}</div></div>
      <div class="admin-actions">
        <button class="btn btn-sm btn-ghost btn-icon" title="Voir" onclick="navigate('player/${p.id}')">${ic('eye')}</button>
        <button class="btn btn-sm btn-ghost btn-icon" title="Modifier" onclick="openPlayerForm('${p.id}')">${ic('edit')}</button>
        <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deletePlayer('${p.id}')">${ic('trash')}</button>
      </div>
    </div>`;
  }).join('') || emptyState('users','Aucun joueur')}
  `;
}
function adminBackupTab(){
  const videosWithFile=STATE.goals.filter(g=>g.videoUrl);
  const totalVideoSize=videosWithFile.reduce((s,g)=>s+(g.videoSize||0),0);
  const quotaBytes=1024*1024*1024; // 1 Go, quota gratuit Supabase Storage
  const pct=Math.min(100, Math.round((totalVideoSize/quotaBytes)*100));
  const photoBytes=STATE.players.reduce((s,p)=>s+(p.photo?p.photo.length:0),0);
  return `
  <div class="grid grid-2" style="margin-bottom:14px;">
    <div class="card">
      <div class="card-title">${ic('video')}Stockage vidéo (Supabase)</div>
      <div class="kpi-val" style="font-size:28px;">${fmtFileSize(totalVideoSize)} <span class="page-sub" style="font-family:var(--font);font-size:13px;">/ 1 Go</span></div>
      <div style="height:6px;border-radius:4px;background:var(--surface-3);margin:10px 0 6px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--primary);"></div></div>
      <div class="page-sub">${plural(videosWithFile.length,'vidéo')} en ligne (${pct}%).</div>
    </div>
    <div class="card">
      <div class="card-title">${ic('image')}Photos des joueurs</div>
      <div class="kpi-val" style="font-size:28px;">${fmtFileSize(photoBytes)}</div>
      <div class="page-sub" style="margin:6px 0 12px;">Téléchargées à chaque visite. Les réduire (${PHOTO_MAX_PX} px max) accélère le site.</div>
      <button class="btn btn-primary btn-sm" id="optimizePhotosBtn" onclick="optimizeAllPhotos()">${ic('compress')}Réduire les photos existantes</button>
    </div>
  </div>
  <div class="grid grid-2">
    <div class="card">
      <div class="card-title">${ic('download')}Exporter les données</div>
      <p class="page-sub">Génère un fichier JSON (joueurs, matchs, buts). Les vidéos restent sur Supabase ; seuls leurs liens sont inclus.</p>
      <button class="btn btn-primary btn-block" onclick="exportData()">${ic('download')}Exporter (.json)</button>
    </div>
    <div class="card">
      <div class="card-title">${ic('upload')}Importer les données</div>
      <p class="page-sub">Restaure une sauvegarde JSON. <b style="color:#f87171;">Remplace toutes les données actuelles, pour tous les visiteurs.</b></p>
      <input type="file" id="importFileInput" accept="application/json" class="input" style="margin-bottom:10px;">
      <button class="btn btn-danger btn-block" onclick="importData()">${ic('upload')}Importer et remplacer</button>
    </div>
  </div>
  <div class="notice">${ic('video')}<div><b>Vidéos :</b> chaque vidéo de but est envoyée sur Supabase Storage (1 Go gratuit, 50 Mo max par fichier). Le bouton <b>Compresser</b> apparaît pour les vidéos de plus de 15 Mo lors de l'ajout d'un but.</div></div>
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
