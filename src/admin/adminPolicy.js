export const ADMIN_PERMISSIONS = Object.freeze([
  "view_dashboard",
  "view_matches",
  "manage_matches",
  "view_players",
  "manage_players",
  "manage_games",
  "view_earnings",
  "manage_settings",
]);

export function hasPermission(permissions, permission) {
  return Array.isArray(permissions) && permissions.includes(permission);
}

export function summarizeAdminMetrics({ matches = [], players = [], earnings = [] } = {}) {
  return {
    totalMatches: matches.length,
    activeMatches: matches.filter((m) => ["waiting", "ready", "playing"].includes(m.status)).length,
    finishedMatches: matches.filter((m) => ["finished", "settled"].includes(m.status)).length,
    totalPlayers: players.length,
    platformEarnings: earnings.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };
}
