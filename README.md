# Betsquad

Betsquad is a multiplayer game platform built around the existing game engines supplied by the project owner.

## Core product rules

- Minimum entry stake: ₦500
- Platform commission: 10% of each completed paid match pool
- Four-player games: 4 players, 2 winners
- One-versus-one games: 2 players, 1 winner
- For two-winner games, first place receives more than second place
- Existing game rules are preserved; platform infrastructure must not rewrite game mechanics

## Architecture

- `games/` — existing game engines/adapters; rules remain isolated
- `src/` — Betsquad player application
- `admin/` — administrator dashboard
- `supabase/` — database migrations, policies and server-side functions
- `docs/` — architecture and deployment documentation

## Multiplayer

Supabase Realtime will be used for authoritative room/match synchronization, player presence and reconnect handling. Client-side polling/local storage is not the source of truth for paid matches.

## Money handling

Paid-match settlement must be server-authoritative and auditable. The client must never be trusted to calculate the final pool, commission or payout. Payment-provider integration and operation of real-money wagering must be enabled only where legally permitted and appropriately licensed.
