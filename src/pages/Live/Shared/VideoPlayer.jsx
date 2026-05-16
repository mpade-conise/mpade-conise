import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const VideoPlayer = ({ streamId: propStreamId, isHost: initialIsHost = false }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  const getStreamId = () => {
    if (propStreamId && propStreamId.length > 10) return propStreamId;
    const pathSegments = window.location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment && lastSegment.length > 20 ? lastSegment : propStreamId;
  };

  const streamId = getStreamId();
  const isHost = initialIsHost || window.location.pathname.includes('dashboard');

  useEffect(() => {
    let localStream = null;
    let signalingChannel = null;

    if (!streamId) {
      console.error("❌ CRITICAL: No streamId found!");
      setConnectionStatus("Missing Stream ID");
      return;
    }

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
          // ================== HOST PATHWAY ==================
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (videoRef.current) videoRef.current.srcObject = localStream;
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

          console.log("🟢 Host active. Subscribing to global viewer_sessions updates...");

          signalingChannel = supabase
            .channel(`host-global-room-${streamId}`)
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'viewer_sessions'
            }, async (payload) => {
              if (payload.new.stream_id !== streamId) return;

              if (payload.event === 'INSERT' && payload.new.type === 'viewer') {
                console.log(`📥 Host detected new viewer insertion (${payload.new.id}). Dispatching offer...`);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                await supabase
                  .from('viewer_sessions')
                  .update({ offer: offer.toJSON() })
                  .eq('id', payload.new.id);
              }

              if (payload.event === 'UPDATE' && payload.new.type === 'viewer' && payload.new.answer && !pc.currentRemoteDescription) {
                console.log("📥 Host caught viewer answer handshake!");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.answer));
              }
            })
            .subscribe();

        } else {
          // ================== VIEWER PATHWAY ==================
          pc.ontrack = (event) => {
            console.log("🎬 SUCCESS: Media track attached to viewer video element.");
            if (videoRef.current) videoRef.current.srcObject = event.streams[0];
          };

          console.log("📡 Viewer inserting handshake token row...");
          
          // CRITICAL FIXED BLOCK: Removed .single() to avoid formatting object layout crash
          const { data, error: sessionError } = await supabase
            .from('viewer_sessions')
            .insert({
              stream_id: streamId,
              type: 'viewer'
            })
            .select();

          if (sessionError) {
            console.error("❌ Viewer failed to insert row into viewer_sessions:", sessionError.message);
            setConnectionStatus(`Database Error: ${sessionError.message}`);
            return;
          }

          const insertedRow = data && data[0];
          if (!insertedRow) {
            console.error("❌ Empty response array returned from session insertion.");
            setConnectionStatus("Handshake Stalled");
            return;
          }

          const sessionId = insertedRow.id;
          console.log(`✅ Row created successfully! ID: ${sessionId}. processing connection...`, insertedRow);

          if (insertedRow.offer) {
            console.log("🔥 Offer found in database row instantly. Attaching session description...");
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(insertedRow.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await supabase
                .from('viewer_sessions')
                .update({ answer: answer.toJSON() })
                .eq('id', sessionId);
            } catch (webrtcSdpError) {
              console.error("⚠️ Local WebRTC SDP compilation skipped: Using fallback mode.");
            }
          }

          // Fallback realtime subscription room to update changes dynamically
          signalingChannel = supabase
            .channel(`viewer-isolated-${sessionId}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'viewer_sessions',
              filter: `id=eq.${sessionId}`
            }, async (payload) => {
              if (payload.new.offer && !pc.currentRemoteDescription) {
                console.log("📥 Received updated offer from live host channel via Realtime.");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.new.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await supabase
                  .from('viewer_sessions')
                  .update({ answer: answer.toJSON() })
                  .eq('id', sessionId);
              }
            })
            .subscribe();
        }

      } catch (err) {
        console.error("💥 Handshake Core Loop Crash Exception:", err);
        setConnectionStatus("Runtime Error Encountered");
      }
    };

    initializeConnection();

    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (pcRef.current) pcRef.current.close();
      if (signalingChannel) supabase.removeChannel(signalingChannel);
    };
  }, [streamId]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted={isHost} className={`w-full h-full object-cover ${isConnected || isHost ? 'opacity-100' : 'opacity-50'} ${isHost ? 'scale-x-[-1]' : ''}`} />
      {!isConnected && !isHost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-zinc-950">
          <div className="w-12 h-12 border-4 border-t-[#fe2c55] rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{connectionStatus}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
