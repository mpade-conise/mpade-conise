import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const hasInitialized = useRef(false); // Prevents duplicate concurrent mounting loops

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

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
    // Structural guard clauses
    if (!streamId) {
      setConnectionStatus("Missing Identity");
      return;
    }
    if (hasInitialized.current) return; // Break the infinite loop mount
    hasInitialized.current = true;

    const initializeConnection = async () => {
      try {
        const activeConfig = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        };

        console.log(`📡 [STREAM DICTIONARY] ID: ${streamId} | Role: ${isHost ? 'HOST' : 'VIEWER'}`);

        const pc = new RTCPeerConnection(activeConfig);
        pcRef.current = pc;

        pc.oniceconnectionstatechange = () => {
          console.log("⚡ ICE Connection State Changed:", pc.iceConnectionState);
          // Set state safely using a functional update or direct string
          setConnectionStatus(prev => `State: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnected(true);
          }
        };

        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await supabase.from('viewer_sessions').insert({
              stream_id: streamId,
              candidate: event.candidate.toJSON(),
              type: isHost ? 'host' : 'viewer'
            });
          }
        };

        if (isHost) {
          // ================== HOST PATHWAY ==================
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          
          if (videoRef.current) videoRef.current.srcObject = stream;
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          console.log("🟢 Host active. Subscribing to global viewer_sessions updates...");

          channelRef.current = supabase
            .channel(`host-global-room-${streamId}`)
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'viewer_sessions'
            }, async (payload) => {
              if (payload.new.stream_id !== streamId) return;

              if (payload.event === 'INSERT' && payload.new.type === 'viewer') {
                console.log(`📥 Host answering incoming viewer token row: ${payload.new.id}`);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                await supabase
                  .from('viewer_sessions')
                  .update({ offer: offer.toJSON() })
                  .eq('id', payload.new.id);
              }

              if (payload.event === 'UPDATE' && payload.new.type === 'viewer' && payload.new.answer && !pc.currentRemoteDescription) {
                console.log("📥 Host caught viewer answer payload! Syncing description...");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.answer));
              }
            })
            .subscribe();

        } else {
          // ================== VIEWER PATHWAY ==================
          pc.ontrack = (event) => {
            console.log("🎬 SUCCESS: Media track attached to viewer video layout.");
            if (videoRef.current) videoRef.current.srcObject = event.streams[0];
          };

          console.log("📡 Viewer inserting handshake token row...");
          const { data, error: sessionError } = await supabase
            .from('viewer_sessions')
            .insert({ stream_id: streamId, type: 'viewer' })
            .select();

          if (sessionError) {
            console.error("❌ Viewer insert failure:", sessionError.message);
            return;
          }

          const insertedRow = data && data[0];
          if (!insertedRow) return;

          const sessionId = insertedRow.id;
          console.log(`✅ Row verified! ID: ${sessionId}. Core signaling loop online.`);

          // Fallback parsing engine
          if (insertedRow.offer && insertedRow.offer.sdp && insertedRow.offer.sdp.length > 50) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(insertedRow.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await supabase
                .from('viewer_sessions')
                .update({ answer: answer.toJSON() })
                .eq('id', sessionId);
            } catch (sdpErr) {
              console.log("ℹ️ Standard initialization skipped. Awaiting live host broadcast offer stream...");
            }
          }

          // Listen for the Host over-writing the row with a real WebRTC offer session description
          channelRef.current = supabase
            .channel(`viewer-isolated-${sessionId}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'viewer_sessions',
              filter: `id=eq.${sessionId}`
            }, async (payload) => {
              if (payload.new.offer && payload.new.offer.sdp && payload.new.offer.sdp.length > 50 && !pc.currentRemoteDescription) {
                console.log("📥 True Host WebRTC Offer captured! Negotiating local answer keys...");
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(payload.new.offer));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);

                  await supabase
                    .from('viewer_sessions')
                    .update({ answer: answer.toJSON() })
                    .eq('id', sessionId);
                } catch (negotiationError) {
                  console.error("❌ SDP Peer Handshake matching failed:", negotiationError);
                }
              }
            })
            .subscribe();
        }

      } catch (err) {
        console.error("💥 Execution Block Exception caught:", err);
      }
    };

    initializeConnection();

    return () => {
      console.log("🧹 Cleaning signaling instances...");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) pcRef.current.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [streamId]); // Stable dynamic bindings

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
