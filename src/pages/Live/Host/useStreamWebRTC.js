// hooks/useStreamWebRTC.js
import { useEffect, useRef, useState } from 'react';

export const useStreamWebRTC = (streamId, socket, isCameraOff, isMuted) => {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const [hardwareReady, setHardwareReady] = useState(false);

  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Hardware Initialization
  useEffect(() => {
    let mediaStream = null;

    async function initMedia() {
      try {
        console.log("🎥 Accessing media hardware devices...");
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        
        localStreamRef.current = mediaStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
        setHardwareReady(true);
      } catch (err) {
        console.error("Broadcasting multimedia hardware failure:", err);
      }
    }

    initMedia();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [streamId]);

  // Sync Hardware Track States
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }
  }, [isMuted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !isCameraOff; });
    }
  }, [isCameraOff]);

  // WebRTC Live Peer Management Event Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('viewer_requesting_stream', async (payload) => {
      const viewerId = payload.viewerSocketId;
      if (!localStreamRef.current) return;

      console.log(`📥 Handshake requested from [${viewerId}]. Dispatching offer...`);
      
      try {
        const pc = new RTCPeerConnection(iceConfig);
        peerConnectionsRef.current[viewerId] = pc;

        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc_ice_candidate', {
              streamId,
              candidate: event.candidate,
              targetSocketId: viewerId,
              senderType: 'host'
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('send_webrtc_offer', {
          streamId,
          offer,
          targetViewerId: viewerId
        });
      } catch (e) {
        console.error("❌ Multi-peer offer configuration error:", e);
      }
    });

    socket.on('webrtc_answer_received', async (payload) => {
      const pc = peerConnectionsRef.current[payload.viewerSocketId];
      if (pc && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      }
    });

    socket.on('incoming_ice_candidate', async (payload) => {
      if (payload.senderType === 'viewer') {
        const pc = peerConnectionsRef.current[payload.senderSocketId];
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn("Host skipped candidate insertion:", e);
          }
        }
      }
    });

    return () => {
      socket.off('viewer_requesting_stream');
      socket.off('webrtc_answer_received');
      socket.off('incoming_ice_candidate');
    };
  }, [socket, streamId]);

  return { localVideoRef, hardwareReady };
};
