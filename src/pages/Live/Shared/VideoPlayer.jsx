import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  // 1. ABSOLUTE ID FIX: Extract ID directly from path if prop is mismatched or stale
  const getStreamId = () => {
    if (propStreamId && propStreamId.length > 10) return propStreamId;
    
    const pathSegments = window.location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Basic UUID validation length check
    return lastSegment && lastSegment.length > 20 ? lastSegment : propStreamId;
  };

  const streamId = getStreamId();

  // 2. AUTO-ROLE FIX: Auto-detect host mode if current window path is a dashboard/studio URL
  const isHost = initialIsHost || window.location.pathname.includes('dashboard');

  useEffect(() => {
    let localStream = null;
    let signalingChannel = null;

    // Halt gracefully if no streaming ID could be found
    if (!streamId) {
      console.error("❌ WebRTC Pipeline Stopped: Valid streamId could not be extracted.");
      setConnectionStatus("Missing Identity Matrix");
      return;
    }

    const initializeConnection = async () => {
      try {
        const globalIce = window.webrtcConfig || globalThis.webrtcConfig;
        const activeConfig = globalIce || {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        };

        console.log(`📡 Mpade Pipeline Active [Target Stream ID: ${streamId}] [Role: ${isHost ? 'HOST' : 'VIEWER'}]:`, activeConfig);

        const pc = new RTCPeerConnection(activeConfig);
        pcRef.current = pc;

        // Connection State Listener
        pc.oniceconnectionstatechange = () => {
          console.log("⚡ ICE State change noticed:", pc.iceConnectionState);
          setConnectionStatus(`State: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnected(true);
          }
        };

        // Automated ICE Trickle Routing
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            console.log("🚀 Route Candidate harvested, trickling to session network...");
            await supabase.from('viewer_sessions').insert({
              stream_id: streamId,
              candidate: event.candidate.toJSON(),
              type: isHost ? 'host' : 'viewer'
            });
          }
        };

        if (isHost) {
          // ================== HOST HANDSHAKE WORKFLOW ==================
          console.log("🎬 Grabbing hardware device access for host broadcast...");
          localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
          });
          
          if (videoRef.current) videoRef.current.srcObject = localStream;
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

          console.log(`📡 Host listening globally for matching viewer entries...`);

          // Listening to the channel globally to bypass restrictive replication filter drops
          signalingChannel = supabase
            .channel(`host-signaling-global-${streamId}`)
            .on('postgres_changes', {
              event: '*', // Catch both INSERTS and UPDATES natively
              schema: 'public',
              table: 'viewer_sessions'
            }, async (payload) => {
              // Manual strict check inside JS scope to ensure IDs are exact matches
              if (payload.new.stream_id !== streamId) return;

              // Handle New Viewer Knocking
              if (payload.event === 'INSERT' && payload.new.type === 'viewer' && !payload.new.offer) {
                console.log(`📥 Host caught a viewer row insert (${payload.new.id}). Dispatching offer...`);
                
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const { error } = await supabase
                  .from('viewer_sessions')
                  .update({ offer: offer.toJSON() })
                  .eq('id', payload.new.id);

                if (error) console.error("❌ Host failed sending offer out:", error.message);
              }

              // Handle Viewer Returning their Answer Handshake
              if (payload.event === 'UPDATE' && payload.new.type === 'viewer' && payload.new.answer && !pc.currentRemoteDescription) {
                console.log("📥 Host caught viewer answer packet! Finalizing live link...");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.answer))
                  .catch(err => console.error("❌ Final handshake negotiation dropped:", err));
              }
            })
            .subscribe();

        } else {
          // ================== VIEWER HANDSHAKE WORKFLOW ==================
          console.log("🎬 Viewer viewport mounting. Binding dynamic track assignments...");
          pc.ontrack = (event) => {
            console.log("🎬 SUCCESS: Media stream track fully received and bound to canvas component.");
            if (videoRef.current) {
              videoRef.current.srcObject = event.streams[0];
            }
          };

          // Step A: Create an entry in viewer_sessions with the true parsed ID
          console.log(`📡 Registering live viewer handshake payload for target ID: ${streamId}`);
          const { data: sessionData, error: sessionError } = await supabase
            .from('viewer_sessions')
            .insert({
              stream_id: streamId,
              type: 'viewer'
            })
            .select()
            .single();

          if (sessionError) {
            console.error("❌ Handshake initialization dropped:", sessionError.message);
            return;
          }

          const sessionId = sessionData.id;
          console.log(`✅ Session row successfully bound with ID: ${sessionId}. Waiting for host offer...`);

          // Step B: Listen specifically for the dedicated offer generated for this isolated session row
          signalingChannel = supabase
            .channel(`viewer-signaling-isolated-${sessionId}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'viewer_sessions',
              filter: `id=eq.${sessionId}`
            }, async (payload) => {
              if (payload.new.offer && !pc.currentRemoteDescription) {
                console.log("🔥 Direct offer discovered on session token! Sending handshake back...");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.offer));
                
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                const { error } = await supabase
                  .from('viewer_sessions')
                  .update({ answer: answer.toJSON() })
                  .eq('id', sessionId);

                if (error) console.error("❌ Viewer failed sending answer back:", error.message);
              }
            })
            .subscribe();
        }

      } catch (err) {
        console.error("💥 Critical Handshake Exception:", err);
        setConnectionStatus("Connection Failed");
      }
    };

    initializeConnection();

    return () => {
      console.log("🧹 Tearing down media pipeline and closing active sockets.");
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (pcRef.current) pcRef.current.close();
      if (signalingChannel) supabase.removeChannel(signalingChannel);
    };
  }, [streamId]); // Binds on dynamic ID changes cleanly

  return (
    <div className="relative w-full h-full bg-black group overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#fe2c55]/5 to-purple-600/5 z-0" />

      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted={isHost} 
        className={`w-full h-full object-cover transition-opacity duration-1000 z-10 
          ${isConnected || isHost ? 'opacity-100' : 'opacity-0'}
          ${isHost ? 'scale-x-[-1]' : ''} 
        `}
      />

      <AnimatePresence>
        {!isConnected && !isHost && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-zinc-950"
          >
            <div className="w-12 h-12 border-4 border-[#fe2c55]/20 border-t-[#fe2c55] rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{connectionStatus}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-6 left-6 z-40 flex flex-col gap-2 pointer-events-none">
        {isHost && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2 bg-[#fe2c55] px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(254,44,85,0.4)] border border-white/20"
          >
            <Shield size={12} className="text-white fill-white/20" />
            <span className="text-[9px] font-black uppercase text-white tracking-wider">Host Direct</span>
          </motion.div>
        )}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 w-fit">
          <Zap size={10} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[9px] font-bold text-white/90">Ultra-Low Latency</span>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-40 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
           <div className={`w-1.5 h-1.5 ${isConnected || isHost ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'} rounded-full`} />
           <span className="text-[9px] font-black uppercase tracking-tighter text-white">720p • Live</span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
