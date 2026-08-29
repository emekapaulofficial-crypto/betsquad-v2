const DEFAULT_EVENTS = {
  MATCH: "match:update",
  PRESENCE: "presence:sync",
  GAME: "game:action",
};

/**
 * Thin client adapter around a Supabase Realtime channel.
 * Game engines remain responsible for their own rules; this module only
 * transports room/presence/game events.
 */
export function createMatchRoom({ supabase, matchId, userId, events = {} }) {
  if (!supabase) throw new Error("Supabase client is required");
  if (!matchId) throw new Error("matchId is required");
  if (!userId) throw new Error("userId is required");

  const eventNames = { ...DEFAULT_EVENTS, ...events };
  const channelName = `betsquad:match:${matchId}`;
  const channel = supabase.channel(channelName, {
    config: {
      presence: { key: userId },
    },
  });

  const listeners = new Map();

  function on(event, callback) {
    const list = listeners.get(event) || new Set();
    list.add(callback);
    listeners.set(event, list);
    return () => list.delete(callback);
  }

  function emit(event, payload) {
    for (const callback of listeners.get(event) || []) callback(payload);
  }

  channel
    .on("broadcast", { event: eventNames.MATCH }, ({ payload }) => emit(eventNames.MATCH, payload))
    .on("broadcast", { event: eventNames.GAME }, ({ payload }) => emit(eventNames.GAME, payload))
    .on("presence", { event: "sync" }, () => emit(eventNames.PRESENCE, channel.presenceState()))
    .on("presence", { event: "join" }, ({ key, newPresences }) => emit("presence:join", { key, newPresences }))
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => emit("presence:leave", { key, leftPresences }));

  async function join(metadata = {}) {
    const status = await channel.subscribe();
    if (status !== "SUBSCRIBED") throw new Error(`Unable to join match room: ${status}`);
    await channel.track({ userId, online: true, ...metadata });
    return status;
  }

  async function broadcast(event, payload) {
    return channel.send({
      type: "broadcast",
      event,
      payload: { ...payload, senderId: userId, sentAt: new Date().toISOString() },
    });
  }

  async function publishGameAction(action) {
    return broadcast(eventNames.GAME, { action });
  }

  async function publishMatchUpdate(update) {
    return broadcast(eventNames.MATCH, { update });
  }

  async function leave() {
    try { await channel.untrack(); } finally { await supabase.removeChannel(channel); }
    listeners.clear();
  }

  return {
    channel,
    join,
    leave,
    on,
    broadcast,
    publishGameAction,
    publishMatchUpdate,
    getPresence: () => channel.presenceState(),
  };
}
