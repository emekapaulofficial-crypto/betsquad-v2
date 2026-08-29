import React, { useEffect, useRef, useState } from "react";
import { createRoomChannel } from "../realtime/roomClient";

export default function MatchRoom({ matchId, playerId, match, onLeave }) {
  const [players, setPlayers] = useState(match?.players ?? []);
  const [voiceJoined, setVoiceJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!matchId) return undefined;
    const channel = createRoomChannel(matchId, {
      onPresenceSync: (state) => {
        const flattened = Object.entries(state).flatMap(([key, entries]) =>
          entries.map((entry) => ({ id: entry.playerId ?? key, ...entry }))
        );
        setPlayers(flattened);
      },
      onMatchUpdate: (payload) => {
        if (payload?.players) setPlayers(payload.players);
      },
    });
    channelRef.current = channel;

    return () => {
      channelRef.current?.leave?.();
      channelRef.current = null;
    };
  }, [matchId]);

  const toggleVoice = async () => {
    // Voice transport is intentionally isolated from game state.
    // The dedicated WebRTC voice implementation will attach to this room.
    setVoiceJoined((value) => !value);
  };

  const leave = () => {
    channelRef.current?.leave?.();
    onLeave?.();
  };

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Betsquad Match</h1>
          <p style={{ marginTop: 0 }}>Room: {matchId || "—"}</p>
        </div>
        <button onClick={leave}>Leave match</button>
      </header>

      <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {players.map((player, index) => (
          <div key={player.id ?? index} style={{ border: "1px solid #ccc", borderRadius: 14, padding: 16 }}>
            <strong>{player.name ?? `Player ${index + 1}`}</strong>
            <div>{player.connected === false ? "Offline" : "Connected"}</div>
            {player.speaking && <div aria-label="Speaking">🎙️ Speaking</div>}
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24, padding: 18, border: "1px solid #ccc", borderRadius: 16 }}>
        <h2>Live Voice</h2>
        <p>Talk with players in this match. Voice is not recorded.</p>
        <button onClick={toggleVoice}>{voiceJoined ? "🔴 Leave voice" : "🎙️ Join voice"}</button>
        {voiceJoined && (
          <button onClick={() => setMuted((value) => !value)} style={{ marginLeft: 8 }}>
            {muted ? "🔇 Unmute microphone" : "🎙️ Mute microphone"}
          </button>
        )}
      </section>

      <section style={{ marginTop: 24, padding: 18, border: "1px solid #ccc", borderRadius: 16 }}>
        <h2>Game area</h2>
        <p>The selected game engine will render here. Game rules remain independent from room and voice networking.</p>
      </section>
    </main>
  );
}
