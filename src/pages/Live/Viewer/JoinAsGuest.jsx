import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, VideoOff, Mic, MicOff, X, Zap, Loader2,
  RefreshCw, MessageCircle, Gift as GiftIcon, Heart,
  LogOut
} from 'lucide-react';
import { io } from 'socket.io-client';

// Import Live Shared & Viewer Components for Full Panel Visibility
import LiveChat from './LiveChat';
import GiftPanel from './GiftPanel';
import VideoPlayer from '../Shared/VideoPlayer';
import FloatingHearts from './FloatingHearts';
import StreamHeader from '../Shared/StreamHeader'; 
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

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

  // Media Refs & Stream State
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [audioLevel, setAudioLevel] = useState(0);

  // Connection & Panel States
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLiveOnPanel, setIsLiveOnPanel] = useState(false);
  const [assignedMode, setAssignedMode] = useState('video');
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hostUserId, setHostUserId] = useState(null);
  const [streamData, setStreamData] = useState(null);

  // Interactive Overlays State (Full Panel Visibility)
  const [showChat, setShowChat] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const [latestGift, setLatestGift] = useState(null);

  const hostUserIdRef = useRef(null);
  const currentUserIdRef = useRef(null);

  useEffect(() => { 
    hostUserIdRef.current = hostUserId; 
  }, [hostUserId]);

  useEffect(() => { 
    currentUserIdRef.current = currentUserId; 
  }, [currentUserId]);

  // Process queued ICE candidates when remote description becomes available
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

  // Start Guest Camera & Microphone Media Stream
  const startPreview = useCallback(async (selectedFacing = facingMode) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: selectedFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });

      localStreamRef.current = mediaStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      // Audio Meter Visualizer Setup
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, Math.round(average * 2.5)));
          if (localStreamRef.current) requestAnimationFrame(checkAudio);
        };
        checkAudio();
      } catch (e) {
        console.warn('Audio meter setup error:', e);
      }

    } catch (err) {
      console.error('❌ [MEDIA] Access Error:', err);
      setIsCamOn(false);
    }
  }, [facingMode]);

  // Flip Camera Front / Back
  const toggleFlipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    await startPreview(nextFacing);
  };

  // Socket.io Connection Helper
  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    const socket = io(SOCKET_SERVER_URL, { 
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', { streamId, userId: currentUserIdRef.current });
    });

    return socket;
  }, [streamId]);

  // Transmit Outbound Video & Audio Tracks via WebRTC to Host
  const startBroadcastIngest = useCallback((guestMediaStream, mode, targetHost) => {
    const activeUser = currentUserIdRef.current || currentUserId;
    const socket = initSocket();

    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
    pcRef.current = pc;

    // Attach local tracks (Video & Audio) to stream upstream to host
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

    const publishStreamFeed = async () => {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

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
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingAnswer));
        await processIceQueue();
      } catch (err) {
        console.error('❌ Remote SDP processing failed:', err);
      }
    });

    socket.off('incoming_ice_candidate');
    socket.on('incoming_ice_candidate', async ({ candidate }) => {
      if (pcRef.current?.remoteDescription && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('❌ Failed to add ICE candidate:', e);
        }
      } else if (candidate) {
        iceQueueRef.current.push(candidate);
      }
    });

    socket.off('removed_from_panel');
    socket.on('removed_from_panel', () => {
      alert('You have been removed from the live panel stage.');
      navigate(`/live/watch/${streamId}`);
    });
  }, [initSocket, streamId, currentUserId, isCamOn, isMicOn, navigate]);

  // Handle Host Approval
  const handleApproval = useCallback((mode, hostId) => {
    setIsRequesting(false);
    setIsLiveOnPanel(true);
    setAssignedMode(mode);

    const resolvedHost = hostId || hostUserIdRef.current;
    startBroadcastIngest(localStreamRef.current, mode, resolvedHost);
  }, [startBroadcastIngest]);

  // Fetch User & Stream Details
  const fetchDetails = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) setUserProfile(profile);
    }

    const { data: streamInfo } = await supabase
      .from('live_streams')
      .select('*, host:host_id(username, avatar_url)')
      .eq('id', streamId)
      .single();

    if (streamInfo) {
      setStreamData(streamInfo);
      const detectedHost = streamInfo.host_id || streamInfo.user_id;
      setHostUserId(detectedHost);
      setHeartCount(streamInfo.likes || 0);
    }

    // Auto-connect if guest has an existing approved invitation
    if (user?.id) {
      const { data: existingAppr } = await supabase
        .from('live_guest_requests')
        .select('*')
        .eq('stream_id', streamId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (existingAppr) {
        handleApproval(existingAppr.mode || 'video', existingAppr.host_id || streamInfo?.host_id);
      }
    }
  }, [streamId, handleApproval]);

  // Lifecycle Initialization
  useEffect(() => {
    let isMounted = true;

    const initStage = async () => {
      await startPreview();
      if (isMounted) {
        await fetchDetails();
      }
    };

    initStage();

    const socket = initSocket();

    const onApproveCohost = (payload) => {
      const guestMatch = payload.guestId ? payload.guestId === currentUserIdRef.current : true;
      if (guestMatch) {
        handleApproval(payload.mode || 'video', payload.hostId);
      }
    };

    socket.on('approve_cohost', onApproveCohost);
    socket.on('cohost_approved', onApproveCohost);

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.off('approve_cohost', onApproveCohost);
        socketRef.current.off('cohost_approved', onApproveCohost);
        socketRef.current.disconnect();
      }
    };
  }, [streamId, initSocket, handleApproval, startPreview, fetchDetails]);

  // Listen for realtime gift notifications
  useEffect(() => {
    if (!streamId) return;
    const giftChannel = supabase.channel(`live_gifts_guest_${streamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_gifts', filter: `stream_id=eq.${streamId}` }, (payload) => {
        setLatestGift({
          id: payload.new.id,
          username: payload.new.sender_id || 'Supporter',
          giftName: payload.new.gift_id || 'Gift',
          price: payload.new.price_total || 0,
        });
        setTimeout(() => setLatestGift(null), 5000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(giftChannel);
    };
  }, [streamId]);

  // Send Request to Host
  const handleSendRequest = async () => {
    setIsRequesting(true);
    const activeUser = userProfile?.id || currentUserId;

    const { data: request, error: reqErr } = await supabase
      .from('live_guest_requests')
      .insert([
        {
          stream_id: streamId,
          user_id: activeUser,
          status: 'pending',
          username: userProfile?.username || 'Guest',
          avatar_url: userProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          mode: 'video'
        },
      ])
      .select()
      .single();

    if (reqErr) {
      console.error('❌ Request error:', reqErr);
      setIsRequesting(false);
      return;
    }

    if (request) {
      if (socketRef.current?.connected) {
        socketRef.current.emit('guest_cohost_request', {
          streamId,
          requestId: request.id,
          userId: activeUser,
          username: userProfile?.username || 'Guest',
          avatar: userProfile?.avatar_url,
          mode: 'video'
        });
      }

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
              alert('Request to join stream panel was declined by the host.');
            }
          }
        )
        .subscribe();
    }
  };

  // Toggle Local Camera Track
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsCamOn(track.enabled);
      }
    }
  };

  // Toggle Local Microphone Track
  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
      }
    }
  };

  // Leave Panel / Disconnect
  const handleLeavePanel = async () => {
    if (currentUserId && streamId) {
      await supabase
        .from('live_guest_requests')
        .update({ status: 'left' })
        .eq('stream_id', streamId)
        .eq('user_id', currentUserId);
    }
    if (pcRef.current) pcRef.current.close();
    navigate(`/live/watch/${streamId}`);
  };

  // Like / Heart Increment
  const handleLike = async () => {
    if (!streamId) return;
    setHeartCount(prev => prev + 1);
    await supabase.rpc('increment_likes', { stream_id_input: streamId });
  };

  return (
    <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-between relative overflow-hidden font-sans select-none">
      
      {/* BACKGROUND NEON GLOWS */}
      <div className="fixed top-0 left-1/4 w-[300px] h-[300px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[300px] h-[300px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP STREAM HEADER (VISIBLE ON BOTH PREVIEW & ACTIVE PANEL) */}
      <div className="w-full z-50 p-4 fixed top-0 left-0 right-0 pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between">
          <StreamHeader 
            data={streamData} 
            isHost={false} 
            viewerCount={1} 
            onLeave={handleLeavePanel} 
          />

          <button
            onClick={() => navigate(`/live/watch/${streamId}`)}
            className="p-2.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 text-white hover:bg-white/20 transition-all ml-2"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* MAIN PANEL CONTENT VIEWPORT */}
      <div className="flex-1 w-full relative z-0 flex flex-col items-center justify-center pt-16 pb-24 overflow-hidden">
        
        {/* ============================================================ */}
        {/* MODE A: ACTIVE LIVE ON PANEL (FULL ROOM & GRID VISIBILITY)   */}
        {/* ============================================================ */}
        {isLiveOnPanel ? (
          <div className="w-full h-full relative overflow-hidden flex flex-col">
            
            {/* DYNAMIC STREAM GRID: SHOWS HOST & ACTIVE CO-HOSTS 50/50 */}
            <div className="w-full h-full relative z-0">
              <DynamicStreamGrid 
                streamId={streamId}
                hostVideo={<VideoPlayer streamId={streamId} isHost={false} />}
                hostInfo={{
                  username: streamData?.host?.username || 'Host',
                  avatar_url: streamData?.host?.avatar_url
                }}
                isHostView={false}
              />
            </div>

            {/* FLOATING GUEST CAMERA PiP OVERLAY FOR INSTANT SELF-MONITORING */}
            <div className="absolute top-20 right-4 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] bg-zinc-950 z-30 group">
              {isCamOn ? (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`} 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-2">
                  <img src={userProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} className="w-10 h-10 rounded-full border border-cyan-400 mb-1 object-cover" alt="" />
                  <span className="text-[9px] text-cyan-300 font-bold uppercase">Camera Off</span>
                </div>
              )}

              {/* AUDIO LEVEL INDICATOR */}
              <div className="absolute bottom-1 left-1 right-1 h-1 bg-black/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${isMicOn ? audioLevel : 0}%` }}
                />
              </div>

              {/* FLIP CAMERA OVERLAY BUTTON */}
              <button
                onClick={toggleFlipCamera}
                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/90 rounded-full border border-white/20 text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <RefreshCw size={12} />
              </button>

              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[8px] text-white font-bold">
                You ({assignedMode === 'video' ? 'Video' : 'Audio'})
              </div>
            </div>

            {/* FLOATING HEARTS & GIFT ANIMATION OVERLAYS */}
            <div className="absolute inset-0 pointer-events-none z-20">
              <FloatingHearts count={heartCount} streamId={streamId} />
              <AnimatePresence>
                {latestGift && (
                  <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full h-full flex items-center justify-center">
                    <GiftAlertOverlay gift={latestGift} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* LIVE CHAT OVERLAY ON THE PANEL */}
            {showChat && (
              <div className="absolute bottom-24 left-4 z-30 w-72 max-h-56 pointer-events-auto overflow-hidden">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-white/10">
                  <LiveChat streamId={streamId} hideMessages={false} />
                </div>
              </div>
            )}
          </div>
        ) : (
          
        /* MODE B: PRE-LIVE STAGE PREVIEW (BEFORE REQUEST / WAITING) */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md h-full flex flex-col items-center justify-center p-4 space-y-4">
            
            {/* STAGE CAMERA PREVIEW CONTAINER */}
            <div className="relative w-full aspect-[3/4] max-h-[50vh] rounded-3xl overflow-hidden border-2 border-cyan-500/40 bg-zinc-950 shadow-[0_0_35px_rgba(6,182,212,0.2)] flex items-center justify-center">
              {isCamOn ? (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`} 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-cyan-400 overflow-hidden mb-3 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                    <img 
                      src={userProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm font-black text-white">@{userProfile?.username || 'Gamer'}</p>
                  <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mt-1">
                    Camera Muted
                  </p>
                </div>
              )}

              {/* AUDIO METER VISUALIZER BAR */}
              <div className="absolute bottom-3 left-4 right-4 h-1.5 bg-black/60 backdrop-blur-md rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${isMicOn ? audioLevel : 0}%` }}
                />
              </div>

              {/* USERTAG BADGE */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white">@{userProfile?.username || 'Guest'}</span>
              </div>

              {/* FLIP CAMERA CONTROL BUTTON */}
              <button
                onClick={toggleFlipCamera}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full border border-white/20 text-white transition-all active:scale-95"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* PRE-LIVE STATUS BANNER */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                {isRequesting ? 'Waiting for Host Approval...' : 'Join Stream Panel Stage'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isRequesting 
                  ? 'The host has received your request. Stay ready on stage!'
                  : 'Transmit your camera & mic live to co-host with the host.'}
              </p>
            </div>

            {/* REQUEST PANEL BUTTON */}
            <div className="w-full pt-2">
              <button
                onClick={handleSendRequest}
                disabled={isRequesting}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
                  isRequesting
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-gradient-to-r from-[#fe2c55] to-pink-600 hover:from-pink-600 hover:to-cyan-600 text-white shadow-[0_0_25px_rgba(254,44,85,0.4)]'
                }`}
              >
                {isRequesting ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="white" />}
                <span>{isRequesting ? 'Request Pending...' : 'Request Stream Panel'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ============================================================ */}
      {/* BOTTOM CO-HOST ACTION DOCK                                   */}
      {/* ============================================================ */}
      <div className="w-full z-50 p-4 bg-black/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-center gap-4 sm:gap-6 pointer-events-auto fixed bottom-0 left-0 right-0">
        
        {/* MIC TOGGLE */}
        <button
          onClick={toggleMic}
          className={`p-3 sm:p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all active:scale-95 ${
            isMicOn 
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
              : 'bg-red-500/20 border-red-500/40 text-red-400'
          }`}
        >
          {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          <span className="hidden sm:inline">{isMicOn ? 'Mic On' : 'Muted'}</span>
        </button>

        {/* CAM TOGGLE */}
        <button
          onClick={toggleCamera}
          className={`p-3 sm:p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all active:scale-95 ${
            isCamOn 
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
              : 'bg-red-500/20 border-red-500/40 text-red-400'
          }`}
        >
          {isCamOn ? <Camera size={20} /> : <VideoOff size={20} />}
          <span className="hidden sm:inline">{isCamOn ? 'Cam On' : 'Cam Off'}</span>
        </button>

        {/* FLIP CAM */}
        <button
          onClick={toggleFlipCamera}
          className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-all active:scale-95"
        >
          <RefreshCw size={20} />
        </button>

        {/* CHAT TOGGLE (IF ON PANEL) */}
        {isLiveOnPanel && (
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3 sm:p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all active:scale-95 ${
              showChat 
                ? 'bg-purple-500/20 border-purple-400 text-purple-300' 
                : 'bg-zinc-900 border-white/10 text-zinc-400'
            }`}
          >
            <MessageCircle size={20} />
            <span className="hidden sm:inline">Chat</span>
          </button>
        )}

        {/* GIFT TOGGLE */}
        {isLiveOnPanel && (
          <button
            onClick={() => setShowGifts(true)}
            className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 hover:bg-amber-500 hover:text-black transition-all active:scale-95"
          >
            <GiftIcon size={20} />
          </button>
        )}

        {/* LIKE / HEART */}
        {isLiveOnPanel && (
          <button
            onClick={handleLike}
            className="p-3 sm:p-3.5 rounded-2xl bg-pink-500/20 border border-pink-400 text-pink-300 hover:bg-pink-500 hover:text-white transition-all active:scale-95"
          >
            <Heart size={20} fill="currentColor" />
          </button>
        )}

        {/* LEAVE PANEL / EXIT */}
        {isLiveOnPanel && (
          <button
            onClick={handleLeavePanel}
            className="px-4 py-3 sm:px-5 bg-red-600/90 hover:bg-red-500 border border-red-400 rounded-2xl text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all active:scale-95"
          >
            <LogOut size={16} />
            <span>Leave</span>
          </button>
        )}
      </div>

      {/* GIFT PANEL DRAWER MODAL */}
      <AnimatePresence>
        {showGifts && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGifts(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg">
              <GiftPanel streamId={streamId} onClose={() => setShowGifts(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JoinAsGuest;
