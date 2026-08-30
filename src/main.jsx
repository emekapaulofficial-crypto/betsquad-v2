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
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [authMode, setAuthMode] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [requests, setRequests] = useState([]);
  const slots = mode === "1v1" ? 2 : 4;
  const roomCode = useMemo(() => Math.random().toString(36).slice(2, 8).toUpperCase(), [room]);

  function showNotice(message) { setNotice(message); setTimeout(() => setNotice(""), 3500); }

  function authenticate() {
    if (!email.trim() || !password) return showNotice("Enter your email and password.");
    setSignedIn(true);
    setAuthMode(null);
    showNotice("Account signed in. Your profile is ready.");
  }

  function createRoom() {
    if (!signedIn) return setAuthMode("signin");
    if (!playerName.trim()) return showNotice("Enter your player name first.");
    setRoom({ code: roomCode, players: [playerName.trim()], max: slots, game: selectedGame.name, mode });
    showNotice(`Room ${roomCode} created. Share this code with your opponent.`);
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
    if (requestType === "deposit" && !reference.trim()) return showNotice("Enter your OPay transaction reference.");
    if (requestType === "withdraw" && (!accountName.trim() || !bankName.trim() || !accountNumber.trim())) return showNotice("Enter the account details the admin should use for payment.");
    const request = {
      id: Date.now(), type: requestType, amount: value, reference: reference.trim(),
      accountName: accountName.trim(), bankName: bankName.trim(), accountNumber: accountNumber.trim(), status: "Pending"
    };
    setRequests(prev => [request, ...prev]);
    showNotice(`${requestType === "deposit" ? "Deposit" : "Withdrawal"} request submitted. Admin review is required.`);
    setRequestType(null); setAmount(""); setReference("");
  }

  function approveRequest(id) {
    const item = requests.find(r => r.id === id);
    if (!item) return;
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Approved" } : r));
    if (item.type === "deposit") setWallet(prev => prev + item.amount);
    showNotice(item.type === "deposit" ? `Deposit approved. ₦${item.amount.toLocaleString()} added to the wallet.` : "Withdrawal approved for manual payout.");
  }

  function rejectRequest(id) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Rejected" } : r));
    showNotice("Request rejected.");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div><div className="brand">BETSQUAD</div><div className="tag">Play. Compete. Win.</div></div>
        <div className="top-actions">
          {signedIn ? <><span className="balance">Wallet: ₦{wallet.toLocaleString()}</span><button onClick={() => {setSignedIn(false); showNotice("Signed out.")}}>Sign Out</button></> : <><button onClick={() => setAuthMode("signin")}>Sign In</button><button className="primary" onClick={() => setAuthMode("signup")}>Create Account</button></>}
          <button onClick={() => window.open("https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0", "_blank")}>WhatsApp</button>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <main>
        <section className="hero"><p className="eyebrow">MULTIPLAYER GAME PLATFORM</p><h1>Play together.<br/><span>Win together.</span></h1><p>Join players from different locations. Your original game engines and rules remain unchanged.</p><div className="hero-actions"><button className="primary big" onClick={() => document.getElementById("games")?.scrollIntoView({behavior:"smooth"})}>Choose a Game</button><button className="ghost big" onClick={() => document.getElementById("wallet")?.scrollIntoView({behavior:"smooth"})}>Open Wallet</button></div></section>

        <section className="rules"><div><strong>Starting pool</strong><span>₦500</span></div><div><strong>1v1</strong><span>One winner</span></div><div><strong>4 Players</strong><span>Two winners</span></div><div><strong>Platform fee</strong><span>10% configured</span></div></section>

        <section className="account-panel"><div><span className="section-kicker">ACCOUNT</span><h2>{signedIn ? "Your Betsquad account" : "Create your player account"}</h2><p>{signedIn ? `Signed in as ${email}. Your game and wallet activity is linked to this account.` : "Sign up so your profile, matches and wallet requests can be linked to you."}</p></div>{!signedIn && <button className="primary" onClick={() => setAuthMode("signup")}>Create Account</button>}</section>

        <section id="wallet" className="wallet-panel"><div><span className="section-kicker">WALLET</span><h2>Money & requests</h2><p>Your balance changes only after an administrator approves a deposit. Withdrawals are reviewed before manual payout.</p></div><div className="wallet-balance"><small>Available balance</small><strong>₦{wallet.toLocaleString()}</strong></div><div className="wallet-actions"><button className="primary" onClick={() => setRequestType("deposit")}>＋ Deposit Request</button><button className="secondary" onClick={() => setRequestType("withdraw")}>− Withdraw Request</button></div></section>

        {requestType && <section className="request-panel"><div className="request-head"><div><span className="section-kicker">WALLET REQUEST</span><h3>{requestType === "deposit" ? "Request a deposit" : "Request a withdrawal"}</h3></div><button className="close-inline" onClick={() => setRequestType(null)}>×</button></div>{requestType === "deposit" ? <div className="payment-destination"><span>PAYMENT DESTINATION</span><strong>OPay</strong><b>Account: 9152926691</b><b>Name: Paul</b><small>Make the payment first. Then submit the amount and your OPay transaction reference. Your wallet is credited only after admin verification.</small></div> : <div className="payment-destination withdrawal"><span>MANUAL PAYOUT DETAILS</span><small>Enter the account where you want the admin to send your approved withdrawal.</small><input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account name"/><input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name"/><input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number"/></div>}<input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Amount (₦)"/><input value={reference} onChange={e => setReference(e.target.value)} placeholder={requestType === "deposit" ? "OPay transaction reference" : "Withdrawal note (optional)"}/><div className="form-actions"><button className="primary" onClick={submitRequest}>Submit {requestType === "deposit" ? "Deposit" : "Withdrawal"} Request</button><button className="ghost" onClick={() => setRequestType(null)}>Cancel</button></div></section>}

        {requests.length > 0 && <section className="history"><span className="section-kicker">MY REQUESTS</span><h2>Wallet request history</h2>{requests.map(r => <div className="history-row" key={r.id}><div><strong>{r.type === "deposit" ? "Deposit" : "Withdrawal"}</strong><small>{new Date(r.id).toLocaleString()}</small></div><strong>₦{r.amount.toLocaleString()}</strong><span className={`status ${r.status.toLowerCase()}`}>{r.status}</span></div>)}</section>}

        <section className="join-panel"><div><span className="section-kicker">MATCH ROOM</span><h2>Join your opponent</h2><p>Have a room code? Your opponent enters the code here to join the same match.</p></div><div className="join-form"><input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter room code" maxLength={8}/><button className="primary" onClick={joinRoom}>Join Room</button></div></section>

        <section id="games" className="games"><div className="section-title"><span className="section-kicker">GAME LOBBY</span><h2>Choose your arena</h2></div>{games.map(game => <article className="card" key={game.slug}><div className="badge">● LIVE READY</div><h2>{game.name}</h2><p>Original rules preserved</p><div className="mode-row">{game.modes.map(m => <button className={selectedGame.slug === game.slug && mode === m ? "mode active" : "mode"} key={m} onClick={() => {setSelectedGame(game);setMode(m);}}>{m}</button>)}</div><button className="primary play" onClick={() => {setSelectedGame(game);setMode(game.modes[0]);document.getElementById("lobby")?.scrollIntoView({behavior:"smooth"});}}>Create Match</button></article>)}</section>

        <section id="lobby" className="lobby"><span className="section-kicker">READY ROOM</span><h2>{selectedGame.name} — {mode}</h2><p>{slots} player slots • Match pool starts at ₦{startingPool}</p><div className="lobby-create"><input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your player name"/><button className="primary" onClick={createRoom}>Create Match Room</button></div>{room && <div className="room"><div><small>YOUR ROOM CODE</small><strong>{room.code}</strong></div><button className="secondary" onClick={() => navigator.clipboard?.writeText(room.code).then(() => showNotice("Room code copied."))}>Copy Code</button><span>{room.players.length}/{room.max} players connected</span><p>Send this code to your opponent. They enter it in the <b>Join your opponent</b> box above.</p></div>}</section>

        <section className="admin-access"><div><span className="section-kicker">PRIVATE AREA</span><h2>Administrator</h2><p>Player accounts cannot manage deposits, withdrawals or game settings. Administration is kept in a separate control area.</p></div><button className="admin-button" onClick={() => setAdminOpen(true)}>Open Admin Console →</button></section>
      </main>

      {adminOpen && <div className="admin-backdrop"><div className="admin-console"><div className="admin-top"><div><span className="section-kicker">BET SQUAD CONTROL</span><h2>Admin Console</h2></div><button onClick={() => setAdminOpen(false)}>×</button></div>{!adminMode ? <div className="admin-login"><div className="admin-icon">♛</div><h3>Administrator access</h3><p>Only an account with the administrator role should be able to enter this console in production.</p><input placeholder="Admin email"/><input type="password" placeholder="Admin password"/><button className="primary" onClick={() => {setAdminMode(true);showNotice("Demo admin console opened. Production access must use Supabase role/RLS enforcement.")}}>Enter Admin Console</button></div> : <><div className="admin-grid"><div><small>PLAYERS</small><strong>Manage accounts</strong></div><div><small>ACTIVE MATCHES</small><strong>Monitor games</strong></div><div><small>DEPOSITS</small><strong>{requests.filter(r=>r.type==="deposit"&&r.status==="Pending").length} pending</strong></div><div><small>WITHDRAWALS</small><strong>{requests.filter(r=>r.type==="withdraw"&&r.status==="Pending").length} pending</strong></div><div><small>WALLET LEDGER</small><strong>Review balances</strong></div><div><small>GAMES</small><strong>Add / disable</strong></div></div><section className="admin-requests"><h3>Deposit & withdrawal requests</h3>{requests.length === 0 ? <p>No requests yet.</p> : requests.map(r => <div className="admin-request" key={r.id}><div><strong>{r.type === "deposit" ? "Deposit" : "Withdrawal"} • ₦{r.amount.toLocaleString()}</strong><small>{r.type === "deposit" ? `OPay ref: ${r.reference || "—"}` : `${r.bankName} • ${r.accountNumber} • ${r.accountName}`}</small></div><span className={`status ${r.status.toLowerCase()}`}>{r.status}</span>{r.status === "Pending" && <div className="request-actions"><button onClick={() => approveRequest(r.id)}>Approve</button><button onClick={() => rejectRequest(r.id)}>Reject</button></div>}</div>)}</section><div className="admin-note"><b>How approval works:</b> Deposit → verify payment → Approve → wallet is credited. Withdrawal → verify request/account → pay manually → mark complete in the production ledger.</div></>}</div></div>}

      {authMode && <div className="modal-backdrop"><div className="modal"><button className="close" onClick={() => setAuthMode(null)}>×</button><div className="modal-logo">B</div><h2>{authMode === "signup" ? "Create your Betsquad account" : "Welcome back"}</h2><p>{authMode === "signup" ? "Your account keeps your player identity, matches and wallet requests together." : "Sign in to continue to your Betsquad dashboard."}</p><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"/>{authMode === "signup" && <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Player name"/>}<button className="primary" onClick={authenticate}>{authMode === "signup" ? "Create Account" : "Sign In"}</button><small>Secure production authentication will be enforced through Supabase Auth.</small></div></div>}
      <footer>Betsquad • Multiplayer platform • Play responsibly</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
