create or replace function public.create_betsquad_room(
  p_game_type text,
  p_mode text,
  p_stake numeric default 500,
  p_display_name text default 'Player'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches%rowtype;
  v_code text;
  v_game text := case when p_game_type = 'dice-duel' then 'dice' else p_game_type end;
  v_max integer := case when p_mode = '1v1' then 2 when p_mode = '4-player' then 4 else 0 end;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if v_max = 0 then raise exception 'Invalid match mode.'; end if;
  if p_stake < 500 then raise exception 'Stake must be at least ₦500.'; end if;
  for i in 1..20 loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    begin
      insert into public.matches(game_id, mode, room_code, stake, status, created_by)
      values (v_game, p_mode, v_code, p_stake, 'waiting', v_user)
      returning * into v_match;
      exit;
    exception when unique_violation then
      if i = 20 then raise exception 'Could not generate a room code. Please try again.'; end if;
    end;
  end loop;
  insert into public.match_players(match_id, user_id, seat, connected)
  values (v_match.id, v_user, 1, true);
  update public.profiles set display_name = coalesce(nullif(trim(p_display_name), ''), display_name), updated_at = now() where id = v_user;
  return jsonb_build_object('id', v_match.id, 'code', v_match.room_code, 'game_type', v_match.game_id, 'max_players', v_max, 'mode', v_match.mode, 'stake', v_match.stake);
end;
$$;

create or replace function public.join_betsquad_room(p_room_code text, p_display_name text default 'Player')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid(); v_match public.matches%rowtype; v_count integer; v_seat integer; v_max integer; v_players jsonb;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_match from public.matches where upper(room_code) = upper(trim(p_room_code)) for update;
  if not found then raise exception 'Room not found. Check the code and try again.'; end if;
  if v_match.status not in ('waiting','ready') then raise exception 'This room is no longer accepting players.'; end if;
  v_max := case when v_match.mode = '1v1' then 2 else 4 end;
  if not exists (select 1 from public.match_players where match_id = v_match.id and user_id = v_user) then
    select count(*) into v_count from public.match_players where match_id = v_match.id;
    if v_count >= v_max then raise exception 'This room is full.'; end if;
    select s into v_seat from generate_series(1, v_max) s where not exists (select 1 from public.match_players mp where mp.match_id = v_match.id and mp.seat = s) order by s limit 1;
    insert into public.match_players(match_id, user_id, seat, connected) values (v_match.id, v_user, v_seat, true);
    if v_count + 1 >= v_max then update public.matches set status = 'ready' where id = v_match.id; end if;
  end if;
  update public.profiles set display_name = coalesce(nullif(trim(p_display_name), ''), display_name), updated_at = now() where id = v_user;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', mp.user_id, 'display_name', coalesce(p.display_name, p.bet_name, 'Player'), 'seat', mp.seat, 'connected', mp.connected) order by mp.seat), '[]'::jsonb) into v_players from public.match_players mp left join public.profiles p on p.id = mp.user_id where mp.match_id = v_match.id;
  return jsonb_build_object('id', v_match.id, 'code', v_match.room_code, 'game_type', v_match.game_id, 'max_players', v_max, 'mode', v_match.mode, 'stake', v_match.stake, 'players', v_players);
end;
$$;
revoke all on function public.create_betsquad_room(text,text,numeric,text) from public;
grant execute on function public.create_betsquad_room(text,text,numeric,text) to authenticated;
revoke all on function public.join_betsquad_room(text,text) from public;
grant execute on function public.join_betsquad_room(text,text) to authenticated;
