import React, { useEffect, useRef, useState } from 'react';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

// CORRECTED GLOBAL ICE CONFIG MATCHING METERED METRICS
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

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const peerConnectionsRef = useRef({}); 
  const singleViewerPcRef = useRef(null); 
  const iceCandidatesQueueRef = useRef({}); // Queues early candidates to block 'checking' freeze drops

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing Socket...');

  const getStreamId = () => {
    if (propStreamId && propStreamId.length > 10) return propStreamId;
    const pathSegments = window.location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment && lastSegment.length > 20 ? lastSegment : propStreamId;
  };

  const streamId = getStreamId();
  const isHost = initialIsHost || window.location.pathname.includes('dashboard');

  useEffect(() => {
    if (!streamId || streamId === "undefined" || streamId.length < 10) {
      setConnectionStatus("Awaiting Stream Setup...");
      return;
    }

    let isComponentMounted = true;
    const globalIo = typeof window !== 'undefined' ? window.io : null;

    if (!globalIo) {
      console.error("❌ Socket.io CDN script missing from global context.");
      setConnectionStatus("Engine Missing");
      return;
    }

    async function initializeMediaAndSignaling() {
      try {
        console.log(`📡 [RTC STREAM INTERFACE] Connecting ID: ${streamId} | Role: ${isHost ? 'host' : 'viewer'}`);

        const socket = globalIo(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          query: { 
            room: streamId, 
            role: isHost ? 'host' : 'viewer'
          },
          forceNew: true,
          reconnectionAttempts: 5
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          if (isComponentMounted) {
            console.log("🟢 Socket pipeline online! Socket ID:", socket.id);
            setConnectionStatus(isHost ? "Streaming Live" : "Negotiating Media Stream...");
            
            if (isHost) {
              setIsConnected(true);
            } else {
              socket.emit('request_host_stream', { streamId });
            }
          }
        });

        // ==========================================
        // 🛠️ HOST-SPECIFIC PIPELINE (ONE-TO-MANY)
        // ==========================================
        if (isHost) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (!isComponentMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          localStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true; // Ensure local preview strictly stays muted
          }

          socket.on('viewer_requesting_stream', async (payload) => {
            if (!isComponentMounted) return;
            const viewerId = payload.viewerSocketId;
            console.log(`📥 Separate request received from viewer [${viewerId}]. Allocating connection...`);

            iceCandidatesQueueRef.current[viewerId] = [];
            const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
            peerConnectionsRef.current[viewerId] = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
              if (event.candidate && socketRef.current?.connected) {
                socketRef.current.emit('webrtc_ice_candidate', {
                  streamId,
                  candidate: event.candidate,
                  targetSocketId: viewerId,
                  senderType: 'host'
                });
              }
            };

            try {
              const offer = await pc.createOffer();
              if (!isComponentMounted) return;
              await pc.setLocalDescription(offer);
              
              socket.emit('send_webrtc_offer', {
                streamId,
                offer,
                targetViewerId: viewerId
              });
            } catch (err) {
              console.error("❌ Failed to orchestrate individual offer matrix:", err);
            }
          });

          socket.on('webrtc_answer_received', async (payload) => {
            if (!isComponentMounted) return;
            const viewerId = payload.viewerSocketId;
            const pc = peerConnectionsRef.current[viewerId];
            if (pc && !pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                console.log(`✅ Connection stabilized directly for viewer: ${viewerId}`);
                
                // Flush queued candidates
                if (iceCandidatesQueueRef.current[viewerId]) {
                  for (const candidate of iceCandidatesQueueRef.current[viewerId]) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                  }
                  delete iceCandidatesQueueRef.current[viewerId];
                }
              } catch (e) {
                console.error("Error setting remote answer on host:", e);
              }
            }
          });

        // ==========================================
        // 👁️ VIEWER-SPECIFIC PIPELINE
        // ==========================================
        } else {
          const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
          singleViewerPcRef.current = pc;
          iceCandidatesQueueRef.current['host_queue'] = [];

          pc.ontrack = (event) => {
            console.log("🎬 Media track successfully bound to viewer element.");
            if (videoRef.current && videoRef.current.srcObject !== event.streams[0]) {
              videoRef.current.srcObject = event.streams[0];
            }
            if (isComponentMounted) {
              setIsConnected(true);
              setConnectionStatus("Live");
            }
          };

          socket.on('webrtc_offer_received', async (payload) => {
            if (!isComponentMounted) return;
            console.log("📥 Host WebRTC Offer captured via direct route. Compiling answer...");
            try {
              socket.hostSocketId = payload.hostSocketId; 

              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              if (!isComponentMounted) return;
              await pc.setLocalDescription(answer);
              
              socket.emit('send_webrtc_answer', { streamId, answer });

              // Flush queued host candidates
              if (iceCandidatesQueueRef.current['host_queue']) {
                for (const candidate of iceCandidatesQueueRef.current['host_queue']) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                }
                delete iceCandidatesQueueRef.current['host_queue'];
              }
            } catch (err) {
              console.error("❌ Handshake failure:", err);
            }
          });

          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current?.connected && socketRef.current.hostSocketId) {
              socketRef.current.emit('webrtc_ice_candidate', {
                streamId,
                candidate: event.candidate,
                targetSocketId: socketRef.current.hostSocketId, 
                senderType: 'viewer'
              });
            }
          };

          pc.oniceconnectionstatechange = () => {
            if (!isComponentMounted) return;
            console.log("⚡ Viewer ICE Connection State Changed:", pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
              setIsConnected(true);
              setConnectionStatus("Live");
            }
          };
        }

        // ==========================================
        // ❄️ CENTRAL INTERCONNECTED ICE ROUTING MODULE
        // ==========================================
        socket.on('incoming_ice_candidate', async (payload) => {
          if (!isComponentMounted) return;
          if (isHost) {
            const viewerId = payload.senderSocketId;
            const pc = peerConnectionsRef.current[viewerId];
            if (payload.senderType === 'viewer' && pc) {
              if (pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e) {
                  console.warn("Host skipped structural candidate:", e);
                }
              } else {
                if (!iceCandidatesQueueRef.current[viewerId]) iceCandidatesQueueRef.current[viewerId] = [];
                iceCandidatesQueueRef.current[viewerId].push(payload.candidate);
              }
            }
          } else {
            const pc = singleViewerPcRef.current;
            if (payload.senderType === 'host' && pc) {
              if (pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e) {
                  console.warn("Viewer skipped structural candidate:", e);
                }
              } else {
                if (!iceCandidatesQueueRef.current['host_queue']) iceCandidatesQueueRef.current['host_queue'] = [];
                iceCandidatesQueueRef.current['host_queue'].push(payload.candidate);
              }
            }
          }
        });

      } catch (err) {
        console.error("💥 Handshake execution exception:", err);
        if (isComponentMounted) setConnectionStatus("Media Blocked");
      }
    }

    initializeMediaAndSignaling();

    return () => {
      isComponentMounted = false;
      console.log("🧹 Cleaning signaling and media instances...");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};

      if (singleViewerPcRef.current) singleViewerPcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted={isHost} 
        className={`w-full h-full object-cover transition-opacity duration-500 ${isConnected || isHost ? 'opacity-100' : 'opacity-40'} ${isHost ? 'scale-x-[-1]' : ''}`} 
      />
      {!isConnected && !isHost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-zinc-950">
          <div className="w-10 h-10 border-4 border-t-[#fe2c55] border-zinc-800 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{connectionStatus}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
