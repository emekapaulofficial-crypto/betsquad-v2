export function createVoiceSession(onTrack, onIceCandidate) {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  peer.ontrack = (event) => onTrack?.(event.streams[0]);
  peer.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate?.(event.candidate);
  };

  return {
    peer,
    async addMicrophone() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      for (const track of stream.getTracks()) peer.addTrack(track, stream);
      return stream;
    },
    close() {
      peer.getSenders().forEach((sender) => sender.track?.stop());
      peer.close();
    },
  };
}
