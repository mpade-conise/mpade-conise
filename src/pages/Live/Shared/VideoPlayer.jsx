import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Volume2, Shield, Wifi, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VideoPlayer = ({ streamId, isHost = false }) => {
  const videoRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let stream = null;

    if (isHost) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        }, 
        audio: true 
      })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            setIsConnected(true);
          }
        })
        .catch(err => console.error("Camera access denied:", err));
    } else {
      // Logic for WebRTC/HLS consumption
      // Mocking connection for UI state
      const timer = setTimeout(() => setIsConnected(true), 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isHost, streamId]);

  return (
    <div className="relative w-full h-full bg-black group overflow-hidden flex items-center justify-center">
      
      {/* 1. Cinematic Background Glow (Subtle Ambient Light) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#fe2c55]/5 to-purple-600/5 z-0" />

      {/* 2. The Video Feed */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted={isHost} 
        className={`w-full h-full object-cover transition-opacity duration-1000 z-10 
          ${isConnected ? 'opacity-100' : 'opacity-0'}
          ${isHost ? 'scale-x-[-1]' : ''} 
        `}
      />

      {/* 3. Professional Vignette (Dark edges to make UI pop) */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

      {/* 4. Scanning/Loading Effect if not connected */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-zinc-950"
          >
            <div className="w-12 h-12 border-4 border-[#fe2c55]/20 border-t-[#fe2c55] rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Initializing Secure Feed</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Top Left: Status Badges */}
      <div className="absolute top-6 left-6 z-40 flex flex-col gap-2 pointer-events-none">
        {isHost && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2 bg-[#fe2c55] px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(254,44,85,0.4)] border border-white/20"
          >
            <Shield size={12} className="text-white fill-white/20" />
            <span className="text-[9px] font-black uppercase text-white tracking-wider">Host Direct</span>
          </motion.div>
        )}
        
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 w-fit">
          <Zap size={10} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[9px] font-bold text-white/90">Ultra-Low Latency</span>
        </div>
      </div>

      {/* 6. Top Right: Connection Metrics */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-3 pointer-events-none">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]" />
             <span className="text-[9px] font-black uppercase tracking-tighter text-white">1080p • 60fps</span>
          </div>
        </div>
      </div>

      {/* 7. Bottom Interaction Hints (Visible on Hover) */}
      <div className="absolute bottom-6 right-6 z-40 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white border border-white/10 transition-all active:scale-95">
          <Volume2 size={18} />
        </button>
        <button className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white border border-white/10 transition-all active:scale-95">
          <Maximize size={18} />
        </button>
      </div>

      {/* 8. Neon Border Frame (Subtle) */}
      <div className="absolute inset-0 border border-white/5 z-40 pointer-events-none transition-colors duration-500 group-hover:border-[#fe2c55]/20" />
    </div>
  );
};

export default VideoPlayer;