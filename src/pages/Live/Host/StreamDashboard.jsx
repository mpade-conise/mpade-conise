import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { 
  Users, Gift, BarChart3, Share2, Clock, 
  MessageCircle, Settings, ShieldAlert, List, 
  HelpCircle, BarChart, Heart, Smile, X, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Component Imports
import HostControls from './HostControls';
import ChatBox from '../Shared/ChatBox';
import LiveAnalyticsPanel from './HostAnalytics';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import StreamHeader from '../Shared/StreamHeader'; 

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  // --- STATE MANAGEMENT ---
  const [streamData, setStreamData] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [reactions, setReactions] = useState([]); 
  const [activeGift, setActiveGift] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // --- FEATURE STATE ---
  const [joinAlert, setJoinAlert] = useState(null);
  const [showSettings, setShowSettings] = useState(false); 
  const [activePoll, setActivePoll] = useState(null); 
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [chatFilter, setChatFilter] = useState('all');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

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
      }

      channel
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'live_streams', 
          filter: `id=eq.${streamId}` 
        }, (payload) => {
          if (isMounted) setStreamData(payload.new);
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

  // --- VIDEO SETUP ---
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

  if (!streamData) return <div className="h-screen bg-black flex items-center justify-center font-black italic text-red-500 underline decoration-red-500/50 animate-pulse">CONNECTING TO UNIVERSE...</div>;

  return (
    <div className="h-[100dvh] w-full bg-black text-white overflow-hidden relative pb-20">
      
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .floating-chat-container { background: transparent !important; border: none !important; }
        `}
      </style>

      {/* 📊 FULLSCREEN ANALYTICS OVERLAY */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[100] bg-black overflow-y-auto hide-scrollbar"
          >
            <div className="sticky top-0 right-0 p-6 flex justify-end z-[110]">
              <button 
                onClick={() => setShowAnalytics(false)} 
                className="bg-white/10 backdrop-blur-xl p-3 rounded-full border border-white/10 hover:bg-white/20 transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <LiveAnalyticsPanel streamId={streamId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎥 BACKGROUND: VIDEO */}
      <div className="absolute inset-0 z-0 bg-zinc-900">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className={`relative z-10 w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`} 
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
      </div>

      {/* 🔴 TOP: SHARED HEADER */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-12">
        <StreamHeader 
          data={streamData} 
          isHost={true} 
          viewerCount={viewers.length}
          onLeave={() => navigate('/live')}
        />

        <div className="flex justify-end items-center mt-4">
          <div className="flex gap-2">
            <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 active:scale-90"><Share2 size={18}/></button>
            <button onClick={() => setShowSettings(true)} className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 active:scale-90"><Settings size={18}/></button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE ACTION BAR */}
      <div className="absolute right-4 top-1/3 flex flex-col gap-5 z-30">
        {[
          { icon: <BarChart size={20}/>, label: 'POLL', active: !!activePoll },
          { icon: <HelpCircle size={20}/>, label: 'Q&A', active: false },
          { icon: <Smile size={20}/>, label: 'FILTERS', active: false }
        ].map((btn, i) => (
          <button key={i} className="flex flex-col items-center gap-1 group">
            <div className={`p-3 rounded-full border transition-all ${btn.active ? 'bg-red-500 border-red-400' : 'bg-black/40 backdrop-blur-md border-white/10'}`}>
              {btn.icon}
            </div>
            <span className="text-[7px] font-black text-zinc-400 group-active:text-white">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* JOIN NOTIFICATION */}
      <AnimatePresence>
        {joinAlert && (
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 16, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
            className="absolute top-48 left-4 bg-white/10 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/20 z-40 text-[10px] font-black uppercase tracking-wider">
            ⚡ {joinAlert}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER: GIFTS POPUP */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        <AnimatePresence>
          {activeGift && <GiftAlertOverlay gift={activeGift} />}
        </AnimatePresence>
      </div>

      {/* BOTTOM: CHAT & ACTIONS */}
      <div className="absolute bottom-8 left-0 right-0 p-4 z-30 space-y-4">
        
        <div className="h-44 w-4/5 mask-fade-top overflow-y-auto hide-scrollbar floating-chat-container">
          <ChatBox streamId={streamId} isHost={true} transparent={true} filter={chatFilter} />
        </div>

        {/* Reactions Stream */}
        <div className="absolute bottom-32 right-4 h-64 w-12 pointer-events-none flex flex-col-reverse items-center">
          {reactions.map(r => (
            <motion.div key={r.id} initial={{ y: 0, opacity: 1, scale: 0.5 }} animate={{ y: -400, opacity: 0, scale: 1.5, x: Math.random() * 40 - 20 }} className="text-3xl mb-2">
              ❤️
            </motion.div>
          ))}
        </div>

        {/* ANALYTICS & MODERATION PILLS */}
        <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <div className="bg-yellow-500/20 backdrop-blur-md px-3 py-2 rounded-xl border border-yellow-500/30 flex items-center gap-2">
                <Gift size={14} className="text-yellow-500" />
                <span className="text-xs font-black tracking-tighter">
                  {streamData.gift_goal_current || 0}
                </span>
              </div>
              <button onClick={() => setShowAnalytics(true)} className="bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                <BarChart3 size={14} className="text-red-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Stats</span>
              </button>
            </div>
            
            <button className="p-2.5 bg-red-500/10 backdrop-blur-md rounded-full border border-red-500/20 active:bg-red-500 transition-colors">
               <ShieldAlert size={18} className="text-red-500" />
            </button>
        </div>

        {/* FINAL CONTROLS */}
        <div className="bg-black/60 backdrop-blur-3xl p-2 rounded-[32px] border border-white/10 shadow-2xl shadow-red-500/10">
          <HostControls streamId={streamId} />
        </div>
      </div>
      
    </div>
  );
};

export default StreamDashboard;