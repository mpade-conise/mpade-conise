import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const hasInitialized = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing Socket...');

  // Extract ID directly from path safely if prop is flaky
  const getStreamId = () => {
    if (propStreamId && propStreamId.length > 10) return propStreamId;
    const pathSegments = window.location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment && lastSegment.length > 20 ? lastSegment : propStreamId;
  };

  const streamId = getStreamId();
  const isHost = initialIsHost || window.location.pathname.includes('dashboard');

  useEffect(() => {
    if (!streamId) {
      setConnectionStatus("Missing Identity");
      return;
    }
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const globalIo = typeof window !== 'undefined' ? window.io : null;

    if (!globalIo) {
      console.error("❌ Socket.io CDN script missing or uninitialized in window global namespace.");
      setConnectionStatus("Engine Missing");
      return;
    }

    const initializeMediaAndSignaling = async () => {
      try {
        const iceConfig = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        };

        console.log(`📡 [RTC STREAM INTERFACE] ID: ${streamId} | Role: ${isHost ? 'HOST' : 'VIEWER'}`);

        // Initialize dedicated WebRTC pipeline signaling connection
        const socket = globalIo(SOCKET_SERVER_URL, {
          transports: ['polling', 'websocket'], // Robust fallback logic for cold Render containers
          query: { room: streamId, role: isHost ? 'signal-host' : 'signal-viewer' }
        });
        socketRef.current = socket;

        const pc = new RTCPeerConnection(iceConfig);
        pcRef.current = pc;

        // 1. ICE CANDIDATE SIGNAL MANAGEMENT
        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            console.log("📤 Sending ICE Candidate via Socket channel...");
            socketRef.current.emit('webrtc_ice_candidate', {
              streamId,
              candidate: event.candidate,
              senderType: isHost ? 'host' : 'viewer'
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log("⚡ ICE Connection State Changed:", pc.iceConnectionState);
          setConnectionStatus(`State: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnected(true);
          }
        };

        // 2. PATHWAY ROUTING ENGINES
        if (isHost) {
          // ================== PRODUCTION HOST PATHWAY ==================
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          
          if (videoRef.current) videoRef.current.srcObject = stream;
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          // Listen for arriving viewing peers who need a media offer
          socket.on('viewer_requesting_stream', async (payload) => {
            console.log(`📥 Viewer (${payload.viewerSocketId}) joined. Generating target SDP Offer...`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('send_webrtc_offer', {
              streamId,
              offer,
              targetViewerId: payload.viewerSocketId
            });
          });

          // Process returning response answers from viewing clients
          socket.on('webrtc_answer_received', async (payload) => {
            console.log("📥 Viewer SDP Answer received! Binding remote session definitions...");
            if (!pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
          });

        } else {
          // ================== PRODUCTION VIEWER PATHWAY ==================
          pc.ontrack = (event) => {
            console.log("🎬 SUCCESS: Media track attached to viewer video layout.");
            if (videoRef.current) videoRef.current.srcObject = event.streams[0];
          };

          // Ask the host to generate an offer for us
          socket.emit('request_host_stream', { streamId });

          // Intercept incoming WebRTC offers from the active broadcasting host
          socket.on('webrtc_offer_received', async (payload) => {
            console.log("📥 Host WebRTC Offer captured! Negotiating local answer keys...");
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              socket.emit('send_webrtc_answer', {
                streamId,
                answer
              });
            } catch (negotiationError) {
              console.error("❌ SDP Peer Handshake matching failed:", negotiationError);
            }
          });
        }

        // 3. SHARED SYNCED ICE RECEIVER
        socket.on('incoming_ice_candidate', async (payload) => {
          if (payload.senderType !== (isHost ? 'host' : 'viewer')) {
            try {
              console.log("📥 Adding incoming remote ICE candidate...");
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error("Error adding received ICE candidate", e);
            }
          }
        });

      } catch (err) {
        console.error("💥 Execution Block Exception caught:", err);
        setConnectionStatus("Media Blocked");
      }
    };

    initializeMediaAndSignaling();

    return () => {
      console.log("🧹 Cleaning signaling and media instances...");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
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
          <div className="w-12 h-12 border-4 border-t-[#fe2c55] border-zinc-800 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{connectionStatus}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
