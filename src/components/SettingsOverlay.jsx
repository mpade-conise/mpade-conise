import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  EyeOff, Flag, Download, HeartOff, 
  Scissors, Users, Captions, Info, Share2, Check 
} from 'lucide-react';

const SettingsOverlay = ({ onClose, onReport, onNotInterested, videoUrl, videoId }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const menuItems = [
    { 
      icon: <Download size={22} />, 
      label: "Save Video", 
      onClick: () => window.open(videoUrl, '_blank'),
      glowColor: "cyan"
    },
    { 
      icon: <HeartOff size={22} />, 
      label: "Clear Display", 
      onClick: () => { /* Logic to hide UI overlays */ onClose(); },
      glowColor: "pink"
    },
    { 
      icon: <Captions size={22} />, 
      label: "Captions", 
      onClick: () => alert("Captions coming soon!"),
      glowColor: "purple"
    },
    { 
      icon: <Scissors size={22} />, 
      label: "Stitch", 
      onClick: () => {},
      glowColor: "cyan"
    },
    { 
      icon: <Users size={22} />, 
      label: "Duet", 
      onClick: () => {},
      glowColor: "pink"
    },
    { 
      icon: copied ? <Check size={22} className="text-emerald-400 drop-shadow-[0_0_8px_#10b981]" /> : <Share2 size={22} />, 
      label: copied ? "Copied!" : "Copy Link", 
      onClick: handleCopyLink,
      glowColor: "cyan"
    },
  ];

  return (
    <>
      {/* Backdrop with Ambient Neon Glow Overlay */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="fixed inset-0 bg-[#040408]/80 z-[100] backdrop-blur-md" 
      />

      {/* Everywhere Neon Bottom Sheet */}
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-[#090914] rounded-t-[2.5rem] pb-10 z-[101] border-t border-cyan-500/40 shadow-[0_-10px_40px_rgba(0,243,255,0.25)] overflow-hidden"
      >
        {/* Top Glowing Ambient Pulse Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500 shadow-[0_0_15px_#00f3ff]" />

        {/* Neon Sheet Grab Handle */}
        <div className="w-12 h-1.5 bg-cyan-400/80 rounded-full mx-auto mt-4 mb-6 shadow-[0_0_10px_#00f3ff]" />

        <div className="px-6">
          {/* Quick Grid Menu Actions */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {menuItems.map((item, index) => (
              <button 
                key={index}
                onClick={item.onClick}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#0e0e1e]/80 border border-cyan-500/20 hover:border-cyan-400/60 active:scale-95 active:translate-y-[2px] transition-all group shadow-[0_0_15px_rgba(0,243,255,0.05)]"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-[#131326] rounded-full text-cyan-400 border border-cyan-500/30 group-hover:border-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.25)] group-hover:shadow-[0_0_20px_rgba(0,243,255,0.6)] transition-all">
                  {item.icon}
                </div>
                <span className="text-[11px] font-black tracking-wide text-zinc-300 group-hover:text-cyan-300 uppercase">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Vertical Action Bar Options */}
          <div className="flex flex-col gap-3">
            {/* Not Interested Button */}
            <button 
              onClick={() => { onNotInterested?.(videoId); onClose(); }}
              className="flex items-center gap-4 p-4 w-full bg-gradient-to-b from-[#101426] to-[#0a0d1a] border border-cyan-500/40 border-b-cyan-950 border-b-4 rounded-2xl text-cyan-400 active:translate-y-[2px] active:border-b-2 shadow-[0_0_15px_rgba(0,243,255,0.15)] hover:shadow-[0_0_20px_rgba(0,243,255,0.35)] transition-all"
            >
              <EyeOff size={20} className="text-cyan-400 drop-shadow-[0_0_8px_#00f3ff]" /> 
              <span className="font-black text-xs uppercase tracking-wider text-white">Not Interested</span>
            </button>

            {/* Why This Video Button */}
            <button 
              className="flex items-center gap-4 p-4 w-full bg-gradient-to-b from-[#181024] to-[#0e0a18] border border-purple-500/40 border-b-purple-950 border-b-4 rounded-2xl text-purple-400 active:translate-y-[2px] active:border-b-2 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
            >
              <Info size={20} className="text-purple-400 drop-shadow-[0_0_8px_#a855f7]" /> 
              <span className="font-black text-xs uppercase tracking-wider text-white">Why this video</span>
            </button>

            {/* Report Button */}
            <button 
              onClick={() => { onReport?.(videoId); onClose(); }}
              className="flex items-center gap-4 p-4 w-full bg-gradient-to-b from-[#2b0810] to-[#180308] border border-pink-500/50 border-b-pink-950 border-b-4 rounded-2xl text-pink-500 active:translate-y-[2px] active:border-b-2 shadow-[0_0_15px_rgba(255,0,80,0.2)] hover:shadow-[0_0_20px_rgba(255,0,80,0.4)] transition-all"
            >
              <Flag size={20} className="text-pink-500 drop-shadow-[0_0_8px_#ff0050]" /> 
              <span className="font-black text-xs uppercase tracking-wider text-pink-400">Report</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default SettingsOverlay;
