import { useEffect, useRef, useState } from 'react';

// UPGRADE: Relocated configuration to root scope for layout reference stability
const UPGRADED_ICE_CONFIG = {
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

const useWebRTC = (streamId, isHost, socket) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); 
  const peerConnections = useRef({}); 
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!socket || !streamId) return;

    let isComponentMounted = true;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        
        if (!isComponentMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
      } catch (err) {
        console.error("Failed to capture user media hardware:", err);
      }
    };

    setupMedia();

    // Dedicated reference handlers to prevent event stacking leaks
    const handleViewerRequest = async ({ viewerSocketId }) => {
      if (!localStreamRef.current) return;
      console.log(`📥 Host useWebRTC responding to viewer request: ${viewerSocketId}`);
      
      // UPGRADE: Passing the matched Turn configurations mapping matrix
      const pc = new RTCPeerConnection(UPGRADED_ICE_CONFIG);
      peerConnections.current[viewerSocketId] = pc;

      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            streamId,
            candidate: event.candidate,
            targetSocketId: viewerSocketId,
            senderType: 'host'
          });
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('send_webrtc_offer', {
          streamId,
          offer,
          targetViewerId: viewerSocketId
        });
      } catch (err) {
        console.error("Failed creating offer matrix:", err);
      }
    };

    const handleAnswerReceived = async ({ viewerSocketId, answer }) => {
      const pc = peerConnections.current[viewerSocketId];
      if (pc && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`⚡ Channel successfully stabilized for: ${viewerSocketId}`);
      }
    };

    const handleIncomingCandidate = async ({ senderSocketId, candidate, senderType }) => {
      if (isHost && senderType === 'viewer') {
        const pc = peerConnections.current[senderSocketId];
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
        }
      }
    };

    // --- BIND LIVE ROUTER LISTENERS ---
    if (isHost) {
      socket.on('viewer_requesting_stream', handleViewerRequest);
      socket.on('webrtc_answer_received', handleAnswerReceived);
    }
    socket.on('incoming_ice_candidate', handleIncomingCandidate);

    // Cleanup Everything Properly
    return () => {
      isComponentMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      
      socket.off('viewer_requesting_stream', handleViewerRequest);
      socket.off('webrtc_answer_received', handleAnswerReceived);
      socket.off('incoming_ice_candidate', handleIncomingCandidate);
    };
  }, [streamId, isHost, socket]);

  return { localStream, remoteStreams };
};

export default useWebRTC;
