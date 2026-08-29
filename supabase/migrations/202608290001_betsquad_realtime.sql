-- Betsquad realtime match-room foundation.
-- This migration stores room/match state and player membership only.
-- Game rules remain in their existing engines.

create extension if not exists pgcrypto;

create table if not exists public.betsquad_matches (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  mode text not null check (mode in ('1v1', '4-player')),
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'playing', 'finished', 'cancelled')),
  stake_amount integer not null default 500 check (stake_amount >= 500),
  max_players integer not null check (max_players in (2, 4)),
  winner_count integer not null check (winner_count in (1, 2)),
  state jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.betsquad_match_players (
  match_id uuid not null references public.betsquad_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat integer not null,
  joined_at timestamptz not null default now(),
  connected boolean not null default true,
  primary key (match_id, user_id),
  unique (match_id, seat),
  check (seat >= 1 and seat <= 4)
);

create index if not exists betsquad_matches_game_status_idx
  on public.betsquad_matches (game_id, status, created_at desc);

create index if not exists betsquad_match_players_user_idx
  on public.betsquad_match_players (user_id, joined_at desc);

alter table public.betsquad_matches enable row level security;
alter table public.betsquad_match_players enable row level security;

-- Players can see matches they created or joined. Public lobby reads are intentionally
-- handled later through a restricted server-side query/view so private match state is not exposed.
drop policy if exists "match members can read their matches" on public.betsquad_matches;
create policy "match members can read their matches"
  on public.betsquad_matches for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.betsquad_match_players mp
      where mp.match_id = id and mp.user_id = auth.uid()
    )
  );

drop policy if exists "players can read their memberships" on public.betsquad_match_players;
create policy "players can read their memberships"
  on public.betsquad_match_players for select
  to authenticated
  using (user_id = auth.uid());

-- Realtime is enabled for membership/presence updates. Game actions and authoritative
-- settlement will be added separately after the existing engines are mapped.
alter table public.betsquad_matches replica identity full;
alter table public.betsquad_match_players replica identity full;
