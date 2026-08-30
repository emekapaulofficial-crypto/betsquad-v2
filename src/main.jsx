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
  const [authMode, setAuthMode] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const slots = mode === "1v1" ? 2 : 4;
  const roomCode = useMemo(() => Math.random().toString(36).slice(2, 8).toUpperCase(), [room]);

  function showNotice(message) { setNotice(message); setTimeout(() => setNotice(""), 3500); }

  function authenticate() {
    if (!email.trim() || !password) return showNotice("Enter your email and password.");
    setSignedIn(true);
    setAuthMode(null);
    showNotice("Account signed in successfully.");
  }

  function createRoom() {
    if (!signedIn) return setAuthMode("signin");
    if (!playerName.trim()) return showNotice("Enter your player name first.");
    setRoom({ code: roomCode, players: [playerName.trim()], max: slots, game: selectedGame.name, mode });
    showNotice(`Room ${roomCode} created. Share the code with your opponent.`);
  }

  function joinRoom() {
    if (!signedIn) return setAuthMode("signin");
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return showNotice("Enter the room code you received.");
    setRoom({ code, players: ["You", "Opponent"], max: slots, game: selectedGame.name, mode });
    showNotice(`Joined room ${code}.`);
    document.getElementById("lobby")?.scrollIntoView({ behavior: "smooth" });
  }

  function submitRequest() {
    const value = Number(amount);
    if (!signedIn) return setAuthMode("signin");
    if (!value || value <= 0) return showNotice("Enter a valid amount.");
    showNotice(`${requestType === "deposit" ? "Deposit" : "Withdrawal"} request submitted for ₦${value.toLocaleString()}. It is pending admin verification.`);
    setRequestType(null); setAmount(""); setReference("");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div><div className="brand">BETSQUAD</div><div className="tag">Play. Compete. Win.</div></div>
        <div className="top-actions">
          {signedIn ? <><span className="balance">Wallet: ₦{wallet.toLocaleString()}</span><button onClick={() => {setSignedIn(false); showNotice("Signed out.")}}>Sign Out</button></> : <><button onClick={() => setAuthMode("signin")}>Sign In</button><button onClick={() => setAuthMode("signup")}>Create Account</button></>}
          <button onClick={() => window.open("https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0", "_blank")}>WhatsApp Chat</button>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <main>
        <section className="hero"><p className="eyebrow">MULTIPLAYER GAME PLATFORM</p><h1>Choose your game.</h1><p>Join players from different locations. Original game engines and rules remain unchanged.</p></section>
        <section className="rules"><div><strong>Starting pool</strong><span>₦500</span></div><div><strong>1v1</strong><span>One winner</span></div><div><strong>4 Players</strong><span>Two winners</span></div><div><strong>Platform fee</strong><span>10% configured</span></div></section>

        <section className="account-panel">
          <div><h2>{signedIn ? "Your Betsquad account" : "Join Betsquad"}</h2><p>{signedIn ? `Signed in as ${email}` : "Create an account to keep your profile, matches and wallet requests linked to you."}</p></div>
          {!signedIn && <div><button onClick={() => setAuthMode("signup")}>Sign Up</button><button onClick={() => setAuthMode("signin")}>Sign In</button></div>}
        </section>

        <section className="wallet-panel"><div><h2>Wallet</h2><p>Deposit and withdrawal requests are reviewed by the administrator.</p></div><div><button onClick={() => setRequestType("deposit")}>Deposit Request</button><button onClick={() => setRequestType("withdraw")}>Withdraw Request</button></div></section>
        {requestType && <section className="request-panel"><h3>{requestType === "deposit" ? "Deposit request" : "Withdrawal request"}</h3>{requestType === "deposit" && <div className="payment-destination"><strong>OPay payment destination</strong><span>Account: 9152926691</span><span>Name: Paul</span><small>Make your payment, then enter your transaction reference below. Admin verification is required before funds are credited.</small></div>}<input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Amount (₦)"/><input value={reference} onChange={e => setReference(e.target.value)} placeholder={requestType === "deposit" ? "OPay transaction reference" : "Withdrawal note"}/><button onClick={submitRequest}>Submit Request</button> <button onClick={() => setRequestType(null)}>Cancel</button></section>}

        <section className="join-panel"><div><h2>Join a Match</h2><p>Have a room code from your opponent? Enter it here.</p></div><div className="join-form"><input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter room code (e.g. K7P4X2)" maxLength={8}/><button className="play" onClick={joinRoom}>Join Room</button></div></section>

        <section className="games">{games.map(game => <article className="card" key={game.slug}><div className="badge">ONLINE</div><h2>{game.name}</h2><p>Original rules preserved</p><div>{game.modes.map(m => <button key={m} onClick={() => {setSelectedGame(game);setMode(m);}}>{m}</button>)}</div><button className="play" onClick={() => {setSelectedGame(game);setMode(game.modes[0]);document.getElementById("lobby")?.scrollIntoView({behavior:"smooth"});}}>Create Match</button></article>)}</section>

        <section id="lobby" className="lobby"><h2>{selectedGame.name} — {mode}</h2><p>{slots} player slots • Match pool starts at ₦{startingPool}</p><input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your player name"/><button className="play" onClick={createRoom}>Create Match Room</button>{room && <div className="room"><strong>ROOM CODE: {room.code}</strong><button onClick={() => navigator.clipboard?.writeText(room.code).then(() => showNotice("Room code copied."))}>Copy Code</button><span>{room.players.length}/{room.max} players connected</span><span>Send this code to your opponent so they can use the Join Match box above.</span><button onClick={() => showNotice(room.players.length >= room.max ? "Match is ready to start." : `Waiting for ${room.max - room.players.length} more player(s).`)}>Check Match</button></div>}</section>

        <section className="admin-entry"><button onClick={() => setAdminOpen(!adminOpen)}>⚙ Admin Panel</button>{adminOpen && <div className="admin-panel"><h2>Betsquad Admin</h2><p>Protected administration area</p><div className="admin-grid"><button>Players</button><button>Active Matches</button><button>Deposit Requests</button><button>Withdrawal Requests</button><button>Wallet Ledger</button><button>Games / Add Game</button><button>Reports</button><button>Platform Settings</button></div><small>Production admin access should be enforced by Supabase roles/RLS before cash operations are enabled.</small></div>}</section>
      </main>

      {authMode && <div className="modal-backdrop"><div className="modal"><button className="close" onClick={() => setAuthMode(null)}>×</button><h2>{authMode === "signup" ? "Create your Betsquad account" : "Sign in to Betsquad"}</h2><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"/>{authMode === "signup" && <input placeholder="Player name" onChange={e => setPlayerName(e.target.value)}/>}<button className="play" onClick={authenticate}>{authMode === "signup" ? "Create Account" : "Sign In"}</button><small>Account persistence and secure authentication should be connected to the Betsquad Supabase project before production launch.</small></div></div>}

      <footer>Betsquad • Multiplayer platform</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
