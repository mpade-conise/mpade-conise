import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { 
  Users, Gift, BarChart3, Share2, Clock, 
  MessageCircle, Settings, ShieldAlert, List, 
  HelpCircle, BarChart, Heart, Smile, X, Check,
  UserPlus, Swords, Mic, MicOff, Video, VideoOff, Layers, Search, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Component Imports
import HostControls from './HostControls';
import ChatBox from '../Shared/ChatBox';
import LiveAnalyticsPanel from './HostAnalytics';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import StreamHeader from '../Shared/StreamHeader'; 
import BattleOverlay from './BattleOverlay';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  
  // --- MEDIA & SOCKET REFERENCES ---
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  
  // CRUCIAL: Tracks active viewer connections dynamically to support independent data streaming lines
  const peerConnectionsRef = useRef({}); 
  
  // --- CORE STATE ---
  const [streamData, setStreamData] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [reactions, setReactions] = useState([]); 
  const [activeGift, setActiveGift] = useState(null);
  const [battleScores, setBattleScores] = useState({ host: 0, challenger: 0 });
  
  // Array of active remote streams for multi-guest layout slicing
  const [coHosts, setCoHosts] = useState([]); 
  
  // --- UI MODES ---
  const [activePanel, setActivePanel] = useState(null); 
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  const [joinAlert, setJoinAlert] = useState(null);
  const [activePoll, setActivePoll] = useState(null); 
  const [chatFilter, setChatFilter] = useState('all');
  const [incomingInvite, setIncomingInvite] = useState(null);

  // 1. INITIALIZE GLOBAL SOCKET.IO ENGINE & WEBTRC EVENT MATRIX
  useEffect(() => {
    let isMounted = true;
    let ioInstance = null;

    const globalIo = typeof window !== 'undefined' ? window.io : null;

    if (globalIo && isMounted) {
      const socket = globalIo(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        query: { room: streamId, role: 'host' },
        forceNew: true
      });
      socketRef.current = socket;
      ioInstance = socket;

      socket.on('viewer_joined', (data) => {
        if (!isMounted) return;
        setJoinAlert(`${data.username || 'A viewer'} joined the stream!`);
        setTimeout(() => { if (isMounted) setJoinAlert(null); }, 3000);
      });

      socket.on('received_reaction', (data) => {
        if (isMounted) handleNewReaction(data.type);
      });

      socket.on('battle_invite_received', (payload) => {
        if (isMounted) {
          console.log("⚔️ Incoming battle invite via Socket.io:", payload);
          setIncomingInvite(payload);
        }
      });

      socket.on('room_presence_update', (users) => {
        if (isMounted) setViewers(users);
      });

      socket.on('incoming_gift_alert', (giftData) => {
        if (isMounted) {
          setActiveGift(giftData);
          setTimeout(() => { if (isMounted) setActiveGift(null); }, 4000);
        }
      });

      // MULTI-PEER CONCURRENT HANDSHAKE GENERATION LAYER
      socket.on('viewer_requesting_stream', async (payload) => {
        const viewerId = payload.viewerSocketId;
        if (!isMounted || !localStreamRef.current) return;

        console.log(`📥 Socket handshake requested from viewer [${viewerId}]. Dispatching custom offer line...`);
        
        try {
          const iceConfig = {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          };

          // Build a brand-new, isolated track interface line for this viewer segment
          const pc = new RTCPeerConnection(iceConfig);
          peerConnectionsRef.current[viewerId] = pc;

          // Inject local camera track layouts straight into this viewer track instance
          localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

          // Forward specific host network details directly to the viewer's endpoint
          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current?.connected) {
              socketRef.current.emit('webrtc_ice_candidate', {
                streamId,
                candidate: event.candidate,
                targetSocketId: viewerId,
                senderType: 'host'
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('send_webrtc_offer', {
            streamId,
            offer,
            targetViewerId: viewerId
          });

        } catch (e) {
          console.error("❌ Failed to process inline multi-peer viewer offer configuration:", e);
        }
      });

      // Map targeted answers back to the isolated user connection dictionary
      socket.on('webrtc_answer_received', async (payload) => {
        const pc = peerConnectionsRef.current[payload.viewerSocketId];
        if (pc && !pc.currentRemoteDescription && isMounted) {
          console.log(`📥 Targeted viewer answer captured for [${payload.viewerSocketId}]. Stabilizing tracks...`);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      });

      // Stream unique client candidate components into matching dictionary tracks
      socket.on('incoming_ice_candidate', async (payload) => {
        if (payload.senderType === 'viewer' && isMounted) {
          const pc = peerConnectionsRef.current[payload.senderSocketId];
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn("Host skipped structural candidate segment layout:", e);
            }
          }
        }
      });
    }

    const fetchStreamMeta = async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();
      
      if (data && isMounted) {
        setStreamData(data);
        setBattleScores({
          host: data.host_battle_points || 0,
          challenger: data.challenger_battle_points || 0
        });
      }
    };

    fetchStreamMeta();

    return () => {
      isMounted = false;
      if (ioInstance) ioInstance.disconnect();
    };
  }, [streamId]);

  // 2. HARDWARE / MULTIMEDIA STREAM SETUP
  useEffect(() => {
    let mediaStream = null;
    let isMounted = true;

    async function startBroadcasting() {
      try {
        console.log("🎥 Accessing media hardware devices...");
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = mediaStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;

        // Perform a quick database status update to signal that the room is active
        await supabase
          .from('live_streams')
          .update({ status: 'live' })
          .eq('id', streamId);

        console.log("🚀 Media pipeline is live. Handshake channels are ready to receive users.");

      } catch (err) { 
        console.error("Broadcasting multimedia stream capture hardware failure:", err); 
      }
    }

    if (streamId) {
      startBroadcasting();
    }

    return () => {
      isMounted = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      // Loop and close down all open individual peer lines on teardown
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [streamId]);

  // Sync dynamic hardware track changes
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }
  }, [isMuted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !isCameraOff; });
    }
  }, [isCameraOff]);

  const handleNewReaction = (type) => {
    const id = Date.now();
    setReactions(prev => [...prev, { id, type }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2000);
  };

  const handleAcceptInvite = async () => {
    if (!incomingInvite || !socketRef.current) return;
    try {
      await supabase
        .from('live_streams')
        .update({ co_host_id: incomingInvite.senderHostId })
        .eq('id', streamId);

      socketRef.current.emit('accept_battle_invite', {
        hostRoomId: streamId,
        challengerRoomId: incomingInvite.senderStreamId
      });

      setCoHosts([{ id: incomingInvite.senderHostId, username: incomingInvite.senderUsername }]);
      setIsBattleMode(true);
      setIncomingInvite(null);
    } catch (err) {
      console.error("⚠️ Failed to accept battle via sockets:", err.message);
    }
  };

  const totalOccupants = 1 + coHosts.length;
  const getGridClass = () => {
    if (totalOccupants === 1) return 'grid-cols-1';
    if (totalOccupants === 2) return 'grid-cols-2';
    return 'grid-cols-2 grid-rows-2';
  };

  if (!streamData) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-black italic text-cyan-400 underline decoration-cyan-500/50 animate-pulse tracking-widest">
        CONNECTING TO SOCKET MATRIX...
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white overflow-hidden relative font-sans">
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .floating-chat-container { background: transparent !important; border: none !important; }
        `}
      </style>

      {/* --- GIFT BANNER ALERT OVERLAY --- */}
      <AnimatePresence>
        {activeGift && (
          <GiftAlertOverlay gift={activeGift} />
        )}
      </AnimatePresence>

      {/* --- TOP STATUS BAR AREA --- */}
      <div className="absolute top-0 left-0 right-0 z-[60] p-4 pt-10 bg-gradient-to-b from-black/80 to-transparent flex flex-col gap-3">
        <StreamHeader 
          data={streamData} 
          isHost={true} 
          viewerCount={viewers.length}
          onLeave={() => navigate('/live')}
        />
        
        <div className="flex justify-between items-center px-1">
          <div className="flex gap-2">
            <div className="bg-yellow-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-yellow-500/30 flex items-center gap-2">
              <Gift size={14} className="text-yellow-500" />
              <span className="text-xs font-black tracking-tighter">
                {streamData.gift_goal_current || 0}
              </span>
            </div>
          </div>
          <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 active:scale-95 transition-transform">
            <Share2 size={18}/>
          </button>
        </div>
      </div>

      {/* --- DYNAMIC STAGE CONTAINER --- */}
      <div className={`absolute inset-0 z-0 grid ${getGridClass()} transition-all duration-500 bg-zinc-900`}>
        {/* HOST PRIMARY SCREEN FRAME */}
        <div className="relative h-full w-full overflow-hidden border-r border-b border-white/5 bg-zinc-950">
          <video 
            ref={localVideoRef} autoPlay muted playsInline 
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`} 
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-700 font-black tracking-widest uppercase text-xs italic">
              Camera Off
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
          
          {isBattleMode && totalOccupants === 2 && (
            <BattleOverlay 
              score={battleScores} 
              hostProfile={streamData?.host} 
              coHost={coHosts[0]}
              onInviteClick={() => setActivePanel('invite')}
            />
          )}
        </div>

        {/* MULTI-GUEST SECONDARY SCREEN BLOCKS */}
        {coHosts.map((guest, idx) => (
          <div key={guest.id || idx} className="relative h-full w-full bg-zinc-950 border-l border-b border-cyan-500/20">
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 animate-pulse">
              <Radio size={24} className="text-cyan-500/40 animate-bounce" />
            </div>
            <video autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-10" />
            
            <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 text-[10px] font-bold text-cyan-400">
              @{guest.username || 'CoHost'}
            </div>
          </div>
        ))}
      </div>

      {/* --- FLOATING ACTIONS COLUMN --- */}
      <div className="absolute right-4 top-1/3 flex flex-col gap-4 z-30">
        {[
          { icon: <BarChart size={18}/>, label: 'POLL', active: !!activePoll },
          { icon: <HelpCircle size={18}/>, label: 'Q&A', active: false },
          { icon: <Smile size={18}/>, label: 'FILTERS', active: false }
        ].map((btn, i) => (
          <button key={i} className="flex flex-col items-center gap-1 group">
            <div className={`p-3 rounded-full border transition-all duration-200 active:scale-90 ${btn.active ? 'bg-cyan-500 border-cyan-400 shadow-lg shadow-cyan-500/30' : 'bg-black/40 backdrop-blur-md border-white/10 hover:border-white/30'}`}>
              {btn.icon}
            </div>
            <span className="text-[8px] font-black tracking-widest text-zinc-400 group-hover:text-white uppercase">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* --- DYNAMIC SLIDE PANELS CONFIGURATION --- */}
      <AnimatePresence>
        {activePanel && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[45vh] bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] z-[100] p-6 pointer-events-auto shadow-[0_-15px_40px_rgba(0,0,0,0.6)]"
          >
            <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-5" onClick={() => setActivePanel(null)} />
            
            {activePanel === 'settings' && (
              <div className="flex flex-col h-full justify-between pb-6">
                <div>
                  <h3 className="text-sm font-black tracking-wider uppercase text-zinc-400 mb-4 flex items-center gap-2">
                    <Settings size={16}/> Stream Settings Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-colors">
                      <p className="text-xs font-bold">Comments Privacy</p>
                      <span className="text-[10px] text-zinc-500">Manage stream interactions</span>
                    </button>
                    <button className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-colors">
                      <p className="text-xs font-bold">Mirror Camera Layout</p>
                      <span className="text-[10px] text-zinc-500">Flip streaming orientation</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('./endlive')}
                  className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.99] text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20"
                >
                  <X size={16}/> End Live Stream Production
                </button>
              </div>
            )}

            {activePanel === 'analytics' && (
              <LiveAnalyticsPanel streamId={streamId} onClose={() => setActivePanel(null)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- BOTTOM DOCK & CHAT INTERACTION SPACE --- */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        <div className="h-48 w-full max-w-[320px] pointer-events-auto mask-fade-top overflow-y-auto hide-scrollbar floating-chat-container">
          <ChatBox streamId={streamId} isHost={true} transparent={true} filter={chatFilter} />
        </div>

        {/* --- CONTROL CONSOLE --- */}
        <nav className="w-full max-w-xl mx-auto bg-zinc-950/80 backdrop-blur-2xl rounded-full border border-white/10 p-1.5 pointer-events-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <ul className="flex items-center justify-between w-full px-1">
            
            {/* CAMERA TOGGLE */}
            <li className="relative group">
              <button 
                onClick={() => setIsCameraOff(!isCameraOff)} 
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-90 ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                {isCameraOff ? <VideoOff size={16}/> : <Video size={16}/>}
              </button>
            </li>

            {/* MIC TOGGLE */}
            <li className="relative group">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-90 ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                {isMuted ? <MicOff size={16}/> : <Mic size={16}/>}
              </button>
            </li>

            {/* BATTLE TOGGLE */}
            <li className="relative group">
              <button 
                onClick={() => { setIsBattleMode(!isBattleMode); if(!isBattleMode) navigate('./battle'); }} 
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-90 ${isBattleMode ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                <Swords size={16}/>
              </button>
            </li>

            {/* CO-HOST SYSTEM */}
            <li className="relative group">
              <button 
                onClick={() => navigate('./cohost')}
                className="p-2.5 rounded-full bg-white/5 text-zinc-300 hover:bg-white/10 transition-all duration-200 active:scale-90"
              >
                <UserPlus size={16}/>
              </button>
            </li>

            {/* GO WITH GUESTS */}
            <li className="relative group">
              <button 
                onClick={() => { setIsGuestMode(!isGuestMode); navigate('./guests'); }}
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-90 ${isGuestMode ? 'bg-purple-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                <Users size={16}/>
              </button>
            </li>

            {/* LIVE ANALYTICS */}
            <li className="relative group">
              <button 
                onClick={() => { setActivePanel('analytics'); navigate('./analytics'); }} 
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-90 ${activePanel === 'analytics' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                <BarChart3 size={16}/>
              </button>
            </li>

            {/* CONFIGURATION SETTINGS */}
            <li className="relative group">
              <button 
                onClick={() => { setActivePanel('settings'); navigate('./settings'); }} 
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-90 ${activePanel === 'settings' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                <Settings size={16}/>
              </button>
            </li>

            {/* GIFTS AND WALLET */}
            <li className="relative group">
              <button 
                onClick={() => navigate('./gifts')}
                className="p-2.5 rounded-full bg-white/5 text-zinc-300 hover:bg-white/10 transition-all duration-200 active:scale-90"
              >
                <Gift size={16}/>
              </button>
            </li>

          </ul>
        </nav>
      </div>

      {/* --- INCOMING CHALLENGE OVERLAY NOTIFIER --- */}
      <AnimatePresence>
        {incomingInvite && (
          <div className="absolute inset-0 pointer-events-none z-[70] flex items-center justify-center">
            <motion.div 
              initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
              className="bg-zinc-950/95 backdrop-blur-2xl border-2 border-cyan-500/50 px-5 py-4 rounded-2xl w-[90%] max-w-[340px] flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400 font-black text-sm">
                  {incomingInvite.senderUsername.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-widest text-cyan-400 uppercase">SOCKET BATTLE</h4>
                  <p className="text-[11px] text-zinc-300 font-medium">
                    <span className="font-bold text-white">@{incomingInvite.senderUsername}</span> challenges you!
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full pt-1">
                <button onClick={() => setIncomingInvite(null)} className="flex-1 bg-zinc-900 border border-white/10 text-zinc-400 font-bold uppercase tracking-widest text-[9px] py-2.5 rounded-xl">Decline</button>
                <button onClick={handleAcceptInvite} className="flex-1 bg-cyan-500 text-black font-black uppercase tracking-widest text-[9px] py-2.5 rounded-xl shadow-lg shadow-cyan-500/20">Accept Live</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamDashboard;
