import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, X, MessageCircle, Gift as GiftIcon, Users, Send, VideoOff, Loader2 } from 'lucide-react';

// Components
import LiveChat from './LiveChat';
import GiftPanel from './GiftPanel';
import VideoPlayer from '../Shared/VideoPlayer';
import FloatingHearts from './FloatingHearts';
import StreamHeader from '../Shared/StreamHeader'; 
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';


const LivePlayer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  
  const [streamData, setStreamData] = useState(null);
  const [showGifts, setShowGifts] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [latestGift, setLatestGift] = useState(null);
  const [eventNotification, setEventNotification] = useState(null);
  const [lastCommentAt, setLastCommentAt] = useState(null);
  
  // NEW STATE: Camera Status
  const [isCameraOff, setIsCameraOff] = useState(false);

  const [showShareList, setShowShareList] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  
  const channelRef = useRef(null);
  const heartCountRef = useRef(0);

  const GIFTS_LIST = useMemo(() => [
    { id: 'rose', name: 'Rose', price: 1, model: '/models/Rose.glb' },
    { id: 'fire', name: 'Campfire', price: 5, model: '/models/Campfire.glb' },
    { id: 'weights', name: 'Flex', price: 3, model: '/models/Dumbell.glb' },
    { id: 'clap', name: 'Clap', price: 2, model: '/models/Claptrap.glb' },
    { id: 'star', name: 'Star', price: 3, model: '/models/Star.glb' },
    { id: 'heart', name: 'Heart', price: 10, model: '/models/Heart.glb' },
    { id: 'pizza', name: 'Pizza', price: 30, model: '/models/Pizza%3A0.glb' },
    { id: 'burger', name: 'Burger', price: 20, model: '/models/Double Cheeseburger.glb' },
    { id: 'diamond', name: 'Diamond', price: 50, model: '/models/diamond.glb' },
    { id: 'balloon', name: 'Balloon', price: 15, model: '/models/Balloons.glb' },
    { id: 'crown', name: 'Crown', price: 100, model: '/models/Crown.glb' },
    { id: 'guitar', name: 'Guitar', price: 150, model: '/models/Guitar.glb' },
    { id: 'car', name: 'Car', price: 300, model: '/models/CAR Model.glb' },
    { id: 'drone', name: 'Drone', price: 400, model: '/models/Drone.glb' },
    { id: 'dj', name: 'DJ', price: 350, model: '/models/DJ gear.glb' },
    { id: 'castle', name: 'Castle', price: 2500, model: '/models/Castle Fortress.glb' },
    { id: 'lion', name: 'Lion', price: 5000, model: '/models/Lion.glb' },
    { id: 'money', name: 'Money Rain', price: 250, model: '/models/Money.glb' },
    { id: 'helicopter', name: 'Helicopter', price: 4000, model: '/models/Helicopter.glb' },
    { id: 'ship', name: 'Cruise Ship', price: 3000, model: '/models/Cruise liner.glb' },
    { id: 'dragon', name: 'Dragon', price: 10000, model: '/models/Red Dragon.glb' },
    { id: 'universe', name: 'Universe', price: 15000, model: '/models/Solar System.glb' },
    { id: 'space', name: 'Space', price: 12000, model: '/models/Space Shuttle.glb' },
    { id: 'world', name: 'World', price: 8000, model: '/models/Simple Worlds.glb' },
    { id: 'xwing', name: 'X-Wing', price: 5500, model: '/models/T-65 X-Wing Starfighter.glb' },
    { id: 'cow', name: 'Cow', price: 120, model: '/models/Cow.glb' },
    { id: 'whale', name: 'Whale', price: 900, model: '/models/Whale.glb' },
    { id: 'horse', name: 'Horse', price: 350, model: '/models/Horse.glb' },
    { id: 'spider', name: 'Spider', price: 40, model: '/models/Spider.glb' },
    { id: 'wolf', name: 'Wolf', price: 600, model: '/models/Wolf.glb' },
    { id: 'shark', name: 'Shark', price: 1200, model: '/models/Shark.glb' },
    { id: 'bunny', name: 'Bunny', price: 50, model: '/models/Bunny ears.glb' },
    { id: 'stag', name: 'Stag', price: 400, model: '/models/Stag.glb' }
  ], []);

  useEffect(() => {
    const fetchFollowers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('follows') 
        .select('follower_id, profiles!follower_id(id, username, avatar_url)')
        .eq('following_id', user.id);
      if (!error && data) setFollowers(data.map(f => f.profiles));
    };
    if (showShareList) fetchFollowers();
  }, [showShareList]);

  const handleSendInvite = async (recipientId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('live_comments')
      .insert([{
        stream_id: streamId,
        user_id: user.id,
        content: `I'm watching this live! Join me.`,
        type: 'invite'
      }]);
    if (!error) setSentInvites(prev => [...prev, recipientId]);
  };

  useEffect(() => {
    if (!streamId) return;
    let isMounted = true;

    const fetchStream = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();
      if (!isMounted) return;
      if (error || data?.is_live === false) {
        navigate('/live/ended');
      } else {
        setStreamData(data);
        setIsCameraOff(data.is_camera_on === false); // Set initial camera state
        const initialLikes = data.likes || 0;
        setHeartCount(initialLikes);
        heartCountRef.current = initialLikes;
      }
    };

    fetchStream();

    const channel = supabase.channel(`room-${streamId}`, {
      config: { realtime: { params: { eventsPerSecond: 20 } } },
    });
    channelRef.current = channel;

    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${streamId}` }, (payload) => {
        if (!isMounted) return;
        if (payload.new.is_live === false) navigate('/live/ended');
        
        // Update Camera Status in Real-time
        setIsCameraOff(payload.new.is_camera_on === false);
        
        setStreamData(prev => ({ ...prev, ...payload.new }));
        if (payload.new.likes > heartCountRef.current) {
          setEventNotification({ type: 'like', message: 'liked the live video', name: 'A viewer', avatar: null });
          setTimeout(() => { if (isMounted) setEventNotification(null); }, 3000);
          setHeartCount(payload.new.likes);
          heartCountRef.current = payload.new.likes;
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_gifts', filter: `stream_id=eq.${streamId}` }, async (payload) => {
        if (!isMounted) return;
        const { data: userData } = await supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.sender_id).single();
        const matchedGift = GIFTS_LIST.find(g => g.id === payload.new.gift_id);
        const formattedGift = {
          id: payload.new.id,
          username: userData?.username || 'Supporter',
          giftName: matchedGift ? matchedGift.name : 'Gift',
          price: payload.new.price_total || 0, // 🔥 Added price for split-screen logic
          avatar: userData?.avatar_url || null,
          giftModel: matchedGift ? matchedGift.model : '/models/Rose.glb' // 🔥 Consistent naming for overlay
        };
        setLatestGift(null); 
        setTimeout(() => {
          if (!isMounted) return;
          setLatestGift(formattedGift);
          setEventNotification({ type: 'gift', giftName: formattedGift.giftName, name: formattedGift.username, avatar: formattedGift.avatar });
        }, 100);
        setTimeout(() => { if (isMounted) { setLatestGift(null); setEventNotification(null); } }, 6500); // Extended time for animations
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_comments', filter: `stream_id=eq.${streamId}` }, (payload) => {
        if (!isMounted) return;
        setLastCommentAt(Date.now());
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [streamId, GIFTS_LIST, navigate]);

  const handleLike = async () => {
    if (!streamId) return;
    const newCount = heartCount + 1;
    setHeartCount(newCount);
    heartCountRef.current = newCount;
    await supabase.rpc('increment_likes', { stream_id_input: streamId });
  };

 // 🔥 Update this function inside LivePlayer.jsx
const handleJoinGuest = () => {
  // We must include /watch/ to match the definition in LiveRouter
  navigate(`/live/watch/${streamId}/join-guest`);
};
  // 🔥 Split Screen Calculation: Check if the latest gift is a "Big Gift" (100+ coins)
  const isSplitScreen = latestGift && latestGift.price >= 100;

  if (!streamData) return <div className="h-screen bg-black" />;

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden flex flex-col">
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      
      {/* Video Container: Animates height when split screen is active */}
      <motion.div 
        animate={{ height: isSplitScreen ? '50%' : '100%' }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="relative w-full z-0 overflow-hidden"
      >
        <VideoPlayer streamId={streamId} isHost={false} />
        
        {/* CAMERA OFF ALERT OVERLAY */}
        <AnimatePresence>
          {isCameraOff && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[45] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                 <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <VideoOff size={40} className="text-white/40" />
                 </div>
                 <div className="flex flex-col gap-1">
                   <h2 className="text-white font-black text-xl uppercase tracking-widest">Host is busy</h2>
                   <p className="text-white/50 text-[10px] font-bold uppercase tracking-tighter">The camera is currently disabled. Stay tuned!</p>
                 </div>
                 <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                    <Loader2 size={12} className="text-[#fe2c55] animate-spin" />
                    <span className="text-[9px] text-white/80 font-black uppercase">Waiting for host...</span>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Gift Overlay Section: Occupies bottom 50% during Split Screen */}
      <div className={`${isSplitScreen ? 'h-1/2 relative' : 'absolute inset-0'} pointer-events-none z-40`}>
        <FloatingHearts count={heartCount} streamId={streamId} />
        <AnimatePresence mode="wait">
          {latestGift && (
            <motion.div 
              key={latestGift.id} 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 1.2 }} 
              className="w-full h-full flex items-center justify-center"
            >
              <GiftAlertOverlay gift={latestGift} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* UI Elements (Header, Chat, Buttons) */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="pointer-events-auto">
           <StreamHeader data={streamData} isHost={false} viewerCount={viewerCount} onLeave={() => navigate('/live')} />
        </div>
      </div>

      <div className="absolute bottom-28 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {eventNotification && (
            <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full pl-1 pr-4 py-1 flex items-center gap-3 shadow-2xl">
              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
                {eventNotification.avatar ? <img src={eventNotification.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xs text-white">👤</div>}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-[10px] font-black">{eventNotification.name}</span>
                <span className="text-white/70 text-[9px] font-medium">{eventNotification.type === 'gift' ? `sent ${eventNotification.giftName}` : eventNotification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-50 flex items-end justify-between pointer-events-none">
        <div className="flex-1 max-w-[320px] h-[350px] pointer-events-auto overflow-hidden hide-scrollbar">
          <LiveChat streamId={streamId} key={`chat-${streamId}-${lastCommentAt}`} hideMessages={false} />
        </div>

        <div className="flex items-center gap-3 pointer-events-auto pl-4 pb-2">
          <button onClick={handleJoinGuest} className="flex flex-col items-center gap-1 group active:scale-95 transition-transform">
             <div className="w-11 h-11 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white group-hover:bg-white/10 transition-colors"><Users size={20} /></div>
             <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">Guest</span>
          </button>

          <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
             <div className="w-11 h-11 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-[#fe2c55]"><Heart size={22} fill="currentColor" /></div>
             <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">Like</span>
          </button>

          <button onClick={() => setShowGifts(true)} className="flex flex-col items-center gap-1 group">
             <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center text-white"><GiftIcon size={24} /></div>
             <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">Gift</span>
          </button>

          <div className="flex flex-col items-center gap-1 group relative">
            <button onClick={() => setShowShareList(!showShareList)} className="w-11 h-11 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all">
              <Share2 size={20} />
            </button>
            <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">Share</span>
            
            <AnimatePresence>
              {showShareList && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-16 right-0 w-64 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl z-[60]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Send to Friends</span>
                    <button onClick={() => setShowShareList(false)}><X size={14} className="text-white/40" /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto pr-1 flex flex-col gap-2 hide-scrollbar">
                    {followers.map((f) => (
                      <div key={f.id} className="flex items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <img src={f.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                          <span className="text-[10px] font-bold text-white truncate w-20">{f.username}</span>
                        </div>
                        <button onClick={() => handleSendInvite(f.id)} disabled={sentInvites.includes(f.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${sentInvites.includes(f.id) ? 'bg-green-500/20 text-green-500' : 'bg-[#fe2c55] text-white'}`}>
                          {sentInvites.includes(f.id) ? 'Sent' : 'Send'}
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

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

export default LivePlayer;