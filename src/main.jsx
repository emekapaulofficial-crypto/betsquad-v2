import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const games = [
  { slug: "whot", name: "Whot!", modes: "1v1 / 4 Players", status: "Game engine preserved" },
  { slug: "snooker", name: "Baize & Brass — Snooker", modes: "1v1 / 4 Players", status: "Game engine preserved" },
  { slug: "dice-duel", name: "Dice Duel", modes: "1v1 / 4 Players", status: "Game engine preserved" },
];

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div><div className="brand">BETSQUAD</div><div className="tag">Play. Compete. Win.</div></div>
        <button onClick={() => window.open("https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0", "_blank")}>WhatsApp Chat</button>
      </header>
      <main>
        <section className="hero">
          <p className="eyebrow">MULTIPLAYER GAME PLATFORM</p>
          <h1>Choose your game.</h1>
          <p>Join players from different locations and compete online. The original game rules remain the source of truth.</p>
        </section>
        <section className="rules">
          <div><strong>Starting pool</strong><span>₦500 minimum stake</span></div>
          <div><strong>1v1</strong><span>One winner</span></div>
          <div><strong>4 Players</strong><span>Two winners</span></div>
          <div><strong>Betsquad fee</strong><span>10% of gross pool</span></div>
        </section>
        <section className="games">
          {games.map((game) => (
            <article className="card" key={game.slug}>
              <div className="badge">ONLINE</div>
              <h2>{game.name}</h2>
              <p>{game.modes}</p>
              <small>{game.status}</small>
              <button className="play" onClick={() => alert("Game integration is being connected to the original engine. No game rules have been changed.")}>Open Game</button>
            </article>
          ))}
        </section>
      </main>
      <footer>Betsquad • Multiplayer platform foundation</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
