import { supabase } from "../supabase/client";

const MIN_STAKE = 500;
const COMMISSION_RATE = 0.10;

export function calculateSettlement({ playerCount, stake }) {
  if (!Number.isFinite(stake) || stake < MIN_STAKE) {
    throw new Error(`Stake must be at least ₦${MIN_STAKE}.`);
  }

  const expectedPlayers = playerCount === 2 || playerCount === 4 ? playerCount : null;
  if (!expectedPlayers) throw new Error("A match must have 2 or 4 players.");

  const pool = expectedPlayers * stake;
  const commission = Math.floor(pool * COMMISSION_RATE);
  const prizePool = pool - commission;

  if (expectedPlayers === 2) {
    return { pool, commission, prizePool, payouts: [prizePool] };
  }

  return {
    pool,
    commission,
    prizePool,
    payouts: [Math.floor(prizePool * 0.65), prizePool - Math.floor(prizePool * 0.65)],
  };
}

export async function createMatch({ gameId, mode, stake }) {
  if (!supabase) throw new Error("Supabase client is not configured.");
  if (!gameId || !mode) throw new Error("gameId and mode are required.");

  const playerCount = mode === "1v1" ? 2 : mode === "4-player" ? 4 : 0;
  calculateSettlement({ playerCount, stake });

  const { data, error } = await supabase
    .from("matches")
    .insert({ game_id: gameId, mode, stake_amount: stake, status: "waiting" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function joinMatch(matchId, seat) {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const { data, error } = await supabase
    .from("match_players")
    .insert({ match_id: matchId, seat, status: "connected" })
    .select()
    .single();

  if (error) throw error;
  return data;
}
