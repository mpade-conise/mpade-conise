import React, { useEffect, useRef, useState } from 'react';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  
  // CRUCIAL: Track peer connections dynamically per viewer ID to stop cross-talk collapse
  const peerConnectionsRef = useRef({}); 
  const singleViewerPcRef = useRef(null); // Used exclusively if this component instance runs as a viewer

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
        const iceConfig = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        };

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
          if (videoRef.current) videoRef.current.srcObject = stream;

          // Triggered every single time a unique viewer walks onto the page
          socket.on('viewer_requesting_stream', async (payload) => {
            const viewerId = payload.viewerSocketId;
            console.log(`📥 Separate request received from viewer [${viewerId}]. Allocating distinct connection...`);

            // Instantiation of a clean, isolated connection channel map
            const pc = new RTCPeerConnection(iceConfig);
            peerConnectionsRef.current[viewerId] = pc;

            // Feed the shared host video tracks straight into this viewer node
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Target the specific viewer with host's ICE configurations
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

          // Process answers from targeted viewers mapping directly back to their reference entry
          socket.on('webrtc_answer_received', async (payload) => {
            const pc = peerConnectionsRef.current[payload.viewerSocketId];
            if (pc && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              console.log(`✅ Connection stabilized directly for viewer: ${payload.viewerSocketId}`);
            }
          });

        // ==========================================
        // 👁️ VIEWER-SPECIFIC PIPELINE
        // ==========================================
        } else {
          const pc = new RTCPeerConnection(iceConfig);
          singleViewerPcRef.current = pc;

          pc.ontrack = (event) => {
            console.log("🎬 Media track successfully bound to viewer element.");
            if (videoRef.current) videoRef.current.srcObject = event.streams[0];
            if (isComponentMounted) {
              setIsConnected(true);
              setConnectionStatus("Live");
            }
          };

          socket.on('webrtc_offer_received', async (payload) => {
            console.log("📥 Host WebRTC Offer captured via direct route. Compiling answer...");
            try {
              // Extract the host pipeline ID to correctly reply to the direct candidate channel later
              socket.hostSocketId = payload.hostSocketId; 

              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              
              socket.emit('send_webrtc_answer', { streamId, answer });
            } catch (err) {
              console.error("❌ Handshake failure:", err);
            }
          });

          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current?.connected) {
              socketRef.current.emit('webrtc_ice_candidate', {
                streamId,
                candidate: event.candidate,
                targetSocketId: socketRef.current.hostSocketId, // Route it straight to the active host
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
          if (isHost) {
            // Host pulls the caller connection map from the tracking index dictionary
            const pc = peerConnectionsRef.current[payload.senderSocketId];
            if (payload.senderType === 'viewer' && pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.warn("Host skipped structural candidate segment layout:", e);
              }
            }
          } else {
            // Viewer targets their unique baseline connection directly
            const pc = singleViewerPcRef.current;
            if (payload.senderType === 'host' && pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.warn("Viewer skipped structural candidate segment layout:", e);
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
      
      // Clear out the host mapping matrix references cleanly on route exits
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
