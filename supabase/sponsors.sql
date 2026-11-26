-- Table des sponsors affichés sur le site (à lancer une fois dans Supabase : SQL Editor > New query > Run).
-- Lecture ouverte à tous les visiteurs ; ajout, modification et suppression réservés au compte admin connecté.
create table if not exists public.sponsors (
  id          text primary key,
  name        text not null,
  logo        text,                         -- image du logo (data URL, réduite par le site)
  url         text,                         -- lien vers le site du sponsor (facultatif)
  sort_order  integer not null default 0,   -- ordre d'affichage
  is_real     boolean not null default false, -- true = le sponsor a vraiment donné son accord
  created_at  timestamptz not null default now()
);

alter table public.sponsors enable row level security;

drop policy if exists "sponsors lisibles par tous" on public.sponsors;
create policy "sponsors lisibles par tous" on public.sponsors
  for select using (true);

drop policy if exists "sponsors modifiables par l'admin" on public.sponsors;
create policy "sponsors modifiables par l'admin" on public.sponsors
  for all to authenticated using (true) with check (true);
