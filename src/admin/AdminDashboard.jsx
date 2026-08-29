import React from "react";
import { ADMIN_PERMISSIONS, hasPermission, summarizeAdminMetrics } from "./adminPolicy";

export default function AdminDashboard({ adminPermissions = [], matches = [], players = [], earnings = [], onManageGames, onManageMatches, onManagePlayers }) {
  const metrics = summarizeAdminMetrics({ matches, players, earnings });

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header>
        <h1>Betsquad Admin</h1>
        <p>Platform operations and monitoring.</p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {[
          ["Total matches", metrics.totalMatches],
          ["Active matches", metrics.activeMatches],
          ["Finished matches", metrics.finishedMatches],
          ["Players", metrics.totalPlayers],
          ["Platform earnings", `₦${metrics.platformEarnings.toLocaleString()}`],
        ].map(([label, value]) => (
          <article key={label} style={{ border: "1px solid #ccc", borderRadius: 14, padding: 16 }}>
            <div>{label}</div><strong>{value}</strong>
          </article>
        ))}
      </section>

      <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
        {hasPermission(adminPermissions, "manage_matches") && <button onClick={onManageMatches}>Manage matches</button>}
        {hasPermission(adminPermissions, "manage_players") && <button onClick={onManagePlayers}>Manage players</button>}
        {hasPermission(adminPermissions, "manage_games") && <button onClick={onManageGames}>Manage games</button>}
      </section>

      <details style={{ marginTop: 24 }}>
        <summary>Admin permissions</summary>
        <ul>{ADMIN_PERMISSIONS.map((permission) => <li key={permission}>{permission}</li>)}</ul>
      </details>
    </main>
  );
}
