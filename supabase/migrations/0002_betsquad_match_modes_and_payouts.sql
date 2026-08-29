-- Betsquad match modes and payout configuration
-- This migration adds platform configuration around the existing game engines.
-- It does not modify game rules.

create table public.game_modes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_capacity integer not null check (player_capacity in (2,4)),
  winner_count integer not null check (winner_count in (1,2)),
  first_place_bps integer not null default 6500 check (first_place_bps between 0 and 10000),
  second_place_bps integer not null default 3500 check (second_place_bps between 0 and 10000),
  min_stake_kobo bigint not null default 50000 check (min_stake_kobo >= 50000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, player_capacity),
  check (
    (player_capacity = 2 and winner_count = 1 and second_place_bps = 0 and first_place_bps = 10000)
    or
    (player_capacity = 4 and winner_count = 2 and first_place_bps > second_place_bps and first_place_bps + second_place_bps = 10000)
  )
);

insert into public.game_modes (game_id, player_capacity, winner_count, first_place_bps, second_place_bps)
select id, 2, 1, 10000, 0 from public.games
on conflict (game_id, player_capacity) do nothing;

insert into public.game_modes (game_id, player_capacity, winner_count, first_place_bps, second_place_bps)
select id, 4, 2, 6500, 3500 from public.games
on conflict (game_id, player_capacity) do nothing;

alter table public.game_modes enable row level security;
create policy "active game modes readable" on public.game_modes for select using (active = true);

create or replace function public.calculate_match_settlement(
  p_pool_kobo bigint,
  p_commission_bps integer default 1000,
  p_player_capacity integer default 2
)
returns table(commission_kobo bigint, prize_pool_kobo bigint, first_place_kobo bigint, second_place_kobo bigint)
language plpgsql
immutable
as $$
declare
  v_commission bigint;
  v_prize bigint;
begin
  if p_pool_kobo < 50000 then
    raise exception 'Minimum stake pool is ₦500 per player';
  end if;

  if p_commission_bps < 0 or p_commission_bps > 10000 then
    raise exception 'Invalid commission rate';
  end if;

  v_commission := floor(p_pool_kobo * p_commission_bps / 10000.0);
  v_prize := p_pool_kobo - v_commission;

  if p_player_capacity = 2 then
    return query select v_commission, v_prize, v_prize, 0::bigint;
  elsif p_player_capacity = 4 then
    return query select v_commission, v_prize,
      floor(v_prize * 6500 / 10000.0)::bigint,
      (v_prize - floor(v_prize * 6500 / 10000.0))::bigint;
  else
    raise exception 'Unsupported player capacity';
  end if;
end;
$$;

-- Server-side settlement primitives are intentionally separated from game engines.
-- Payment-provider capture/withdrawal remains an integration concern and must be
-- enabled only where real-money wagering is legally permitted and licensed.
