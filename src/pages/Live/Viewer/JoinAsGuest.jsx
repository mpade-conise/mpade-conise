// src/pages/Live/Shared/JoinAsGuest.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion } from 'framer-motion';
import { Camera, VideoOff, Mic, MicOff, X, Zap, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'https://mpade-backend.onrender.com';

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    }
  ],
  iceCandidatePoolSize: 10
};

const JoinAsGuest = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const hostVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);

  const [stream, setStream] = useState(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [assignedMode, setAssignedMode] = useState('video');
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hostUserId, setHostUserId] = useState(null);

  // Sync state to refs to prevent stale closure bugs in socket event handlers
  const hostUserIdRef = useRef(null);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    hostUserIdRef.current = hostUserId;
  }, [hostUserId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const processIceQueue = async () => {
    if (pcRef.current && pcRef.current.remoteDescription && iceQueueRef.current.length > 0) {
      console.log(`🧊 [ICE] Processing ${iceQueueRef.current.length} queued ICE candidates...`);
      const candidatesToProcess = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const candidate of candidatesToProcess) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ [ICE] Queued candidate added");
        } catch (e) {
          console.warn("⚠️ [ICE] Queued candidate failed:", e);
        }
      }
    }
  };

  useEffect(() => {
    console.log("🚀 [MOUNT] JoinAsGuest mounted for stream:", streamId);
    startPreview();
    fetchUserAndStreamDetails();

    return () => {
      console.log("🧹 [CLEANUP] Cleaning up connections...");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  const fetchUserAndStreamDetails = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) console.error("❌ [SUPABASE] Auth error:", userError);
      
      if (user) {
        console.log("👤 [USER] Logged-in User ID:", user.id);
        setCurrentUserId(user.id);
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profileData);
      }

      console.log("🔍 [SUPABASE] Fetching stream details for stream ID:", streamId);
      const { data: streamData, error: streamError } = await supabase
        .from('live_streams')
        .select('user_id, host_id')
        .eq('id', streamId)
        .single();

      if (streamError) {
        console.error("❌ [SUPABASE] Stream fetch error:", streamError);
      } else if (streamData) {
        const resolvedHost = streamData.user_id || streamData.host_id;
        console.log("👑 [HOST] Resolved Host ID:", resolvedHost);
        setHostUserId(resolvedHost);
      } else {
        console.warn("⚠️ [HOST] Stream record returned null or empty");
      }
    } catch (err) {
      console.error("❌ [SUPABASE] Exception in fetchUserAndStreamDetails:", err);
    }
  };

  const startPreview = async () => {
    try {
      console.log("🎥 [MEDIA] Requesting camera/mic permissions...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = mediaStream;
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
      console.log("✅ [MEDIA] Local media initialized");
    } catch (err) {
      console.error("❌ [MEDIA] Camera/Mic Access Error:", err);
      setIsCamOn(false);
    }
  };

  const initSocket = () => {
    if (socketRef.current?.connected) {
      console.log("⚡ [SOCKET] Using existing connected instance");
      return socketRef.current;
    }

    console.log("🔌 [SOCKET] Connecting to:", SOCKET_SERVER_URL);
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => console.log("✅ [SOCKET] Connected, Socket ID:", socket.id));
    socket.on('connect_error', (err) => console.error("❌ [SOCKET] Connection Error:", err.message));
    socket.on('disconnect', (reason) => console.warn("⚠️ [SOCKET] Disconnected:", reason));

    socketRef.current = socket;
    return socket;
  };

  const connectToHostStream = (guestMediaStream, mode) => {
    const targetHostId = hostUserIdRef.current || hostUserId;
    const activeUserId = currentUserIdRef.current || currentUserId;

    console.log("🏁 [WEBRTC HALT CHECK] Preparing handshake:", { targetHostId, activeUserId, streamId });

    // HALT CHECK 1: Missing Host ID
    if (!targetHostId) {
      console.error("🛑 [HALT CAUSE 1] hostUserId is null/undefined! WebRTC handshake stopped.");
      alert("Host details not loaded yet. Please try again.");
      return;
    }

    // HALT CHECK 2: Connection Already Active
    if (pcRef.current) {
      console.warn("🛑 [HALT CAUSE 2] RTCPeerConnection already active. Blocking double initialization.");
      return;
    }

    const socket = initSocket();

    const setupSocketListeners = () => {
      console.log("📡 [SOCKET] Registering user session & joining call room...");
      socket.emit('register_user_session', { userId: activeUserId });
      socket.emit('join_call_room', { roomId: streamId, userId: activeUserId, targetPeerId: targetHostId });
      socket.emit('peer_ready', { roomId: streamId, userId: activeUserId });
    };

    if (socket.connected) {
      setupSocketListeners();
    } else {
      socket.on('connect', setupSocketListeners);
    }

    console.log("⚙️ [WEBRTC] Instantiating RTCPeerConnection...");
    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
    pcRef.current = pc;

    // Detailed State Logging
    pc.onconnectionstatechange = () => {
      console.log(`🌐 [WEBRTC STATE] Connection State: %c${pc.connectionState}`, "color: yellow; font-weight: bold;");
      if (pc.connectionState === 'failed') {
        console.error("🛑 [HALT CAUSE 3] PeerConnection state failed! STUN/TURN servers unreadable or blocked.");
      }
    };

    pc.onsignalingstatechange = () => console.log(`🚦 [WEBRTC STATE] Signaling State: ${pc.signalingState}`);
    pc.oniceconnectionstatechange = () => console.log(`❄️ [WEBRTC STATE] ICE State: ${pc.iceConnectionState}`);

    if (guestMediaStream) {
      const videoTrack = guestMediaStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = mode === 'video' && isCamOn;

      guestMediaStream.getTracks().forEach(track => {
        console.log(`➕ [WEBRTC] Adding track: ${track.kind}`);
        pc.addTrack(track, guestMediaStream);
      });
    } else {
      console.warn("⚠️ [WEBRTC] No local guestMediaStream available to attach.");
    }

    pc.ontrack = (event) => {
      console.log("🎬 [WEBRTC] Host track event received!", event);
      if (event.streams && event.streams[0] && hostVideoRef.current) {
        console.log("✅ [WEBRTC] Attaching stream to host video element");
        hostVideoRef.current.srcObject = event.streams[0];
        hostVideoRef.current.play().catch(e => console.error("❌ [VIDEO] Playback blocked:", e));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        console.log("📤 [ICE] Emitting ICE candidate to host:", targetHostId);
        socketRef.current.emit('webrtc_ice_candidate', {
          roomId: streamId,
          streamId: streamId,
          candidate: event.candidate,
          to: targetHostId
        });
      }
    };

    const createAndSendOffer = async () => {
      try {
        console.log("📝 [WEBRTC] Creating local offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("📤 [WEBRTC] Offer set locally, emitting offer to host:", targetHostId);
        socket.emit('send_webrtc_offer', {
          roomId: streamId,
          streamId: streamId,
          offer,
          targetViewerId: targetHostId,
          to: targetHostId
        });
      } catch (err) {
        console.error("❌ [WEBRTC] Offer Creation Error:", err);
      }
    };

    createAndSendOffer();

    socket.on('webrtc_answer_received', async ({ answer, from }) => {
      console.log("📥 [WEBRTC] Answer received from host/peer:", from);
      if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
      try {
        if (pcRef.current.signalingState === 'have-local-offer') {
          console.log("✅ [WEBRTC] Setting Remote Description from answer...");
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue();
        } else {
          console.warn(`⚠️ [WEBRTC] Answer ignored due to state: ${pcRef.current.signalingState}`);
        }
      } catch (err) {
        console.error("❌ [WEBRTC] Remote answer error:", err);
      }
    });

    socket.on('webrtc_offer_received', async ({ offer, from }) => {
      console.log("📥 [WEBRTC] Renegotiation offer received from:", from);
      if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        console.log("📤 [WEBRTC] Sending renegotiation answer back to:", targetHostId);
        socket.emit('send_webrtc_answer', {
          roomId: streamId,
          streamId: streamId,
          answer,
          to: targetHostId
        });
        await processIceQueue();
      } catch (err) {
        console.error("❌ [WEBRTC] Offer process error:", err);
      }
    });

    socket.on('incoming_ice_candidate', async ({ candidate, from }) => {
      console.log("📥 [ICE] Received candidate from:", from);
      const currentPc = pcRef.current;
      if (currentPc && currentPc.remoteDescription && currentPc.remoteDescription.type) {
        try {
          await currentPc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ [ICE] Candidate added");
        } catch (e) {
          console.warn("⚠️ [ICE] Candidate addition warning:", e);
        }
      } else {
        console.log("📦 [ICE] Remote description not set yet. Queueing candidate...");
        iceQueueRef.current.push(candidate);
      }
    });

    socket.on('kicked_cohost', () => {
      console.warn("🚫 [HOST] Session ended by host.");
      alert('Host ended the panel session.');
      navigate(`/live/watch/${streamId}`);
    });
  };

  const handleApprovalTrigger = (mode) => {
    console.log("🎉 [APPROVAL] Triggering panel join in mode:", mode);
    setIsRequesting(false);
    setIsApproved(true);
    setAssignedMode(mode);

    if (mode === 'audio' && localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = false;
      setIsCamOn(false);
    }

    connectToHostStream(localStreamRef.current, mode);
  };

  const handleSendRequest = async () => {
    console.log("📩 [REQUEST] Initiating join request...");
    setIsRequesting(true);

    const socket = initSocket();
    socket.off('approve_cohost'); // Prevent duplicated event bindings
    socket.on('approve_cohost', ({ mode }) => {
      console.log("⚡ [SOCKET] Received approve_cohost event!");
      handleApprovalTrigger(mode || 'video');
    });

    const activeUser = userProfile?.id || currentUserIdRef.current || currentUserId;

    const { data: request, error } = await supabase
      .from('live_guest_requests')
      .insert([{
        stream_id: streamId,
        user_id: activeUser,
        status: 'pending',
        username: userProfile?.username,
        avatar_url: userProfile?.avatar_url
      }])
      .select()
      .single();

    if (!error && request) {
      console.log("✅ [SUPABASE] Inserted guest request:", request.id, "Listening for realtime updates...");
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            console.log("🔔 [REALTIME] Request updated:", payload.new);
            const mode = payload.new.mode || 'video';

            if (payload.new.status === 'approved') {
              handleApprovalTrigger(mode);
              supabase.removeChannel(subscription);
            } else if (payload.new.status === 'rejected') {
              setIsRequesting(false);
              alert('Host rejected your request to join.');
              navigate(`/live/watch/${streamId}`);
            } else if (payload.new.status === 'disconnected') {
              navigate(`/live/watch/${streamId}`);
            }
          }
        )
        .subscribe((status) => console.log("📡 [REALTIME SUBSCRIPTION] Status:", status));
    } else {
      setIsRequesting(false);
      console.error("❌ [SUPABASE] Error inserting request:", error);
    }
  };

  const toggleCamera = () => {
    if (assignedMode === 'audio' && isApproved) {
      alert("Host has approved this link in Audio-only mode.");
      return;
    }

    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsCamOn(track.enabled);
        console.log("🎥 [MEDIA] Camera toggled:", track.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
        console.log("🎙️ [MEDIA] Mic toggled:", track.enabled);
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative p-6 font-sans">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-white hover:bg-white/20 transition-all">
          <X size={20} />
        </button>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-[#fe2c55] uppercase tracking-widest">
            {isApproved ? `Live Panel (${assignedMode.toUpperCase()})` : 'Guest Preview'}
          </span>
        </div>
      </div>

      <div className={`w-full max-w-[700px] grid gap-4 ${isApproved ? 'grid-cols-2' : 'grid-cols-1 flex justify-center'}`}>
        <motion.div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto max-w-[320px]">
          {isCamOn && assignedMode === 'video' ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4">
              <img src={userProfile?.avatar_url} className="w-20 h-20 rounded-full border-2 border-emerald-500 mb-3 object-cover" alt="" />
              <p className="text-xs font-bold text-zinc-300">@{userProfile?.username}</p>
              <span className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase mt-1">
                {assignedMode === 'audio' ? '● Audio Live' : 'Camera Off'}
              </span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="text-white font-bold text-xs">@{userProfile?.username || 'You'} (You)</span>
          </div>
        </motion.div>

        {isApproved && (
          <div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto max-w-[320px]">
            <video ref={hostVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">● Host Feed</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-6 z-50">
        <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isMicOn ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {!isApproved && (
          <button onClick={handleSendRequest} disabled={isRequesting} className="bg-[#fe2c55] px-8 py-4 rounded-full text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-[#e0264b] transition-all disabled:opacity-50">
            {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
            {isRequesting ? 'Waiting for Host...' : 'Request to Join Panel'}
          </button>
        )}

        <button 
          onClick={toggleCamera} 
          disabled={assignedMode === 'audio' && isApproved}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isCamOn && assignedMode === 'video' ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'} ${assignedMode === 'audio' && isApproved ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isCamOn && assignedMode === 'video' ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
};

export default JoinAsGuest;
