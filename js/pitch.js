'use strict';
/* ============================================================
   MINI TERRAIN - tracé réutilisable + points (buts / passes)
   Convention : coordonnées normalisées 0..1 (x=largeur, y=longueur,
   origine en haut à gauche), terrain dessiné À LA VERTICALE (comme
   vu depuis le bord du five), converties en un viewBox fixe.
   Pour l'entrée du ballon dans le but, on ne suit QUE la largeur
   (goalX, 0..1 sur la largeur de la petite surface) : la hauteur
   n'est pas suivie, le trait plein du tir va directement jusqu'à la
   ligne de but à la largeur choisie.
   ============================================================ */
const PITCH_VB_W=160, PITCH_VB_H=280;
const GOAL_INSET_W=28; /* même largeur que le petit rectangle (surface de but) du terrain */
const GOAL_INSET_X0=(PITCH_VB_W-GOAL_INSET_W)/2;
function goalEntryXY(goalX,insetSide){
  return { x:GOAL_INSET_X0+goalX*GOAL_INSET_W, y: insetSide==='top'? 2 : PITCH_VB_H-2 };
}
function pitchFieldMarkingsSVG(){
  const w=PITCH_VB_W, h=PITCH_VB_H;
  return `<rect x="2" y="2" width="${w-4}" height="${h-4}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <line x1="2" y1="${h/2}" x2="${w-2}" y2="${h/2}" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <circle cx="${w/2}" cy="${h/2}" r="22" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <circle cx="${w/2}" cy="${h/2}" r="2" fill="rgba(255,255,255,.55)"/>
    <rect x="${w/2-34}" y="2" width="68" height="36" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <rect x="${w/2-34}" y="${h-38}" width="68" height="36" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <rect x="${w/2-14}" y="2" width="28" height="14" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.3"/>
    <rect x="${w/2-14}" y="${h-16}" width="28" height="14" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.3"/>`;
}
function pitchDotSVG(x,y,color,r,onclick,title){
  if(x===null||x===undefined||y===null||y===undefined) return '';
  const cx=(x*PITCH_VB_W).toFixed(1), cy=(y*PITCH_VB_H).toFixed(1);
  return `<circle cx="${cx}" cy="${cy}" r="${r||6.5}" fill="${color}" stroke="#fff" stroke-width="1.3" ${onclick?`style="cursor:pointer;" onclick="${onclick}"`:''}>${title?`<title>${esc(title)}</title>`:''}</circle>`;
}
// Mini-widget combiné pour UNE action (un but) : tir, entrée dans la cage (largeur
// seulement) et position du passeur, le tout sur le MÊME terrain, comme sur les outils pro
// (une seule flèche passeur -> tir, pas de point de réception séparé).
function goalActionLinesSVG(row,insetSide){
  const hasShot=(row.shotX!==null&&row.shotX!==undefined);
  const hasGoal=(row.goalX!==null&&row.goalX!==undefined);
  const hasPasser=(row.passerX!==null&&row.passerX!==undefined);
  let out='';
  let sx,sy;
  if(hasShot){ sx=row.shotX*PITCH_VB_W; sy=row.shotY*PITCH_VB_H; }
  if(hasPasser && hasShot){
    const px=row.passerX*PITCH_VB_W, py=row.passerY*PITCH_VB_H;
    out+=`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="#8b5cf6" stroke-width="1.6" stroke-dasharray="4,3" opacity=".85"/>`;
  }
  if(hasGoal && hasShot){
    const gd=goalEntryXY(row.goalX,insetSide);
    out+=`<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${gd.x.toFixed(1)}" y2="${gd.y.toFixed(1)}" stroke="#f97316" stroke-width="1.6" opacity=".9"/>`;
  }
  if(hasPasser) out+=pitchDotSVG(row.passerX,row.passerY,'#3b82f6',5);
  if(hasShot) out+=`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4.5" fill="#f97316" stroke="#fff" stroke-width="1.2"/>`;
  /* pas de rond à l'arrivée dans la cage : la cage est trop petite, le trait seul suffit */
  return out;
}
function goalActionPickerBlock(row,insetSide){
  const hasAssister = !row.isOwnGoal && !!row.assisterId;
  const hasShot=(row.shotX!==null&&row.shotX!==undefined);
  const hasGoal=(row.goalX!==null&&row.goalX!==undefined);
  const hasPasser=(row.passerX!==null&&row.passerX!==undefined);
  return `<div style="flex:1;min-width:180px;max-width:260px;">
    <div class="hint" style="margin:0 0 4px;font-weight:700;color:var(--text-dim);text-transform:uppercase;font-size:10.5px;">Action du but (cage en ${insetSide==='top'?'haut':'bas'})</div>
    <div style="border-radius:8px;overflow:hidden;border:1px solid var(--border);cursor:zoom-in;" onclick="openPitchZoom('${row.rowId}')">
      <svg viewBox="0 0 ${PITCH_VB_W} ${PITCH_VB_H}" width="100%" height="210" style="display:block;background:#173b2b;pointer-events:none;">
        ${pitchFieldMarkingsSVG()}
        ${goalActionLinesSVG(row,insetSide)}
      </svg>
    </div>
    <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
      <button type="button" class="btn btn-sm btn-ghost" style="padding:2px 8px;font-size:11px;" onclick="openPitchZoom('${row.rowId}')">${ic('fullscreen',13)} Agrandir</button>
      ${hasShot? `<button type="button" class="btn btn-sm btn-ghost" style="padding:2px 8px;font-size:11px;" onclick="clearGoalPoint('${row.rowId}','shot')">${ic('x',13)} Tir</button>` : ''}
      ${hasGoal? `<button type="button" class="btn btn-sm btn-ghost" style="padding:2px 8px;font-size:11px;" onclick="clearGoalPoint('${row.rowId}','goal')">${ic('x',13)} Entrée</button>` : ''}
      ${(hasAssister&&hasPasser)? `<button type="button" class="btn btn-sm btn-ghost" style="padding:2px 8px;font-size:11px;" onclick="clearGoalPoint('${row.rowId}','passer')">${ic('x',13)} Passeur</button>` : ''}
    </div>
  </div>`;
}
/* ---------- Agrandissement plein écran du mini-terrain (précision de clic) ---------- */
let _pitchZoom=null; // {rowId}
function openPitchZoom(rowId){
  _pitchZoom={rowId};
  renderPitchZoomOverlay();
}
function closePitchZoom(){
  _pitchZoom=null;
  const el=document.getElementById('pitchZoomOverlay');
  if(el) el.remove();
  syncGoalSelects();
}
function pitchZoomContentHTML(){
  const row=_fiveFormGoalRows.find(r=>r.rowId===_pitchZoom.rowId);
  if(!row) return '';
  const insetSide=goalInsetSideForRow(row);
  const hasAssister = !row.isOwnGoal && !!row.assisterId;
  let mode=row.pickMode||'shot';
  if(mode==='passer' && !hasAssister) mode='shot';
  const stripY0 = insetSide==='top'? 2 : PITCH_VB_H-16;
  const pitchRect = mode==='goal'
    ? `<rect x="${GOAL_INSET_X0}" y="${stripY0}" width="${GOAL_INSET_W}" height="14" fill="rgba(239,68,68,.28)" style="cursor:crosshair;" onclick="handlePitchZoomClick(event,'goal')"/>`
    : `<rect x="0" y="0" width="${PITCH_VB_W}" height="${PITCH_VB_H}" fill="transparent" style="cursor:crosshair;" onclick="handlePitchZoomClick(event,'${mode}')"/>`;
  const svgInner=`${pitchFieldMarkingsSVG()}${goalActionLinesSVG(row,insetSide)}${pitchRect}`;
  const toggleHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
    <button type="button" class="btn btn-sm ${mode==='shot'?'btn-primary':'btn-ghost'}" onclick="setPickMode('${row.rowId}','shot')">${ic('pin',14)} Tir</button>
    <button type="button" class="btn btn-sm ${mode==='goal'?'btn-primary':'btn-ghost'}" onclick="setPickMode('${row.rowId}','goal')">${ic('goalNet',14)} Entrée (cage en ${insetSide==='top'?'haut':'bas'})</button>
    ${hasAssister? `<button type="button" class="btn btn-sm ${mode==='passer'?'btn-primary':'btn-ghost'}" onclick="setPickMode('${row.rowId}','passer')">${ic('target',14)} Passeur</button>` : ''}
  </div>`;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;max-width:460px;margin:0 auto;">
    <div style="font-weight:800;font-size:15px;color:var(--text);text-align:center;">Action du but</div>
    ${toggleHTML}
    <div class="hint" style="text-align:center;margin:-8px 0 0;">${mode==='goal'? "Clique dans la cage à la largeur voulue (la hauteur n'est pas suivie)" : "Clique précisément à l'endroit voulu"}</div>
    <div style="border-radius:14px;overflow:hidden;border:2px solid var(--border);width:100%;">
      <svg viewBox="0 0 ${PITCH_VB_W} ${PITCH_VB_H}" width="100%" style="display:block;background:#173b2b;aspect-ratio:${PITCH_VB_W}/${PITCH_VB_H};">${svgInner}</svg>
    </div>
    <button type="button" class="btn btn-primary btn-block" onclick="closePitchZoom()">${ic('check')} Valider</button>
  </div>`;
}
function setPickMode(rowId,mode){
  const row=_fiveFormGoalRows.find(r=>r.rowId===rowId);
  if(!row) return;
  row.pickMode=mode;
  if(_pitchZoom && _pitchZoom.rowId===rowId) renderPitchZoomOverlay();
}
function renderPitchZoomOverlay(){
  let el=document.getElementById('pitchZoomOverlay');
  if(!el){
    el=document.createElement('div');
    el.id='pitchZoomOverlay';
    el.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(4,7,14,.88);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px 16px;overflow-y:auto;';
    el.addEventListener('click',function(ev){ if(ev.target===el) closePitchZoom(); });
    document.body.appendChild(el);
  }
  el.innerHTML=pitchZoomContentHTML();
}
function handlePitchZoomClick(ev,field){
  if(!_pitchZoom) return;
  const rect=ev.currentTarget.getBoundingClientRect();
  const x=Math.min(1,Math.max(0,(ev.clientX-rect.left)/rect.width));
  const y=Math.min(1,Math.max(0,(ev.clientY-rect.top)/rect.height));
  updateGoalRow(_pitchZoom.rowId, field+'X', x);
  updateGoalRow(_pitchZoom.rowId, field+'Y', y);
  renderPitchZoomOverlay();
}
function handlePitchPickClick(ev,rowId,field){
  const rect=ev.currentTarget.getBoundingClientRect();
  const x=Math.min(1,Math.max(0,(ev.clientX-rect.left)/rect.width));
  const y=Math.min(1,Math.max(0,(ev.clientY-rect.top)/rect.height));
  updateGoalRow(rowId,field+'X',x);
  updateGoalRow(rowId,field+'Y',y);
  syncGoalSelects();
}
function handleGoalFrameClick(ev,rowId){
  const rect=ev.currentTarget.getBoundingClientRect();
  const x=Math.min(1,Math.max(0,(ev.clientX-rect.left)/rect.width));
  const y=Math.min(1,Math.max(0,(ev.clientY-rect.top)/rect.height));
  updateGoalRow(rowId,'goalX',x);
  updateGoalRow(rowId,'goalY',y);
  syncGoalSelects();
}
function clearGoalPoint(rowId,field){
  updateGoalRow(rowId,field+'X',null);
  updateGoalRow(rowId,field+'Y',null);
  syncGoalSelects();
}
// Carte combinée "buts + passes décisives" en lecture seule (profil joueur / toutes les actions
// confondues) : buts en orange (avec trait plein vers l'entrée dans la cage si connue), passes
// décisives en bleu (avec trait pointillé pro-style vers le point de tir du but assisté).
function actionsMapHTML(goalPts,assistPts,height){
  if(!goalPts.length && !assistPts.length) return emptyState('map','Aucune position enregistrée pour ces actions');
  let marks='';
  assistPts.forEach(p=>{
    const x1=(p.x*PITCH_VB_W).toFixed(1), y1=(p.y*PITCH_VB_H).toFixed(1);
    if(p.shotX!==null && p.shotX!==undefined){
      marks+=`<line x1="${x1}" y1="${y1}" x2="${(p.shotX*PITCH_VB_W).toFixed(1)}" y2="${(p.shotY*PITCH_VB_H).toFixed(1)}" stroke="#a78bfa" stroke-width="1.4" stroke-dasharray="4,3" opacity=".7"/>`;
    }
    marks+=`<circle cx="${x1}" cy="${y1}" r="5" fill="#a78bfa" stroke="#fff" stroke-width="1.2" style="cursor:pointer;" onclick="navigate('five/${p.fiveId}')">${p.label?`<title>${esc(p.label)}</title>`:''}</circle>`;
  });
  goalPts.forEach(p=>{
    const x1=(p.x*PITCH_VB_W).toFixed(1), y1=(p.y*PITCH_VB_H).toFixed(1);
    if(p.goalX!==null && p.goalX!==undefined){
      const gd=goalEntryXY(p.goalX,'top'); // toujours en haut : normalisé comme si on attaquait en haut
      marks+=`<line x1="${x1}" y1="${y1}" x2="${gd.x.toFixed(1)}" y2="${gd.y.toFixed(1)}" stroke="#b4f461" stroke-width="1.4" opacity=".75"/>`;
    }
    marks+=`<circle cx="${x1}" cy="${y1}" r="5" fill="#b4f461" stroke="#fff" stroke-width="1.2" style="cursor:pointer;" onclick="navigate('five/${p.fiveId}')">${p.label?`<title>${esc(p.label)}</title>`:''}</circle>`;
  });
  return `<div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border-soft);background:var(--surface);">
    <svg viewBox="0 0 ${PITCH_VB_W} ${PITCH_VB_H}" width="100%" height="${height||380}" style="display:block;background:#173b2b;">
      ${pitchFieldMarkingsSVG()}
      ${marks}
    </svg>
    <div class="legend" style="padding:10px 14px;">
      <span><i style="background:#b4f461"></i>Buts</span>
      <span><i style="background:#a78bfa"></i>Passes décisives</span>
    </div>
  </div>`;
}
// Carte des actions d'UN joueur (buts + passes décisives), toujours normalisée comme si le
// joueur attaquait vers le haut : on inverse les DEUX axes (x et y) quand il a attaqué en bas,
// car passer d'un sens de jeu à l'autre est une rotation à 180°, pas un simple effet miroir.
function playerActionsMapHTML(playerId,myGoals,myAssistEvents){
  const goalPts=myGoals.filter(m=>m.goal.shotX!==null&&m.goal.shotX!==undefined).map(m=>{
    const flip=playerAttackEndInFive(m.five,playerId)==='bottom';
    const hasGoalEntry=(m.goal.goalX!==null&&m.goal.goalX!==undefined);
    return {
      x: flip? 1-m.goal.shotX : m.goal.shotX,
      y: flip? 1-m.goal.shotY : m.goal.shotY,
      goalX: hasGoalEntry? (flip? 1-m.goal.goalX : m.goal.goalX) : null,
      fiveId: m.five.id,
      label: 'FIVE #'+pad2(fiveNumber(m.five.id))+' · '+fmtDateShort(m.five.date)
    };
  });
  const assistPts=myAssistEvents.filter(m=>m.goal.passerX!==null&&m.goal.passerX!==undefined).map(m=>{
    const flip=playerAttackEndInFive(m.five,playerId)==='bottom';
    const hasShot=(m.goal.shotX!==null&&m.goal.shotX!==undefined);
    return {
      x: flip? 1-m.goal.passerX : m.goal.passerX,
      y: flip? 1-m.goal.passerY : m.goal.passerY,
      shotX: hasShot? (flip? 1-m.goal.shotX : m.goal.shotX) : null,
      shotY: hasShot? (flip? 1-m.goal.shotY : m.goal.shotY) : null,
      fiveId: m.five.id,
      label: 'FIVE #'+pad2(fiveNumber(m.five.id))+' · '+fmtDateShort(m.five.date)
    };
  });
  return actionsMapHTML(goalPts,assistPts,380);
}
// Carte des actions de TOUS les Five combinés (menu principal), même principe : chaque but/passe
// est normalisé comme si l'équipe qui marque avait toujours attaqué vers le haut.
function allFivesActionsMapHTML(){
  const goalPts=[], assistPts=[];
  STATE.goals.forEach(g=>{
    if(g.isOwnGoal) return;
    if(g.shotX===null||g.shotX===undefined) return;
    const five=getFive(g.fiveId);
    if(!five) return;
    const part=STATE.participations.find(x=>x.fiveId===five.id && x.playerId===g.scorerId);
    const team=part? part.teamId : null;
    if(!team) return;
    const aSide=five.attackingEndA||'top';
    const bSide=aSide==='top'?'bottom':'top';
    const attackEnd= team==='A'? aSide : bSide;
    const flip=attackEnd==='bottom';
    const scorer=getPlayer(g.scorerId);
    const hasGoalEntry=(g.goalX!==null&&g.goalX!==undefined);
    goalPts.push({
      x: flip? 1-g.shotX : g.shotX,
      y: flip? 1-g.shotY : g.shotY,
      goalX: hasGoalEntry? (flip? 1-g.goalX : g.goalX) : null,
      fiveId: five.id,
      label: (scorer? playerName(scorer)+' · ':'')+'FIVE #'+pad2(fiveNumber(five.id))
    });
    if(g.passerX!==null && g.passerX!==undefined){
      const passer=g.assisterId? getPlayer(g.assisterId) : null;
      assistPts.push({
        x: flip? 1-g.passerX : g.passerX,
        y: flip? 1-g.passerY : g.passerY,
        shotX: flip? 1-g.shotX : g.shotX,
        shotY: flip? 1-g.shotY : g.shotY,
        fiveId: five.id,
        label: (passer? playerName(passer)+' · ':'')+'FIVE #'+pad2(fiveNumber(five.id))
      });
    }
  });
  return actionsMapHTML(goalPts,assistPts,420);
}
// Carte "toutes les actions du Five" : position de tir de chaque but, colorée par équipe,
// avec un trait plein vers la largeur d'entrée dans la cage (hauteur non suivie, la cage
// visée est en haut ou en bas selon l'équipe du buteur / le sens de jeu / un éventuel CSC),
// et un trait pointillé pour passeur -> réception.
function matchActionsMapHTML(fiveId){
  const goalsTL=fiveGoalsWithScore(fiveId);
  const withPos=goalsTL.filter(g=>g.shotX!==null&&g.shotX!==undefined&&g.shotY!==null&&g.shotY!==undefined);
  if(!withPos.length) return emptyState('map','Aucune position de tir enregistrée pour ce match');
  const five=getFive(fiveId);
  const aSide=(five&&five.attackingEndA)||'top';
  const bSide=aSide==='top'?'bottom':'top';
  const topTeam = aSide==='top'?'A':'B';
  const bottomTeam = aSide==='top'?'B':'A';
  const TEAM_A_COLOR=TEAM_COLORS.A, TEAM_B_COLOR=TEAM_COLORS.B;
  const topColor = topTeam==='A'? TEAM_A_COLOR : TEAM_B_COLOR;
  const bottomColor = bottomTeam==='A'? TEAM_A_COLOR : TEAM_B_COLOR;
  const LABEL_H=16;
  const pitchY0=LABEL_H;
  const totalH=LABEL_H+PITCH_VB_H+LABEL_H;
  let marks='';
  withPos.forEach(g=>{
    const color = g.team==='A' ? TEAM_A_COLOR : g.team==='B' ? TEAM_B_COLOR : '#93a0b8';
    const scorer=getPlayer(g.scorerId);
    const sx=g.shotX*PITCH_VB_W, sy=pitchY0+g.shotY*PITCH_VB_H;
    const hasAssistPos=(g.passerX!==null&&g.passerX!==undefined);
    if(hasAssistPos){
      // Style "pro" : une seule flèche passeur -> tir (pas de point de réception séparé).
      const px=g.passerX*PITCH_VB_W, py=pitchY0+g.passerY*PITCH_VB_H;
      marks+=`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="3,3" opacity=".7"/>`;
      marks+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${color}" opacity=".55"/>`;
    }
    if(g.goalX!==null && g.goalX!==undefined && (g.team==='A'||g.team==='B')){
      const teamSide = g.team==='A'? aSide : bSide;
      const entrySide = g.isOwnGoal? (teamSide==='top'?'bottom':'top') : teamSide;
      const gd=goalEntryXY(g.goalX,entrySide);
      const gx=gd.x, gy=pitchY0+gd.y;
      marks+=`<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${gx.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="${color}" stroke-width="1.3" opacity=".65"/>`;
      /* pas de rond à l'arrivée dans la cage : trop petit pour rester lisible */
    }
    marks+=`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="5" fill="${color}" stroke="#fff" stroke-width="1.2" style="cursor:pointer;" onclick="navigate('player/${g.scorerId}')"><title>${esc(playerName(scorer))} - ${g.isOwnGoal?'CSC':''} ${g.after.a}-${g.after.b}</title></circle>`;
  });
  return `<div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border-soft);background:var(--surface);">
    <svg viewBox="0 0 ${PITCH_VB_W} ${totalH}" width="100%" height="460" style="display:block;background:#173b2b;">
      <text x="${PITCH_VB_W/2}" y="${LABEL_H-3}" text-anchor="middle" fill="${topColor}" font-size="9" font-weight="800">▲ ÉQUIPE ${topTeam}</text>
      <g transform="translate(0,${pitchY0})">${pitchFieldMarkingsSVG()}</g>
      <text x="${PITCH_VB_W/2}" y="${totalH-4}" text-anchor="middle" fill="${bottomColor}" font-size="9" font-weight="800">▼ ÉQUIPE ${bottomTeam}</text>
      ${marks}
    </svg>
    <div class="legend" style="padding:10px 14px;">
      <span><i style="background:${topColor}"></i>Équipe ${topTeam} - marque en haut</span>
      <span><i style="background:${bottomColor}"></i>Équipe ${bottomTeam} - marque en bas</span>
      <span style="color:var(--text-faint);">Trait plein = tir → entrée (largeur) · pointillé = passeur → tir</span>
    </div>
  </div>`;
}

