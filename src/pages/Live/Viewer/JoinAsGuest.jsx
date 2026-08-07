import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion } from 'framer-motion';
import { Camera, VideoOff, Mic, MicOff, X, Zap, Loader2 } from 'lucide-react';
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
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
  ],
  iceCandidatePoolSize: 10,
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
  const isConnectingRef = useRef(false);

  const [stream, setStream] = useState(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [assignedMode, setAssignedMode] = useState('video');
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hostUserId, setHostUserId] = useState(null);

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
      console.log(`🧊 [ICE] Processing ${iceQueueRef.current.length} queued candidates...`);
      const candidatesToProcess = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const candidate of candidatesToProcess) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('⚠️ [ICE] Candidate add warning:', e);
        }
      }
    }
  };

  const startPreview = async () => {
    try {
      console.log('🎥 [MEDIA] Initializing camera/mic preview...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = mediaStream;
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error('❌ [MEDIA] Access Error:', err);
      setIsCamOn(false);
    }
  };

  const fetchUserAndStreamDetails = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) console.error('❌ [SUPABASE] Auth error:', userError);

      if (user) {
        setCurrentUserId(user.id);
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profileData);
      }

      const { data: streamData, error: streamError } = await supabase
        .from('live_streams')
        .select('*')
        .eq('id', streamId)
        .single();

      if (streamError) {
        console.error('❌ [SUPABASE] Stream error:', streamError);
      } else if (streamData) {
        const resolvedHost = streamData.host_id || streamData.user_id;
        setHostUserId(resolvedHost);
      }
    } catch (err) {
      console.error('❌ [SUPABASE] Exception in fetch details:', err);
    }
  };

  useEffect(() => {
    startPreview();
    fetchUserAndStreamDetails();

    return () => {
      console.log('🧹 [CLEANUP] Tearing down peer connections & sockets');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => console.log('✅ [SOCKET] Connected ID:', socket.id));
    socket.on('connect_error', (err) => console.error('❌ [SOCKET] Error:', err.message));

    socketRef.current = socket;
    return socket;
  }, []);

  const connectToHostStream = (guestMediaStream, mode, directHostId = null) => {
    const targetHostId = directHostId || hostUserIdRef.current || hostUserId;
    const activeUserId = currentUserIdRef.current || currentUserId;

    if (!targetHostId) {
      alert('Host connection details are missing. Please refresh.');
      return;
    }

    if (pcRef.current) {
      console.warn('⚠️ WebRTC connection already exists. Bypassing duplication.');
      return;
    }

    const socket = initSocket();

    const registerSession = () => {
      socket.emit('register_user_session', { userId: activeUserId });
      socket.emit('join_call_room', { roomId: streamId, userId: activeUserId, targetPeerId: targetHostId });
      socket.emit('peer_ready', { roomId: streamId, userId: activeUserId });
    };

    if (socket.connected) registerSession();
    else socket.on('connect', registerSession);

    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
    pcRef.current = pc;

    if (guestMediaStream) {
      const videoTrack = guestMediaStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = mode === 'video' && isCamOn;

      guestMediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, guestMediaStream);
      });
    }

    pc.ontrack = (event) => {
      if (event.streams?.[0] && hostVideoRef.current) {
        hostVideoRef.current.srcObject = event.streams[0];
        hostVideoRef.current.play().catch((e) => console.error('❌ Playback error:', e));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit('webrtc_ice_candidate', {
          roomId: streamId,
          streamId,
          candidate: event.candidate,
          to: targetHostId,
        });
      }
    };

    const createOffer = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('send_webrtc_offer', {
          roomId: streamId,
          streamId,
          offer,
          targetViewerId: targetHostId,
          to: targetHostId,
        });
      } catch (err) {
        console.error('❌ Offer creation failed:', err);
      }
    };

    createOffer();

    socket.off('webrtc_answer_received');
    socket.on('webrtc_answer_received', async ({ answer }) => {
      if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
      try {
        if (pcRef.current.signalingState === 'have-local-offer') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue();
        }
      } catch (err) {
        console.error('❌ Answer processing failed:', err);
      }
    });

    socket.off('webrtc_offer_received');
    socket.on('webrtc_offer_received', async ({ offer }) => {
      if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('send_webrtc_answer', { roomId: streamId, streamId, answer, to: targetHostId });
        await processIceQueue();
      } catch (err) {
        console.error('❌ Dynamic renegotiation failed:', err);
      }
    });

    socket.off('incoming_ice_candidate');
    socket.on('incoming_ice_candidate', async ({ candidate }) => {
      if (pcRef.current?.remoteDescription?.type) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('⚠️ ICE Candidate add failed:', e);
        }
      } else {
        iceQueueRef.current.push(candidate);
      }
    });

    socket.off('kicked_cohost');
    socket.on('kicked_cohost', () => {
      alert('Host ended panel session.');
      navigate(`/live/watch/${streamId}`);
    });
  };

  const handleApprovalTrigger = useCallback(
    (mode, dynamicHostId = null) => {
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;

      setIsRequesting(false);
      setIsApproved(true);
      setAssignedMode(mode);

      if (dynamicHostId) {
        setHostUserId(dynamicHostId);
        hostUserIdRef.current = dynamicHostId;
      }

      if (mode === 'audio' && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = false;
        setIsCamOn(false);
      }

      connectToHostStream(localStreamRef.current, mode, dynamicHostId);
    },
    [streamId]
  );

  const handleSendRequest = async () => {
    setIsRequesting(true);

    const socket = initSocket();
    socket.off('approve_cohost');
    socket.on('approve_cohost', ({ mode, hostId }) => {
      handleApprovalTrigger(mode || 'video', hostId);
    });

    const activeUser = userProfile?.id || currentUserIdRef.current || currentUserId;

    const { data: request, error } = await supabase
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

    if (!error && request) {
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            const mode = payload.new.mode || 'video';

            if (payload.new.status === 'approved') {
              handleApprovalTrigger(mode, payload.new.host_id);
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
      console.error('❌ Supabase insert request error:', error);
    }
  };

  const toggleCamera = () => {
    if (assignedMode === 'audio' && isApproved) return;

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
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-white hover:bg-white/20 transition-all"
        >
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
        <button
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
            isMicOn ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'
          }`}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {!isApproved && (
          <button
            onClick={handleSendRequest}
            disabled={isRequesting}
            className="bg-[#fe2c55] px-8 py-4 rounded-full text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-[#e0264b] transition-all disabled:opacity-50"
          >
            {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
            {isRequesting ? 'Waiting for Host...' : 'Request to Join Panel'}
          </button>
        )}

        <button
          onClick={toggleCamera}
          disabled={assignedMode === 'audio' && isApproved}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
            isCamOn && assignedMode === 'video' ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'
          } ${assignedMode === 'audio' && isApproved ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isCamOn && assignedMode === 'video' ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
};

export default JoinAsGuest;
