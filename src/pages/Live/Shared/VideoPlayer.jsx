import React, { useEffect, useRef, useState } from 'react';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);

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
    // 1. Guard clause to prevent premature connections or fast remount teardowns
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
          transports: ['websocket', 'polling'], // Allow fallback for cold Render servers
          query: { 
            room: streamId, 
            role: isHost ? 'host' : 'viewer'
          },
          forceNew: true,
          reconnectionAttempts: 5
        });
        socketRef.current = socket;

        const pc = new RTCPeerConnection(iceConfig);
        pcRef.current = pc;

        socket.on('connect', () => {
          if (isComponentMounted) {
            console.log("🟢 Socket pipeline online! Socket ID:", socket.id);
            setConnectionStatus(isHost ? "Streaming Live" : "Negotiating Media Stream...");
            
            if (isHost) {
              setIsConnected(true);
            } else {
              // Explicitly ask the host to send over the stream offers
              socket.emit('request_host_stream', { streamId });
            }
          }
        });

        // 1. ICE CANDIDATE SIGNAL CHANNELS
        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current?.connected) {
            socketRef.current.emit('webrtc_ice_candidate', {
              streamId,
              candidate: event.candidate,
              senderType: isHost ? 'host' : 'viewer'
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (!isComponentMounted) return;
          console.log("⚡ ICE Connection State Changed:", pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnected(true);
            setConnectionStatus("Live");
          }
        };

        // 2. DISPATCHING PATHWAYS
        if (isHost) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (!isComponentMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          localStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          socket.on('viewer_requesting_stream', async (payload) => {
            console.log(`📥 Viewer requested stream. Generating SDP Offer...`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('send_webrtc_offer', {
              streamId,
              offer,
              targetViewerId: payload.viewerSocketId
            });
          });

          socket.on('webrtc_answer_received', async (payload) => {
            if (!pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
          });
        } else {
          // VIEWER ROUTE
          pc.ontrack = (event) => {
            console.log("🎬 Media track successfully bound to element.");
            if (videoRef.current) {
              videoRef.current.srcObject = event.streams[0];
            }
            if (isComponentMounted) {
              setIsConnected(true);
              setConnectionStatus("Connected");
            }
          };

          socket.on('webrtc_offer_received', async (payload) => {
            console.log("📥 Host WebRTC Offer captured. Sending Answer configuration...");
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('send_webrtc_answer', { streamId, answer });
            } catch (err) {
              console.error("❌ Handshake failure:", err);
            }
          });
        }

        socket.on('incoming_ice_candidate', async (payload) => {
          const targetType = isHost ? 'viewer' : 'host';
          if (payload.senderType === targetType && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn("ICE candidate skipped during assembly step:", e);
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
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]); // Tracks changes to streamId safely

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
