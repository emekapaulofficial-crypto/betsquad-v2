export const SETTLEMENT_POLICY = Object.freeze({
  currency: "NGN",
  minimumStake: 500,
  platformCommissionPercent: 10,
  fourPlayer: Object.freeze({
    players: 4,
    winners: 2,
    firstWinnerPercentOfPrizePool: 65,
    secondWinnerPercentOfPrizePool: 35,
  }),
  oneVsOne: Object.freeze({
    players: 2,
    winners: 1,
    winnerPercentOfPrizePool: 100,
  }),
});

export function calculateSettlement(stake, mode) {
  const amount = Number(stake);
  if (!Number.isFinite(amount) || amount < SETTLEMENT_POLICY.minimumStake) {
    throw new Error(`Stake must be at least ₦${SETTLEMENT_POLICY.minimumStake}.`);
  }

  const playerCount = mode === "1v1" ? 2 : mode === "4-player" ? 4 : 0;
  if (!playerCount) throw new Error("Unsupported match mode.");

  const grossPool = amount * playerCount;
  const commission = Math.floor(grossPool * SETTLEMENT_POLICY.platformCommissionPercent / 100);
  const prizePool = grossPool - commission;

  if (mode === "1v1") {
    return { grossPool, commission, prizePool, payouts: [prizePool] };
  }

  const first = Math.floor(prizePool * 65 / 100);
  const second = prizePool - first;
  return { grossPool, commission, prizePool, payouts: [first, second] };
}
