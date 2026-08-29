# Betsquad multiplayer architecture

## Source of truth

Paid matches must use Supabase as the shared source of truth. Browser localStorage/window.storage and polling are not authoritative.

## Room lifecycle

1. Authenticated player creates a match for a registered game and player mode.
2. The server validates game status, player capacity and minimum stake.
3. A short room code is generated server-side.
4. Players join the match through authenticated membership.
5. The match becomes `ready` when the required number of players is present.
6. The server-authoritative game session starts.
7. Game actions are validated against the existing engine rules and persisted/broadcast.
8. Realtime broadcasts update every connected client.
9. Presence/reconnect state lets a temporarily disconnected player return to the same match.
10. On completion, placements are recorded and settlement is calculated server-side.

## Settlement configuration

- Minimum stake: ₦500 per player.
- Betsquad commission: 10% of the completed match pool.
- 1v1: one winner receives the entire post-commission prize pool.
- 4-player: two winners; default split is 65% to first place and 35% to second place.

All monetary values are represented in kobo in the database to avoid floating-point currency errors.

## Security requirements

The client must never be trusted to decide the winner, final pool, commission, prize amount or transaction status. These values must be calculated/validated by trusted server-side functions.

Real-money wagering, deposits and withdrawals must only be enabled for jurisdictions and operators where the required legal/licensing and payment-provider requirements are satisfied.
