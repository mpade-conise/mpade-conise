import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, VideoOff, Mic, MicOff, X, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';

// Socket server URL (adjust if using an environment variable)
const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'https://your-signaling-server.com';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19020' },
    { urls: 'stun:stun1.l.google.com:19020' }
  ]
};

const JoinAsGuest = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({}); // Stores peer connections mapped by socketId

  const [stream, setStream] = useState(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [coHostsStreams, setCoHostsStreams] = useState([]); // [{ socketId, stream }]

  useEffect(() => {
    startPreview();
    fetchUser();

    return () => {
      stopStream();
      cleanupConnections();
    };
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(data);
    }
  };

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Camera access denied", err);
      setIsCamOn(false);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const cleanupConnections = () => {
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // --- WebRTC & Socket.io Co-Hosting Logic ---

  const initSocketAndWebRTC = (localMediaStream) => {
    const socket = io(SOCKET_SERVER_URL, {
      query: { streamId, userId: userProfile?.id, role: 'cohost' }
    });
    socketRef.current = socket;

    socket.emit('join-room', { room: streamId, isCoHost: true });

    // Handle existing co-hosts or incoming connections
    socket.on('active-cohosts', async (coHostSocketIds) => {
      coHostSocketIds.forEach(targetSocketId => {
        if (targetSocketId !== socket.id) {
          createPeerConnection(targetSocketId, localMediaStream, true);
        }
      });
    });

    socket.on('cohost-joined', ({ socketId }) => {
      createPeerConnection(socketId, localMediaStream, false);
    });

    // Signaling SDP Exchange (Only allowed for authenticated active_cohosts on backend)
    socket.on('sdp-offer', async ({ fromSocketId, sdp }) => {
      let pc = peerConnectionsRef.current[fromSocketId];
      if (!pc) {
        pc = createPeerConnection(fromSocketId, localMediaStream, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('sdp-answer', { toSocketId: fromSocketId, sdp: answer });
    });

    socket.on('sdp-answer', async ({ fromSocketId, sdp }) => {
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('cohost-left', ({ socketId }) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      setCoHostsStreams(prev => prev.filter(item => item.socketId !== socketId));
    });
  };

  const createPeerConnection = (targetSocketId, localMediaStream, isInitiator) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[targetSocketId] = pc;

    // Add local tracks to peer connection
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(track => pc.addTrack(track, localMediaStream));
    }

    // Capture remote co-host tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setCoHostsStreams(prev => {
        const exists = prev.some(item => item.socketId === targetSocketId);
        if (exists) return prev;
        return [...prev, { socketId: targetSocketId, stream: remoteStream }];
      });
    };

    // Forward ICE candidates to signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          toSocketId: targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // If initiator, send SDP offer
    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socketRef.current.emit('sdp-offer', {
          toSocketId: targetSocketId,
          sdp: offer
        });
      });
    }

    return pc;
  };

  // --- Request & Realtime Listener ---

  const handleSendRequest = async () => {
    setIsRequesting(true);

    const { data: request, error } = await supabase.from('live_guest_requests').insert([{
      stream_id: streamId,
      user_id: userProfile?.id,
      status: 'pending',
      username: userProfile?.username,
      avatar_url: userProfile?.avatar_url
    }]).select().single();

    if (!error && request) {
      // Listen for Host approval in real-time
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            if (payload.new.status === 'approved') {
              setIsRequesting(false);
              setIsApproved(true);
              initSocketAndWebRTC(stream);
              supabase.removeChannel(subscription);
            } else if (payload.new.status === 'rejected') {
              setIsRequesting(false);
              alert('Host rejected your request.');
              navigate(`/live/watch/${streamId}`);
            }
          }
        )
        .subscribe();
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative p-6">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fe2c55]/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
          <X size={20} className="text-white" />
        </button>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-[#fe2c55] uppercase tracking-widest">
            {isApproved ? 'Live Co-Host' : 'Guest Mode'}
          </span>
          <span className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">
            {isApproved ? 'Connected to Stream' : 'Preview your setup'}
          </span>
        </div>
      </div>

      {/* Grid: Shows Local Camera + Remote Co-Hosts if approved */}
      <div className={`w-full max-w-[800px] grid gap-4 ${isApproved && coHostsStreams.length > 0 ? 'grid-cols-2' : 'grid-cols-1 flex justify-center'}`}>
        {/* Local Camera Card */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 mx-auto max-w-[340px]"
        >
          {isCamOn ? (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-950">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <VideoOff size={32} className="text-white/20" />
              </div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Camera Disabled</p>
            </div>
          )}

          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            <img src={userProfile?.avatar_url} className="w-8 h-8 rounded-full border-2 border-[#fe2c55] shadow-lg" alt="" />
            <span className="text-white font-bold text-xs">{userProfile?.username} (You)</span>
          </div>
        </motion.div>

        {/* Remote Co-Hosts Cards */}
        {isApproved && coHostsStreams.map(({ socketId, stream: remoteStream }) => (
          <RemoteVideoCard key={socketId} stream={remoteStream} socketId={socketId} />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-6 z-50">
        <button 
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isMicOn ? 'bg-white/10 border-white/20 text-white' : 'bg-red-500/20 border-red-500/40 text-red-500'}`}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {!isApproved && (
          <button 
            onClick={handleSendRequest}
            disabled={isRequesting}
            className="bg-[#fe2c55] px-10 py-4 rounded-full text-white font-black uppercase text-xs tracking-widest shadow-[0_0_30px_rgba(254,44,85,0.4)] flex items-center gap-3 active:scale-95 transition-all"
          >
            {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
            {isRequesting ? 'Waiting for Host...' : 'Request to Join'}
          </button>
        )}

        <button 
          onClick={toggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isCamOn ? 'bg-white/10 border-white/20 text-white' : 'bg-red-500/20 border-red-500/40 text-red-500'}`}
        >
          {isCamOn ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>

      {/* Rules Footer */}
      <div className="mt-8 flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5 z-50">
        <ShieldCheck size={14} className="text-cyan-400" />
        <span className="text-[9px] text-white/50 font-bold uppercase tracking-tighter">Community guidelines apply</span>
      </div>
    </div>
  );
};

// Component for rendering Remote Co-Host Streams
const RemoteVideoCard = ({ stream }) => {
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (remoteVideoRef.current && stream) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 mx-auto max-w-[340px]">
      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Co-Host</span>
      </div>
    </div>
  );
};

export default JoinAsGuest;
