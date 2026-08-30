import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const games = [
  { slug: "whot", name: "Whot!", modes: ["1v1", "4 Players"] },
  { slug: "snooker", name: "Baize & Brass — Snooker", modes: ["1v1", "4 Players"] },
  { slug: "dice-duel", name: "Dice Duel", modes: ["1v1", "4 Players"] },
];
const startingPool = 500;

function App() {
  const [selectedGame, setSelectedGame] = useState(games[0]);
  const [mode, setMode] = useState("1v1");
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [wallet, setWallet] = useState(0);
  const [requestType, setRequestType] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const slots = mode === "1v1" ? 2 : 4;
  const roomCode = useMemo(() => Math.random().toString(36).slice(2, 8).toUpperCase(), [room]);

  function createRoom() {
    if (!playerName.trim()) return alert("Enter your player name first.");
    setRoom({ code: roomCode, players: [playerName.trim()], max: slots, game: selectedGame.name, mode });
  }
  function submitRequest() {
    const value = Number(amount);
    if (!value || value <= 0) return alert("Enter a valid amount.");
    alert(`${requestType === "deposit" ? "Deposit" : "Withdrawal"} request submitted for ₦${value.toLocaleString()}. Admin verification is required before the wallet changes.`);
    setRequestType(null); setAmount(""); setReference("");
  }
  return (
    <div className="app">
      <header className="topbar">
        <div><div className="brand">BETSQUAD</div><div className="tag">Play. Compete. Win.</div></div>
        <div><span className="balance">Wallet: ₦{wallet.toLocaleString()}</span> <button onClick={() => window.open("https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0", "_blank")}>WhatsApp Chat</button></div>
      </header>
      <main>
        <section className="hero"><p className="eyebrow">MULTIPLAYER GAME PLATFORM</p><h1>Choose your game.</h1><p>Join players from different locations. Original game engines and rules remain unchanged.</p></section>
        <section className="rules"><div><strong>Starting pool</strong><span>₦500</span></div><div><strong>1v1</strong><span>One winner</span></div><div><strong>4 Players</strong><span>Two winners</span></div><div><strong>Platform fee</strong><span>10% configured</span></div></section>
        <section className="wallet-panel"><div><h2>Wallet</h2><p>Deposit and withdrawal requests are reviewed by the administrator.</p></div><div><button onClick={() => setRequestType("deposit")}>Deposit Request</button><button onClick={() => setRequestType("withdraw")}>Withdraw Request</button></div></section>
        {requestType && <section className="request-panel"><h3>{requestType === "deposit" ? "Deposit request" : "Withdrawal request"}</h3>{requestType === "deposit" && <div className="payment-destination"><strong>OPay payment destination</strong><span>Account: 9152926691</span><span>Name: Paul</span><small>Submit your transaction reference after payment. Admin verification is required.</small></div>}<input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Amount (₦)"/><input value={reference} onChange={e => setReference(e.target.value)} placeholder={requestType === "deposit" ? "OPay transaction reference" : "Optional note"}/><button onClick={submitRequest}>Submit Request</button> <button onClick={() => setRequestType(null)}>Cancel</button></section>}
        <section className="games">{games.map(game => <article className="card" key={game.slug}><div className="badge">ONLINE</div><h2>{game.name}</h2><p>Original rules preserved</p><div>{game.modes.map(m => <button key={m} onClick={() => {setSelectedGame(game);setMode(m);}}>{m}</button>)}</div><button className="play" onClick={() => {setSelectedGame(game);setMode(game.modes[0]);document.getElementById("lobby").scrollIntoView({behavior:"smooth"});}}>Create Match</button></article>)}</section>
        <section id="lobby" className="lobby"><h2>{selectedGame.name} — {mode}</h2><p>{slots} player slots • Match pool starts at ₦{startingPool}</p><input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your player name"/><button className="play" onClick={createRoom}>Create Match Room</button>{room && <div className="room"><strong>Room {room.code}</strong><span>{room.players.length}/{room.max} players connected</span><span>Share the room code with the other players.</span><button onClick={() => alert("Room created. Server-side realtime matchmaking is the next connection layer.")}>Enter Match</button></div>}</section>
      </main><footer>Betsquad • Multiplayer platform</footer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
