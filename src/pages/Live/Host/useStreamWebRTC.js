import { useEffect, useRef, useState } from 'react';

// Upgraded with Open Relay Project STUN + TURN configurations 
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:staticauth.openrelay.metered.ca:443',
      username: 'openrelayprojectsecret',
      credential: 'openrelayprojectsecret'
    },
    {
      urls: 'turn:staticauth.openrelay.metered.ca:80',
      username: 'openrelayprojectsecret',
      credential: 'openrelayprojectsecret'
    }
  ],
  iceCandidatePoolSize: 10 // Pre-fetches ICE candidates to speed up connection handshakes
};

export const useStreamWebRTC = (streamId, socket, isCameraOff, isMuted) => {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const [hardwareReady, setHardwareReady] = useState(false);

  // 1. Unified Hardware Lifecycle 
  useEffect(() => {
    let mediaStream = null;
    let isMounted = true;

    async function initMedia() {
      try {
        console.log("🎥 Accessing media hardware devices...");
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = mediaStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
        setHardwareReady(true);
      } catch (err) {
        console.error("Broadcasting multimedia hardware failure:", err);
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [streamId]);

  // 2. Sync Hardware Track States
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

  // 3. WebRTC Live Peer Management Event Listeners
  useEffect(() => {
    if (!socket || !streamId) return;

    const handleViewerRequest = async (payload) => {
      const viewerId = payload.viewerSocketId;
      // CRITICAL FIX: Ensure the stream object actually exists in the ref before calling tracks
      if (!localStreamRef.current) {
        console.warn("⚠️ Handshake skipped: Media hardware stream not fully initialized yet.");
        return;
      }

      console.log(`📥 Handshake requested from [${viewerId}]. Dispatching offer...`);
      
      try {
        const pc = new RTCPeerConnection(ICE_CONFIG);
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

        // CRITICAL FIX: Track connection health states directly in console
        pc.oniceconnectionstatechange = () => {
          console.log(`📡 Host WebRTC state with viewer [${viewerId}]: ${pc.iceConnectionState}`);
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
    };

    const handleAnswerReceived = async (payload) => {
      const pc = peerConnectionsRef.current[payload.viewerSocketId];
      if (pc && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        console.log(`⚡ Remote Description Bound successfully for viewer: ${payload.viewerSocketId}`);
      }
    };

    const handleIncomingIceCandidate = async (payload) => {
      // CRITICAL FIX: Isolate candidate assignments strictly to viewers targeting this host instance
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
    };

    // Bind listeners safely
    socket.on('viewer_requesting_stream', handleViewerRequest);
    socket.on('webrtc_answer_received', handleAnswerReceived);
    socket.on('incoming_ice_candidate', handleIncomingIceCandidate);

    return () => {
      socket.off('viewer_requesting_stream', handleViewerRequest);
      socket.off('webrtc_answer_received', handleAnswerReceived);
      socket.off('incoming_ice_candidate', handleIncomingIceCandidate);
    };
  }, [socket, streamId, hardwareReady]); // Added hardwareReady to block signaling until camera tracks mount

  return { localVideoRef, hardwareReady };
};
