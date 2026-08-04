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
      urls: "turn:global.relay.metered.ca:443",
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
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  
  // MULTI-GRID: Store RTCPeerConnections mapped by target peer ID
  const pcsRef = useRef(new Map());
  const iceQueuesRef = useRef(new Map());

  const [stream, setStream] = useState(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [assignedMode, setAssignedMode] = useState('video');
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // MULTI-GRID: State to hold multiple remote streams for rendering in a responsive grid
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ peerId, stream }]

  const currentUserIdRef = useRef(null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    console.log("🚀 [MOUNT] JoinAsGuest mounted for stream:", streamId);
    startPreview();
    fetchUserDetails();

    return () => {
      console.log("🧹 [CLEANUP] Cleaning up connections...");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  const fetchUserDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profileData);
      }
    } catch (err) {
      console.error("❌ Auth error:", err);
    }
  };

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = mediaStream;
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("❌ Media error:", err);
      setIsCamOn(false);
    }
  };

  const initSocket = () => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true
    });

    socket.on('connect', () => console.log("✅ [SOCKET] Connected:", socket.id));
    socketRef.current = socket;
    return socket;
  };

  // MULTI-GRID: Dynamically create peer connection for specific remote peer
  const createPeerConnection = (targetPeerId) => {
    if (pcsRef.current.has(targetPeerId)) {
      return pcsRef.current.get(targetPeerId);
    }

    console.log(`⚙️ [WEBRTC MESH] Instantiating PeerConnection for peer: ${targetPeerId}`);
    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
    pcsRef.current.set(targetPeerId, pc);

    // Attach local guest media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Capture remote stream for grid array state
    pc.ontrack = (event) => {
      console.log(`🎬 [WEBRTC MESH] Remote track received from: ${targetPeerId}`);
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        setRemoteStreams(prev => {
          const exists = prev.some(item => item.peerId === targetPeerId);
          if (exists) return prev;
          return [...prev, { peerId: targetPeerId, stream: remoteStream }];
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit('webrtc_ice_candidate', {
          roomId: streamId,
          candidate: event.candidate,
          to: targetPeerId
        });
      }
    };

    return pc;
  };

  const initMultiGridSignaling = () => {
    const socket = initSocket();
    const activeUserId = currentUserIdRef.current || currentUserId;

    socket.emit('register_user_session', { userId: activeUserId });
    socket.emit('join_call_room', { roomId: streamId, userId: activeUserId });

    // 1. Existing peers in the room trigger new connection initialization
    socket.on('all_room_peers', ({ peers }) => {
      console.log("👥 [GRID] Active peers received:", peers);
      peers.forEach(peerId => {
        if (peerId !== activeUserId) {
          sendOfferToPeer(peerId);
        }
      });
    });

    // 2. Incoming Offer from any room participant
    socket.on('webrtc_offer_received', async ({ offer, from }) => {
      console.log(`📥 [WEBRTC OFFER] Received from peer: ${from}`);
      const pc = createPeerConnection(from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('send_webrtc_answer', {
          roomId: streamId,
          answer,
          to: from
        });
      } catch (err) {
        console.error("❌ Remote offer error:", err);
      }
    });

    // 3. Incoming Answer
    socket.on('webrtc_answer_received', async ({ answer, from }) => {
      console.log(`📥 [WEBRTC ANSWER] Received from peer: ${from}`);
      const pc = pcsRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // 4. ICE candidate processing per peer
    socket.on('incoming_ice_candidate', async ({ candidate, from }) => {
      const pc = pcsRef.current.get(from);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // 5. Peer disconnected - remove video tile from grid
    socket.on('peer_disconnected', ({ peerId }) => {
      console.log(`🚪 [GRID] Peer disconnected: ${peerId}`);
      if (pcsRef.current.has(peerId)) {
        pcsRef.current.get(peerId).close();
        pcsRef.current.delete(peerId);
      }
      setRemoteStreams(prev => prev.filter(item => item.peerId !== peerId));
    });
  };

  const sendOfferToPeer = async (targetPeerId) => {
    const pc = createPeerConnection(targetPeerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('send_webrtc_offer', {
        roomId: streamId,
        offer,
        to: targetPeerId
      });
    } catch (err) {
      console.error("❌ Offer creation error:", err);
    }
  };

  const handleApprovalTrigger = (mode) => {
    setIsRequesting(false);
    setIsApproved(true);
    setAssignedMode(mode);

    if (mode === 'audio' && localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = false;
      setIsCamOn(false);
    }

    initMultiGridSignaling();
  };

  const handleSendRequest = async () => {
    setIsRequesting(true);
    const socket = initSocket();

    socket.off('approve_cohost');
    socket.on('approve_cohost', ({ mode }) => {
      handleApprovalTrigger(mode || 'video');
    });

    const activeUser = userProfile?.id || currentUserIdRef.current;

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
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            if (payload.new.status === 'approved') {
              handleApprovalTrigger(payload.new.mode || 'video');
              supabase.removeChannel(subscription);
            } else if (payload.new.status === 'rejected') {
              setIsRequesting(false);
              alert('Host rejected your request to join.');
              navigate(`/live/watch/${streamId}`);
            }
          }
        )
        .subscribe();
    } else {
      setIsRequesting(false);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsCamOn(track.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative p-6 font-sans">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-white hover:bg-white/20 transition-all">
          <X size={20} />
        </button>
        <span className="text-[10px] font-black text-[#fe2c55] uppercase tracking-widest">
          {isApproved ? `Multi-Grid Panel (${remoteStreams.length + 1} Live)` : 'Guest Preview'}
        </span>
      </div>

      {/* DYNAMIC MULTI-GRID LAYOUT */}
      <div className={`w-full max-w-[1000px] grid gap-4 ${
        !isApproved 
          ? 'grid-cols-1 flex justify-center' 
          : remoteStreams.length === 0 
          ? 'grid-cols-1 max-w-[360px]' 
          : remoteStreams.length === 1 
          ? 'grid-cols-2' 
          : 'grid-cols-2 md:grid-cols-3'
      }`}>
        {/* Local Stream Tile */}
        <motion.div className="relative w-full aspect-[3/4] rounded-[24px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto">
          {isCamOn && assignedMode === 'video' ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4">
              <img src={userProfile?.avatar_url} className="w-16 h-16 rounded-full border-2 border-emerald-500 mb-2 object-cover" alt="" />
              <p className="text-xs font-bold text-zinc-300">@{userProfile?.username}</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="text-white font-bold text-xs">You</span>
          </div>
        </motion.div>

        {/* Remote Peers Grid Tiles */}
        {isApproved && remoteStreams.map(({ peerId, stream }) => (
          <RemoteVideoTile key={peerId} peerId={peerId} stream={stream} />
        ))}
      </div>

      {/* Control Actions */}
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

        <button onClick={toggleCamera} disabled={assignedMode === 'audio' && isApproved} className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isCamOn ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
          {isCamOn ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
};

// Helper Component for rendering multi-grid remote feeds
const RemoteVideoTile = ({ peerId, stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <motion.div className="relative w-full aspect-[3/4] rounded-[24px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
        <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Co-Host Feed</span>
      </div>
    </motion.div>
  );
};

export default JoinAsGuest;
