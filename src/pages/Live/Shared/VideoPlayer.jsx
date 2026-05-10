import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Volume2, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Ensure you import your webrtcConfig and supabase client
// Remove the // from these lines:
import { webrtcConfig } from '../../../../config/webrtcConfig'; 
import { supabase } from '../../../../lib/supabase';

const VideoPlayer = ({ streamId, isHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  useEffect(() => {
    let localStream = null;

    const initializeConnection = async () => {
      try {
        // 1. Setup Peer Connection with your Metered TURN config
        const pc = new RTCPeerConnection(webrtcConfig);
        pcRef.current = pc;

        // Debug Logs for Connection State
        pc.oniceconnectionstatechange = () => {
          console.log("WebRTC State:", pc.iceConnectionState);
          setConnectionStatus(`State: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnected(true);
          }
        };

        if (isHost) {
          // HOST LOGIC
          localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
          });
          
          if (videoRef.current) videoRef.current.srcObject = localStream;
          
          // Add tracks to the connection
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

          // Create Offer and save to Supabase 'live_streams'
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          await supabase
            .from('live_streams')
            .update({ offer: offer, status: 'live' })
            .eq('id', streamId);

          // Listen for Answer from viewers (simplified for 1-to-1 or broadcast)
          supabase
            .channel(`stream-${streamId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams' }, 
              payload => {
                if (payload.new.answer && !pc.currentRemoteDescription) {
                  pc.setRemoteDescription(new RTCSessionDescription(payload.new.answer));
                }
            })
            .subscribe();

        } else {
          // VIEWER LOGIC
          pc.ontrack = (event) => {
            console.log("Remote track received!");
            if (videoRef.current) {
              videoRef.current.srcObject = event.streams[0];
            }
          };

          // Get Host's offer from Supabase
          const { data } = await supabase
            .from('live_streams')
            .select('offer')
            .eq('id', streamId)
            .single();

          if (data?.offer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send answer back
            await supabase
              .from('live_streams')
              .update({ answer: answer })
              .eq('id', streamId);
          }
        }

        // Handle ICE Candidates (The "Handshake")
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await supabase.from('viewer_sessions').insert({
              stream_id: streamId,
              candidate: event.candidate,
              type: isHost ? 'host' : 'viewer'
            });
          }
        };

      } catch (err) {
        console.error("WebRTC Error:", err);
        setConnectionStatus("Connection Failed");
      }
    };

    initializeConnection();

    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (pcRef.current) pcRef.current.close();
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
