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

async function init(){
  document.getElementById('view').innerHTML=`<div class="empty-state"><div class="e-icon">⚽</div><div style="font-weight:700;">Chargement de LeFiveyyy...</div></div>`;
  try{
    await initAuth();
    await loadAll();
  }catch(err){
    console.error(err);
    document.getElementById('view').innerHTML=`<div class="empty-state"><div class="e-icon">⚠️</div><div style="font-weight:700;">Connexion à la base impossible</div><div class="page-sub" style="margin-top:6px;">${esc(err.message)}<br>Vérifie ta connexion internet et réessaie.</div></div>`;
    return;
  }
  window.addEventListener('hashchange', render);
  document.getElementById('burgerBtn').addEventListener('click',()=>{
    document.getElementById('sidebar').classList.add('show');
    document.getElementById('sidebarBackdrop').classList.add('show');
  });
  function closeSidebar(){
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebarBackdrop').classList.remove('show');
  }
  document.getElementById('sidebarClose').addEventListener('click',closeSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click',closeSidebar);
  document.getElementById('navMobile').addEventListener('click',closeSidebar);
  render();
}
init();
