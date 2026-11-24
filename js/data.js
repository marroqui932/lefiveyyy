'use strict';
/* ============================================================
   COUCHE DE PERSISTANCE - Supabase (base partagée en ligne)
   ============================================================ */
const SUPABASE_URL='https://pjzpezjponuqdogxusct.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_TbCMf0PqZHDJ_b_l-YIOmA_PkR5hST2';
const VIDEO_BUCKET='goal-videos';
const sb=window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sbCheck(res){
  if(res && res.error) throw res.error;
  return res? res.data : null;
}

/* ---- mapping camelCase (app) <-> snake_case (Postgres) ---- */
function playerFromDb(r){ return { id:r.id, name:r.name, photo:r.photo||null, notes:r.notes||'', country:r.country||null, createdAt:r.created_at? new Date(r.created_at).getTime():Date.now() }; }
function playerToDb(p){ return { id:p.id, name:p.name, photo:p.photo||null, notes:p.notes||'', country:p.country||null }; }

function fiveFromDb(r){ return { id:r.id, date:r.date, timeStart:r.time_start||'', timeEnd:r.time_end||'', location:r.location||'', notes:r.notes||'', attackingEndA:r.attacking_end_a||'top', createdAt:r.created_at? new Date(r.created_at).getTime():Date.now() }; }
function fiveToDb(f){ return { id:f.id, date:f.date, time_start:f.timeStart||null, time_end:f.timeEnd||null, location:f.location||null, notes:f.notes||'', attacking_end_a:f.attackingEndA||'top' }; }

function participationFromDb(r){ return { id:r.id, fiveId:r.five_id, playerId:r.player_id, teamId:r.team_id||null }; }
function participationToDb(p){ return { id:p.id, five_id:p.fiveId, player_id:p.playerId, team_id:p.teamId||null }; }

function goalFromDb(r){ return { id:r.id, fiveId:r.five_id, order:r.goal_order, scorerId:r.scorer_id, assisterId:r.assister_id||null, isOwnGoal:!!r.is_own_goal, videoUrl:r.video_url||null, videoFilename:r.video_filename||null, videoPath:r.video_path||null, videoSize:r.video_size||0,
  shotX:r.shot_x===null||r.shot_x===undefined?null:Number(r.shot_x), shotY:r.shot_y===null||r.shot_y===undefined?null:Number(r.shot_y),
  goalX:r.goal_x===null||r.goal_x===undefined?null:Number(r.goal_x), goalY:r.goal_y===null||r.goal_y===undefined?null:Number(r.goal_y),
  passerX:r.passer_x===null||r.passer_x===undefined?null:Number(r.passer_x), passerY:r.passer_y===null||r.passer_y===undefined?null:Number(r.passer_y),
  receptionX:r.reception_x===null||r.reception_x===undefined?null:Number(r.reception_x), receptionY:r.reception_y===null||r.reception_y===undefined?null:Number(r.reception_y),
  minute:r.minute===null||r.minute===undefined?null:Number(r.minute),
  createdAt:r.created_at? new Date(r.created_at).getTime():Date.now() }; }
function goalToDb(g){ return { id:g.id, five_id:g.fiveId, goal_order:g.order, scorer_id:g.scorerId, assister_id:g.isOwnGoal? null : (g.assisterId||null), is_own_goal:!!g.isOwnGoal, video_url:g.videoUrl||null, video_filename:g.videoFilename||null, video_path:g.videoPath||null, video_size:g.videoSize||0,
  shot_x: g.shotX===undefined?null:g.shotX, shot_y: g.shotY===undefined?null:g.shotY,
  goal_x: g.goalX===undefined?null:g.goalX, goal_y: g.goalY===undefined?null:g.goalY,
  passer_x: g.passerX===undefined?null:g.passerX, passer_y: g.passerY===undefined?null:g.passerY,
  reception_x: g.receptionX===undefined?null:g.receptionX, reception_y: g.receptionY===undefined?null:g.receptionY,
  minute: (g.minute===undefined||g.minute===null||isNaN(g.minute))?null:g.minute }; }

/* ---------------- Repositories ----------------
   Point d'accès unique aux données. Ici elles parlent à Supabase. */
const PlayersRepo={
  all: async ()=>{ const {data,error}=await sb.from('players').select('*'); if(error) throw error; return data.map(playerFromDb); },
  save: async (p)=>{ const {error}=await sb.from('players').upsert(playerToDb(p)); if(error) throw error; return p; },
  remove: async (id)=>{ const {error}=await sb.from('players').delete().eq('id',id); if(error) throw error; }
};
const FivesRepo={
  all: async ()=>{ const {data,error}=await sb.from('fives').select('*'); if(error) throw error; return data.map(fiveFromDb); },
  save: async (f)=>{ const {error}=await sb.from('fives').upsert(fiveToDb(f)); if(error) throw error; return f; },
  remove: async (id)=>{ const {error}=await sb.from('fives').delete().eq('id',id); if(error) throw error; }
};
const ParticipationsRepo={
  all: async ()=>{ const {data,error}=await sb.from('participations').select('*'); if(error) throw error; return data.map(participationFromDb); },
  save: async (p)=>{ const {error}=await sb.from('participations').upsert(participationToDb(p)); if(error) throw error; return p; },
  remove: async (id)=>{ const {error}=await sb.from('participations').delete().eq('id',id); if(error) throw error; }
};
const GoalsRepo={
  all: async ()=>{ const {data,error}=await sb.from('goals').select('*'); if(error) throw error; return data.map(goalFromDb); },
  save: async (g)=>{ const {error}=await sb.from('goals').upsert(goalToDb(g)); if(error) throw error; return g; },
  remove: async (id)=>{ const {error}=await sb.from('goals').delete().eq('id',id); if(error) throw error; }
};
/* Upload/suppression de fichiers vidéo dans Supabase Storage.
   Les métadonnées (url, chemin, nom, taille) sont stockées directement
   sur la ligne du but concerné (colonnes video_* de la table goals). */
const VideosRepo={
  upload: async (goalId,file)=>{
    const ext=(file.name.split('.').pop()||'mp4').toLowerCase();
    const path=`${goalId}-${Date.now()}.${ext}`;
    const {error}=await sb.storage.from(VIDEO_BUCKET).upload(path,file,{upsert:true, contentType:file.type||'video/mp4'});
    if(error) throw error;
    const {data}=sb.storage.from(VIDEO_BUCKET).getPublicUrl(path);
    return { url:data.publicUrl, path, fileName:file.name, size:file.size };
  },
  remove: async (path)=>{
    if(!path) return;
    const {error}=await sb.storage.from(VIDEO_BUCKET).remove([path]);
    if(error) console.error('Suppression vidéo échouée:', error);
  }
};

/* ---------------- Authentification admin ---------------- */
let currentUser=null;
function isAdmin(){ return !!currentUser; }
async function initAuth(){
  const {data}=await sb.auth.getSession();
  currentUser=data?.session?.user || null;
  sb.auth.onAuthStateChange((_event,session)=>{
    currentUser=session?.user || null;
    renderNav();
    render();
  });
}
async function loginAdmin(email,password){
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error) throw error;
  currentUser=data.user;
  return data.user;
}
async function logoutAdmin(){
  await sb.auth.signOut();
  currentUser=null;
}

/* ============================================================
   ÉTAT EN MÉMOIRE (cache rafraîchi après chaque écriture)
   ============================================================ */
const STATE={ players:[], fives:[], participations:[], goals:[] };

async function loadAll(){
  const [players,fives,participations,goals]=await Promise.all([
    PlayersRepo.all(), FivesRepo.all(), ParticipationsRepo.all(), GoalsRepo.all()
  ]);
  STATE.players=players;
  STATE.fives=fives;
  STATE.participations=participations;
  STATE.goals=goals;
}

function getPlayer(id){ return STATE.players.find(p=>p.id===id) || null; }
function getFive(id){ return STATE.fives.find(f=>f.id===id) || null; }
function videoForGoal(goalId){
  const g=STATE.goals.find(x=>x.id===goalId);
  if(!g || !g.videoUrl) return null;
  return { id:g.id, fileName:g.videoFilename||'video', url:g.videoUrl, path:g.videoPath, size:g.videoSize||0 };
}

