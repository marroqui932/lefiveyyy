-- Stats issues de l'analyse vidéo (IA) : une ligne par five (à lancer une fois dans Supabase : SQL Editor > New query > Run).
-- Contenu : possession, et pour chaque joueur distance, vitesse max, sprints, touches, passes, récupérations, duels, heatmap.
-- Buts et passes décisives restent ceux saisis à la main (table goals).
-- Lecture ouverte à tous les visiteurs ; ajout, modification et suppression réservés au compte admin connecté.
create table if not exists public.ai_stats (
  five_id     text primary key references public.fives(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.ai_stats enable row level security;

drop policy if exists "stats IA lisibles par tous" on public.ai_stats;
create policy "stats IA lisibles par tous" on public.ai_stats
  for select using (true);

drop policy if exists "stats IA modifiables par l'admin" on public.ai_stats;
create policy "stats IA modifiables par l'admin" on public.ai_stats
  for all to authenticated using (true) with check (true);
