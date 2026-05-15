import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Volume2, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const VideoPlayer = ({ streamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  // UNIVERSAL FIX: Auto-detect host mode if current window path is a dashboard URL
  const isHost = initialIsHost || window.location.pathname.includes('dashboard');

  useEffect(() => {
    let localStream = null;
    let streamChannel = null;
    let candidateChannel = null;

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

        console.log(`WebRTC Dynamic Initialization [Mode: ${isHost ? 'HOST' : 'VIEWER'}]:`, activeConfig);

        const pc = new RTCPeerConnection(activeConfig);
        pcRef.current = pc;

        // 1. Connection State Listeners
        pc.oniceconnectionstatechange = () => {
          console.log("👉 Connection State Changed to:", pc.iceConnectionState);
          setConnectionStatus(`State: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnected(true);
          }
        };

        // 2. Candidate Creation Handler
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            console.log("🚀 ICE Route Candidate found! Transmitting to signaling stream...");
            await supabase.from('viewer_sessions').insert({
              stream_id: streamId,
              candidate: event.candidate.toJSON(),
              type: isHost ? 'host' : 'viewer'
            });
          }
        };

        // 3. Realtime Mesh Signal Subscriptions
        candidateChannel = supabase
          .channel(`candidates-room-${streamId}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'viewer_sessions'
          }, 
          payload => {
            if (payload.new.stream_id === streamId) {
              const targetType = isHost ? 'viewer' : 'host';
              if (payload.new.type === targetType && payload.new.candidate) {
                console.log(`📥 Attaching received candidate data packet from target [${targetType}]`);
                pc.addIceCandidate(new RTCIceCandidate(payload.new.candidate))
                  .catch(e => console.error("❌ Failed to bind incoming route candidate:", e));
              }
            }
          })
          .subscribe();

        if (isHost) {
          // ================== FORCE HOST WORKFLOW ==================
          console.log("🎬 Host Workflow engaged. Gathering local multimedia tracks...");
          
          localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
          });
          
          if (videoRef.current) videoRef.current.srcObject = localStream;
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log("✅ Host SDP Local Offer built successfully.");

          const { error: offerWriteError } = await supabase
            .from('live_streams')
            .update({ 
              offer: offer.toJSON(), 
              status: 'live' 
            })
            .eq('id', streamId);

          if (offerWriteError) {
            console.error("❌ Host failed to write connection offer to DB:", offerWriteError);
          } else {
            console.log("🚀 SUCCESS: Connection configuration saved to database row.");
          }

          // Active listener tracking incoming viewer returns
          streamChannel = supabase
            .channel(`stream-host-signaling-${streamId}`)
            .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'live_streams'
            }, 
            payload => {
              if (payload.new.id === streamId && payload.new.answer && !pc.currentRemoteDescription) {
                console.log("📥 Viewer payload received! Completing WebRTC handshake...");
                pc.setRemoteDescription(new RTCSessionDescription(payload.new.answer))
                  .catch(err => console.error("❌ Handshake execution error:", err));
              }
            })
            .subscribe();

        } else {
          // ================== VIEWER WORKFLOW ==================
          console.log("🎬 Viewer Workflow engaged. Awaiting peer stream response matrix...");
          
          pc.ontrack = (event) => {
            console.log("🎬 SUCCESS: Video signal attached directly to player element.");
            if (videoRef.current) {
              videoRef.current.srcObject = event.streams[0];
            }
          };

          const { data } = await supabase
            .from('live_streams')
            .select('offer')
            .eq('id', streamId)
            .single();

          if (data?.offer) {
            console.log("🔥 Offer discovered on initial load. Connecting...");
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await supabase
              .from('live_streams')
              .update({ answer: answer.toJSON() })
              .eq('id', streamId);
          }

          streamChannel = supabase
            .channel(`stream-viewer-signaling-${streamId}`)
            .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'live_streams'
            }, 
            async (payload) => {
              if (payload.new.id === streamId && payload.new.offer && !pc.currentRemoteDescription) {
                console.log("📥 Live host offer change caught via stream channel!");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await supabase
                  .from('live_streams')
                  .update({ answer: answer.toJSON() })
                  .eq('id', streamId);
              }
            })
            .subscribe();
        }

      } catch (err) {
        console.error("💥 Core Initializer Error Stack:", err);
        setConnectionStatus("Connection Failed");
      }
    };

    initializeConnection();

    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (pcRef.current) pcRef.current.close();
      if (streamChannel) supabase.removeChannel(streamChannel);
      if (candidateChannel) supabase.removeChannel(candidateChannel);
    };
  }, [isHost, streamId]);

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
