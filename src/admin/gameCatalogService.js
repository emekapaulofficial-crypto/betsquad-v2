import { supabase } from "../supabase/client";

export async function listGames({ includeDisabled = false } = {}) {
  let query = supabase.from("game_catalog").select("*").order("created_at", { ascending: true });
  if (!includeDisabled) query = query.eq("enabled", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addGame({ slug, name, description = "", engineKey, supportedModes = ["1v1", "4-player"], enabled = true }) {
  const { data, error } = await supabase.from("game_catalog").insert({
    slug,
    name,
    description,
    engine_key: engineKey,
    supported_modes: supportedModes,
    enabled,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function setGameEnabled(gameId, enabled) {
  const { data, error } = await supabase.from("game_catalog").update({ enabled, updated_at: new Date().toISOString() }).eq("id", gameId).select().single();
  if (error) throw error;
  return data;
}
