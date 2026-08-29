import React, { useMemo, useState } from "react";
import { BETSQUAD_GAMES } from "../config/games";
import { BETSQUAD_CONFIG } from "../config/betsquadConfig";

export default function PlayerLobby({ onCreateMatch, onJoinMatch }) {
  const [selectedGame, setSelectedGame] = useState(BETSQUAD_GAMES[0]?.id ?? "");
  const [mode, setMode] = useState("1v1");
  const [stake, setStake] = useState(BETSQUAD_CONFIG.betting.minimumStake);
  const [roomCode, setRoomCode] = useState("");

  const game = useMemo(() => BETSQUAD_GAMES.find((item) => item.id === selectedGame), [selectedGame]);
  const maxStake = 1000000;
  const validStake = Number(stake) >= BETSQUAD_CONFIG.betting.minimumStake && Number(stake) <= maxStake;

  function createMatch() {
    if (!game || !validStake) return;
    onCreateMatch?.({ gameId: game.id, mode, stake: Number(stake) });
  }

  function joinMatch() {
    const code = roomCode.trim();
    if (!code) return;
    onJoinMatch?.(code);
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Betsquad</h1>
          <p style={{ marginTop: 0 }}>Choose a game and enter a match.</p>
        </div>
        <a href={BETSQUAD_CONFIG.community.whatsappUrl} target="_blank" rel="noreferrer">
          💬 Join Betsquad on WhatsApp
        </a>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginTop: 24 }}>
        {BETSQUAD_GAMES.filter((item) => item.enabled).map((item) => (
          <button key={item.id} onClick={() => { setSelectedGame(item.id); setMode(item.modes[0]); }} style={{ padding: 20, textAlign: "left", borderRadius: 14, border: selectedGame === item.id ? "2px solid currentColor" : "1px solid #ccc", background: "transparent" }}>
            <strong>{item.name}</strong>
            <div>{item.modes.join(" · ")}</div>
          </button>
        ))}
      </section>

      {game && (
        <section style={{ marginTop: 28, padding: 20, border: "1px solid #ccc", borderRadius: 16 }}>
          <h2>{game.name}</h2>
          <label>
            Mode
            <select value={mode} onChange={(event) => setMode(event.target.value)} style={{ display: "block", marginTop: 6, padding: 10 }}>
              {game.modes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label style={{ display: "block", marginTop: 16 }}>
            Stake (NGN)
            <input type="number" min={BETSQUAD_CONFIG.betting.minimumStake} value={stake} onChange={(event) => setStake(event.target.value)} style={{ display: "block", marginTop: 6, padding: 10 }} />
          </label>
          {!validStake && <p role="alert">Minimum stake is ₦{BETSQUAD_CONFIG.betting.minimumStake.toLocaleString()}.</p>}
          <button disabled={!validStake} onClick={createMatch} style={{ marginTop: 16, padding: "12px 18px" }}>Create Match</button>
        </section>
      )}

      <section style={{ marginTop: 28, padding: 20, border: "1px solid #ccc", borderRadius: 16 }}>
        <h2>Join a private match</h2>
        <input value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="Enter room code" style={{ padding: 10, marginRight: 8 }} />
        <button onClick={joinMatch}>Join Match</button>
      </section>
    </main>
  );
}
