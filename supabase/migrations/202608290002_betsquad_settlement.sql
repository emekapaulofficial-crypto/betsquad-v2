create or replace function public.settle_betsquad_match(
  p_match_id uuid,
  p_requested_winners uuid[],
  p_requesting_user uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  player_count integer;
  gross_pool numeric;
  commission numeric;
  prize_pool numeric;
  first_payout numeric;
  second_payout numeric;
  winner_count integer;
begin
  if p_requesting_user is null or auth.uid() is distinct from p_requesting_user then
    raise exception 'Unauthorized settlement request';
  end if;

  select * into m
  from public.matches
  where id = p_match_id
  for update;

  if not found then raise exception 'Match not found'; end if;
  if m.status <> 'finished' then raise exception 'Match is not finished'; end if;
  if m.settled_at is not null then raise exception 'Match already settled'; end if;

  select count(*) into player_count
  from public.match_players where match_id = p_match_id;

  if player_count not in (2, 4) then raise exception 'Invalid player count'; end if;
  if m.stake < 500 then raise exception 'Stake below minimum'; end if;

  winner_count := coalesce(array_length(p_requested_winners, 1), 0);
  if (player_count = 2 and winner_count <> 1)
     or (player_count = 4 and winner_count <> 2) then
    raise exception 'Invalid winner count';
  end if;

  if exists (
    select 1 from unnest(p_requested_winners) w
    where not exists (
      select 1 from public.match_players mp
      where mp.match_id = p_match_id and mp.user_id = w
    )
  ) then raise exception 'Winner is not a match player'; end if;

  gross_pool := m.stake * player_count;
  commission := floor(gross_pool * 0.10);
  prize_pool := gross_pool - commission;

  if player_count = 2 then
    first_payout := prize_pool;
    second_payout := 0;
  else
    first_payout := floor(prize_pool * 0.65);
    second_payout := prize_pool - first_payout;
  end if;

  update public.matches
  set settled_at = now(),
      status = 'settled',
      platform_fee = commission,
      prize_pool = prize_pool
  where id = p_match_id;

  return jsonb_build_object(
    'match_id', p_match_id,
    'gross_pool', gross_pool,
    'platform_fee', commission,
    'prize_pool', prize_pool,
    'payouts', case when player_count = 2
      then jsonb_build_array(first_payout)
      else jsonb_build_array(first_payout, second_payout)
    end
  );
end;
$$;

revoke all on function public.settle_betsquad_match(uuid, uuid[], uuid) from public;
grant execute on function public.settle_betsquad_match(uuid, uuid[], uuid) to authenticated;
