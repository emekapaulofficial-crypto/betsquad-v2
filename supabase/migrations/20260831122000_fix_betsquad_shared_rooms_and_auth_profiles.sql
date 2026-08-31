-- Betsquad shared room codes and auth/profile synchronization.
-- Applied to production Supabase on 2026-08-31.

alter table public.game_rooms add column if not exists code text;
create unique index if not exists game_rooms_code_upper_unique_idx on public.game_rooms (upper(code)) where code is not null;

create or replace function public.create_betsquad_room(
  p_game_type text,
  p_mode text,
  p_stake numeric default 500,
  p_display_name text default 'Player'
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_code text;
  v_game text := case when p_game_type = 'dice-duel' then 'dice' else p_game_type end;
  v_max integer := case when p_mode = '1v1' then 2 when p_mode = '4-player' then 4 else 0 end;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if v_max = 0 then raise exception 'Invalid match mode.'; end if;
  if p_stake < 500 then raise exception 'Stake must be at least ₦500.'; end if;
  if v_game not in ('whot','snooker','dice') then raise exception 'Unsupported game.'; end if;

  for i in 1..20 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.game_rooms(code, game_code, game_type, room_type, entry_fee, max_players, capacity, status, created_by, creator_id, stake)
      values (v_code, v_game, v_game, 'private', p_stake, v_max, v_max, 'waiting', v_user, v_user, p_stake)
      returning * into v_room;
      exit;
    exception when unique_violation then
      if i = 20 then raise exception 'Could not generate a room code. Please try again.'; end if;
    end;
  end loop;

  insert into public.game_room_players(room_id, user_id, display_name, stake_amount, status, is_bot)
  values (v_room.id, v_user, coalesce(nullif(trim(p_display_name), ''), 'Player'), p_stake, 'joined', false);

  update public.profiles set display_name = coalesce(nullif(trim(p_display_name), ''), display_name), updated_at = now() where id = v_user;

  return jsonb_build_object('room', jsonb_build_object('id', v_room.id, 'code', v_room.code, 'game_type', v_room.game_type, 'max_players', v_max, 'status', v_room.status), 'players', jsonb_build_array(jsonb_build_object('user_id', v_user, 'display_name', coalesce(nullif(trim(p_display_name), ''), 'Player'))));
end;
$$;

create or replace function public.join_betsquad_room(p_room_code text, p_display_name text default 'Player')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_count integer;
  v_existing uuid;
  v_players jsonb;
  v_max integer;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_room from public.game_rooms where upper(code) = upper(trim(p_room_code)) and status in ('waiting','ready') for update;
  if not found then raise exception 'Room not found. Check the code and try again.'; end if;
  v_max := coalesce(v_room.max_players, v_room.capacity, 4);
  select id into v_existing from public.game_room_players where room_id = v_room.id and user_id = v_user limit 1;
  if v_existing is null then
    select count(*) into v_count from public.game_room_players where room_id = v_room.id and status <> 'left';
    if v_count >= v_max then raise exception 'This room is full.'; end if;
    insert into public.game_room_players(room_id, user_id, display_name, stake_amount, status, is_bot)
    values (v_room.id, v_user, coalesce(nullif(trim(p_display_name), ''), 'Player'), coalesce(v_room.stake, v_room.entry_fee, 500), 'joined', false);
  else
    update public.game_room_players set status = 'joined', display_name = coalesce(nullif(trim(p_display_name), ''), display_name) where id = v_existing;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', grp.user_id, 'display_name', coalesce(grp.display_name, 'Player'), 'connected', true) order by grp.joined_at), '[]'::jsonb) into v_players from public.game_room_players grp where grp.room_id = v_room.id and grp.status <> 'left';
  return jsonb_build_object('room', jsonb_build_object('id', v_room.id, 'code', v_room.code, 'game_type', v_room.game_type, 'max_players', v_max, 'status', v_room.status), 'players', v_players);
end;
$$;

revoke all on function public.create_betsquad_room(text,text,numeric,text) from public;
grant execute on function public.create_betsquad_room(text,text,numeric,text) to authenticated;
revoke all on function public.join_betsquad_room(text,text) from public;
grant execute on function public.join_betsquad_room(text,text) to authenticated;

create or replace function public.sync_betsquad_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_name text;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'player_name'), ''), null);
  insert into public.profiles(id, email, display_name, created_at, updated_at)
  values (new.id, lower(new.email), v_name, coalesce(new.created_at, now()), now())
  on conflict (id) do update set email = lower(excluded.email), display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name), updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_betsquad_profile on auth.users;
create trigger on_auth_user_created_sync_betsquad_profile after insert on auth.users for each row execute function public.sync_betsquad_profile();
