import React, { useEffect, useState } from "react";
import { addGame, listGames, setGameEnabled } from "./gameCatalogService";

export default function GameManager() {
  const [games, setGames] = useState([]);
  const [form, setForm] = useState({ slug: "", name: "", description: "", engineKey: "", enabled: true });
  const [error, setError] = useState("");

  const refresh = async () => {
    try { setGames(await listGames({ includeDisabled: true })); setError(""); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { refresh(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await addGame(form);
      setForm({ slug: "", name: "", description: "", engineKey: "", enabled: true });
      await refresh();
    } catch (err) { setError(err.message); }
  };

  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h2>Game Manager</h2>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input required placeholder="Game slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input required placeholder="Game name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required placeholder="Engine key" value={form.engineKey} onChange={(e) => setForm({ ...form, engineKey: e.target.value })} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="submit">Add game</button>
      </form>
      <div style={{ marginTop: 20 }}>
        {games.map((game) => (
          <article key={game.id} style={{ padding: 14, border: "1px solid #ccc", borderRadius: 10, marginTop: 8 }}>
            <strong>{game.name}</strong> — {game.slug} — {game.enabled ? "Enabled" : "Disabled"}
            <button style={{ marginLeft: 10 }} onClick={async () => { await setGameEnabled(game.id, !game.enabled); await refresh(); }}>
              {game.enabled ? "Disable" : "Enable"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
