import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
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
import BattleOverlay from './BattleOverlay'; // Split-Screen Battle Logic

/**
 * Local WebRTC Architecture Safety Configuration
 * Ensures that if sub-components or signaling instances reference webrtcConfig 
 * within the Host bundle scope, it resolves safely instead of triggering a ReferenceError.
 */
const webrtcConfig = window.webrtcConfig || {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  // --- CORE STATE ---
  const [streamData, setStreamData] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [reactions, setReactions] = useState([]); 
  const [activeGift, setActiveGift] = useState(null);
  const [battleScores, setBattleScores] = useState({ host: 0, challenger: 0 });
  const [activeCoHost, setActiveCoHost] = useState(null); // Real-time opponent profile
  
  // --- UI, DRAWER, & FEATURE MODES ---
  const [activePanel, setActivePanel] = useState(null); // 'analytics', 'settings', 'invite'
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  // --- SUB-FEATURES ---
  const [joinAlert, setJoinAlert] = useState(null);
  const [activePoll, setActivePoll] = useState(null); 
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [chatFilter, setChatFilter] = useState('all');

  // --- LIVE PRODUCTION HOSTS STATE ---
  const [liveHosts, setLiveHosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);

  // --- MATCHMAKING STATE LINK ---
  const [incomingInvite, setIncomingInvite] = useState(null); // Tracks active incoming challenges

  // Helper function to resolve dynamic co-host profiles on payload updates
  const fetchCoHostProfile = async (coHostId) => {
    if (!coHostId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', coHostId)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("⚠️ Failed to append cohost profile:", err.message);
      return { id: coHostId, username: 'Opponent Creator', avatar_url: null };
    }
  };

  // Fetch online creators/hosts from the database
  const fetchLiveHosts = async (isMounted = true) => {
    if (!streamData) return;
    if (isMounted) setIsLoadingHosts(true);
    try {
      let query = supabase
        .from('live_streams')
        .select(`
          id,
          host_id,
          status,
          host:host_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('status', 'live')
        .not('id', 'eq', streamId)
        .not('host_id', 'eq', streamData.host_id);

      if (searchQuery.trim() !== '') {
        query = query.ilike('host.username', `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;

      const formattedHosts = (data || [])
        .filter(item => item.host)
        .map(item => ({
          stream_id: item.id,
          id: item.host.id,
          username: item.host.username,
          avatar_url: item.host.avatar_url,
          tag: 'Live Now'
        }));

      if (isMounted) setLiveHosts(formattedHosts);
    } catch (err) {
      console.error("⚠️ Error fetching production live hosts:", err.message);
    } finally {
      if (isMounted) setIsLoadingHosts(false);
    }
  };

  // Trigger live host fetching whenever the panel opens or search query changes
  useEffect(() => {
    let isMounted = true;
    if (activePanel === 'invite' && streamData) {
      fetchLiveHosts(isMounted);
    }
    return () => { isMounted = false; };
  }, [activePanel, searchQuery, streamData]);

  // 1. DATA & REALTIME SUBSCRIPTIONS
  useEffect(() => {
    let isMounted = true;
    const channel = supabase.channel(`live_room_${streamId}`);

    const fetchAndSubscribe = async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();
      
      if (data && isMounted) {
        setStreamData(data);
        setIsSlowMode(data.slow_mode_enabled || false);
        setBattleScores({
          host: data.host_battle_points || 0,
          challenger: data.challenger_battle_points || 0
        });
        
        if (data.co_host_id) {
          const profile = await fetchCoHostProfile(data.co_host_id);
          if (isMounted) {
            setActiveCoHost(profile);
            setIsBattleMode(true);
          }
        }
      }

      channel
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'live_streams', 
          filter: `id=eq.${streamId}` 
        }, async (payload) => {
          if (!isMounted) return;
          
          setStreamData(payload.new);
          setBattleScores({
            host: payload.new.host_battle_points || 0,
            challenger: payload.new.challenger_battle_points || 0
          });

          if (payload.new.co_host_id !== payload.old.co_host_id) {
            if (payload.new.co_host_id) {
              const profile = await fetchCoHostProfile(payload.new.co_host_id);
              if (isMounted) {
                setActiveCoHost(profile);
                setIsBattleMode(true);
              }
            } else {
              setActiveCoHost(null);
              setIsBattleMode(false);
            }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`
        }, (payload) => {
          if (isMounted) handleNewGift(payload.new);
        })
        .on('broadcast', { event: 'reaction' }, ({ payload }) => {
          if (isMounted) handleNewReaction(payload.type);
        })
        .on('broadcast', { event: 'battle_invite_received' }, ({ payload }) => {
          if (isMounted) {
            console.log("⚔️ Incoming match invitation received via broadcast:", payload);
            setIncomingInvite(payload);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return;
          const newState = channel.presenceState();
          const viewerList = Object.values(newState).flat();
          
          setViewers((prevViewers) => {
            if (viewerList.length > prevViewers.length) {
              const newest = viewerList[viewerList.length - 1];
              setJoinAlert(`${newest.username || 'Someone'} joined!`);
              setTimeout(() => { if (isMounted) setJoinAlert(null); }, 3000);
            }
            return viewerList;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && isMounted) {
            await channel.track({ 
              user_id: 'host', 
              username: 'Host', 
              online_at: new Date().toISOString() 
            });
          }
        });
    };

    fetchAndSubscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // 2. CAMERA AND AUDIO STREAM MEDIA SETUP
  useEffect(() => {
    let mediaStream = null;
    async function startBroadcasting() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) { 
        console.error("Broadcasting failed", err); 
      }
    }
    startBroadcasting();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 3. UTILITY EVENT HANDLERS
  const handleNewReaction = (type) => {
    const id = Date.now();
    setReactions(prev => [...prev, { id, type }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2000);
  };

  const handleNewGift = (gift) => {
    const giftData = {
      id: gift.gift_id,
      name: gift.gift_id.replace('_', ' '),
      price: gift.price_total,
      sender_name: "A supporter"
    };
    setActiveGift(giftData);
    setTimeout(() => setActiveGift(null), 5000);
  };

  const handleSendInvite = async (targetHost) => {
    try {
      const targetChannel = supabase.channel(`live_room_${targetHost.stream_id}`);
      
      targetChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await targetChannel.send({
            type: 'broadcast',
            event: 'battle_invite_received',
            payload: {
              senderStreamId: streamId,
              senderHostId: streamData.host_id,
              senderUsername: streamData.host?.username || 'A Creator',
              senderAvatar: streamData.host?.avatar_url
            }
          });
          
          console.log(`✈️ Battle invite successfully transmitted to target stream: ${targetHost.stream_id}`);
          supabase.removeChannel(targetChannel);
        }
      });

      setActivePanel(null);
    } catch (err) {
      console.error("⚠️ Failed to transmit real-time broadcast invite:", err.message);
    }
  };

  const handleAcceptInvite = async () => {
    if (!incomingInvite) return;
    
    try {
      const { error: senderRoomError } = await supabase
        .from('live_streams')
        .update({ co_host_id: streamData.host_id }) 
        .eq('id', incomingInvite.senderStreamId);

      if (senderRoomError) throw senderRoomError;

      const { error: localRoomError } = await supabase
        .from('live_streams')
        .update({ co_host_id: incomingInvite.senderHostId })
        .eq('id', streamId);

      if (localRoomError) throw localRoomError;

      setIsBattleMode(true);
      setIncomingInvite(null);
      
      console.log("🔥 Co-host pairing handshake completed successfully. Split screen active.");
    } catch (err) {
      console.error("⚠️ Failed to process room pairing handshake:", err.message);
    }
  };

  if (!streamData) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-black italic text-red-500 underline decoration-red-500/50 animate-pulse tracking-widest">
        CONNECTING TO UNIVERSE...
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

      {/* --- 1. TOP STATUS BAR AREA --- */}
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

      {/* --- 2. DYNAMIC STAGE CONTAINER (SPLIT SCREEN GRAPHICS) --- */}
      <div className="absolute inset-0 z-0 flex transition-all duration-500 bg-zinc-900">
        {/* Host Main Screen Section */}
        <motion.div 
          animate={{ width: (isBattleMode || isGuestMode) ? '50%' : '100%' }}
          className="relative h-full overflow-hidden border-r border-white/5"
        >
          <video 
            ref={videoRef} autoPlay muted playsInline 
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`} 
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-700 font-black tracking-widest uppercase italic">
              Camera Off
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
        </motion.div>

        {/* Dynamic Secondary Screen Block (Battle/Guest Arena) */}
        <AnimatePresence>
          {(isBattleMode || isGuestMode) && (
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-1/2 h-full bg-zinc-900 relative"
            >
              <div className="absolute inset-0 flex items-center justify-center border-l border-cyan-500/30 bg-zinc-950">
                {activeCoHost ? (
                  <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                      Live Video Active ({activeCoHost.username})
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] font-black uppercase text-zinc-600 tracking-wider animate-pulse">
                    {isBattleMode ? "Waiting for Opponent..." : "Waiting for Guest..."}
                  </p>
                )}
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

      {/* --- 3. FLOATING OVERLAYS & ACTION COLUMN --- */}
      <div className="absolute right-4 top-1/3 flex flex-col gap-4 z-30">
        {[
          { icon: <BarChart size={18}/>, label: 'POLL', active: !!activePoll },
          { icon: <HelpCircle size={18}/>, label: 'Q&A', active: false },
          { icon: <Smile size={18}/>, label: 'FILTERS', active: false }
        ].map((btn, i) => (
          <button key={i} className="flex flex-col items-center gap-1 group">
            <div className={`p-3 rounded-full border transition-all duration-200 active:scale-90 ${btn.active ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/30' : 'bg-black/40 backdrop-blur-md border-white/10 hover:border-white/30'}`}>
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
              className="absolute top-44 left-4 bg-gradient-to-r from-red-500/20 to-black/40 backdrop-blur-xl px-4 py-2 rounded-xl border border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-400 shadow-lg">
              ⚡ {joinAlert}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeGift && <GiftAlertOverlay gift={activeGift} />}
        </AnimatePresence>

        {/* --- INCOMING CHALLENGE POPUP OVERLAY MODAL --- */}
        <AnimatePresence>
          {incomingInvite && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-2xl border-2 border-cyan-500/50 px-5 py-4 rounded-2xl z-[200] w-[90%] max-w-[340px] flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                {incomingInvite.senderAvatar ? (
                  <img src={incomingInvite.senderAvatar} className="w-10 h-10 rounded-full object-cover border border-cyan-500/30" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400 font-black text-sm">
                    {incomingInvite.senderUsername.substring(0,2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black tracking-widest text-cyan-400 uppercase">BATTLE CHALLENGE</h4>
                  <p className="text-[11px] text-zinc-300 font-medium">
                    <span className="font-bold text-white">@{incomingInvite.senderUsername}</span> wants to battle you live!
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full pt-1">
                <button 
                  onClick={() => setIncomingInvite(null)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 font-bold uppercase tracking-widest text-[9px] py-2.5 rounded-xl transition-colors"
                >
                  Decline
                </button>
                <button 
                  onClick={handleAcceptInvite}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-[9px] py-2.5 rounded-xl transition-transform active:scale-95 shadow-lg shadow-cyan-500/20"
                >
                  Accept Live
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Heart Fountain Dynamics */}
        <div className="absolute bottom-44 right-6 h-80 w-16 flex flex-col-reverse items-center">
          {reactions.map(r => (
            <motion.div 
              key={r.id} 
              initial={{ y: 0, opacity: 1, scale: 0.6 }} 
              animate={{ y: -450, opacity: 0, scale: 1.6, x: Math.random() * 60 - 30 }} 
              className="text-3xl mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]"
            >
              ❤️
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- 4. BOTTOM DOCK & STREAM CHAT INTERACTION SPACE --- */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        <div className="h-48 w-full max-w-[320px] pointer-events-auto mask-fade-top overflow-y-auto hide-scrollbar floating-chat-container">
          <ChatBox streamId={streamId} isHost={true} transparent={true} filter={chatFilter} />
        </div>

        {/* --- 5. THE ULTIMATE DOCK CONTROL COMMAND CONSOLE --- */}
        <div className="w-full bg-black/50 backdrop-blur-3xl rounded-[28px] border border-white/10 p-2 flex items-center justify-between pointer-events-auto shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`p-3 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-zinc-300 hover:text-white'}`}
            >
              {isMuted ? <MicOff size={18}/> : <Mic size={18}/>}
            </button>
            <button 
              onClick={() => setIsCameraOff(!isCameraOff)} 
              className={`p-3 rounded-full transition-all duration-300 ${isCameraOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-zinc-300 hover:text-white'}`}
            >
              {isCameraOff ? <VideoOff size={18}/> : <Video size={18}/>}
            </button>
          </div>

          <div className="flex bg-white/5 rounded-full p-1 border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => { setIsBattleMode(!isBattleMode); setIsGuestMode(false); if(!isBattleMode) setActivePanel('invite'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${isBattleMode ? 'bg-[#fe2c55] text-white shadow-lg shadow-red-500/30 scale-105' : 'text-zinc-400 hover:text-white'}`}
            >
              <Swords size={15}/>
              <span className="text-[9px] font-black uppercase tracking-widest">Battle</span>
            </button>
            <button 
              onClick={() => { setIsGuestMode(!isGuestMode); setIsBattleMode(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${isGuestMode ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105' : 'text-zinc-400 hover:text-white'}`}
            >
              <UserPlus size={15}/>
              <span className="text-[9px] font-black uppercase tracking-widest">Guest</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setActivePanel('analytics')}
              className={`p-3 rounded-full transition-colors ${activePanel === 'analytics' ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:text-red-400'}`}
            >
              <BarChart3 size={18}/>
            </button>
            <button 
              onClick={() => setActivePanel('settings')}
              className={`p-3 rounded-full transition-colors ${activePanel === 'settings' ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:text-white'}`}
            >
              <Settings size={18}/>
            </button>
          </div>
        </div>
      </div>

      {/* --- 6. UNIVERSAL MANAGEMENT PANEL DRAWER SHEET --- */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 rounded-t-[32px] z-[110] max-h-[85vh] overflow-y-auto hide-scrollbar"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4" />
              
              <div className="p-6">
                {activePanel === 'analytics' && (
                  <div className="pb-8">
                    <LiveAnalyticsPanel streamId={streamId} />
                  </div>
                )}
                
                {activePanel === 'settings' && (
                  <div className="space-y-6 pb-12">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black italic tracking-widest uppercase text-red-500">Stream Architecture</h2>
                      <button onClick={() => setActivePanel(null)} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white"><X size={16}/></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <SettingsCard icon={<ShieldAlert/>} title="Moderation" desc="Blocked words & safety filters" />
                       <SettingsCard icon={<List/>} title="Polls" desc="Configure viewer micro-voting" />
                       <SettingsCard icon={<Layers/>} title="Invite Opponent" desc="Co-host matching rooms" onClick={() => setActivePanel('invite')} />
                       <SettingsCard icon={<Smile/>} title="Beauty" desc="Configure real-time face tracking" />
                    </div>

                    <div className="pt-4 bg-zinc-900/50 p-2 rounded-2xl border border-white/5">
                      <HostControls streamId={streamId} />
                    </div>
                  </div>
                )}

                {/* --- CO-HOST / CREATOR INVITE DRAWER INTERFACE --- */}
                {activePanel === 'invite' && (
                  <div className="space-y-5 pb-12">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black italic tracking-widest uppercase text-cyan-400">Battle Matchmaking</h2>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Invite live creators to battle arena</p>
                      </div>
                      <button onClick={() => setActivePanel('settings')} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white"><X size={16}/></button>
                    </div>

                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-3.5 text-zinc-500" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="SEARCH ACTIVE CREATORS..." 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold tracking-wider uppercase text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-zinc-600"
                      />
                    </div>

                    {/* Production Creator Invite Roster List */}
                    <div className="space-y-2">
                      <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 px-1">
                        {searchQuery ? "Search Results" : "Recommended Competitors"}
                      </div>

                      {isLoadingHosts ? (
                        <div className="text-center py-6 text-xs font-bold tracking-widest text-zinc-600 animate-pulse uppercase">
                          Scanning Database Tracks...
                        </div>
                      ) : liveHosts.length === 0 ? (
                        <div className="text-center py-6 text-xs font-bold tracking-widest text-zinc-600 uppercase">
                          No foreign hosts are live right now.
                        </div>
                      ) : (
                        liveHosts.map((creator) => (
                          <div key={creator.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-3 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              {creator.avatar_url ? (
                                <img src={creator.avatar_url} className="w-8 h-8 rounded-full object-cover border border-zinc-800" alt="" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-[10px] font-bold text-zinc-400">
                                  {creator.username?.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-xs font-black tracking-wide text-zinc-200">{creator.username}</div>
                                <div className="text-[9px] font-bold text-cyan-500 uppercase tracking-tighter">{creator.tag}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleSendInvite(creator)}
                              className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-transform active:scale-95"
                            >
                              Invite
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

const SettingsCard = ({ icon, title, desc, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col gap-3 p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/50 transition-all text-left group w-full"
  >
    <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors w-fit">
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div>
      <h3 className="text-xs font-black uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-[10px] text-zinc-500 leading-tight">{desc}</p>
    </div>
  </button>
);

export default StreamDashboard;
