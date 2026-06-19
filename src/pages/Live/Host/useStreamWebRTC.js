// hooks/useStreamWebRTC.js
import { useEffect, useRef, useState } from 'react';

// Upgraded with Open Relay Project STUN + TURN configurations 
// Moved outside the hook function to guarantee a stable reference point
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
  ]
};

export const useStreamWebRTC = (streamId, socket, isCameraOff, isMuted) => {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const [hardwareReady, setHardwareReady] = useState(false);

  // 1. Hardware Initialization
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
      // Safely close all concurrent active peer pipelines
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
    if (!socket) return;

    // Handle incoming viewers requesting handshakes
    const handleViewerRequest = async (payload) => {
      const viewerId = payload.viewerSocketId;
      if (!localStreamRef.current) return;

      console.log(`📥 Handshake requested from [${viewerId}]. Dispatching offer...`);
      
      try {
        const pc = new RTCPeerConnection(ICE_CONFIG);
        peerConnectionsRef.current[viewerId] = pc;

        // Push local webcam and microphone tracks to this specific remote connection line
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
    };

    // Stabilize WebRTC tracks when viewer responds with an answer
    const handleAnswerReceived = async (payload) => {
      const pc = peerConnectionsRef.current[payload.viewerSocketId];
      if (pc && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      }
    };

    // Inject incoming connection route components
    const handleIncomingIceCandidate = async (payload) => {
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

    // Bind dedicated socket listeners
    socket.on('viewer_requesting_stream', handleViewerRequest);
    socket.on('webrtc_answer_received', handleAnswerReceived);
    socket.on('incoming_ice_candidate', handleIncomingIceCandidate);

    // Clean up cleanly on dependency mutations or unmounting
    return () => {
      socket.off('viewer_requesting_stream', handleViewerRequest);
      socket.off('webrtc_answer_received', handleAnswerReceived);
      socket.off('incoming_ice_candidate', handleIncomingIceCandidate);
    };
  }, [socket, streamId]);

  return { localVideoRef, hardwareReady };
};
