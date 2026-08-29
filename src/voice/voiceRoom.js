export function bindVoiceSignaling(channel, voiceController, getPlayerId) {
  if (!channel) throw new Error("A realtime match channel is required.");

  const handler = async ({ payload }) => {
    const from = payload?.from;
    if (!from || from === getPlayerId?.()) return;
    await voiceController.handleSignal(from, payload.message);
  };

  channel.on?.("broadcast", { event: "voice-signal" }, handler);

  return () => {
    channel.off?.("broadcast", { event: "voice-signal" }, handler);
  };
}

export function sendVoiceSignal(channel, playerId, to, message) {
  return channel?.send?.({
    type: "broadcast",
    event: "voice-signal",
    payload: { from: playerId, to, message },
  });
}
