import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { io } from 'socket.io-client'; // Import Socket.io Client
import { 
  Users, Gift, BarChart3, Share2, Clock, 
  MessageCircle, Settings, ShieldAlert, List, 
  HelpCircle, BarChart, Heart, Smile, X, Check,
  UserPlus, Swords, Mic, MicOff, Video, VideoOff, Layers, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Component Imports
import HostControls from './HostControls';
import ChatBox from '../Shared/ChatBox';
import LiveAnalyticsPanel from './HostAnalytics';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import StreamHeader from '../Shared/StreamHeader'; 
import BattleOverlay from './BattleOverlay';

// Change this URL to your live Node.js deployment (Render, Railway, etc.)
const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  
  // --- MEDIA & SOCKET REFERENCES ---
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  
  // --- CORE STATE ---
  const [streamData, setStreamData] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [reactions, setReactions] = useState([]); 
  const [activeGift, setActiveGift] = useState(null);
  const [battleScores, setBattleScores] = useState({ host: 0, challenger: 0 });
  const [activeCoHost, setActiveCoHost] = useState(null); 
  
  // --- UI MODES ---
  const [activePanel, setActivePanel] = useState(null); 
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  const [joinAlert, setJoinAlert] = useState(null);
  const [activePoll, setActivePoll] = useState(null); 
  const [chatFilter, setChatFilter] = useState('all');
  const [liveHosts, setLiveHosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState(null);

  // 1. INITIALIZE SOCKET.IO CONNECTION
  useEffect(() => {
    let isMounted = true;

    // Connect to the external Node.js socket server
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      query: { room: streamId, role: 'host' }
    });
    socketRef.current = socket;

    // Socket Event: Client Joined Room
    socket.on('viewer_joined', (data) => {
      if (!isMounted) return;
      setJoinAlert(`${data.username || 'A viewer'} joined the stream!`);
      setTimeout(() => { if (isMounted) setJoinAlert(null); }, 3000);
    });

    // Socket Event: Real-time Live Reaction Received
    socket.on('received_reaction', (data) => {
      if (isMounted) handleNewReaction(data.type);
    });

    // Socket Event: Incoming Battle Challenge Request
    socket.on('battle_invite_received', (payload) => {
      if (isMounted) {
        console.log("⚔️ Incoming battle invite via Socket.io:", payload);
        setIncomingInvite(payload);
      }
    });

    // Socket Event: Update Active Viewer Counts
    socket.on('room_presence_update', (users) => {
      if (isMounted) setViewers(users);
    });

    // Fetch Base Stream Configurations from Supabase Meta Layer
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
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  // 2. HARDWARE / MULTIMEDIA STREAM SETUP
  useEffect(() => {
    let mediaStream = null;
    async function startBroadcasting() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        localStreamRef.current = mediaStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
      } catch (err) { 
        console.error("Broadcasting multimedia stream capture failed:", err); 
      }
    }
    startBroadcasting();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

  // 3. EVENT HANDLERS
  const handleNewReaction = (type) => {
    const id = Date.now();
    setReactions(prev => [...prev, { id, type }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2000);
  };

  const handleSendInvite = (targetHost) => {
    if (!socketRef.current || !streamData) return;

    // Send the match invite instantly through the socket router instead of writing rows
    socketRef.current.emit('send_battle_invite', {
      targetRoomId: targetHost.stream_id,
      senderStreamId: streamId,
      senderHostId: streamData.host_id,
      senderUsername: streamData.host?.username || 'Host Creator',
      senderAvatar: streamData.host?.avatar_url
    });

    setActivePanel(null);
  };

  const handleAcceptInvite = async () => {
    if (!incomingInvite || !socketRef.current) return;
    
    try {
      // Update data states globally
      await supabase
        .from('live_streams')
        .update({ co_host_id: incomingInvite.senderHostId })
        .eq('id', streamId);

      // Tell the socket server both streams are now locked in battle
      socketRef.current.emit('accept_battle_invite', {
        hostRoomId: streamId,
        challengerRoomId: incomingInvite.senderStreamId
      });

      setIsBattleMode(true);
      setIncomingInvite(null);
    } catch (err) {
      console.error("⚠️ Failed to accept battle via sockets:", err.message);
    }
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
      <div className="absolute inset-0 z-0 flex transition-all duration-500 bg-zinc-900">
        <motion.div 
          animate={{ width: (isBattleMode || isGuestMode) ? '50%' : '100%' }}
          className="relative h-full overflow-hidden border-r border-white/5"
        >
          <video 
            ref={localVideoRef} autoPlay muted playsInline 
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`} 
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-700 font-black tracking-widest uppercase italic">
              Camera Off
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
        </motion.div>

        {/* Dynamic Secondary Screen Block */}
        <AnimatePresence>
          {(isBattleMode || isGuestMode) && (
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-1/2 h-full bg-zinc-900 relative"
            >
              <div className="absolute inset-0 flex items-center justify-center border-l border-cyan-500/30 bg-zinc-950">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-zinc-950" />
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20 pointer-events-none">
                  <p className="text-[10px] font-black uppercase text-cyan-500 tracking-wider animate-pulse">
                    Socket Connected Stream Pipeline
                  </p>
                </div>
              </div>
              
              {isBattleMode && (
                <BattleOverlay 
                  score={battleScores} 
                  hostProfile={streamData?.host} 
                  coHost={activeCoHost}
                  onInviteClick={() => setActivePanel('invite')}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- FLOATING OVERLAYS & ACTION COLUMN --- */}
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

      {/* Dynamic Popups Container */}
      <div className="absolute inset-0 pointer-events-none z-40">
        <AnimatePresence>
          {joinAlert && (
            <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 16, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
              className="absolute top-44 left-4 bg-gradient-to-r from-cyan-500/20 to-black/40 backdrop-blur-xl px-4 py-2 rounded-xl border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-cyan-400 shadow-lg">
              ⚡ {joinAlert}
            </motion.div>
          )}
        </AnimatePresence>

        {/* INCOMING CHALLENGE MODAL */}
        <AnimatePresence>
          {incomingInvite && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-2xl border-2 border-cyan-500/50 px-5 py-4 rounded-2xl z-[200] w-[90%] max-w-[340px] flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto"
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
          )}
        </AnimatePresence>
      </div>

      {/* --- BOTTOM DOCK & STREAM CHAT INTERACTION SPACE --- */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        <div className="h-48 w-full max-w-[320px] pointer-events-auto mask-fade-top overflow-y-auto hide-scrollbar floating-chat-container">
          <ChatBox streamId={streamId} isHost={true} transparent={true} filter={chatFilter} />
        </div>

        {/* --- THE CONTROL COMMAND CONSOLE --- */}
        <div className="w-full bg-black/50 backdrop-blur-3xl rounded-[28px] border border-white/10 p-2 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300'}`}>
              {isMuted ? <MicOff size={18}/> : <Mic size={18}/>}
            </button>
            <button onClick={() => setIsCameraOff(!isCameraOff)} className={`p-3 rounded-full ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300'}`}>
              {isCameraOff ? <VideoOff size={18}/> : <Video size={18}/>}
            </button>
          </div>

          <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
            <button 
              onClick={() => { setIsBattleMode(!isBattleMode); if(!isBattleMode) setActivePanel('invite'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${isBattleMode ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30' : 'text-zinc-400'}`}
            >
              <Swords size={15}/>
              <span className="text-[9px] font-black uppercase tracking-widest">Battle</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setActivePanel('analytics')} className="p-3 rounded-full bg-white/5 text-zinc-300"><BarChart3 size={18}/></button>
            <button onClick={() => setActivePanel('settings')} className="p-3 rounded-full bg-white/5 text-zinc-300"><Settings size={18}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamDashboard;
