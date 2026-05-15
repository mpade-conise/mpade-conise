import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Volume2, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const VideoPlayer = ({ streamId, isHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  useEffect(() => {
    let localStream = null;
    let streamChannel = null;
    let candidateChannel = null;

    const initializeConnection = async () => {
      try {
        // 1. Safe global context lookup with standard reliable fallback
        const globalIce = window.webrtcConfig || globalThis.webrtcConfig;
        const activeConfig = globalIce || {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        };

        console.log("WebRTC Initialization Config:", activeConfig);

        const pc = new RTCPeerConnection(activeConfig);
        pcRef.current = pc;

        // 2. IMMEDIATE CONNECTION STATE CHANGES LISTENER
        pc.oniceconnectionstatechange = () => {
          console.log("👉 CRITICAL - ICE Connection State Changed to:", pc.iceConnectionState);
          setConnectionStatus(`State: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnected(true);
          }
        };

        pc.onsignalingstatechange = () => {
          console.log("👉 Signaling State Changed to:", pc.signalingState);
        };

        // 3. IMMEDIATE LOCAL ICE CANDIDATE GENERATION LISTENER
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            console.log("🚀 Local ICE Candidate generated! Saving to DB...");
            const { error } = await supabase.from('viewer_sessions').insert({
              stream_id: streamId,
              candidate: event.candidate.toJSON(), // Map candidate details explicitly to JSON
              type: isHost ? 'host' : 'viewer'
            });
            if (error) console.error("❌ Error saving ICE candidate to Supabase:", error);
          }
        };

        // 4. SUBSCRIBE TO INCOMING ICE CANDIDATES (Broadened table stream filter)
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
                console.log(`📥 Incoming ICE candidate detected from target type [${targetType}]`);
                pc.addIceCandidate(new RTCIceCandidate(payload.new.candidate))
                  .catch(e => console.error("❌ Failed to attach remote ICE candidate:", e));
              }
            }
          })
          .subscribe((status) => console.log(`📡 Candidate Channel Status:`, status));

        if (isHost) {
          // ================== HOST WORKFLOW ==================
          console.log("Setting up host multimedia stream...");
          localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
          });
          
          if (videoRef.current) videoRef.current.srcObject = localStream;
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log("🔥 Host Local Description (Offer) set successfully.");
          
          // CRITICAL FIX: Convert internal SDP classes explicitly into JSON format strings/objects
          const { error } = await supabase
            .from('live_streams')
            .update({ 
              offer: offer.toJSON(), 
              status: 'live' 
            })
            .eq('id', streamId);
            
          if (error) {
            console.error("❌ Host failed to write WebRTC offer to database:", error);
          } else {
            console.log("🚀 Success! Host offer written to Supabase without resolving to null.");
          }

          // Listen for incoming Answer updates from viewers
          streamChannel = supabase
            .channel(`stream-host-signaling-${streamId}`)
            .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'live_streams'
            }, 
            payload => {
              if (payload.new.id === streamId && payload.new.answer && !pc.currentRemoteDescription) {
                console.log("📥 Host detected viewer WebRTC answer payload! Applying...");
                pc.setRemoteDescription(new RTCSessionDescription(payload.new.answer))
                  .catch(err => console.error("❌ Failed setting viewer Remote Description:", err));
              }
            })
            .subscribe((status) => console.log(`📡 Host Signaling Channel Status:`, status));

        } else {
          // ================== VIEWER WORKFLOW ==================
          console.log("Setting up viewer consumer stream...");
          pc.ontrack = (event) => {
            console.log("🎬 SUCCESS: Remote video/audio track attached directly to viewer element!");
            if (videoRef.current) {
              videoRef.current.srcObject = event.streams[0];
            }
          };

          // Fetch original offer from host
          const { data, error } = await supabase
            .from('live_streams')
            .select('offer')
            .eq('id', streamId)
            .single();

          if (error) console.error("❌ Viewer failed reading active host stream row:", error);

          if (data?.offer) {
            console.log("🔥 Viewer found existing host offer in DB. Connecting...");
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // CRITICAL FIX: Convert Viewer Local Description to JSON structure 
            const { error: updateError } = await supabase
              .from('live_streams')
              .update({ answer: answer.toJSON() })
              .eq('id', streamId);
              
            if (updateError) console.error("❌ Viewer failed writing WebRTC answer back to database:", updateError);
          }

          // Active fallback sync listener for viewers in case host re-generates mid-session
          streamChannel = supabase
            .channel(`stream-viewer-signaling-${streamId}`)
            .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'live_streams'
            }, 
            async (payload) => {
              if (payload.new.id === streamId && payload.new.offer && !pc.currentRemoteDescription) {
                console.log("📥 Viewer caught live host WebRTC offer update event!");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                
                // CRITICAL FIX: Staggered lifecycle updates mapped safely
                await supabase
                  .from('live_streams')
                  .update({ answer: answer.toJSON() })
                  .eq('id', streamId);
              }
            })
            .subscribe((status) => console.log(`📡 Viewer Signaling Channel Status:`, status));
        }

      } catch (err) {
        console.error("💥 Critical WebRTC Initializer Exception:", err);
        setConnectionStatus("Connection Failed");
      }
    };

    initializeConnection();

    return () => {
      console.log("🧹 Cleaning up active stream audio/video tracks and open signaling channels.");
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
          ${isConnected ? 'opacity-100' : 'opacity-0'}
          ${isHost ? 'scale-x-[-1]' : ''} 
        `}
      />

      <AnimatePresence>
        {!isConnected && (
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
           <div className={`w-1.5 h-1.5 ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'} rounded-full`} />
           <span className="text-[9px] font-black uppercase tracking-tighter text-white">720p • Live</span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
