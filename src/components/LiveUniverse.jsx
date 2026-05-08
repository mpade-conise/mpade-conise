import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FlipVertical, Wand2, Music2, Share2, 
  Settings, Users, Mic, MicOff, Video, VideoOff,
  Music, Check, Send, Heart, Gift, ShoppingBag,
  MoreHorizontal, MessageCircle, UserPlus, Zap,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const LiveUniverse = () => {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [streamTitle, setStreamTitle] = useState("");
  
  // Hardware/Filters
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [facingMode, setFacingMode] = useState("user");
  const [isEnhanced, setIsEnhanced] = useState(false);
  
  // Overlays
  const [activePanel, setActivePanel] = useState(null); // 'gifts', 'shop', 'users', 'settings'
  const [comments, setComments] = useState([]);
  const [hearts, setHearts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Excellent');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // --- LIFECYCLE: CAMERA CONTROL ---
  useEffect(() => {
    startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [facingMode]);

  const startCamera = async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: isMicOn
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera Error:", err);
    }
  };

  // --- LIVE SIMULATION (Engagement) ---
  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setViewers(prev => prev + Math.floor(Math.random() * 3));
        const mockMsgs = ["Love from Blantyre! 🇲🇼", "Mpade is the future", "Send a galaxy! 🌌", "Looking good Pat!"];
        const randomMsg = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
        setComments(prev => [...prev.slice(-10), { id: Date.now(), user: `Fan_${Math.floor(Math.random()*99)}`, text: randomMsg }]);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // --- ACTIONS ---
  const handleGoLive = () => {
    if (!streamTitle) return alert("Give your stream a catchy title!");
    setLoading(true);
    setTimeout(() => {
      setIsLive(true);
      setLoading(false);
    }, 1500);
  };

  const spawnHeart = () => {
    const id = Date.now();
    setHearts(prev => [...prev, id]);
    setTimeout(() => setHearts(prev => prev.filter(h => h !== id)), 2000);
  };

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden font-sans select-none">
      
      {/* 1. CORE VIDEO STREAM LAYER */}
      <div className="absolute inset-0 z-0" onDoubleClick={spawnHeart}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-all duration-700 ${isEnhanced ? 'saturate-[1.2] brightness-110 contrast-105' : ''}`} 
        />
        {!isVideoOn && (
          <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center flex-col gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center">
               <VideoOff size={32} className="text-zinc-700" />
            </div>
            <p className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">Video Paused</p>
          </div>
        )}
      </div>

      {/* 2. LIVE HUD (Visible only when broadcasting) */}
      {isLive && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col p-4">
          {/* Top Section: Info & Viewers */}
          <div className="flex justify-between items-start pt-4">
            <div className="flex items-center gap-2">
               <div className="bg-black/40 backdrop-blur-md p-1.5 pr-4 rounded-full border border-white/10 flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 border border-white/20 flex items-center justify-center text-[10px] font-black">P</div>
                 <div>
                   <p className="text-[10px] font-black leading-none">Patrick C.</p>
                   <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-[8px] font-bold text-zinc-400">{viewers} watching</p>
                   </div>
                 </div>
                 <button className="bg-cyan-500 p-1 rounded-full ml-1 pointer-events-auto active:scale-90 transition-transform">
                    <UserPlus size={12} strokeWidth={4} className="text-black" />
                 </button>
               </div>
            </div>

            <div className="flex flex-col items-end gap-3 pointer-events-auto">
              <button onClick={() => navigate(-1)} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10"><X size={20}/></button>
              <SideControl icon={<Zap size={18}/>} label="Promote" />
              <SideControl icon={<Share2 size={18}/>} label="Share" />
              <SideControl icon={<FlipVertical size={18}/>} onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} />
            </div>
          </div>

          {/* Bottom Section: Chat & Gifts */}
          <div className="mt-auto mb-20 flex flex-col gap-4">
            {/* Real-time Comments */}
            <div className="max-h-[240px] overflow-hidden flex flex-col justify-end gap-2 w-[75%]">
               <AnimatePresence>
                 {comments.map((msg) => (
                   <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, x: -20, scale: 0.9 }} 
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="bg-black/20 backdrop-blur-sm p-2 rounded-xl border-l-2 border-cyan-500/50"
                   >
                     <span className="text-[10px] font-black text-cyan-400 mr-2 uppercase tracking-tighter">{msg.user}</span>
                     <span className="text-xs text-white/90 leading-tight">{msg.text}</span>
                   </motion.div>
                 ))}
               </AnimatePresence>
            </div>
          </div>

          {/* Interaction Bar */}
          <div className="absolute bottom-6 left-4 right-4 flex items-center gap-3 pointer-events-auto">
            <div className="flex-1 bg-black/40 backdrop-blur-2xl rounded-full px-5 py-3.5 border border-white/10 flex items-center">
               <input type="text" placeholder="Add comment..." className="bg-transparent border-none text-sm w-full focus:ring-0 placeholder:text-zinc-500" />
               <Send size={18} className="text-zinc-400 ml-2" />
            </div>
            <CircleBtn icon={<ShoppingBag size={20} />} color="bg-orange-500" onClick={() => setActivePanel('shop')} />
            <CircleBtn icon={<Gift size={20} />} color="bg-pink-500" onClick={() => setActivePanel('gifts')} />
            <div className="relative">
              <CircleBtn icon={<Heart size={20} fill="white" />} color="bg-[#ff0050]" onClick={spawnHeart} />
              {/* Heart Particle Spawner */}
              <AnimatePresence>
                {hearts.map(h => (
                  <motion.div 
                    key={h}
                    initial={{ y: 0, opacity: 1, scale: 0.5 }}
                    animate={{ y: -400, x: (Math.random() - 0.5) * 120, opacity: 0, scale: 2 }}
                    className="absolute bottom-10 right-0 text-[#ff0050] pointer-events-none"
                  >
                    <Heart fill="currentColor" size={24} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* 3. SETUP MODE (Before going live) */}
      {!isLive && (
        <div className="absolute inset-0 z-30 bg-gradient-to-b from-black/60 via-transparent to-black flex flex-col">
          <div className="p-6 flex justify-between">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10"><X/></button>
            <div className="flex flex-col gap-5">
              <SideControl icon={<FlipVertical size={20}/>} label="Flip" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} />
              <SideControl icon={<Wand2 size={20}/>} label="Filter" active={isEnhanced} onClick={() => setIsEnhanced(!isEnhanced)} />
              <SideControl icon={<Music2 size={20}/>} label="Sound" />
              <SideControl icon={<Settings size={20}/>} label="Settings" />
            </div>
          </div>

          <div className="mt-auto p-10 space-y-8 backdrop-blur-md bg-black/40 rounded-t-[48px] border-t border-white/10">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center group cursor-pointer overflow-hidden">
                  <div className="flex flex-col items-center">
                    <Video size={20} className="text-zinc-600" />
                    <span className="text-[8px] font-black uppercase mt-1">Add Cover</span>
                  </div>
               </div>
               <input 
                type="text" 
                placeholder="Title your Universe..." 
                className="bg-transparent border-none text-2xl font-black focus:ring-0 placeholder:text-zinc-800 flex-1"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
               />
            </div>

            <div className="flex gap-4">
              <SetupBadge icon={<Zap size={12}/>} text="High Quality" />
              <SetupBadge icon={<Users size={12}/>} text="Followers Only" />
            </div>

            <div className="flex gap-4">
               <DeviceToggle active={isMicOn} icon={isMicOn ? <Mic/> : <MicOff/>} onClick={() => setIsMicOn(!isMicOn)} />
               <DeviceToggle active={isVideoOn} icon={isVideoOn ? <Video/> : <VideoOff/>} onClick={() => setIsVideoOn(!isVideoOn)} />
            </div>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleGoLive}
              disabled={loading}
              className="w-full py-5 bg-[#ff0050] rounded-2xl font-black uppercase tracking-[4px] shadow-2xl flex items-center justify-center gap-3"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Start Universe Live"}
            </motion.button>
          </div>
        </div>
      )}

      {/* 4. SLIDE-IN PANELS (Gifts, Shopping, etc) */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 z-[70] bg-[#0A0A0A] border-t border-white/10 rounded-t-[40px] p-8 max-h-[70vh] overflow-y-auto shadow-2xl"
            >
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">
                    {activePanel === 'gifts' ? 'Send a Universe Gift' : 'Mpade Shop'}
                  </h3>
                  <button onClick={() => setActivePanel(null)} className="p-2 bg-white/5 rounded-full"><X size={16}/></button>
               </div>

               {activePanel === 'gifts' && (
                 <div className="grid grid-cols-4 gap-4">
                    {[
                      { icon: '🔥', name: 'Fire', coins: 10 },
                      { icon: '💎', name: 'Diamond', coins: 100 },
                      { icon: '🦁', name: 'Lion', coins: 1000 },
                      { icon: '🪐', name: 'Universe', coins: 5000 }
                    ].map(g => (
                      <div key={g.name} className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer active:scale-90">
                         <span className="text-3xl">{g.icon}</span>
                         <span className="text-[10px] font-bold">{g.name}</span>
                         <span className="text-[8px] font-black text-yellow-500 uppercase">{g.coins} Coins</span>
                      </div>
                    ))}
                 </div>
               )}
               
               {activePanel === 'shop' && (
                 <div className="space-y-4">
                    <p className="text-xs text-zinc-500 text-center py-10">No products pinned to this live yet.</p>
                 </div>
               )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

// --- STYLED ATOMS ---

const SideControl = ({ icon, label, onClick, active }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group">
    <div className={`p-3 rounded-full border transition-all ${active ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-black/40 border-white/10 group-active:scale-90'}`}>
      {icon}
    </div>
    {label && <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-500">{label}</span>}
  </button>
);

const CircleBtn = ({ icon, color, onClick }) => (
  <motion.button 
    whileTap={{ scale: 0.8 }}
    onClick={onClick}
    className={`w-12 h-12 ${color} rounded-full flex items-center justify-center shadow-lg border border-white/20`}
  >
    {icon}
  </motion.button>
);

const SetupBadge = ({ icon, text }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
    <span className="text-cyan-400">{icon}</span>
    <span className="text-[9px] font-black uppercase tracking-wider">{text}</span>
  </div>
);

const DeviceToggle = ({ active, icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-4 rounded-2xl border transition-all flex items-center justify-center ${active ? 'bg-white/5 border-white/10 text-white' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
  >
    {icon}
  </button>
);

export default LiveUniverse;