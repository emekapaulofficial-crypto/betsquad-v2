# Betsquad Live Voice

Betsquad games support an optional live voice channel for players inside a match.

## Design

- Browser microphone access uses WebRTC media capture.
- Signaling is carried by the match's authenticated realtime channel.
- Audio is peer-to-peer where practical; the signaling layer never stores microphone audio.
- Voice is scoped to the active match room.
- Players can mute/unmute their own microphone.
- Players can control whether incoming player audio is enabled.
- Leaving a match tears down local media tracks and peer connections.
- Reconnection must recreate signaling/peer state without modifying game state.
- Microphone permission is requested only after an explicit player action.

## Security and privacy

- Only authenticated players in the same active match may join its voice channel.
- No microphone recording or persistent audio storage is part of the feature.
- Server-authoritative match permissions remain separate from voice signaling.
- Production deployment must use HTTPS because browsers require a secure context for microphone access.
- A TURN service should be configured for players whose networks cannot establish a direct WebRTC connection.

## UI contract

The eventual in-game control should expose:

- Join voice
- Leave voice
- Mute/unmute microphone
- Speaker/audio on/off
- Per-player speaking indicator
- Connection status

This module is deliberately independent of the game rules. Adding voice must not change card, snooker, dice, scoring, turn, or winner logic.