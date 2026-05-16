import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const hasInitialized = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  // Fallback URL parser to ensure IDs are synced across views
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

    const initializeConnection = async () => {
      try {
        const activeConfig = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        };

        console.log(`📡 [STREAM PIPELINE ENGINE] Target: ${streamId} | Active Role: ${isHost ? 'HOST' : 'VIEWER'}`);

        const pc = new RTCPeerConnection(activeConfig);
        pcRef.current = pc;

        pc.oniceconnectionstatechange = () => {
          console.log("⚡ ICE State Matrix Updated:", pc.iceConnectionState);
          setConnectionStatus(`State: ${pc.iceConnectionState}`);
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
          // ================== HOST BROADCAST PATHWAY ==================
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          
          if (videoRef.current) videoRef.current.srcObject = stream;
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          // Generate Host master WebRTC connection offer profile
          const hostOffer = await pc.createOffer();
          await pc.setLocalDescription(hostOffer);

          console.log(`🚀 Host uploading main signal description to stream row: ${streamId}`);
          
          // CRITICAL HOST SYNC FIX: Push the host's offer directly into the primary live_stream record
          await supabase
            .from('live_streams')
            .update({ 
              offer: hostOffer.toJSON(),
              status: 'live'
            })
            .eq('id', streamId);

          // Subscribing to global viewer handshake requests
          channelRef.current = supabase
            .channel(`host-global-room-${streamId}`)
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'viewer_sessions'
            }, async (payload) => {
              if (payload.new.stream_id !== streamId) return;

              // If a viewer inserts a token, sign the local handshake offer
              if (payload.event === 'INSERT' && payload.new.type === 'viewer') {
                console.log(`📥 Answering incoming viewer signaling node: ${payload.new.id}`);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                await supabase
                  .from('viewer_sessions')
                  .update({ offer: offer.toJSON() })
                  .eq('id', payload.new.id);
              }

              // Finalize handshake on answer return
              if (payload.event === 'UPDATE' && payload.new.type === 'viewer' && payload.new.answer && !pc.currentRemoteDescription) {
                console.log("📥 Handshake matching successful! Opening data sync streams...");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.answer));
              }
            })
            .subscribe();

        } else {
          // ================== VIEWER VIEWPORT PATHWAY ==================
          pc.ontrack = (event) => {
            console.log("🎬 SUCCESS: Video feed stream connected to canvas.");
            if (videoRef.current) videoRef.current.srcObject = event.streams[0];
          };

          // Step 1: Fetch the Host's existing offer directly from the master live_streams row if available
          const { data: streamRecord } = await supabase
            .from('live_streams')
            .select('offer')
            .eq('id', streamId)
            .single();

          if (streamRecord && streamRecord.offer) {
            console.log("🔥 Host signal found directly on stream row metadata! Initializing connection setup...");
            await pc.setRemoteDescription(new RTCSessionDescription(streamRecord.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Step 2: Write our response back down into a clean session token
            const { data: directSession } = await supabase
              .from('viewer_sessions')
              .insert({
                stream_id: streamId,
                type: 'viewer',
                answer: answer.toJSON()
              })
              .select();
              
            console.log("✅ Connection token uploaded to handshake mesh.");
            return;
          }

          // Step 3: Fallback if host hasn't populated data yet (standard setup loop)
          console.log("📡 Host metadata empty. Creating secondary viewer handshake token...");
          const { data, error: sessionError } = await supabase
            .from('viewer_sessions')
            .insert({ stream_id: streamId, type: 'viewer' })
            .select();

          if (sessionError || !data?.[0]) return;
          const sessionId = data[0].id;

          channelRef.current = supabase
            .channel(`viewer-isolated-${sessionId}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'viewer_sessions',
              filter: `id=eq.${sessionId}`
            }, async (payload) => {
              if (payload.new.offer && payload.new.offer.sdp && payload.new.offer.sdp.length > 50 && !pc.currentRemoteDescription) {
                console.log("📥 Host WebRTC Offer captured via Realtime socket.");
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(payload.new.offer));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);

                  await supabase
                    .from('viewer_sessions')
                    .update({ answer: answer.toJSON() })
                    .eq('id', sessionId);
                } catch (err) {
                  console.error("❌ Handshake sync failed:", err);
                }
              }
            })
            .subscribe();
        }

      } catch (err) {
        console.error("💥 Core Execution Exception caught:", err);
      }
    };

    initializeConnection();

    return () => {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      if (pcRef.current) pcRef.current.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
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
