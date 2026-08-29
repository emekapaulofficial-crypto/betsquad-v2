export const BETSQUAD_GAMES = [
  {
    id: "whot",
    name: "Whot!",
    slug: "whot",
    enabled: true,
    modes: ["1v1", "4-player"],
    maxPlayers: 4,
    winners: {
      "1v1": 1,
      "4-player": 2,
    },
    engine: "whot",
  },

  {
    id: "snooker",
    name: "Baize & Brass Snooker",
    slug: "snooker",
    enabled: true,
    modes: ["1v1", "4-player"],
    maxPlayers: 4,
    winners: {
      "1v1": 1,
      "4-player": 2,
    },
    engine: "snooker",
  },

  {
    id: "dice",
    name: "Dice",
    slug: "dice",
    enabled: true,
    modes: ["1v1", "4-player"],
    maxPlayers: 4,
    winners: {
      "1v1": 1,
      "4-player": 2,
    },
    engine: "dice",
  },
];

export function getGameById(gameId) {
  return BETSQUAD_GAMES.find((game) => game.id === gameId);
}

export function getEnabledGames() {
  return BETSQUAD_GAMES.filter((game) => game.enabled);
}
