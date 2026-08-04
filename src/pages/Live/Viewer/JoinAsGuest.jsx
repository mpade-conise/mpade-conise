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

  // Drain candidate queue once remote description is ready
  const processIceQueue = async () => {
    if (pcRef.current && pcRef.current.remoteDescription && iceQueueRef.current.length > 0) {
      const candidatesToProcess = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const candidate of candidatesToProcess) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error processing queued ICE candidate:", e);
        }
      }
    }
  };

  useEffect(() => {
    startPreview();
    fetchUserAndStreamDetails();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  const fetchUserAndStreamDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profileData);
    }

    // Fetch the host ID from the live stream record
    const { data: streamData } = await supabase.from('live_streams').select('user_id, host_id').eq('id', streamId).single();
    if (streamData) {
      setHostUserId(streamData.user_id || streamData.host_id);
    }
  };

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = mediaStream;
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Camera error:", err);
      setIsCamOn(false);
    }
  };

  const initSocket = () => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;
    return socket;
  };

  const connectToHostStream = (guestMediaStream, mode) => {
    if (pcRef.current) return;

    const socket = initSocket();

    const setupSocketListeners = () => {
      socket.emit('register_user_session', { userId: currentUserId });
      socket.emit('join_call_room', { roomId: streamId, userId: currentUserId, targetPeerId: hostUserId });
      socket.emit('peer_ready', { roomId: streamId, userId: currentUserId });
    };

    if (socket.connected) {
      setupSocketListeners();
    } else {
      socket.on('connect', setupSocketListeners);
    }

    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
    pcRef.current = pc;

    if (guestMediaStream) {
      const videoTrack = guestMediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = mode === 'video' && isCamOn;
      }
      guestMediaStream.getTracks().forEach(track => pc.addTrack(track, guestMediaStream));
    }

    pc.ontrack = (event) => {
      console.log("🎬 Host Stream Received");
      if (event.streams && event.streams[0] && hostVideoRef.current) {
        hostVideoRef.current.srcObject = event.streams[0];
        hostVideoRef.current.play().catch(e => console.error("Auto-play error:", e));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit('webrtc_ice_candidate', {
          roomId: streamId,
          streamId: streamId,
          candidate: event.candidate,
          to: hostUserId
        });
      }
    };

    const createAndSendOffer = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('send_webrtc_offer', {
          roomId: streamId,
          streamId: streamId,
          offer,
          targetViewerId: hostUserId,
          to: hostUserId
        });
      } catch (err) {
        console.error("Error creating WebRTC offer:", err);
      }
    };

    createAndSendOffer();

    socket.on('webrtc_answer_received', async ({ answer }) => {
      if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
      try {
        if (pcRef.current.signalingState === 'have-local-offer') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue();
        }
      } catch (err) {
        console.error("Error setting remote answer:", err);
      }
    });

    socket.on('webrtc_offer_received', async ({ offer }) => {
      if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('send_webrtc_answer', {
          roomId: streamId,
          streamId: streamId,
          answer,
          to: hostUserId
        });
        await processIceQueue();
      } catch (err) {
        console.error("Error handling incoming offer:", err);
      }
    });

    socket.on('incoming_ice_candidate', async ({ candidate }) => {
      const currentPc = pcRef.current;
      if (currentPc && currentPc.remoteDescription && currentPc.remoteDescription.type) {
        try {
          await currentPc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Skipped candidate:", e);
        }
      } else {
        iceQueueRef.current.push(candidate);
      }
    });

    socket.on('kicked_cohost', () => {
      alert('Host ended the panel session.');
      navigate(`/live/watch/${streamId}`);
    });
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

    connectToHostStream(localStreamRef.current, mode);
  };

  const handleSendRequest = async () => {
    setIsRequesting(true);

    const socket = initSocket();
    socket.on('approve_cohost', ({ mode }) => {
      handleApprovalTrigger(mode || 'video');
    });

    const { data: request, error } = await supabase
      .from('live_guest_requests')
      .insert([{
        stream_id: streamId,
        user_id: userProfile?.id,
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
        .subscribe();
    } else {
      setIsRequesting(false);
      if (error) console.error("Error creating guest request:", error);
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
            <span className="text-white font-bold text-xs">@{userProfile?.username} (You)</span>
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
