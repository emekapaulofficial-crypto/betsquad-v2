-- Betsquad core schema
-- Paid-match values are settled server-side. Game rules stay in game engines.

create extension if not exists pgcrypto;

create type public.game_status as enum ('draft','active','disabled');
create type public.match_status as enum ('waiting','ready','playing','completed','cancelled','disputed');
create type public.transaction_type as enum ('entry_fee','prize','commission','refund');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'player' check (role in ('player','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  player_capacity integer not null check (player_capacity in (2,4)),
  winner_count integer not null check (winner_count in (1,2)),
  status public.game_status not null default 'active',
  min_stake_kobo bigint not null default 50000 check (min_stake_kobo >= 50000),
  commission_bps integer not null default 1000 check (commission_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id),
  room_code text unique not null,
  status public.match_status not null default 'waiting',
  stake_kobo bigint not null check (stake_kobo >= 50000),
  total_pool_kobo bigint not null default 0,
  commission_kobo bigint not null default 0,
  prize_pool_kobo bigint not null default 0,
  state jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  seat integer not null,
  placement integer,
  is_winner boolean not null default false,
  prize_kobo bigint not null default 0,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id),
  unique (match_id, seat)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  match_id uuid references public.matches(id),
  type public.transaction_type not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  status text not null default 'pending' check (status in ('pending','completed','failed','reversed')),
  provider_reference text,
  created_at timestamptz not null default now()
);

create table public.match_events (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index matches_game_status_idx on public.matches(game_id, status);
create index match_players_user_idx on public.match_players(user_id);
create index transactions_match_idx on public.transactions(match_id);
create index match_events_match_idx on public.match_events(match_id, id);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.transactions enable row level security;
alter table public.match_events enable row level security;

-- Player-readable catalog. Match money settlement is deliberately not exposed as a client-write operation.
create policy "games readable" on public.games for select using (status <> 'draft');
create policy "profiles own row" on public.profiles for select using (id = auth.uid());
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Match membership can be read by authenticated players who belong to the match.
create policy "match members read matches" on public.matches for select using (
  exists (select 1 from public.match_players mp where mp.match_id = matches.id and mp.user_id = auth.uid())
  or created_by = auth.uid()
);

create policy "match members read players" on public.match_players for select using (
  exists (select 1 from public.match_players mine where mine.match_id = match_players.match_id and mine.user_id = auth.uid())
);

create policy "match members read events" on public.match_events for select using (
  exists (select 1 from public.match_players mp where mp.match_id = match_events.match_id and mp.user_id = auth.uid())
);

-- Transactions are private to the owning player. Inserts/settlement should be performed by trusted server functions.
create policy "own transactions read" on public.transactions for select using (user_id = auth.uid());

-- Seed the three supplied game slots. Exact engine identifiers can be adjusted when the source files are moved into games/.
insert into public.games (slug, name, player_capacity, winner_count)
values
  ('whot', 'Whot!', 4, 2),
  ('snooker', 'Baize & Brass — Snooker', 4, 2),
  ('dice', 'Dice', 2, 1)
on conflict (slug) do nothing;
