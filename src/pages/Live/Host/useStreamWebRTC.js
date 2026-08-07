import { useEffect, useRef, useState } from 'react';

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    }
  ],
  iceCandidatePoolSize: 10
};

export const useStreamWebRTC = (streamId, socket, isCameraOff, isMuted, challengerVideoRef = null) => {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const iceCandidatesQueueRef = useRef({}); 
  const remoteStreamRef = useRef(null);
  const [hardwareReady, setHardwareReady] = useState(false);

  const bindRemoteStreamToDOM = (stream) => {
    if (stream) remoteStreamRef.current = stream;
    const targetRef = challengerVideoRef?.current;
    if (targetRef && remoteStreamRef.current) {
      if (targetRef.srcObject !== remoteStreamRef.current) {
        targetRef.srcObject = remoteStreamRef.current;
        targetRef.play().catch(e => console.warn("Autoplay restriction:", e));
        console.log("🎥 Guest remote media stream attached to challenger video element.");
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (challengerVideoRef?.current && remoteStreamRef.current) {
        bindRemoteStreamToDOM(remoteStreamRef.current);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [challengerVideoRef]);

  // Hardware Setup
  useEffect(() => {
    let mediaStream = null;
    let isMounted = true;

    async function initMedia() {
      try {
        console.log("🎥 Accessing media hardware devices...");
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = mediaStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
        setHardwareReady(true);
      } catch (err) {
        console.error("Broadcasting hardware failure:", err);
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      remoteStreamRef.current = null;
    };
  }, [streamId]);

  useEffect(() => {
    if (hardwareReady && localStreamRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [hardwareReady, localVideoRef.current]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !isCameraOff; });
    }
  }, [isMuted, isCameraOff]);

  // Signaling Matrix Pipeline
  useEffect(() => {
    if (!socket || !streamId || !hardwareReady) return;

    const createPeerConnection = (targetSocketId) => {
      if (peerConnectionsRef.current[targetSocketId]) {
        return peerConnectionsRef.current[targetSocketId];
      }

      const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
      peerConnectionsRef.current[targetSocketId] = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
      }

      pc.ontrack = (event) => {
        console.log("🌐 Remote guest track received from peer:", targetSocketId);
        if (event.streams && event.streams[0]) {
          bindRemoteStreamToDOM(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            streamId,
            candidate: event.candidate,
            targetSocketId,
            senderType: 'host'
          });
        }
      };

      return pc;
    };

    const handleViewerRequest = async (payload) => {
      const viewerId = payload.viewerSocketId;
      if (!localStreamRef.current) return;

      console.log(`📥 Handshake requested from [${viewerId}]. Dispatching offer...`);
      iceCandidatesQueueRef.current[viewerId] = [];
      
      try {
        const pc = createPeerConnection(viewerId);
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

    const handleIncomingOffer = async (payload) => {
      const senderId = payload.senderSocketId || payload.guestSocketId || payload.socketId;
      if (!senderId || !payload.offer) return;

      console.log(`📥 Incoming guest offer from [${senderId}]`);
      iceCandidatesQueueRef.current[senderId] = iceCandidatesQueueRef.current[senderId] || [];

      try {
        const pc = createPeerConnection(senderId);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

        if (iceCandidatesQueueRef.current[senderId]) {
          for (const candidate of iceCandidatesQueueRef.current[senderId]) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          }
          delete iceCandidatesQueueRef.current[senderId];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('send_webrtc_answer', {
          streamId,
          answer,
          targetSocketId: senderId
        });
      } catch (err) {
        console.error("❌ Error responding to guest offer:", err);
      }
    };

    const handleAnswerReceived = async (payload) => {
      const viewerId = payload.viewerSocketId || payload.senderSocketId || payload.targetSocketId;
      const pc = peerConnectionsRef.current[viewerId];
      
      if (pc && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          console.log(`⚡ Connection stabilized for peer: ${viewerId}`);
          
          if (iceCandidatesQueueRef.current[viewerId]) {
            for (const candidate of iceCandidatesQueueRef.current[viewerId]) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }
            delete iceCandidatesQueueRef.current[viewerId];
          }
        } catch (err) {
          console.error("Failed to apply remote answer:", err);
        }
      }
    };

    const handleIncomingIceCandidate = async (payload) => {
      const senderId = payload.senderSocketId || payload.targetSocketId;
      const pc = peerConnectionsRef.current[senderId];
      
      if (pc) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn("Skipped candidate insertion:", e);
          }
        } else {
          iceCandidatesQueueRef.current[senderId] = iceCandidatesQueueRef.current[senderId] || [];
          iceCandidatesQueueRef.current[senderId].push(payload.candidate);
        }
      }
    };

    socket.on('viewer_requesting_stream', handleViewerRequest);
    socket.on('receive_webrtc_offer', handleIncomingOffer);
    socket.on('webrtc_answer_received', handleAnswerReceived);
    socket.on('incoming_ice_candidate', handleIncomingIceCandidate);

    return () => {
      socket.off('viewer_requesting_stream', handleViewerRequest);
      socket.off('receive_webrtc_offer', handleIncomingOffer);
      socket.off('webrtc_answer_received', handleAnswerReceived);
      socket.off('incoming_ice_candidate', handleIncomingIceCandidate);
    };
  }, [socket, streamId, hardwareReady]);

  return { localVideoRef, hardwareReady };
};
