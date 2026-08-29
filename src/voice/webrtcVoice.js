const peers = new Map();

export async function createMicrophoneStream() {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported by this browser.");
  }
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export function createVoiceController({ channel, onRemoteStream, onSpeakingChange }) {
  let localStream = null;
  let muted = false;

  const sendSignal = (payload) => channel?.send?.({ type: "broadcast", event: "voice-signal", payload });

  const createPeer = async (peerId, initiator) => {
    const pc = new RTCPeerConnection();
    peers.set(peerId, pc);

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (stream) onRemoteStream?.(peerId, stream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal({ kind: "ice", to: peerId, candidate: event.candidate });
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "offer", to: peerId, description: pc.localDescription });
    }

    return pc;
  };

  const handleSignal = async (from, message) => {
    if (!message || message.to !== undefined && message.to !== channel?.topic?.split(":").pop()) return;
    let pc = peers.get(from);
    if (!pc) pc = await createPeer(from, false);

    if (message.kind === "offer") {
      await pc.setRemoteDescription(message.description);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ kind: "answer", to: from, description: pc.localDescription });
    } else if (message.kind === "answer") {
      await pc.setRemoteDescription(message.description);
    } else if (message.kind === "ice" && message.candidate) {
      await pc.addIceCandidate(message.candidate);
    }
  };

  const join = async () => {
    localStream = await createMicrophoneStream();
    localStream.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    await channel?.subscribe?.();
    return localStream;
  };

  const setMuted = (value) => {
    muted = Boolean(value);
    localStream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    onSpeakingChange?.(!muted);
  };

  const leave = () => {
    localStream?.getTracks().forEach((track) => track.stop());
    localStream = null;
    peers.forEach((pc) => pc.close());
    peers.clear();
  };

  return { join, leave, setMuted, handleSignal, createPeer };
}
