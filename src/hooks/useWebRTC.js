import { useEffect, useRef, useState } from 'react';

const useWebRTC = (streamId, isHost, socket) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // Supports multiple co-hosts/guests
  const peerConnections = useRef({}); // Dictionary tracking peer connection lines
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!socket || !streamId) return;

    const iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        setLocalStream(stream);
        localStreamRef.current = stream;

        // If host, your signaling pipeline triggers when socket says 'viewer_requesting_stream'
      } catch (err) {
        console.error("Failed to capture user media hardware:", err);
      }
    };

    setupMedia();

    // --- SOCKET SIGNALING MATRIX INTERACTION ---
    if (isHost) {
      socket.on('viewer_requesting_stream', async ({ viewerSocketId }) => {
        if (!localStreamRef.current) return;
        
        const pc = new RTCPeerConnection(iceConfig);
        peerConnections.current[viewerSocketId] = pc;

        // Add local tracks to this viewer link
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

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('send_webrtc_offer', {
          streamId,
          offer,
          targetViewerId: viewerSocketId
        });
      });

      socket.on('webrtc_answer_received', async ({ viewerSocketId, answer }) => {
        const pc = peerConnections.current[viewerSocketId];
        if (pc && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });
    }

    // Dynamic ICE Candidate sync for both hosts and viewers
    socket.on('incoming_ice_candidate', async ({ senderSocketId, candidate, senderType }) => {
      if (isHost && senderType === 'viewer') {
        const pc = peerConnections.current[senderSocketId];
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
        }
      }
    });

    // Cleanup Everything Properly
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      
      socket.off('viewer_requesting_stream');
      socket.off('webrtc_answer_received');
      socket.off('incoming_ice_candidate');
    };
  }, [streamId, isHost, socket]);

  return { localStream, remoteStreams };
};

export default useWebRTC;
