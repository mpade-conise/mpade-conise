import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Settings, MessageSquareOff, 
  Users, Share2, Shield, Gift, RefreshCcw, Layout, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';
import EndStream from './EndStream';

const HostControls = ({ streamId }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(true);

  // 1. SYNC INITIAL STATE FROM DATABASE
  useEffect(() => {
    if (!streamId) return;

    const fetchStreamSettings = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('is_muted, is_video_off, chat_enabled, gifts_enabled')
        .eq('id', streamId)
        .single();

      if (data && !error) {
        setIsMuted(data.is_muted);
        setIsVideoOff(data.is_video_off);
        setChatEnabled(data.chat_enabled);
        setGiftsEnabled(data.gifts_enabled);
      }
    };

    fetchStreamSettings();
  }, [streamId]);

  // 2. UNIVERSAL UPDATE FUNCTION
  const updateToggle = async (column, currentValue, setter) => {
    const newValue = !currentValue;
    
    // Optimistic UI Update
    setter(newValue);

    const { error } = await supabase
      .from('live_streams')
      .update({ [column]: newValue })
      .eq('id', streamId);

    if (error) {
      console.error(`Failed to update ${column}:`, error.message);
      setter(currentValue); // Rollback on error
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto p-2">
      
      {/* 🛠️ ADVANCED FEATURE GRID */}
      <AnimatePresence>
        {showFullMenu && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="grid grid-cols-4 gap-2 overflow-hidden pb-2"
          >
            <MenuAction icon={<RefreshCcw size={18}/>} label="Switch Cam" />
            <MenuAction icon={<Users size={18}/>} label="Invite Guest" />
            <MenuAction icon={<Share2 size={18}/>} label="Share Screen" />
            <MenuAction icon={<Layout size={18}/>} label="Layout" />
            
            <MenuAction 
              icon={<MessageSquareOff size={18}/>} 
              label={chatEnabled ? "Mute Chat" : "Open Chat"} 
              active={!chatEnabled}
              onClick={() => updateToggle('chat_enabled', chatEnabled, setChatEnabled)}
            />
            <MenuAction 
              icon={<Gift size={18}/>} 
              label="Gifts" 
              active={!giftsEnabled}
              onClick={() => updateToggle('gifts_enabled', giftsEnabled, setGiftsEnabled)}
            />
            <MenuAction icon={<Shield size={18}/>} label="Moderation" />
            <MenuAction icon={<Maximize2 size={18}/>} label="Quality" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 PRIMARY CONTROL BAR */}
      <div className="flex items-center justify-between bg-zinc-900/90 backdrop-blur-2xl p-2 rounded-[24px] border border-white/10 shadow-2xl">
        
        {/* Core Media Controls */}
        <div className="flex items-center gap-2">
          <ControlButton 
            icon={isMuted ? <MicOff size={20}/> : <Mic size={20}/>} 
            active={!isMuted} 
            onClick={() => updateToggle('is_muted', isMuted, setIsMuted)}
            variant={isMuted ? "danger" : "default"}
          />
          
          <ControlButton 
            icon={isVideoOff ? <VideoOff size={20}/> : <Video size={20}/>} 
            active={!isVideoOff} 
            onClick={() => updateToggle('is_video_off', isVideoOff, setIsVideoOff)}
            variant={isVideoOff ? "danger" : "default"}
          />
        </div>

        {/* Menu Toggle */}
        <button 
          onClick={() => setShowFullMenu(!showFullMenu)}
          className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 border ${
            showFullMenu ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/20'
          }`}
        >
          {showFullMenu ? 'Close Tools' : 'More Tools'}
          <Settings size={14} className={showFullMenu ? 'animate-spin-slow' : ''} />
        </button>

        {/* End Stream */}
        <div className="pl-2 border-l border-white/10">
          <EndStream streamId={streamId} />
        </div>
      </div>
    </div>
  );
};

// Sub-components kept as you had them, just ensuring props are passed correctly
const MenuAction = ({ icon, label, active = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-1.5 border ${
      active 
      ? 'bg-red-500/20 border-red-500/40 text-red-500' 
      : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
    }`}
  >
    {icon}
    <span className="text-[8px] font-bold uppercase tracking-tighter">{label}</span>
  </button>
);

const ControlButton = ({ icon, onClick, variant = "default" }) => {
  const styles = {
    default: "bg-white/5 text-white hover:bg-white/10 border-white/5",
    danger: "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30"
  };

  return (
    <button 
      onClick={onClick}
      className={`p-3.5 rounded-full border transition-all active:scale-90 ${styles[variant]}`}
    >
      {icon}
    </button>
  );
};

export default HostControls;