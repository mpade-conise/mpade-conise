import { useEffect, useRef, useState } from 'react';

// Stripped down completely: No third party APIs, no paid TURN servers.
// Relying 100% on pure direct peer-to-peer WebRTC via Google STUN.
const PURE_STUN_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

export const useStreamWebRTC = (streamId, socket, isCameraOff, isMuted) => {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const iceCandidatesQueueRef = useRef({}); 
  const [hardwareReady, setHardwareReady] = useState(false);

  // 1. Hardware Stream Capturing
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
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
        setHardwareReady(true);
      } catch (err) {
        console.error("Broadcasting hardware failure:", err);
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

  // Late-binding stream video DOM attachment
  useEffect(() => {
    if (hardwareReady && localStreamRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [hardwareReady, localVideoRef.current]);

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

  // 2. Signaling Matrix Pipeline via Socket.io
  useEffect(() => {
    if (!socket || !streamId || !hardwareReady) return;

    const handleViewerRequest = async (payload) => {
      const viewerId = payload.viewerSocketId;
      if (!localStreamRef.current) return;

      console.log(`📥 Handshake requested from [${viewerId}]. Dispatching offer...`);
      iceCandidatesQueueRef.current[viewerId] = [];
      
      try {
        const pc = new RTCPeerConnection(PURE_STUN_CONFIG);
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
        console.error("❌ Multi-peer offer error:", e);
      }
    };

    const handleAnswerReceived = async (payload) => {
      const viewerId = payload.viewerSocketId;
      const pc = peerConnectionsRef.current[viewerId];
      
      if (pc && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          console.log(`⚡ Connection stabilized for viewer: ${viewerId}`);
          
          if (iceCandidatesQueueRef.current[viewerId]) {
            for (const candidate of iceCandidatesQueueRef.current[viewerId]) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
            }
            delete iceCandidatesQueueRef.current[viewerId];
          }
        } catch (err) {
          console.error("Failed to apply remote answer:", err);
        }
      }
    };

    const handleIncomingIceCandidate = async (payload) => {
      if (payload.senderType === 'viewer') {
        const viewerId = payload.senderSocketId;
        const pc = peerConnectionsRef.current[viewerId];
        
        if (pc) {
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn("Skipped candidate insertion:", e);
            }
          } else {
            if (!iceCandidatesQueueRef.current[viewerId]) {
              iceCandidatesQueueRef.current[viewerId] = [];
            }
            iceCandidatesQueueRef.current[viewerId].push(payload.candidate);
          }
        }
      }
    };

    socket.on('viewer_requesting_stream', handleViewerRequest);
    socket.on('webrtc_answer_received', handleAnswerReceived);
    socket.on('incoming_ice_candidate', handleIncomingIceCandidate);

    return () => {
      socket.off('viewer_requesting_stream', handleViewerRequest);
      socket.off('webrtc_answer_received', handleAnswerReceived);
      socket.off('incoming_ice_candidate', handleIncomingIceCandidate);
    };
  }, [socket, streamId, hardwareReady]);

  return { localVideoRef, hardwareReady };
};
