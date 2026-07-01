import React from 'react';
import { MicOff, VideoOff } from 'lucide-react';

const LiveStreamViewport = ({ activeGuests = [], hostData }) => {
  // Total streams to display (Host + active guests)
  const totalPanels = 1 + activeGuests.length;

  // Compute adaptive layout grid classes based on panel count
  const getGridClasses = () => {
    switch (totalPanels) {
      case 1: return 'grid-cols-1 grid-rows-1';
      case 2: return 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1';
      case 3: return 'grid-cols-2 grid-rows-2'; // 3 windows (host + 2 guests)
      case 4: return 'grid-cols-2 grid-rows-2'; // 4 windows maximum
      default: return 'grid-cols-2 grid-rows-2';
    }
  };

  return (
    <div className="w-full h-screen bg-zinc-950 p-2 flex items-center justify-center">
      <div className={`w-full h-full max-w-4xl aspect-[9/16] sm:aspect-video bg-zinc-900 rounded-3xl overflow-hidden grid gap-1.5 p-1.5 ${getGridClasses()}`}>
        
        {/* PANEL 1: MAIN HOST VIEWPORT */}
        <div className="relative bg-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 group">
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-black text-white tracking-wider uppercase z-20">
            HOST: {hostData?.username || 'Creator'}
          </div>
          {/* Main camera feed rendering wrapper */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest z-0">Host Stream Camera Payload</div>
        </div>

        {/* GUEST MATRIX CHANNELS */}
        {activeGuests.map((guest, index) => (
          <div 
            key={guest.id} 
            className="relative bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 shadow-2xl transition-all duration-300"
          >
            {/* Identity Badge Overlay */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-zinc-300 flex items-center gap-1 z-20">
              <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
              {guest.username}
            </div>

            {/* Media Status Muted indicators */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
              {guest.isMuted && (
                <div className="p-1 bg-rose-500/80 backdrop-blur-sm rounded-md text-white">
                  <MicOff size={10} className="stroke-[2.5]" />
                </div>
              )}
              {guest.mode === 'audio' && (
                <div className="p-1 bg-zinc-800/80 backdrop-blur-sm rounded-md text-zinc-400">
                  <VideoOff size={10} />
                </div>
              )}
            </div>

            {/* Render conditional viewport contents based on media profile rules */}
            {guest.mode === 'video' ? (
              <div className="absolute inset-0 w-full h-full bg-zinc-800 flex items-center justify-center">
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Guest Camera Stream</p>
              </div>
            ) : (
              // Audio-Only Mode Placeholder State
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center font-black text-zinc-400 text-sm shadow-inner">
                  {guest.username.charAt(0).toUpperCase()}
                </div>
                <p className="text-[8px] font-mono text-emerald-400/80 tracking-widest uppercase">Connected Voice Link</p>
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  );
};

export default LiveStreamViewport;
