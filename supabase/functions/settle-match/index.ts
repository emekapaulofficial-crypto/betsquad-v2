import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required." }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid authentication." }, 401);

    const body = await req.json();
    const matchId = String(body?.matchId ?? "");
    const winners = Array.isArray(body?.winners) ? body.winners.map(String) : [];

    if (!matchId || winners.length === 0) {
      return json({ error: "matchId and winners are required." }, 400);
    }

    // Settlement authority belongs on the server. The client may request settlement,
    // but must not decide the final pool, commission, or payout amounts.
    const { data, error } = await supabase.rpc("settle_betsquad_match", {
      p_match_id: matchId,
      p_requested_winners: winners,
      p_requesting_user: user.id,
    });

    if (error) return json({ error: error.message }, 400);
    return json({ settlement: data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Settlement failed." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
