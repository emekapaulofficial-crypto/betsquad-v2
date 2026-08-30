import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./admin.css";

const demoRequests = [
  { id: 1, type: "deposit", player: "Player One", amount: 5000, reference: "OP-582941", status: "Pending" },
  { id: 2, type: "withdraw", player: "Player Two", amount: 2500, bank: "Access Bank", account: "1234567890", accountName: "Player Two", status: "Pending" },
];

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [requests, setRequests] = useState(demoRequests);
  const [balances, setBalances] = useState({ "Player One": 12000, "Player Two": 7600 });
  const [section, setSection] = useState("overview");
  const [editPlayer, setEditPlayer] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [notice, setNotice] = useState("");
  const pendingDeposits = requests.filter(r => r.type === "deposit" && r.status === "Pending").length;
  const pendingWithdrawals = requests.filter(r => r.type === "withdraw" && r.status === "Pending").length;
  const totalWallet = useMemo(() => Object.values(balances).reduce((a, b) => a + b, 0), [balances]);

  const notify = message => { setNotice(message); setTimeout(() => setNotice(""), 3000); };

  function approve(id) {
    const item = requests.find(r => r.id === id);
    if (!item || item.status !== "Pending") return;
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: item.type === "withdraw" ? "Paid" : "Approved" } : r));
    if (item.type === "deposit") setBalances(prev => ({ ...prev, [item.player]: (prev[item.player] || 0) + item.amount }));
    notify(item.type === "deposit" ? `₦${item.amount.toLocaleString()} credited to ${item.player}.` : `Withdrawal for ${item.player} marked Paid after manual processing.`);
  }

  function reject(id) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Rejected" } : r));
    notify("Request rejected.");
  }

  function adjustWallet() {
    const value = Number(editAmount);
    if (!editPlayer.trim() || !Number.isFinite(value) || value < 0) return notify("Enter a player and a valid non-negative balance.");
    setBalances(prev => ({ ...prev, [editPlayer.trim()]: value }));
    notify(`Wallet balance updated for ${editPlayer.trim()}.`);
    setEditPlayer(""); setEditAmount("");
  }

  if (!authenticated) return <div className="admin-shell login-shell"><div className="login-card"><div className="crown">♛</div><span className="eyebrow">BET SQUAD CONTROL</span><h1>Administrator Console</h1><p>Private operations area for player, match and wallet management.</p><input placeholder="Administrator email" /><input type="password" placeholder="Password" /><button className="admin-primary" onClick={() => setAuthenticated(true)}>Secure Sign In</button><small>Production deployment should enforce this screen with Supabase Auth + an administrator role and database RLS.</small></div></div>;

  return <div className="admin-shell">
    <aside className="sidebar"><div className="admin-brand">BETSQUAD <span>ADMIN</span></div><nav>
      {[["overview","Dashboard"],["deposits","Deposit Requests"],["withdrawals","Withdrawal Requests"],["wallets","Wallet Management"],["players","Players"],["matches","Matches"],["games","Games"],["reports","Reports"]].map(([id,label]) => <button className={section === id ? "nav-item active" : "nav-item"} onClick={() => setSection(id)} key={id}>{label}{id === "deposits" && pendingDeposits > 0 && <b>{pendingDeposits}</b>}{id === "withdrawals" && pendingWithdrawals > 0 && <b>{pendingWithdrawals}</b>}</button>)}
    </nav><button className="logout" onClick={() => setAuthenticated(false)}>Sign out</button></aside>
    <main className="admin-main">{notice && <div className="toast">{notice}</div>}<header className="admin-header"><div><span className="eyebrow">PRIVATE ADMIN AREA</span><h1>{section === "overview" ? "Operations Dashboard" : section.replace("withdrawals", "Withdrawal Requests").replace("deposits", "Deposit Requests").replace("wallets", "Wallet Management")}</h1></div><div className="admin-status">● System ready</div></header>

    {section === "overview" && <><div className="stats"><div><small>PLAYER BALANCES</small><strong>₦{totalWallet.toLocaleString()}</strong><span>Tracked wallet total</span></div><div><small>PENDING DEPOSITS</small><strong>{pendingDeposits}</strong><span>Verify payment before approval</span></div><div><small>PENDING WITHDRAWALS</small><strong>{pendingWithdrawals}</strong><span>Manual payout required</span></div><div><small>PLATFORM POOL</small><strong>₦500</strong><span>Configured starting pool</span></div></div><div className="workflow"><h2>Wallet workflow</h2><div className="steps"><div><i>1</i><strong>Deposit</strong><span>Player pays the configured payment destination and submits a reference.</span></div><div><i>2</i><strong>Verify</strong><span>Admin checks the payment before approving the request.</span></div><div><i>3</i><strong>Credit</strong><span>Approval creates a wallet ledger credit for the requested amount.</span></div><div><i>4</i><strong>Withdraw</strong><span>Player submits payout details; admin pays manually and completes the request.</span></div></div></div></>}

    {(section === "deposits" || section === "withdrawals" || section === "overview") && <section className="requests"><div className="section-head"><div><span className="eyebrow">MONEY OPERATIONS</span><h2>{section === "deposits" ? "Deposit requests" : section === "withdrawals" ? "Withdrawal requests" : "Recent requests"}</h2></div></div>{requests.filter(r => section === "overview" || (section === "deposits" ? r.type === "deposit" : r.type === "withdraw")).map(r => <article className="request" key={r.id}><div className="request-icon">{r.type === "deposit" ? "＋" : "−"}</div><div className="request-info"><strong>{r.player} • ₦{r.amount.toLocaleString()}</strong><span>{r.type === "deposit" ? `OPay reference: ${r.reference}` : `${r.bank} • ${r.account} • ${r.accountName}`}</span></div><span className={`pill ${r.status.toLowerCase()}`}>{r.status}</span>{r.status === "Pending" && <div className="request-buttons"><button onClick={() => approve(r.id)}>Approve</button><button className="danger" onClick={() => reject(r.id)}>Reject</button></div>}</article>)}</section>}

    {section === "wallets" && <section className="panel"><span className="eyebrow">WALLET MANAGEMENT</span><h2>Edit player wallet</h2><p>Set a player's balance from the admin console. In production, every adjustment must create an immutable ledger entry and require the admin role.</p><div className="form-grid"><input value={editPlayer} onChange={e => setEditPlayer(e.target.value)} placeholder="Player name or ID"/><input value={editAmount} onChange={e => setEditAmount(e.target.value)} type="number" min="0" placeholder="New balance (₦)"/><button className="admin-primary" onClick={adjustWallet}>Save Balance</button></div><div className="balance-list">{Object.entries(balances).map(([name,balance]) => <div key={name}><strong>{name}</strong><span>₦{balance.toLocaleString()}</span></div>)}</div></section>}

    {section === "players" && <section className="panel"><span className="eyebrow">PLAYER MANAGEMENT</span><h2>Players</h2><p>Authenticated players, account status and wallet overview will appear here once Supabase Auth and the player tables are connected.</p><div className="empty">Player directory ready for database connection.</div></section>}
    {section === "matches" && <section className="panel"><span className="eyebrow">MATCH CONTROL</span><h2>Matches</h2><p>Monitor active rooms, player presence, results and payouts from one place.</p><div className="empty">Realtime match monitoring ready for connection.</div></section>}
    {section === "games" && <section className="panel"><span className="eyebrow">GAME CATALOGUE</span><h2>Games</h2><div className="game-list"><div>Whot! <span>Enabled</span></div><div>Baize & Brass — Snooker <span>Enabled</span></div><div>Dice Duel <span>Enabled</span></div></div></section>}
    {section === "reports" && <section className="panel"><span className="eyebrow">REPORTING</span><h2>Reports</h2><p>Deposit, withdrawal, match and wallet-ledger reports will be available here.</p></section>}
    </main>
  </div>;
}

createRoot(document.getElementById("admin-root")).render(<App />);
