import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabase";
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
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [notice, setNotice] = useState("");
  const [requests, setRequests] = useState([]);
  const [authBusy, setAuthBusy] = useState(false);
  const [roomChannel, setRoomChannel] = useState(null);
  const slots = mode === "1v1" ? 2 : 4;

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
  }

  // Restore the Supabase session before the UI decides whether a player is signed in.
  // This prevents the brief signed-out state that was causing protected actions to
  // repeatedly open the sign-in dialog after navigation/back/reload.
  useEffect(() => {
    let mounted = true;
    let subscription;

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;
        const session = data?.session;
        const user = session?.user || null;
        setCurrentUser(user);
        setSignedIn(!!user);
        setEmail(user?.email || "");
        if (user?.user_metadata?.player_name && !playerName) {
          setPlayerName(user.user_metadata.player_name);
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
          setSignedIn(false);
        }
      } finally {
        if (mounted) setAuthReady(true);
      }
    }

    restoreSession();
    const result = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user || null;
      setCurrentUser(user);
      setSignedIn(!!user);
      setEmail(user?.email || "");
      if (user?.user_metadata?.player_name && !playerName) {
        setPlayerName(user.user_metadata.player_name);
      }
      if (!user && authReady) setAuthMode(null);
    });
    subscription = result.data.subscription;

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
    // The auth listener should be installed once; playerName/authReady are intentionally
    // not dependencies because changing them must not recreate the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always ask Supabase for the current authenticated user before protected actions.
  // React state can briefly lag behind the persisted Supabase session after navigation.
  async function requireAuth() {
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user || null;
    if (error || !user) {
      setCurrentUser(null);
      setSignedIn(false);
      setAuthMode("signin");
      return null;
    }
    setCurrentUser(user);
    setSignedIn(true);
    setEmail(user.email || "");
    if (user.user_metadata?.player_name && !playerName) {
      setPlayerName(user.user_metadata.player_name);
    }
    return user;
  }

  async function authenticate() {
    if (authBusy) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return showNotice("Enter your email and password.");
    if (authMode === "signup" && password.length < 6) return showNotice("Password must be at least 6 characters.");
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return showNotice("Enter a valid email address.");
    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { player_name: playerName.trim() } },
        });
        if (error) throw error;
        setPassword("");
        if (data?.session?.user) {
          setCurrentUser(data.session.user);
          setSignedIn(true);
          setEmail(data.session.user.email || cleanEmail);
          setAuthMode(null);
          showNotice("Account created and signed in.");
        } else {
          setAuthMode(null);
          showNotice("Account created. Check your email to confirm it before signing in.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error || !data?.session || !data?.user) {
          setCurrentUser(null);
          setSignedIn(false);
          throw new Error("Incorrect email or password.");
        }
        setCurrentUser(data.user);
        setEmail(data.user.email || cleanEmail);
        setPassword("");
        setAuthMode(null);
        setSignedIn(true);
        showNotice("Sign in successful.");
      }
    } catch (error) {
      setSignedIn(false);
      setCurrentUser(null);
      showNotice(authMode === "signin" ? "Incorrect email or password." : (error?.message || "Unable to authenticate."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (roomChannel) {
      try { await roomChannel.untrack(); } catch {}
      await supabase.removeChannel(roomChannel);
      setRoomChannel(null);
    }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return showNotice(error.message);
    setCurrentUser(null);
    setSignedIn(false);
    setEmail("");
    setPassword("");
    setWallet(0);
    setRequests([]);
    setRoom(null);
    setAuthMode(null);
    showNotice("You have been signed out.");
  }

  async function openRoomChannel(roomId, userId, displayName, existingPlayers = []) {
    if (roomChannel) await supabase.removeChannel(roomChannel);
    const channel = supabase.channel(`betsquad:game-room:${roomId}`, { config: { presence: { key: userId } } });
    const syncPlayers = () => {
      const state = channel.presenceState();
      const list = Object.values(state).flat().map((entry) => ({ id: entry.userId, name: entry.displayName || "Player" }));
      setRoom((current) => current ? { ...current, players: list.length ? list : existingPlayers } : current);
    };
    channel.on("presence", { event: "sync" }, syncPlayers);
    channel.on("presence", { event: "join" }, syncPlayers);
    channel.on("presence", { event: "leave" }, syncPlayers);
    const status = await channel.subscribe();
    if (status !== "SUBSCRIBED") throw new Error(`Unable to connect to room: ${status}`);
    await channel.track({ userId, displayName, online: true });
    setRoomChannel(channel);
    syncPlayers();
  }

  async function createRoom() {
    const user = await requireAuth();
    if (!user) return;
    if (!playerName.trim()) return showNotice("Enter your player name first.");
    try {
      const { data, error } = await supabase.rpc("create_betsquad_room", {
        p_game_type: selectedGame.slug,
        p_mode: mode === "1v1" ? "1v1" : "4-player",
        p_stake: Number(startingPool),
        p_display_name: playerName.trim(),
      });
      if (error) throw error;
      const created = data?.room || data;
      setRoom({ id: created.id, code: created.code, players: [{ id: user.id, name: playerName.trim() }], max: created.max_players || slots, game: selectedGame.name, mode });
      await openRoomChannel(created.id, user.id, playerName.trim());
      showNotice(`Room ${created.code} created. Share this code with your opponent.`);
    } catch (error) {
      showNotice(error?.message || "Unable to create room. Please try again.");
    }
  }

  async function joinRoom() {
    const user = await requireAuth();
    if (!user) return;
    const code = joinCode.trim().toUpperCase().replace(/[\s-]/g, "");
    if (code.length < 4) return showNotice("Enter the room code you received.");
    try {
      const { data, error } = await supabase.rpc("join_betsquad_room", {
        p_room_code: code,
        p_display_name: playerName.trim() || "Player",
      });
      if (error) throw error;
      const joined = data?.room || data;
      const members = data?.players || [];
      const playerList = members.map((item) => ({ id: item.user_id, name: item.display_name || "Player" }));
      setRoom({ id: joined.id, code: joined.code, players: playerList, max: joined.max_players, game: joined.game_type, mode: joined.max_players === 2 ? "1v1" : "4 Players" });
      await openRoomChannel(joined.id, user.id, playerName.trim() || "Player", playerList);
      showNotice(`Joined room ${joined.code}. You are now in the same live room.`);
      document.getElementById("lobby")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      showNotice(error?.message || "Room not found or no seat is available.");
    }
  }

  async function submitRequest() {
    const user = await requireAuth();
    if (!user) return;
    const value = Number(amount);
    if (!value || value <= 0) return showNotice("Enter a valid amount.");
    if (requestType === "deposit" && !reference.trim()) return showNotice("Enter your OPay transaction reference.");
    if (requestType === "withdraw" && (!accountName.trim() || !bankName.trim() || !accountNumber.trim())) return showNotice("Enter the account details the admin should use for payment.");
    if (requestType === "withdraw" && value > wallet) return showNotice("Withdrawal amount is greater than your available wallet balance.");
    const request = { id: Date.now(), type: requestType, amount: value, reference: reference.trim(), accountName: accountName.trim(), bankName: bankName.trim(), accountNumber: accountNumber.trim(), status: "Pending" };
    setRequests(prev => [request, ...prev]);
    if (requestType === "withdraw") setWallet(prev => prev - value);
    showNotice(`${requestType === "deposit" ? "Deposit" : "Withdrawal"} request submitted. ${requestType === "withdraw" ? "The amount is reserved while pending." : "Admin review is required."}`);
    setRequestType(null);
    setAmount("");
    setReference("");
  }

  const showSignedInUI = authReady && signedIn;

  return (
    <div className="app">
      <header className="topbar"><div><div className="brand">BETSQUAD</div><div className="tag">Play. Compete. Win.</div></div><div className="top-actions">{!authReady ? <span className="balance">Checking account…</span> : showSignedInUI ? <><span className="balance">Wallet: ₦{wallet.toLocaleString()}</span><button onClick={signOut}>Sign Out</button></> : <><button onClick={() => setAuthMode("signin")}>Sign In</button><button className="primary" onClick={() => setAuthMode("signup")}>Create Account</button></>}<button onClick={() => window.open("https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0", "_blank")}>WhatsApp</button></div></header>
      {notice && <div className="notice">{notice}</div>}
      <main>
        <section className="hero"><p className="eyebrow">MULTIPLAYER GAME PLATFORM</p><h1>Play together.<br/><span>Win together.</span></h1><p>Join players from different locations. Your original game engines and rules remain unchanged.</p><div className="hero-actions"><button className="primary big" onClick={() => document.getElementById("games")?.scrollIntoView({behavior:"smooth"})}>Choose a Game</button><button className="ghost big" onClick={() => document.getElementById("wallet")?.scrollIntoView({behavior:"smooth"})}>Open Wallet</button></div></section>
        <section className="rules"><div><strong>Starting pool</strong><span>₦500</span></div><div><strong>1v1</strong><span>One winner</span></div><div><strong>4 Players</strong><span>Two winners</span></div><div><strong>Platform fee</strong><span>10% configured</span></div></section>
        <section className="account-panel"><div><span className="section-kicker">ACCOUNT</span><h2>{showSignedInUI ? "Your Betsquad account" : "Create your player account"}</h2><p>{showSignedInUI ? `Signed in as ${email}. Your game and wallet activity is linked to this account.` : "Sign up so your profile, matches and wallet requests can be linked to you."}</p></div>{!showSignedInUI && authReady && <button className="primary" onClick={() => setAuthMode("signup")}>Create Account</button>}</section>
        <section id="wallet" className="wallet-panel"><div><span className="section-kicker">WALLET</span><h2>Money & requests</h2><p>Your balance changes only after an administrator approves a deposit. Withdrawals are reviewed before manual payout.</p></div><div className="wallet-balance"><small>Available balance</small><strong>₦{wallet.toLocaleString()}</strong></div><div className="wallet-actions"><button className="primary" onClick={() => setRequestType("deposit")}>＋ Deposit Request</button><button className="secondary" onClick={() => setRequestType("withdraw")}>− Withdraw Request</button></div></section>
        {requestType && <section className="request-panel"><div className="request-head"><div><span className="section-kicker">WALLET REQUEST</span><h3>{requestType === "deposit" ? "Request a deposit" : "Request a withdrawal"}</h3></div><button className="close-inline" onClick={() => setRequestType(null)}>×</button></div>{requestType === "deposit" ? <div className="payment-destination"><span>PAYMENT DESTINATION</span><strong>OPay</strong><b>Account: 9152926691</b><b>Name: Paul</b><small>Make the payment first. Then submit the amount and your OPay transaction reference. Your wallet is credited only after admin verification.</small></div> : <div className="payment-destination withdrawal"><span>MANUAL PAYOUT DETAILS</span><small>Enter the account where you want the admin to send your approved withdrawal.</small><input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account name"/><input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name"/><input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number"/></div>}<input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Amount (₦)"/><input value={reference} onChange={e => setReference(e.target.value)} placeholder={requestType === "deposit" ? "OPay transaction reference" : "Withdrawal note (optional)"}/><div className="form-actions"><button className="primary" onClick={submitRequest}>Submit {requestType === "deposit" ? "Deposit" : "Withdrawal"} Request</button><button className="ghost" onClick={() => setRequestType(null)}>Cancel</button></div></section>}
        {requests.length > 0 && <section className="history"><span className="section-kicker">MY REQUESTS</span><h2>Wallet request history</h2>{requests.map(r => <div className="history-row" key={r.id}><div><strong>{r.type === "deposit" ? "Deposit" : "Withdrawal"}</strong><small>{new Date(r.id).toLocaleString()}</small></div><strong>₦{r.amount.toLocaleString()}</strong><span className={`status ${r.status.toLowerCase()}`}>{r.status}</span></div>)}</section>}
        <section className="join-panel"><div><span className="section-kicker">MATCH ROOM</span><h2>Join your opponent</h2><p>Have a room code? Enter it here to join the same live match.</p></div><div className="join-form"><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter room code" maxLength={8}/><button className="primary" onClick={joinRoom}>Join Room</button></div></section>
        <section id="games" className="games"><div className="section-title"><span className="section-kicker">GAME LOBBY</span><h2>Choose your arena</h2></div>{games.map(game => <article className="card" key={game.slug}><div className="badge">● LIVE READY</div><h2>{game.name}</h2><p>Original rules preserved</p><div className="mode-row">{game.modes.map(m => <button className={selectedGame.slug === game.slug && mode === m ? "mode active" : "mode"} key={m} onClick={() => {setSelectedGame(game);setMode(m);}}>{m}</button>)}</div><button className="primary play" onClick={() => {setSelectedGame(game);setMode(game.modes[0]);document.getElementById("lobby")?.scrollIntoView({behavior:"smooth"});}}>Create Match</button></article>)}</section>
        <section id="lobby" className="lobby"><span className="section-kicker">READY ROOM</span><h2>{selectedGame.name} — {mode}</h2><p>{slots} player slots • Match pool starts at ₦{startingPool}</p><div className="lobby-create"><input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your player name"/><button className="primary" onClick={createRoom}>Create Match Room</button></div>{room && <div className="room"><div><small>LIVE ROOM CODE</small><strong>{room.code}</strong></div><button className="secondary" onClick={() => navigator.clipboard?.writeText(room.code).then(() => showNotice("Room code copied."))}>Copy Code</button><span>{room.players.length}/{room.max} players connected</span><div className="room-players">{room.players.map((player, index) => <span key={player.id || index}>🟢 {player.name}</span>)}</div><p>Send this code to your opponent. They enter it above. Both devices stay connected to the same live room.</p></div>}</section>
      </main>
      {authMode && <div className="modal-backdrop"><div className="modal"><button className="close" onClick={() => !authBusy && setAuthMode(null)}>×</button><div className="modal-logo">B</div><h2>{authMode === "signup" ? "Create your Betsquad account" : "Welcome back"}</h2><p>{authMode === "signup" ? "Create a real account. Your password is checked by secure authentication." : "Your password is verified by Supabase. Incorrect credentials will not sign you in."}</p><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email"/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (6+ characters)" autoComplete={authMode === "signup" ? "new-password" : "current-password"}/>{authMode === "signup" && <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Player name" autoComplete="name"/>}<button className="primary" disabled={authBusy} onClick={authenticate}>{authBusy ? "Checking…" : authMode === "signup" ? "Create Account" : "Sign In"}</button><small>Authentication is handled by Supabase Auth. This website does not store your password.</small></div></div>}
      <footer>Betsquad • Multiplayer platform • Play responsibly</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
