import { supabase } from './supabase';

export async function createMatchRoom({ gameSlug, mode = '1v1', stake = 500 }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error('Please sign in first.');

  const { data, error } = await supabase
    .from('matches')
    .insert({ game_slug: gameSlug, mode, stake, status: 'waiting' })
    .select('id, game_slug, mode, stake, status')
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToMatch(matchId, onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`betsquad-match-${matchId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
