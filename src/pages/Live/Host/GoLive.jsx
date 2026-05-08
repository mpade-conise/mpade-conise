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
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden font-sans selection:bg-[#fe2c55]">
      
      {/* TOP OVERLAY CONTROLS */}
      <div className="absolute top-0 inset-x-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2 bg-black/20 backdrop-blur-xl rounded-full border border-white/10 pointer-events-auto">
          <X size={24} />
        </button>
        
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
           <ControlIconButton icon={<Settings size={20}/>} label="Settings" />
           <ControlIconButton icon={<Sparkles size={20}/>} label="Effects" />
           <ControlIconButton icon={<Wand2 size={20}/>} label="Beautify" />
           <ControlIconButton icon={<LayoutGrid size={20}/>} label="Interact" />
        </div>
      </div>

      {/* CAMERA PREVIEW CANVAS */}
      <div className="flex-1 relative bg-zinc-900">
        {isCamOn ? (
          <video 
            ref={videoRef} 
            autoPlay muted playsInline 
            className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-800 to-black">
            <VideoOff size={48} className="text-zinc-600" />
          </div>
        )}
        
        {/* CENTERED LIVE INPUT BOX */}
        <div className="absolute inset-x-0 bottom-[180px] px-8 flex justify-center">
          <div className="w-full max-w-md bg-black/40 backdrop-blur-2xl p-4 rounded-[28px] border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden border border-white/20">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Patrick" alt="avatar" />
               </div>
               <input 
                 type="text"
                 placeholder="Add a title to attract viewers..."
                 className="bg-transparent flex-1 border-none outline-none font-bold text-sm placeholder:text-zinc-500"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
               />
               <div className="bg-white/10 px-3 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase">
                  <Target size={12} className="text-red-500"/> Goal
               </div>
            </div>
          </div>
        </div>

        {/* GO LIVE BUTTON */}
        <div className="absolute inset-x-0 bottom-[100px] flex justify-center px-8">
           <button 
             onClick={handleStartStream}
             disabled={loading}
             className="w-full max-w-md bg-[#fe2c55] hover:bg-[#ef2950] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_40px_rgba(254,44,85,0.4)] active:scale-95 transition-all flex items-center justify-center"
           >
             {loading ? <RefreshCw className="animate-spin" /> : 'Go LIVE'}
           </button>
        </div>
      </div>

      {/* BOTTOM NAVIGATION TABS */}
      <div className="bg-black/95 backdrop-blur-3xl border-t border-white/5 pt-4 pb-8 px-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-center gap-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                location.pathname === tab.path ? 'opacity-100' : 'opacity-40 hover:opacity-60'
              }`}
            >
              {tab.icon && <span className={location.pathname === tab.path ? 'text-[#fe2c55]' : ''}>{tab.icon}</span>}
              <span className={`text-[11px] font-black tracking-widest whitespace-nowrap ${
                tab.name === 'LIVE' ? 'text-[#fe2c55]' : ''
              }`}>
                {tab.name}
              </span>
              {location.pathname === tab.path && (
                <motion.div layoutId="tab-underline" className="w-1 h-1 bg-[#fe2c55] rounded-full" />
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
    <div className="p-3 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/5 group-hover:bg-[#fe2c55] group-hover:border-[#fe2c55] transition-all">
      {icon}
    </div>
    <span className="text-[9px] font-bold uppercase tracking-tighter text-white/70">{label}</span>
  </button>
);

export default GoLive;