import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion } from 'framer-motion';
import { Camera, VideoOff, Mic, MicOff, X, Zap, Loader2, Radio } from 'lucide-react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'https://mpade-backend.onrender.com';

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    }
  ],
  iceCandidatePoolSize: 10,
};

const JoinAsGuest = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);

  const [stream, setStream] = useState(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLiveOnPanel, setIsLiveOnPanel] = useState(false);
  const [assignedMode, setAssignedMode] = useState('video');
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hostUserId, setHostUserId] = useState(null);

  const hostUserIdRef = useRef(null);
  const currentUserIdRef = useRef(null);

  useEffect(() => { 
    hostUserIdRef.current = hostUserId; 
    console.log('[DEBUG] Updated hostUserIdRef:', hostUserId);
  }, [hostUserId]);

  useEffect(() => { 
    currentUserIdRef.current = currentUserId; 
    console.log('[DEBUG] Updated currentUserIdRef:', currentUserId);
  }, [currentUserId]);

  const processIceQueue = async () => {
    console.log(`🧊 [ICE] Processing queued candidates. Queue length: ${iceQueueRef.current.length}`);
    if (pcRef.current && pcRef.current.remoteDescription && iceQueueRef.current.length > 0) {
      const candidates = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const candidate of candidates) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ [ICE] Added queued ICE Candidate successfully');
        } catch (e) {
          console.warn('⚠️ [ICE] Candidate add warning:', e);
        }
      }
    } else {
      console.log('ℹ️ [ICE] Queue processing skipped (No PC, remote description missing, or empty queue)');
    }
  };

  const startPreview = async () => {
    console.log('📹 [MEDIA] Requesting user media permissions...');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('✅ [MEDIA] User media stream obtained successfully:', mediaStream.id);
      localStreamRef.current = mediaStream;
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
        console.log('🎥 [MEDIA] Assigned media stream to local video element');
      }
    } catch (err) {
      console.error('❌ [MEDIA] Access Error:', err);
      setIsCamOn(false);
    }
  };

  const fetchDetails = async () => {
    console.log('🔍 [INIT] Fetching user profile and live stream metadata...');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('👤 [AUTH] Authenticated User ID:', user.id);
      setCurrentUserId(user.id);
      const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileErr) console.error('❌ [SUPABASE] Error fetching user profile:', profileErr);
      else console.log('✅ [SUPABASE] User profile retrieved:', profile?.username);
      setUserProfile(profile);
    } else {
      console.warn('⚠️ [AUTH] No authenticated user found.');
    }

    const { data: streamData, error: streamErr } = await supabase.from('live_streams').select('*').eq('id', streamId).single();
    if (streamErr) {
      console.error('❌ [SUPABASE] Error fetching stream details:', streamErr);
    } else if (streamData) {
      const detectedHost = streamData.host_id || streamData.user_id;
      console.log('✅ [SUPABASE] Live Stream host retrieved:', detectedHost);
      setHostUserId(detectedHost);
    }
  };

  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🌐 [SOCKET] Reusing existing connected socket:', socketRef.current.id);
      return socketRef.current;
    }

    console.log('🌐 [SOCKET] Initializing Socket.io connection to:', SOCKET_SERVER_URL);
    const socket = io(SOCKET_SERVER_URL, { 
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("🌐 [Guest Socket] Connected to signaling server with ID:", socket.id);
      console.log(`📡 [SOCKET] Emitting 'join_room' for stream: ${streamId}, user: ${currentUserIdRef.current}`);
      socket.emit('join_room', { streamId, userId: currentUserIdRef.current });
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ [SOCKET] Disconnected from signaling server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [SOCKET] Connection Error:', error);
    });

    return socket;
  }, [streamId]);

  // Ingest-Only Connection: Guest acts as stream source for the Host
  const startBroadcastIngest = useCallback((guestMediaStream, mode, targetHost) => {
    const activeUser = currentUserIdRef.current || currentUserId;
    console.log(`🚀 [WEBRTC] Initializing broadcast ingest process. ActiveUser: ${activeUser}, TargetHost: ${targetHost}, Mode: ${mode}`);
    const socket = initSocket();

    if (pcRef.current) {
      console.log('🔄 [WEBRTC] Closing existing RTCPeerConnection before recreating');
      pcRef.current.close();
    }

    console.log('🛠️ [WEBRTC] Creating new RTCPeerConnection with ICE config');
    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
    pcRef.current = pc;

    // Track Connection State Changes
    pc.onconnectionstatechange = () => {
      console.log(`⚡ [WEBRTC State] Connection State Changed: ${pc.connectionState}`);
    };
    pc.onsignalingstatechange = () => {
      console.log(`⚡ [WEBRTC State] Signaling State Changed: ${pc.signalingState}`);
    };
    pc.oniceconnectionstatechange = () => {
      console.log(`⚡ [WEBRTC State] ICE Connection State Changed: ${pc.iceConnectionState}`);
    };

    // Attach local tracks to send stream upstream to host server/mixer
    if (guestMediaStream) {
      console.log('🎵 [WEBRTC] Attaching local tracks to Peer Connection...');
      guestMediaStream.getTracks().forEach((track) => {
        if (track.kind === 'video') track.enabled = mode === 'video' && isCamOn;
        if (track.kind === 'audio') track.enabled = isMicOn;
        console.log(`➕ [WEBRTC] Added track: ${track.kind} (Enabled: ${track.enabled})`);
        pc.addTrack(track, guestMediaStream);
      });
    } else {
      console.warn('⚠️ [WEBRTC] No local media stream provided to attach tracks!');
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        console.log('📡 [WEBRTC] Generated local ICE Candidate, emitting to host:', targetHost);
        socket.emit('webrtc_ice_candidate', {
          streamId,
          candidate: event.candidate,
          to: targetHost,
          senderType: 'guest'
        });
      }
    };

    // Configure connection strictly for publishing outbound stream
    const publishStreamFeed = async () => {
      try {
        console.log('📄 [WEBRTC] Creating WebRTC offer...');
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);
        console.log('✅ [WEBRTC] Local description set to offer');

        console.log("🚀 [Guest WebRTC] Dispatching offer to host via socket event 'send_webrtc_offer'");
        socket.emit('send_webrtc_offer', {
          streamId,
          guestId: activeUser,
          targetHostId: targetHost,
          offer: offer,
          mode,
        });
      } catch (err) {
        console.error('❌ Stream ingest publish failed:', err);
      }
    };

    publishStreamFeed();

    socket.off('webrtc_answer_received');
    socket.on('webrtc_answer_received', async ({ answer, sdpAnswer }) => {
      const incomingAnswer = answer || sdpAnswer;
      console.log('📩 [SOCKET] Event received: "webrtc_answer_received"', { incomingAnswer });
      if (!pcRef.current || pcRef.current.signalingState === 'closed' || !incomingAnswer) {
        console.warn('⚠️ [WEBRTC] Ignored answer. PC invalid or state closed.');
        return;
      }
      try {
        console.log("⚡ [Guest WebRTC] Host Answer received! Setting Remote Description...");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingAnswer));
        console.log('✅ [WEBRTC] Remote Description set successfully');
        await processIceQueue();
      } catch (err) {
        console.error('❌ Remote SDP processing failed:', err);
      }
    });

    socket.off('incoming_ice_candidate');
    socket.on('incoming_ice_candidate', async ({ candidate }) => {
      console.log('📩 [SOCKET] Event received: "incoming_ice_candidate"', candidate);
      if (pcRef.current?.remoteDescription && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ [WEBRTC] Added incoming ICE candidate directly');
        } catch (e) {
          console.error('❌ [WEBRTC] Failed to add incoming ICE candidate:', e);
        }
      } else if (candidate) {
        console.log('📥 [WEBRTC] Remote description not ready, queuing incoming candidate');
        iceQueueRef.current.push(candidate);
      }
    });

    socket.off('removed_from_panel');
    socket.on('removed_from_panel', () => {
      console.warn('🚨 [SOCKET] Event received: "removed_from_panel". Navigating back...');
      alert('You have been removed from the panel stream.');
      navigate(`/live/watch/${streamId}`);
    });
  }, [initSocket, streamId, currentUserId, isCamOn, isMicOn, navigate]);

  const handleApproval = useCallback((mode, hostId) => {
    console.log("🎉 [Guest] Received host approval, setting up WebRTC stream...", { mode, hostId });
    setIsRequesting(false);
    setIsLiveOnPanel(true);
    setAssignedMode(mode);

    const resolvedHost = hostId || hostUserIdRef.current;
    console.log(`📌 [APPROVAL] Resolved Host ID for ingest: ${resolvedHost}`);
    startBroadcastIngest(localStreamRef.current, mode, resolvedHost);
  }, [startBroadcastIngest]);

  useEffect(() => {
    console.log('🚀 [LIFECYCLE] Component mounted. Initializing preview, details, and socket listeners...');
    startPreview();
    fetchDetails();
    const socket = initSocket();

    // Listen for real-time approval directly on active socket
    const onApproveCohost = (payload) => {
      console.log('📩 [SOCKET] Approval event received:', payload);
      const guestMatch = payload.guestId ? payload.guestId === currentUserIdRef.current : true;
      if (guestMatch) {
        console.log('✅ [APPROVAL] Match confirmed for current guest!');
        handleApproval(payload.mode || 'video', payload.hostId);
      } else {
        console.log(`ℹ️ [APPROVAL] Approval ignored (Target Guest ID ${payload.guestId} != Current User ${currentUserIdRef.current})`);
      }
    };

    socket.on('approve_cohost', onApproveCohost);
    socket.on('cohost_approved', onApproveCohost);

    return () => {
      console.log('🧹 [CLEANUP] Unmounting component. Cleaning up streams, PC, and socket listeners...');
      if (localStreamRef.current) {
        console.log('🛑 [MEDIA] Stopping local media tracks');
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        console.log('🛑 [WEBRTC] Closing PeerConnection');
        pcRef.current.close();
      }
      if (socketRef.current) {
        console.log('🔌 [SOCKET] Removing socket listeners and disconnecting');
        socketRef.current.off('approve_cohost', onApproveCohost);
        socketRef.current.off('cohost_approved', onApproveCohost);
        socketRef.current.disconnect();
      }
    };
  }, [streamId, initSocket, handleApproval]);

  const handleSendRequest = async () => {
    console.log('👆 [ACTION] "Request Stream Panel" clicked');
    setIsRequesting(true);
    const activeUser = userProfile?.id || currentUserId;
    console.log(`📤 [SUPABASE] Inserting panel request for user: ${activeUser}`);

    // 1. Send via Supabase
    const { data: request, error: reqErr } = await supabase
      .from('live_guest_requests')
      .insert([
        {
          stream_id: streamId,
          user_id: activeUser,
          status: 'pending',
          username: userProfile?.username,
          avatar_url: userProfile?.avatar_url,
        },
      ])
      .select()
      .single();

    if (reqErr) {
      console.error('❌ [SUPABASE] Request submission error:', reqErr);
      setIsRequesting(false);
      return;
    }

    if (request) {
      console.log('✅ [SUPABASE] Request submitted successfully. Request ID:', request.id);
      console.log(`📡 [SUPABASE] Subscribing to changes for channel: guest_request_${request.id}`);
      
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            console.log('🔔 [SUPABASE Realtime] Guest request updated:', payload.new);
            if (payload.new.status === 'approved') {
              console.log('🎉 [SUPABASE Realtime] Request APPROVED by host');
              handleApproval(payload.new.mode || 'video', payload.new.host_id);
              supabase.removeChannel(subscription);
            } else if (payload.new.status === 'rejected') {
              console.warn('🚫 [SUPABASE Realtime] Request REJECTED by host');
              setIsRequesting(false);
              alert('Request to join stream panel was rejected.');
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 [SUPABASE Realtime] Subscription status: ${status}`);
        });
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsCamOn(track.enabled);
        console.log(`🎥 [MEDIA] Camera state toggled to: ${track.enabled}`);
      } else {
        console.warn('⚠️ [MEDIA] No video track found to toggle');
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
        console.log(`🎙️ [MEDIA] Microphone state toggled to: ${track.enabled}`);
      } else {
        console.warn('⚠️ [MEDIA] No audio track found to toggle');
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative p-6 font-sans">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
        <button
          onClick={() => {
            console.log('🚪 [ACTION] Navigating back...');
            navigate(-1);
          }}
          className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-white hover:bg-white/20 transition-all"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-white/10">
          <Radio size={14} className={isLiveOnPanel ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'} />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {isLiveOnPanel ? `Panel Ingest Feed (${assignedMode.toUpperCase()})` : 'Guest Stage Preview'}
          </span>
        </div>
      </div>

      <div className="w-full max-w-[360px] flex justify-center">
        <motion.div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border-2 border-cyan-500/30 bg-zinc-900 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          {isCamOn && assignedMode === 'video' ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4">
              <img src={userProfile?.avatar_url} className="w-20 h-20 rounded-full border-2 border-cyan-500 mb-3 object-cover" alt="" />
              <p className="text-xs font-bold text-zinc-300">@{userProfile?.username}</p>
              <span className="text-[9px] text-cyan-400 font-mono tracking-wider uppercase mt-1">
                {assignedMode === 'audio' ? '● Audio Feed Active' : 'Camera Muted'}
              </span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-white font-bold text-xs">@{userProfile?.username || 'Guest'}</span>
          </div>
        </motion.div>
      </div>

      <div className="mt-8 flex items-center gap-6 z-50">
        <button
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
            isMicOn ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'
          }`}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {!isLiveOnPanel && (
          <button
            onClick={handleSendRequest}
            disabled={isRequesting}
            className="bg-[#fe2c55] px-8 py-4 rounded-full text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-[#e0264b] transition-all disabled:opacity-50"
          >
            {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
            {isRequesting ? 'Waiting for Host...' : 'Request Stream Panel'}
          </button>
        )}

        <button
          onClick={toggleCamera}
          disabled={assignedMode === 'audio' && isLiveOnPanel}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
            isCamOn && assignedMode === 'video' ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'
          }`}
        >
          {isCamOn && assignedMode === 'video' ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
};

export default JoinAsGuest;
