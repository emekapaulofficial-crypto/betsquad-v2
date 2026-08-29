# Betsquad game engines

Each supplied game stays isolated under this directory. The platform must integrate with a game through an adapter instead of rewriting the game's rules.

## Adapter contract

A game adapter should expose:

- `slug`: stable game identifier
- `name`: display name
- `supportedPlayerCounts`: `[2, 4]` where the supplied engine supports both modes
- `winnerCount(playerCount)`: 1 for 2 players, 2 for 4 players
- `createInitialState(players)`: initialize the existing engine state
- `applyAction(state, playerIndex, action)`: validate/apply an action using the existing rules
- `isComplete(state)`: determine whether the existing game has finished
- `getPlacements(state)`: return final placements from the existing rules

The multiplayer layer owns room membership, authentication, presence, synchronization, stake accounting and settlement. It must not invent or alter game mechanics.

## Supplied engines

- Whot!
- Baize & Brass — Snooker
- Dice Duel

The source files should be copied into this directory unchanged first. Adapter code should wrap them rather than modify their rule logic.
