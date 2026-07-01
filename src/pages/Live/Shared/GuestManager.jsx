import React from 'react';
import { ArrowLeft, Radio, Video, Mic, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Add defensive empty array fallbacks directly in the destructuring
const GuestManager = ({ 
  activeGuests = [], 
  setActiveGuests, 
  pendingRequests = [], 
  setPendingRequests, 
  onBack 
}) => {
  
  const handleAcceptRequest = (request, assignedMode) => {
    if (!setActiveGuests) return;
    setActiveGuests(prev => [
      ...(prev || []),
      { id: request.id, username: request.username, mode: assignedMode, isMuted: false }
    ]);
    if (setPendingRequests) {
      setPendingRequests(prev => (prev || []).filter(item => item.id !== request.id));
    }
  };

  const handleRejectRemove = (id, isRequestQueue = true) => {
    if (isRequestQueue) {
      if (setPendingRequests) setPendingRequests(prev => (prev || []).filter(item => item.id !== id));
    } else {
      if (setActiveGuests) setActiveGuests(prev => (prev || []).filter(item => item.id !== id));
    }
  };

  return (
    <div className="space-y-4 font-sans text-left p-1">
      <button onClick={onBack} className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors uppercase font-bold tracking-wider">
        <ArrowLeft size={12} /> Exit Guest Configuration
      </button>

      {/* ACTIVE MANAGER CONTROL LIST */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[2px] px-1 flex items-center gap-1">
          <Users size={10} className="text-cyan-400" /> Allocated Room Seats ({activeGuests?.length || 0}/3)
        </h3>
        
        <div className="grid grid-cols-1 gap-1.5">
          {activeGuests?.map(guest => (
            <div key={guest.id} className="bg-zinc-900 p-2 rounded-xl border border-white/5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-200 truncate">{guest.username}</p>
                <p className="text-[8px] text-zinc-500 font-mono uppercase mt-0.5">{guest.mode} Active Link</p>
              </div>
              <button onClick={() => handleRejectRemove(guest.id, false)} className="p-1.5 bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded-lg transition-all">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* REQUEST QUEUE INTAKE CARD */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[2px] px-1 flex items-center gap-1">
          <Radio size={10} className="text-purple-400 animate-pulse" /> Pending Requests ({pendingRequests?.length || 0})
        </h3>

        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {pendingRequests?.map(req => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -10 }} className="bg-zinc-900 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200 truncate">{req.username}</span>
                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-white/5">
                  <button onClick={() => handleAcceptRequest(req, 'audio')} className="px-2 py-1 bg-zinc-900 text-emerald-400 text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-0.5">
                    <Mic size={8} /> Audio
                  </button>
                  <button onClick={() => handleAcceptRequest(req, 'video')} className="px-2 py-1 bg-purple-600 text-white text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-0.5">
                    <Video size={8} /> +Video
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GuestManager;
