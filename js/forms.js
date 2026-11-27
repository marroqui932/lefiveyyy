'use strict';
/* ============================================================
   MODALS / FORMULAIRES
   ============================================================ */
function openModal(html){
  document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop" id="modalBackdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal(){
  document.getElementById('modalRoot').innerHTML='';
  const zoom=document.getElementById('pitchZoomOverlay');
  if(zoom) zoom.remove();
  _pitchZoom=null;
}

/* ---------- Player form ---------- */
function openPlayerForm(playerId){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const p=playerId? getPlayer(playerId) : null;
  _playerFormCountry = p? (p.country||null) : null;
  openModal(`
    <h2>${p?"Modifier le joueur":"Ajouter un joueur"}<button class="modal-close" onclick="closeModal()" aria-label="Fermer">${ic("x")}</button></h2>
    <form id="playerForm" onsubmit="return submitPlayerForm(event,'${playerId||''}')">
      <div class="form-row"><label>Nom du joueur *</label><input class="input" name="name" required value="${p?esc(p.name):''}"></div>
      <div class="form-row"><label>Photo</label><input class="input" type="file" accept="image/*" name="photoFile">
        ${p&&p.photo? `<div style="margin-top:8px;">${avatarHTML(p,60)} <label style="display:inline-flex;align-items:center;gap:6px;font-weight:500;text-transform:none;font-size:12.5px;"><input type="checkbox" name="removePhoto"> Supprimer la photo actuelle</label></div>`:''}
      </div>
      <div class="form-row"><label>Nationalité</label><div id="countryPickerContainer">${countryPickerHTML()}</div></div>
      <div class="form-row"><label>Notes / infos complémentaires</label><textarea class="input" name="notes" rows="3">${p&&p.notes?esc(p.notes):''}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">${p?'Enregistrer':'Ajouter'}</button>
      </div>
    </form>
  `);
}
async function submitPlayerForm(ev,playerId){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  const name=(fd.get('name')||'').trim();
  if(!name){ toast('Le nom est obligatoire','error'); return false; }
  const existing=playerId? getPlayer(playerId) : null;
  const p={
    id: playerId || uid('pl'),
    name,
    country: _playerFormCountry || null,
    notes: (fd.get('notes')||'').trim(),
    photo: existing? existing.photo : null,
    createdAt: existing? existing.createdAt : Date.now()
  };
  if(fd.get('removePhoto')) p.photo=null;
  const file=fd.get('photoFile');
  if(file && file.size>0){
    try{ p.photo=await resizePhotoDataURL(await fileToDataURL(file)); }catch(e){ console.error(e); toast('Photo illisible','error'); }
  }
  await PlayersRepo.save(p);
  await loadAll();
  closeModal();
  toast(existing? 'Joueur mis à jour':'Joueur ajouté','success');
  render();
  return false;
}
async function deletePlayer(playerId){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const p=getPlayer(playerId);
  if(!p) return;
  const nb=playerFiveIds(playerId).length;
  const msg = nb>0
    ? `Supprimer "${p.name}" ? Il participe à ${nb} Five. Ses buts/passes resteront affichés comme "Joueur supprimé" dans l'historique des matchs.`
    : `Supprimer "${p.name}" ?`;
  if(!confirm(msg)) return;
  await PlayersRepo.remove(playerId);
  // on retire aussi ses participations (mais on garde les buts pour ne pas casser l'historique du match)
  const parts=STATE.participations.filter(x=>x.playerId===playerId);
  for(const part of parts) await ParticipationsRepo.remove(part.id);
  await loadAll();
  toast('Joueur supprimé','success');
  navigate('players');
}

/* ---------- Five form (avec équipes + buts) ---------- */
let _fiveFormGoalRows=[];
let _fiveFormAttackingEndA='top';
function openFiveForm(fiveId,preset){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const f=fiveId? getFive(fiveId) : null;
  const parts=fiveId? playersInFive(fiveId) : [];
  /* preset = équipes pré-remplies (venant du générateur d'équipes) pour un nouveau Five */
  const teamA=(!fiveId && preset)? (preset.teamA||[]) : parts.filter(p=>p.teamId==='A').map(p=>p.playerId);
  const teamB=(!fiveId && preset)? (preset.teamB||[]) : parts.filter(p=>p.teamId==='B').map(p=>p.playerId);
  const noTeam=parts.filter(p=>!p.teamId).map(p=>p.playerId);
  const goals=fiveId? goalsForFive(fiveId) : [];
  _fiveFormAttackingEndA = f? (f.attackingEndA||'top') : 'top';
  _fiveFormGoalRows = goals.map(g=>({rowId:uid('row'), goalId:g.id, scorerId:g.scorerId, assisterId:g.assisterId, isOwnGoal:!!g.isOwnGoal, existingVideo:videoForGoal(g.id),
    shotX:g.shotX??null, shotY:g.shotY??null, goalX:g.goalX??null, goalY:g.goalY??null,
    passerX:g.passerX??null, passerY:g.passerY??null, minute:g.minute??null, pickMode:'shot'}));
  if(_fiveFormGoalRows.length===0) _fiveFormGoalRows=[];

  const allPlayers=[...STATE.players].sort((a,b)=>a.name.localeCompare(b.name));

  openModal(`
    <h2>${f?"Modifier le five":"Ajouter un five"}<button class="modal-close" onclick="closeModal()" aria-label="Fermer">${ic("x")}</button></h2>
    <form id="fiveForm" onsubmit="return submitFiveForm(event,'${fiveId||''}')">
      <div class="form-2col">
        <div class="form-row"><label>Date *</label><input class="input" type="date" name="date" required value="${f?f.date:''}"></div>
        <div class="form-row"><label>Lieu</label><input class="input" name="location" value="${f?esc(f.location||''):''}" placeholder="Ex: Bobigny"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Heure de début</label><input class="input" type="time" name="timeStart" value="${f?f.timeStart||'':''}"></div>
        <div class="form-row"><label>Heure de fin</label><input class="input" type="time" name="timeEnd" value="${f?f.timeEnd||'':''}"></div>
      </div>

      <div class="form-row"><label>Équipe A</label>
        <div class="check-grid" id="teamACheck">${allPlayers.map(p=>`<label><input type="checkbox" value="${p.id}" ${teamA.includes(p.id)?'checked':''} onchange="syncGoalSelects()">${esc(p.name)}</label>`).join('') || '<span class="page-sub">Ajoute d\'abord des joueurs.</span>'}</div>
      </div>
      <div class="form-row"><label>Équipe B</label>
        <div class="check-grid" id="teamBCheck">${allPlayers.map(p=>`<label><input type="checkbox" value="${p.id}" ${teamB.includes(p.id)?'checked':''} onchange="syncGoalSelects()">${esc(p.name)}</label>`).join('') || ''}</div>
      </div>
      ${noTeam.length? `<div class="hint">${noTeam.length} joueur(s) participant(s) sans équipe assignée (ne coche aucune case pour eux si l'équipe est inconnue).</div>`:''}
      <div class="hint">Un joueur non sélectionné dans une équipe ne participera pas au calcul du score ni au décompte victoire/défaite pour ce Five, sauf s'il est simplement listé comme participant sans équipe (les statistiques individuelles de buts/passes restent, elles, toujours calculées).</div>

      <div class="form-row"><label>Sens du jeu</label>
        <div id="attackingEndToggle">${attackingEndToggleHTML()}</div>
        <div class="hint">Choisis quelle équipe marque en haut / en bas : ça détermine dans quelle cage chaque but du formulaire s'affiche, et l'affichage de la carte des actions du match.</div>
      </div>

      ${sectionTitle("ball","Buts du match")}
      <div id="goalsContainer">${renderGoalRowsHTML()}</div>
      <button type="button" class="btn btn-ghost btn-sm" onclick="addGoalRow()">+ Ajouter un but</button>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">${f?'Enregistrer':'Créer le Five'}</button>
      </div>
    </form>
  `);
}
function currentFiveFormPlayers(){
  const a=[...document.querySelectorAll('#teamACheck input:checked')].map(i=>i.value);
  const b=[...document.querySelectorAll('#teamBCheck input:checked')].map(i=>i.value);
  return [...new Set([...a,...b])];
}
function attackingEndToggleHTML(){
  const side=_fiveFormAttackingEndA||'top';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button type="button" class="btn btn-sm ${side==='top'?'btn-primary':'btn-ghost'}" onclick="setAttackingEndA('top')">Équipe A marque en haut</button>
    <button type="button" class="btn btn-sm ${side==='bottom'?'btn-primary':'btn-ghost'}" onclick="setAttackingEndA('bottom')">Équipe A marque en bas</button>
  </div>`;
}
function setAttackingEndA(side){
  _fiveFormAttackingEndA=side;
  const toggle=document.getElementById('attackingEndToggle');
  if(toggle) toggle.innerHTML=attackingEndToggleHTML();
  syncGoalSelects();
}
// Détermine l'équipe (A/B) d'un joueur directement depuis les cases cochées du formulaire
// (peut différer de ce qui est en base tant que le formulaire n'est pas enregistré).
function scorerTeamInForm(playerId){
  if(!playerId) return null;
  const a=[...document.querySelectorAll('#teamACheck input:checked')].map(i=>i.value);
  const b=[...document.querySelectorAll('#teamBCheck input:checked')].map(i=>i.value);
  if(a.includes(playerId)) return 'A';
  if(b.includes(playerId)) return 'B';
  return null;
}
// Détermine dans quelle cage (haut/bas) le but d'une ligne doit s'afficher, selon l'équipe
// du buteur, le sens de jeu choisi pour ce Five, et en tenant compte des CSC (qui rentrent
// dans la cage défendue par le buteur, donc à l'opposé de son sens d'attaque).
function goalInsetSideForRow(row){
  const scorerTeam=scorerTeamInForm(row.scorerId);
  if(!scorerTeam) return 'top';
  const aSide=_fiveFormAttackingEndA||'top';
  const bSide=aSide==='top'?'bottom':'top';
  const attackEnd= scorerTeam==='A'? aSide : bSide;
  if(row.isOwnGoal) return attackEnd==='top'?'bottom':'top';
  return attackEnd;
}
function fmtFileSize(bytes){
  if(!bytes && bytes!==0) return '';
  if(bytes<1024) return bytes+' o';
  if(bytes<1024*1024) return (bytes/1024).toFixed(0)+' Ko';
  return (bytes/(1024*1024)).toFixed(1)+' Mo';
}
function renderGoalRowsHTML(){
  const playerIds=currentFiveFormPlayers();
  const options=(selected)=>{
    const ids=playerIds.length? playerIds : STATE.players.map(p=>p.id);
    return ids.map(id=>{ const p=getPlayer(id); return `<option value="${id}" ${selected===id?'selected':''}>${p?esc(p.name):'?'}</option>`; }).join('');
  };
  return _fiveFormGoalRows.map((row,idx)=>`
    <div class="goal-row" data-row="${row.rowId}">
      <div class="goal-row-head"><span>BUT #${idx+1}</span><button type="button" class="btn btn-sm btn-danger" onclick="removeGoalRow('${row.rowId}')" aria-label="Supprimer ce but">${ic("trash",14)}</button></div>
      <div class="form-row"><label>Minute du but${row.goalId?'':' *'}</label>
        <input class="input" type="number" min="0" max="120" step="1" inputmode="numeric" placeholder="ex : 12" value="${row.minute===null||row.minute===undefined?'':row.minute}" style="max-width:140px;" oninput="updateGoalMinute('${row.rowId}',this.value)">
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Buteur</label><select class="input" data-field="scorer" onchange="updateGoalRow('${row.rowId}','scorerId',this.value)"><option value="">- Choisir -</option>${options(row.scorerId)}</select></div>
        <div class="form-row"><label>Passeur</label><select class="input" data-field="assister" ${row.isOwnGoal?'disabled':''} onchange="updateGoalRowAssister('${row.rowId}',this.value)"><option value="">Sans passe décisive</option>${options(row.isOwnGoal?'':row.assisterId)}</select></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;font-weight:500;text-transform:none;letter-spacing:0;">
          <input type="checkbox" ${row.isOwnGoal?'checked':''} onchange="toggleOwnGoal('${row.rowId}',this.checked)">
          But contre son camp (compte pour l'équipe adverse, pas de passeur)
        </label>
      </div>
      <div class="form-row"><label>Vidéo du but (optionnel)</label>
        <input class="input" type="file" accept="video/*" onchange="onGoalVideoChange('${row.rowId}',this.files[0])">
        <div id="videoInfo_${row.rowId}">
          ${row.existingVideo? `<div class="hint">Vidéo actuelle : ${esc(row.existingVideo.fileName)} - <a href="#" onclick="event.preventDefault();playVideo('${row.existingVideo.id}')">voir</a> · <a href="#" onclick="event.preventDefault();markRemoveVideo('${row.rowId}')">supprimer</a></div>` : ''}
          ${row.videoFile? `<div class="hint">${esc(row.videoFile.name)} - ${fmtFileSize(row.videoFile.size)}
            ${row.videoFile.size>15*1024*1024 ? ` · <button type="button" class="btn btn-sm btn-ghost" style="padding:2px 8px;" onclick="compressGoalVideo('${row.rowId}')">${ic("compress",13)} Compresser</button>` : ''}
          </div>` : ''}
        </div>
      </div>
      <div class="form-row"><label>Localisation du but (optionnel)</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${goalActionPickerBlock(row,goalInsetSideForRow(row))}
        </div>
      </div>
    </div>
  `).join('') || '<div class="page-sub">Aucun but. Clique sur "+ Ajouter un but".</div>';
}
function toggleOwnGoal(rowId, checked){
  const row=_fiveFormGoalRows.find(r=>r.rowId===rowId);
  if(!row) return;
  row.isOwnGoal = checked;
  if(checked){ row.assisterId = ''; row.passerX=null; row.passerY=null; }
  syncGoalSelects();
}
function syncGoalSelects(){
  document.getElementById('goalsContainer').innerHTML=renderGoalRowsHTML();
}
function addGoalRow(){
  _fiveFormGoalRows.push({rowId:uid('row'), goalId:null, scorerId:'', assisterId:'', isOwnGoal:false, existingVideo:null,
    shotX:null, shotY:null, goalX:null, goalY:null, passerX:null, passerY:null, minute:null, pickMode:'shot'});
  syncGoalSelects();
}
function removeGoalRow(rowId){
  _fiveFormGoalRows=_fiveFormGoalRows.filter(r=>r.rowId!==rowId);
  syncGoalSelects();
}
function updateGoalRow(rowId,field,value){
  const row=_fiveFormGoalRows.find(r=>r.rowId===rowId);
  if(!row) return;
  row[field]=value;
}
function updateGoalMinute(rowId,value){
  const row=_fiveFormGoalRows.find(r=>r.rowId===rowId);
  if(!row) return;
  const n=Number(value);
  row.minute = (value===''||isNaN(n))? null : Math.max(0,Math.min(120,Math.round(n)));
}
/* Si tous les buts ont une minute, on les enregistre dans l'ordre chronologique (le score évolue donc
   correctement même si les buts ont été saisis dans le désordre). Sinon on garde l'ordre de saisie. */
function rowsOrderedByMinute(rows){
  const all=rows.length>0 && rows.every(r=>r.minute!==null && r.minute!==undefined);
  return all? [...rows].sort((a,b)=>a.minute-b.minute) : rows;
}
function updateGoalRowAssister(rowId,value){
  const row=_fiveFormGoalRows.find(r=>r.rowId===rowId);
  if(!row) return;
  row.assisterId=value;
  if(!value){ row.passerX=null; row.passerY=null; }
  syncGoalSelects();
}
function onGoalVideoChange(rowId,file){
  updateGoalRow(rowId,'videoFile',file);
  syncGoalSelects();
}
function markRemoveVideo(rowId){
  const row=_fiveFormGoalRows.find(r=>r.rowId===rowId);
  if(!row) return;
  row.removeVideo=true;
  row.existingVideo=null;
  syncGoalSelects();
  toast('La vidéo sera supprimée à l\'enregistrement','success');
}
/* Compression vidéo côté navigateur, sans dépendance externe :
   on redessine la vidéo dans un <canvas> et on la ré-encode avec
   MediaRecorder à un débit réduit (fonctionne sur Chrome/Firefox/Edge
   récents ; se dégrade proprement si l'API n'est pas disponible). */
function compressVideo(file, opts){
  opts=opts||{};
  const maxWidth=opts.maxWidth||1280;
  const bitrate=opts.bitrate||1500000;
  return new Promise((resolve,reject)=>{
    if(typeof MediaRecorder==='undefined'){ reject(new Error("La compression vidéo n'est pas supportée par ce navigateur.")); return; }
    const video=document.createElement('video');
    video.muted=false;
    video.playsInline=true;
    video.src=URL.createObjectURL(file);
    video.onloadedmetadata=()=>{
      const scale=Math.min(1, maxWidth/(video.videoWidth||maxWidth));
      const w=Math.max(2,Math.round((video.videoWidth||maxWidth)*scale));
      const h=Math.max(2,Math.round((video.videoHeight||720)*scale));
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      video.play().then(()=>{
        let stream;
        try{ stream=canvas.captureStream(30); }catch(e){ reject(e); return; }
        try{
          const srcStream = video.captureStream? video.captureStream() : (video.mozCaptureStream? video.mozCaptureStream() : null);
          if(srcStream){ srcStream.getAudioTracks().forEach(t=>stream.addTrack(t)); }
        }catch(e){ /* pas grave si l'audio ne peut pas être capturé */ }
        let mime='video/webm;codecs=vp9,opus';
        if(!MediaRecorder.isTypeSupported(mime)) mime='video/webm;codecs=vp8,opus';
        if(!MediaRecorder.isTypeSupported(mime)) mime='video/webm';
        let recorder;
        try{ recorder=new MediaRecorder(stream,{mimeType:mime, videoBitsPerSecond:bitrate}); }
        catch(e){ reject(e); return; }
        const chunks=[];
        recorder.ondataavailable=(e)=>{ if(e.data && e.data.size>0) chunks.push(e.data); };
        recorder.onstop=()=>{
          URL.revokeObjectURL(video.src);
          if(!chunks.length){ reject(new Error('Échec de la compression (aucune donnée produite).')); return; }
          resolve(new Blob(chunks,{type:mime}));
        };
        recorder.onerror=(e)=>reject(e.error||new Error('Erreur MediaRecorder'));
        let stopped=false;
        function stopOnce(){ if(stopped) return; stopped=true; try{ recorder.stop(); }catch(e){} }
        function drawFrame(){
          if(video.paused||video.ended){ stopOnce(); return; }
          ctx.drawImage(video,0,0,w,h);
          requestAnimationFrame(drawFrame);
        }
        recorder.start(250);
        drawFrame();
        video.onended=stopOnce;
        // filet de sécurité : ne pas dépasser la durée réelle de la vidéo + marge
        setTimeout(stopOnce, ((video.duration||30)*1000)+2000);
      }).catch(reject);
    };
    video.onerror=()=>reject(new Error('Impossible de lire ce fichier vidéo.'));
  });
}
async function compressGoalVideo(rowId){
  const row=_fiveFormGoalRows.find(r=>r.rowId===rowId);
  if(!row || !row.videoFile) return;
  const originalFile=row.videoFile;
  toast('Compression en cours... (peut prendre quelques secondes)','');
  try{
    const blob=await compressVideo(originalFile,{maxWidth:1280,bitrate:1500000});
    const newName=originalFile.name.replace(/\.[^.]+$/,'')+'-compresse.webm';
    const compressedFile=new File([blob], newName, {type: blob.type||'video/webm'});
    if(compressedFile.size>=originalFile.size){
      toast('La compression n\'a pas réduit la taille du fichier, original conservé','error');
      return;
    }
    row.videoFile=compressedFile;
    syncGoalSelects();
    toast(`Vidéo compressée : ${fmtFileSize(originalFile.size)} → ${fmtFileSize(compressedFile.size)}`,'success');
  }catch(err){
    console.error(err);
    toast('Compression impossible sur ce navigateur : '+err.message,'error');
  }
}
async function submitFiveForm(ev,fiveId){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  const date=fd.get('date');
  if(!date){ toast('La date est obligatoire','error'); return false; }
  const teamA=[...document.querySelectorAll('#teamACheck input:checked')].map(i=>i.value);
  const teamB=[...document.querySelectorAll('#teamBCheck input:checked')].map(i=>i.value);
  const overlap=teamA.filter(id=>teamB.includes(id));
  if(overlap.length){ toast('Un joueur ne peut pas être dans les deux équipes','error'); return false; }
  for(const row of _fiveFormGoalRows){
    if(!row.scorerId){ toast('Chaque but doit avoir un buteur','error'); return false; }
    if(!row.goalId && (row.minute===null||row.minute===undefined)){ toast('Chaque nouveau but doit avoir une minute','error'); return false; }
  }

  const existing=fiveId? getFive(fiveId) : null;
  const five={
    id: fiveId || uid('five'),
    date,
    timeStart: fd.get('timeStart')||'',
    timeEnd: fd.get('timeEnd')||'',
    location: (fd.get('location')||'').trim(),
    notes:'',
    attackingEndA: _fiveFormAttackingEndA||'top',
    createdAt: existing? existing.createdAt : Date.now()
  };
  await FivesRepo.save(five);

  // Participations : on remplace entièrement
  const oldParts=participationsForFive(five.id);
  for(const op of oldParts) await ParticipationsRepo.remove(op.id);
  for(const pid of teamA) await ParticipationsRepo.save({id:uid('part'),fiveId:five.id,playerId:pid,teamId:'A'});
  for(const pid of teamB) await ParticipationsRepo.save({id:uid('part'),fiveId:five.id,playerId:pid,teamId:'B'});

  // Buts : diff entre existants et formulaire
  const existingGoalsMap={};
  goalsForFive(five.id).forEach(g=>{ existingGoalsMap[g.id]=g; });
  const existingGoalIds=Object.keys(existingGoalsMap);
  const keptIds=[];
  let order=0;
  const submitBtn=document.querySelector('#fiveForm button[type="submit"]');
  for(const row of rowsOrderedByMinute(_fiveFormGoalRows)){
    order++;
    const goalId=row.goalId || uid('goal');
    keptIds.push(goalId);
    const prev=row.goalId? existingGoalsMap[row.goalId] : null;
    let videoUrl=prev? prev.videoUrl : null;
    let videoFilename=prev? prev.videoFilename : null;
    let videoPath=prev? prev.videoPath : null;
    let videoSize=prev? prev.videoSize : 0;

    if(row.removeVideo && videoPath){
      await VideosRepo.remove(videoPath);
      videoUrl=null; videoFilename=null; videoPath=null; videoSize=0;
    }
    if(row.videoFile){
      if(videoPath) await VideosRepo.remove(videoPath);
      try{
        if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent='Envoi de la vidéo...'; }
        const uploaded=await VideosRepo.upload(goalId, row.videoFile);
        videoUrl=uploaded.url; videoFilename=uploaded.fileName; videoPath=uploaded.path; videoSize=uploaded.size;
      }catch(e){
        console.error(e);
        toast('Impossible d\'envoyer la vidéo (fichier trop volumineux ou hors ligne ?)','error');
      }
    }
    const hasAssistPos=!row.isOwnGoal && !!row.assisterId;
    await GoalsRepo.save({id:goalId, fiveId:five.id, order, scorerId:row.scorerId, assisterId:row.isOwnGoal? null : (row.assisterId||null), isOwnGoal:!!row.isOwnGoal, videoUrl, videoFilename, videoPath, videoSize, createdAt:Date.now(),
      shotX: row.shotX??null, shotY: row.shotY??null,
      goalX: row.goalX??null, goalY: null,
      passerX: hasAssistPos? (row.passerX??null) : null, passerY: hasAssistPos? (row.passerY??null) : null,
      receptionX: null, receptionY: null,
      minute: row.minute??null
    });
  }
  for(const gid of existingGoalIds){
    if(!keptIds.includes(gid)){
      const g=existingGoalsMap[gid];
      if(g && g.videoPath) await VideosRepo.remove(g.videoPath);
      await GoalsRepo.remove(gid);
    }
  }

  await loadAll();
  closeModal();
  toast(existing? 'Five mis à jour':'Five créé','success');
  navigate('five/'+five.id);
  return false;
}
async function deleteFive(fiveId){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const f=getFive(fiveId);
  if(!f) return;
  if(!confirm(`Supprimer le Five du ${fmtDateShort(f.date)} ? Cette action supprimera aussi tous ses buts et vidéos associées. Cette action est irréversible.`)) return;
  const goals=goalsForFive(fiveId);
  for(const g of goals){
    if(g.videoPath) await VideosRepo.remove(g.videoPath);
    await GoalsRepo.remove(g.id);
  }
  const parts=participationsForFive(fiveId);
  for(const p of parts) await ParticipationsRepo.remove(p.id);
  await FivesRepo.remove(fiveId);
  await loadAll();
  toast('Five supprimé','success');
  navigate('five');
}

/* ---------- Video player ---------- */
function playVideo(goalId){
  const meta=videoForGoal(goalId);
  if(!meta || !meta.url){ toast('Vidéo introuvable','error'); return; }
  openModal(`
    <div class="video-modal">
      <h2>${esc(meta.fileName)}<button class="modal-close" onclick="closeModal()" aria-label="Fermer">${ic("x")}</button></h2>
      <video src="${meta.url}" controls autoplay playsinline></video>
      <div class="modal-actions">
        <a class="btn btn-ghost" href="${meta.url}" target="_blank" rel="noopener">${ic("download")}Ouvrir / télécharger</a>
        <button class="btn btn-primary" onclick="closeModal()">Fermer</button>
      </div>
    </div>
  `);
}

/* ---------- Export / Import ---------- */
async function exportData(){
  toast('Préparation de l\'export...','');
  const payload={
    version:3,
    exportedAt:new Date().toISOString(),
    players:STATE.players,
    fives:STATE.fives,
    participations:STATE.participations,
    goals:STATE.goals,
    aiStats:STATE.aiStats
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`lefiveyyy-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  toast('Export terminé (les vidéos restent hébergées sur Supabase, seuls les liens sont exportés)','success');
}
async function deleteAllRows(table){
  const {error}=await sb.from(table).delete().neq('id','__never_matches__');
  if(error) throw error;
}
async function importData(){
  if(!isAdmin()){ toast('Connecte-toi pour modifier les données','error'); return; }
  const input=document.getElementById('importFileInput');
  if(!input || !input.files || !input.files[0]){ toast('Choisis un fichier JSON','error'); return; }
  if(!confirm('Importer ce fichier va REMPLACER toutes les données actuelles pour tout le monde. Continuer ?')) return;
  try{
    const text=await input.files[0].text();
    const data=JSON.parse(text);
    if(!data.players || !data.fives) throw new Error('Fichier invalide');
    await deleteAllRows('goals');
    await deleteAllRows('participations');
    await deleteAllRows('fives');
    await deleteAllRows('players');
    for(const p of data.players) await PlayersRepo.save(p);
    for(const f of data.fives) await FivesRepo.save(f);
    for(const part of (data.participations||[])) await ParticipationsRepo.save(part);
    for(const g of (data.goals||[])) await GoalsRepo.save(g);
    // stats IA (les anciennes ont disparu avec les fives : suppression en cascade)
    if(data.aiStats && STATE.aiStatsReady) for(const [fid,s] of Object.entries(data.aiStats)) await AiStatsRepo.save(fid,s);
    await loadAll();
    toast('Import réussi','success');
    render();
  }catch(e){
    console.error(e);
    toast('Erreur lors de l\'import : '+e.message,'error');
  }
}

