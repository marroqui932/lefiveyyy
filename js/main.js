'use strict';
/* ============================================================
   INIT
   ============================================================ */
window.navigate=navigate;
window.openPlayerForm=openPlayerForm;
window.submitPlayerForm=submitPlayerForm;
window.deletePlayer=deletePlayer;
window.openFiveForm=openFiveForm;
window.submitFiveForm=submitFiveForm;
window.deleteFive=deleteFive;
window.addGoalRow=addGoalRow;
window.removeGoalRow=removeGoalRow;
window.updateGoalRow=updateGoalRow;
window.onGoalVideoChange=onGoalVideoChange;
window.toggleOwnGoal=toggleOwnGoal;
window.updateGoalRowAssister=updateGoalRowAssister;
window.handlePitchPickClick=handlePitchPickClick;
window.handleGoalFrameClick=handleGoalFrameClick;
window.clearGoalPoint=clearGoalPoint;
window.openPitchZoom=openPitchZoom;
window.closePitchZoom=closePitchZoom;
window.handlePitchZoomClick=handlePitchZoomClick;
window.setPickMode=setPickMode;
window.updateGoalMinute=updateGoalMinute;
window.toggleTgPlayer=toggleTgPlayer;
window.tgSelectAll=tgSelectAll;
window.tgSelectNone=tgSelectNone;
window.tgSelectNext=tgSelectNext;
window.tgAddConstraint=tgAddConstraint;
window.tgRemoveConstraint=tgRemoveConstraint;
window.generateTeams=generateTeams;
window.rerollTeams=rerollTeams;
window.useGeneratedTeams=useGeneratedTeams;
window.setAttackingEndA=setAttackingEndA;
window.setCountryPick=setCountryPick;
window.compressGoalVideo=compressGoalVideo;
window.syncGoalSelects=syncGoalSelects;
window.markRemoveVideo=markRemoveVideo;
window.playVideo=playVideo;
window.closeModal=closeModal;
window.exportData=exportData;
window.importData=importData;
window.render=render;
window.launchCompare=launchCompare;
window.openLoginModal=openLoginModal;
window.submitLoginForm=submitLoginForm;
window.handleLogoutClick=handleLogoutClick;
window.toggleMoreSheet=toggleMoreSheet;
window.optimizeAllPhotos=optimizeAllPhotos;

async function init(){
  const view=document.getElementById('view');
  view.innerHTML=loaderHTML('Échauffement en cours…');
  try{
    await initAuth();
    await loadAll();
  }catch(err){
    console.error(err);
    view.innerHTML=emptyState('cloud','Connexion à la base impossible',
      `${esc(err.message)}<br>Vérifie ta connexion internet et réessaie.<div style="margin-top:14px;"><button class="btn btn-primary" onclick="location.reload()">${ic('refresh')} Réessayer</button></div>`);
    return;
  }
  window.addEventListener('hashchange', render);
  document.getElementById('sheetBackdrop').addEventListener('click',()=>toggleMoreSheet(false));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape') return;
    if(document.querySelector('.modal-backdrop')) closeModal();
    toggleMoreSheet(false);
  });
  render();
}
init();
