import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { 
  Video, Activity, ShieldCheck, Zap, Camera, Mic, MicOff, 
  VideoOff, RefreshCw, Users, Lock, Globe, Gift, Settings, 
  Share2, MessageSquare, ShieldAlert, Target, Sparkles, Wand2, Volume2, 
  Image as ImageIcon, Gamepad2, LayoutGrid, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GoLive = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  
  // SETUP STATE
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Chatting");
  const [privacy, setPrivacy] = useState("public");
  
  // MEDIA STATE
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [stream, setStream] = useState(null);

  // EFFECTS
  const [beautyLevel, setBeautyLevel] = useState(0);
  const [activeFilter, setActiveFilter] = useState("none");

  useEffect(() => {
    if (isCamOn) startPreview();
    else stopPreview();
    return () => stopPreview();
  }, [isCamOn]);

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      setIsCamOn(false);
    }
  };

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleStartStream = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('live_streams')
      .insert([{ 
        title: title || `${user.user_metadata?.username || 'User'}'s Universe`,
        host_id: user.id, // Using host_id for RLS compliance
        category,
        privacy,
        status: 'live' 
      }])
      .select().single();

    if (!error) navigate(`/live/dashboard/${data.id}`);
    setLoading(false);
  };

  const tabs = [
    { name: 'POST', path: '/create/post', icon: null },
    { name: 'CREATE', path: '/create/story', icon: null },
    { name: 'LIVE', path: '/live/setup', icon: null },
    { name: 'DEVICE CAMERA', path: '/live/device-camera', icon: <Camera size={14}/> },
    { name: 'MOBILE GAMING', path: '/live/gaming', icon: <Gamepad2 size={14}/> },
  ];

  return (
    <div className="h-screen bg-[#030308] text-white flex flex-col overflow-hidden font-sans selection:bg-pink-500/40 relative">
      
      {/* BACKGROUND NEON GLOW HALOS & REFLECTIONS */}
      <div className="fixed top-0 left-1/4 w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse z-10" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

      {/* TOP OVERLAY CONTROLS */}
      <div className="absolute top-0 inset-x-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-pink-500/30 text-pink-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:border-pink-500/80 hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] pointer-events-auto transition-all">
          <X size={24} className="drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
        </button>
        
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
           <ControlIconButton icon={<Settings size={20}/>} label="Settings" />
           <ControlIconButton icon={<Sparkles size={20}/>} label="Effects" />
           <ControlIconButton icon={<Wand2 size={20}/>} label="Beautify" />
           <ControlIconButton icon={<LayoutGrid size={20}/>} label="Interact" />
        </div>
      </div>

      {/* CAMERA PREVIEW CANVAS */}
      <div className="flex-1 relative bg-zinc-950">
        {isCamOn ? (
          <video 
            ref={videoRef} 
            autoPlay muted playsInline 
            className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-900 via-purple-950/20 to-black relative">
            <VideoOff size={48} className="text-pink-500/40 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
          </div>
        )}

        {/* TOP GLOW & REFLECTION OVERLAY FOR VIDEO */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
        
        {/* CENTERED LIVE INPUT BOX */}
        <div className="absolute inset-x-0 bottom-[180px] px-8 flex justify-center z-40">
          <div className="w-full max-w-md bg-black/40 backdrop-blur-2xl p-4 rounded-[28px] border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.25)] relative overflow-hidden">
            {/* Top Specular Edge Line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            
            <div className="flex items-center gap-3 relative z-10">
               <div className="w-10 h-10 rounded-full bg-zinc-900 overflow-hidden border border-pink-500/80 shadow-[0_0_12px_rgba(244,63,94,0.6)] flex-shrink-0">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Patrick" alt="avatar" className="w-full h-full object-cover" />
               </div>
               <input 
                 type="text"
                 placeholder="Add a title to attract viewers..."
                 className="bg-transparent flex-1 border-none outline-none font-bold text-sm text-cyan-50 placeholder:text-cyan-200/40 drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
               />
               <div className="bg-pink-500/20 border border-pink-500/50 px-3 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase text-pink-300 shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                  <Target size={12} className="text-pink-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]"/> Goal
               </div>
            </div>
          </div>
        </div>

        {/* GO LIVE BUTTON */}
        <div className="absolute inset-x-0 bottom-[100px] flex justify-center px-8 z-40">
           <button 
             onClick={handleStartStream}
             disabled={loading}
             className="w-full max-w-md bg-pink-600 hover:bg-pink-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_30px_rgba(244,63,94,0.8)] hover:shadow-[0_0_45px_rgba(244,63,94,1)] border border-pink-400/60 active:scale-95 transition-all flex items-center justify-center relative overflow-hidden group"
           >
             {/* Reflection highlight */}
             <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
             {loading ? <RefreshCw className="animate-spin drop-shadow-[0_0_8px_#ffffff]" /> : <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Go LIVE</span>}
           </button>
        </div>
      </div>

      {/* BOTTOM NAVIGATION TABS */}
      <div className="bg-black/80 backdrop-blur-3xl border-t border-cyan-500/30 pt-4 pb-8 px-4 overflow-x-auto no-scrollbar relative z-50 shadow-[0_-10px_30px_rgba(6,182,212,0.15)]">
        {/* Top Edge Glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        
        <div className="flex items-center justify-center gap-8 min-w-max relative z-10">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                location.pathname === tab.path ? 'opacity-100' : 'opacity-40 hover:opacity-75'
              }`}
            >
              {tab.icon && (
                <span className={location.pathname === tab.path ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-300'}>
                  {tab.icon}
                </span>
              )}
              <span className={`text-[11px] font-black tracking-widest whitespace-nowrap ${
                tab.name === 'LIVE' ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-100 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]'
              }`}>
                {tab.name}
              </span>
              {location.pathname === tab.path && (
                <motion.div layoutId="tab-underline" className="w-1.5 h-1.5 bg-pink-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,1)]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// UI COMPONENT FOR SIDE CONTROLS
const ControlIconButton = ({ icon, label }) => (
  <button className="flex flex-col items-center gap-1 group">
    <div className="p-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-cyan-500/30 text-cyan-300 group-hover:bg-pink-600 group-hover:border-pink-400 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(244,63,94,0.8)] transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]">
      {icon}
    </div>
    <span className="text-[9px] font-bold uppercase tracking-tighter text-cyan-200/80 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)] group-hover:text-pink-300 transition-colors">{label}</span>
  </button>
);

export default GoLive;
