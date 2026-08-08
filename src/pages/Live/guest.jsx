import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  Camera, Users, Gamepad2, Settings, Sparkles, Wand2, 
  LayoutGrid, X, UserPlus, Shield, Mic, MicOff, VideoOff, 
  RefreshCw, Radio, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GuestLiveSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // STREAM & ROOM CONFIG
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Guest Hangout");
  const [privacy, setPrivacy] = useState("public");
  const [isRoomLocked, setIsRoomLocked] = useState(false);

  // MEDIA STATE
  const [isCamOn, setIsCamOn] = useState(true);
  const [stream, setStream] = useState(null);

  // 7 GUEST PANELS (Host is 8th)
  const [guestSlots, setGuestSlots] = useState([
    { id: 1, label: "Slot 1", occupant: null, isLocked: false },
    { id: 2, label: "Slot 2", occupant: null, isLocked: false },
    { id: 3, label: "Slot 3", occupant: null, isLocked: false },
    { id: 4, label: "Slot 4", occupant: null, isLocked: false },
    { id: 5, label: "Slot 5", occupant: null, isLocked: false },
    { id: 6, label: "Slot 6", occupant: null, isLocked: false },
    { id: 7, label: "Slot 7", occupant: null, isLocked: false },
  ]);

  useEffect(() => {
    if (isCamOn) startPreview();
    else stopPreview();
    return () => stopPreview();
  }, [isCamOn]);

  // BIND MEDIA STREAM TO VIDEO ELEMENT
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCamOn]);

  const startPreview = async () => {
    try {
      // Mobile-friendly constraints to avoid media errors in WebViews
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      setStream(mediaStream);
    } catch (err) {
      console.warn("Camera preview initialization failed:", err);
      setIsCamOn(false);
    }
  };

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleSlotLock = (id) => {
    setGuestSlots(prev => prev.map(slot => 
      slot.id === id ? { ...slot, isLocked: !slot.isLocked } : slot
    ));
  };

  const handleStartGuestStream = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        alert("Please log in to start a multi-guest room.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('live_streams')
        .insert([{ 
          title: title || `${user.user_metadata?.username || 'User'}'s Multi-Guest Room`,
          host_id: user.id,
          category,
          privacy,
          status: 'live',
          stream_type: 'multi_guest',
          max_guests: 7,
          is_locked: isRoomLocked
        }])
        .select().single();

      if (!error && data) {
        navigate(`/live/dashboard/${data.id}`);
      } else {
        console.error("Failed to insert live stream record:", error);
      }
    } catch (err) {
      console.error("Error starting guest stream:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { name: 'POST', path: '/create/post', icon: null },
    { name: 'CREATE', path: '/create/story', icon: null },
    { name: 'DEVICE CAMERA', path: '/live/device-camera', icon: <Camera size={14}/> },
    { name: 'GO WITH GUEST', action: 'direct_guest_stream', icon: <Users size={14}/> },
    { name: 'MOBILE GAMING', path: '/live/gaming', icon: <Gamepad2 size={14}/> },
  ];

  const handleTabClick = (tab) => {
    if (tab.action === 'direct_guest_stream') {
      handleStartGuestStream();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#030308] text-white flex flex-col justify-between overflow-hidden font-sans relative">
      
      {/* NEON AMBIENT GLOWS */}
      <div className="fixed top-0 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-pink-600/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse z-10" />
      <div className="fixed bottom-0 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-cyan-500/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

      {/* TOP CONTROLS */}
      <div className="w-full z-50 p-4 sm:p-6 flex justify-between items-start pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-pink-500/30 text-pink-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:border-pink-500/80 pointer-events-auto transition-all">
          <X size={20} className="sm:w-6 sm:h-6 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
        </button>
        
        <div className="flex flex-col gap-2 sm:gap-3 pointer-events-auto items-end">
           <ControlIconButton icon={<Settings size={18} className="sm:w-5 sm:h-5"/>} label="Settings" />
           <ControlIconButton icon={<Sparkles size={18} className="sm:w-5 sm:h-5"/>} label="Effects" />
           <ControlIconButton icon={<Wand2 size={18} className="sm:w-5 sm:h-5"/>} label="Beautify" />
           <ControlIconButton 
             icon={isRoomLocked ? <Lock size={18} className="sm:w-5 sm:h-5"/> : <Unlock size={18} className="sm:w-5 sm:h-5"/>} 
             label={isRoomLocked ? "Locked" : "Open"} 
             onClick={() => setIsRoomLocked(!isRoomLocked)}
           />
        </div>
      </div>

      {/* 8-PANEL GRID CONTAINER */}
      <div className="flex-1 relative p-3 sm:p-4 overflow-y-auto no-scrollbar z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 max-w-4xl mx-auto h-full auto-rows-fr">
          
          {/* HOST PANEL (8th Panel / Main) */}
          <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border-2 border-pink-500/80 shadow-[0_0_20px_rgba(244,63,94,0.4)] col-span-2 row-span-2 min-h-[180px] sm:min-h-[220px]">
            {isCamOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <VideoOff size={32} className="text-pink-500/50" />
              </div>
            )}
            <div className="absolute top-3 left-3 bg-pink-600/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-pink-400/50">
              <Radio size={12} className="animate-pulse"/> Host
            </div>
          </div>

          {/* 7 GUEST PANELS */}
          {guestSlots.map((slot) => (
            <div 
              key={slot.id} 
              className={`relative rounded-2xl border flex flex-col items-center justify-center p-2 min-h-[100px] sm:min-h-[120px] transition-all overflow-hidden ${
                slot.isLocked 
                  ? 'bg-black/60 border-zinc-800 text-zinc-600' 
                  : 'bg-black/40 backdrop-blur-xl border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-300 hover:border-cyan-400'
              }`}
            >
              <div className="absolute top-2 right-2">
                <button 
                  onClick={() => toggleSlotLock(slot.id)}
                  className="p-1 rounded-lg bg-black/40 text-cyan-400/80 hover:text-pink-400 transition-colors"
                >
                  {slot.isLocked ? <Lock size={12}/> : <Unlock size={12}/>}
                </button>
              </div>

              {slot.occupant ? (
                <div className="flex flex-col items-center gap-1">
                  <img src={slot.occupant.avatar} alt="Guest" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-pink-500" />
                  <span className="text-[10px] font-bold text-cyan-100">{slot.occupant.username}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-70">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <UserPlus size={14} className="text-cyan-400 sm:w-4 sm:h-4"/>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-cyan-200/60">{slot.label}</span>
                </div>
              )}
            </div>
          ))}

        </div>
      </div>

      {/* CONTROLS AND INPUT SECTION */}
      <div className="w-full flex flex-col items-center px-4 sm:px-8 gap-2.5 z-40 my-2">
        {/* ROOM TITLE INPUT */}
        <div className="w-full max-w-md bg-black/50 backdrop-blur-2xl p-2.5 sm:p-3 rounded-2xl sm:rounded-[24px] border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
          <input 
            type="text"
            placeholder="Room Title (e.g. 7-Guest Talk Show)..."
            className="bg-transparent w-full border-none outline-none font-bold text-xs sm:text-sm text-cyan-50 placeholder:text-cyan-200/40 px-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* START GUEST STREAM BUTTON */}
        <button 
          onClick={handleStartGuestStream}
          disabled={loading}
          className="w-full max-w-md bg-pink-600 hover:bg-pink-500 text-white py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm shadow-[0_0_30px_rgba(244,63,94,0.8)] border border-pink-400/60 active:scale-95 transition-all flex items-center justify-center relative overflow-hidden"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <span>Start 8-Panel Room</span>}
        </button>
      </div>

      {/* BOTTOM NAVIGATION TABS */}
      <div className="bg-black/80 backdrop-blur-3xl border-t border-cyan-500/30 pt-3 pb-6 sm:pb-8 px-4 overflow-x-auto no-scrollbar relative z-50 shadow-[0_-10px_30px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        
        <div className="flex items-center justify-start sm:justify-center gap-6 sm:gap-8 min-w-max relative z-10 px-2">
          {tabs.map((tab) => {
            const isActive = tab.name === 'GO WITH GUEST';
            return (
              <button
                key={tab.name}
                onClick={() => handleTabClick(tab)}
                disabled={loading}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                }`}
              >
                {tab.icon && (
                  <span className={isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-300'}>
                    {tab.icon}
                  </span>
                )}
                <span className={`text-[10px] sm:text-[11px] font-black tracking-widest whitespace-nowrap ${
                  isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-100 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]'
                }`}>
                  {tab.name}
                </span>
                {isActive && (
                  <motion.div layoutId="tab-underline" className="w-1.5 h-1.5 bg-pink-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,1)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ControlIconButton = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group">
    <div className="p-2 sm:p-3 bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-cyan-500/30 text-cyan-300 group-hover:bg-pink-600 group-hover:border-pink-400 group-hover:text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]">
      {icon}
    </div>
    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter text-cyan-200/80 group-hover:text-pink-300 transition-colors">{label}</span>
  </button>
);

export default GuestLiveSetup;
