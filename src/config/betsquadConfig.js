export const BETSQUAD_CONFIG = {
  brandName: "Betsquad",

  betting: {
    minimumStake: 500,
    currency: "NGN",
    adminCommissionPercent: 10,
  },

  payouts: {
    fourPlayer: {
      players: 4,
      winners: 2,
      firstWinnerPercent: 65,
      secondWinnerPercent: 35,
    },

    oneVsOne: {
      players: 2,
      winners: 1,
      winnerPercent: 100,
    },
  },

  community: {
    whatsappUrl: "https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0",
  },

  voice: {
    enabled: true,
    provider: "webrtc",
    recording: false,
  },
};
