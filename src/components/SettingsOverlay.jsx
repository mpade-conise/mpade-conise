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
      onClick: () => window.open(videoUrl, '_blank') 
    },
    { 
      icon: <HeartOff size={22} />, 
      label: "Clear Display", 
      onClick: () => { /* Logic to hide UI overlays */ onClose(); } 
    },
    { 
      icon: <Captions size={22} />, 
      label: "Captions", 
      onClick: () => alert("Captions coming soon!") 
    },
    { 
      icon: <Scissors size={22} />, 
      label: "Stitch", 
      onClick: () => {} 
    },
    { 
      icon: <Users size={22} />, 
      label: "Duet", 
      onClick: () => {} 
    },
    { 
      icon: copied ? <Check size={22} className="text-green-500" /> : <Share2 size={22} />, 
      label: copied ? "Copied!" : "Copy Link", 
      onClick: handleCopyLink 
    },
  ];

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 z-[100] backdrop-blur-[2px]" 
      />

      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[2rem] pb-10 z-[101] border-t border-white/10"
      >
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-6" />

        <div className="px-6">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {menuItems.map((item, index) => (
              <button 
                key={index}
                onClick={item.onClick}
                className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full text-white">
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium text-zinc-400 text-center">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => { onNotInterested?.(videoId); onClose(); }}
              className="flex items-center gap-4 p-4 w-full bg-white/5 rounded-2xl active:scale-[0.98] transition-all"
            >
              <EyeOff size={20} className="text-white" /> 
              <span className="font-semibold text-sm text-white">Not Interested</span>
            </button>

            <button 
              className="flex items-center gap-4 p-4 w-full bg-white/5 rounded-2xl active:scale-[0.98] transition-all"
            >
              <Info size={20} className="text-white" /> 
              <span className="font-semibold text-sm text-white">Why this video</span>
            </button>

            <button 
              onClick={() => { onReport?.(videoId); onClose(); }}
              className="flex items-center gap-4 p-4 w-full bg-red-500/10 rounded-2xl active:scale-[0.98] transition-all"
            >
              <Flag size={20} className="text-red-500" /> 
              <span className="font-semibold text-sm text-red-500">Report</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default SettingsOverlay;