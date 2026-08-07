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

  useEffect(() => { hostUserIdRef.current = hostUserId; }, [hostUserId]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const processIceQueue = async () => {
    if (pcRef.current && pcRef.current.remoteDescription && iceQueueRef.current.length > 0) {
      const candidates = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const candidate of candidates) {
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = mediaStream;
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error('❌ [MEDIA] Access Error:', err);
      setIsCamOn(false);
    }
  };

  const fetchDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);
    }

    const { data: streamData } = await supabase.from('live_streams').select('*').eq('id', streamId).single();
    if (streamData) setHostUserId(streamData.host_id || streamData.user_id);
  };

  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SOCKET_SERVER_URL, { 
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("🌐 [Guest Socket] Connected to signaling server with ID:", socket.id);
      socket.emit('join_room', { streamId, userId: currentUserIdRef.current });
    });

    return socket;
  }, [streamId]);

  // Ingest-Only Connection: Guest acts as stream source for the Host
  const startBroadcastIngest = useCallback((guestMediaStream, mode, targetHost) => {
    const activeUser = currentUserIdRef.current || currentUserId;
    const socket = initSocket();

    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
    pcRef.current = pc;

    // Attach local tracks to send stream upstream to host server/mixer
    if (guestMediaStream) {
      guestMediaStream.getTracks().forEach((track) => {
        if (track.kind === 'video') track.enabled = mode === 'video' && isCamOn;
        if (track.kind === 'audio') track.enabled = isMicOn;
        pc.addTrack(track, guestMediaStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
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
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);

        console.log("🚀 [Guest WebRTC] Dispatching offer to host...");
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
      if (!pcRef.current || pcRef.current.signalingState === 'closed' || !incomingAnswer) return;
      try {
        console.log("⚡ [Guest WebRTC] Host Answer received! Setting Remote Description...");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingAnswer));
        await processIceQueue();
      } catch (err) {
        console.error('❌ Remote SDP processing failed:', err);
      }
    });

    socket.off('incoming_ice_candidate');
    socket.on('incoming_ice_candidate', async ({ candidate }) => {
      if (pcRef.current?.remoteDescription && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else if (candidate) {
        iceQueueRef.current.push(candidate);
      }
    });

    socket.off('removed_from_panel');
    socket.on('removed_from_panel', () => {
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
    startBroadcastIngest(localStreamRef.current, mode, resolvedHost);
  }, [startBroadcastIngest]);

  useEffect(() => {
    startPreview();
    fetchDetails();
    const socket = initSocket();

    // Listen for real-time approval directly on active socket
    const onApproveCohost = (payload) => {
      const guestMatch = payload.guestId ? payload.guestId === currentUserIdRef.current : true;
      if (guestMatch) {
        handleApproval(payload.mode || 'video', payload.hostId);
      }
    };

    socket.on('approve_cohost', onApproveCohost);
    socket.on('cohost_approved', onApproveCohost);

    return () => {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) {
        socketRef.current.off('approve_cohost', onApproveCohost);
        socketRef.current.off('cohost_approved', onApproveCohost);
        socketRef.current.disconnect();
      }
    };
  }, [streamId, initSocket, handleApproval]);

  const handleSendRequest = async () => {
    setIsRequesting(true);
    const activeUser = userProfile?.id || currentUserId;

    // 1. Send via Supabase
    const { data: request } = await supabase
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

    if (request) {
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            if (payload.new.status === 'approved') {
              handleApproval(payload.new.mode || 'video', payload.new.host_id);
              supabase.removeChannel(subscription);
            } else if (payload.new.status === 'rejected') {
              setIsRequesting(false);
              alert('Request to join stream panel was rejected.');
            }
          }
        )
        .subscribe();
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
        <button
          onClick={() => navigate(-1)}
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
