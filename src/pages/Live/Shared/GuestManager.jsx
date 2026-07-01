import React, { useState } from 'react';
import { ArrowLeft, Radio, Video, Mic, Check, X, ShieldAlert, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GuestManager = ({ streamId, onBack }) => {
  // Active guest seats/slots (Simulated max capacity limits)
  const [activeGuests, setActiveGuests] = useState([
    { id: 'g1', username: 'Alex_Dev', mode: 'video', isMuted: false },
    { id: 'g2', username: 'Sarah_K', mode: 'audio', isMuted: true }
  ]);

  // Pending incoming live queue connection requests
  const [pendingRequests, setPendingRequests] = useState([
    { id: 'r1', username: 'Chifundo_99', requestedMode: 'video', time: '1m ago' },
    { id: 'r2', username: 'Ben_Tech', requestedMode: 'audio', time: 'Just now' }
  ]);

  // Action: Accept user request into active channel matrix
  const handleAcceptRequest = (request, assignedMode) => {
    setActiveGuests(prev => [
      ...prev,
      {
        id: request.id,
        username: request.username,
        mode: assignedMode, // forces 'video' or 'audio' override matching choice
        isMuted: false
      }
    ]);
    setPendingRequests(prev => prev.filter(item => item.id !== request.id));
  };

  // Action: Terminate connection seat or decline incoming request
  const handleRejectRemove = (id, isRequestQueue = true) => {
    if (isRequestQueue) {
      setPendingRequests(prev => prev.filter(item => item.id !== id));
    } else {
      setActiveGuests(prev => prev.filter(item => item.id !== id));
    }
  };

  // Action: Instantly toggle audio configurations on live seats
  const handleToggleMute = (guestId) => {
    setActiveGuests(prev => prev.map(guest => 
      guest.id === guestId ? { ...guest, isMuted: !guest.isMuted } : guest
    ));
  };

  return (
    <div className="space-y-4 font-sans select-none text-left">
      {/* Top Nav Control Action */}
      <button onClick={onBack} className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors uppercase font-bold tracking-wider">
        <ArrowLeft size={12} /> Back to Dashboard
      </button>

      {/* ================= SECTION 1: LIVE SEATS ROOM MATRIX ================= */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[2px] px-1 flex items-center gap-1">
          <Users size={10} className="text-cyan-400" /> Active Guest Slots ({activeGuests.length}/4)
        </h3>
        
        <div className="grid grid-cols-1 gap-2">
          {activeGuests.map(guest => (
            <div key={guest.id} className="bg-zinc-900/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 font-bold text-xs">
                  {guest.username.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 truncate">{guest.username}</p>
                  <span className="text-[8px] font-mono font-bold tracking-wider text-zinc-500 uppercase flex items-center gap-1 mt-0.5">
                    {guest.mode === 'video' ? (
                      <><Video size={8} className="text-purple-400"/> Audio + Video</>
                    ) : (
                      <><Mic size={8} className="text-emerald-400"/> Audio Only</>
                    )}
                  </span>
                </div>
              </div>

              {/* Live Media Actions */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleToggleMute(guest.id)} 
                  className={`p-1.5 rounded-lg border transition-all ${guest.isMuted ? 'bg-rose-950/40 text-rose-400 border-rose-500/20' : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-white'}`}
                >
                  <Mic size={11} className={guest.isMuted ? "stroke-[2.5]" : ""} />
                </button>
                <button 
                  onClick={() => handleRejectRemove(guest.id, false)} 
                  className="p-1.5 bg-zinc-800/40 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 rounded-lg border border-white/5 hover:border-rose-500/10 transition-all"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
          {activeGuests.length === 0 && (
            <div className="text-center py-4 border border-dashed border-white/5 rounded-xl text-[9px] font-mono uppercase text-zinc-600 tracking-wider">
              No active session connections
            </div>
          )}
        </div>
      </div>

      {/* ================= SECTION 2: INCOMING GUEST REQUEST QUEUE ================= */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[2px] px-1 flex items-center gap-1">
          <Radio size={10} className="text-purple-400 animate-pulse" /> Pending Queue Array ({pendingRequests.length})
        </h3>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {pendingRequests.map(req => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-zinc-900 border border-white/5 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black tracking-tight text-zinc-100 truncate">{req.username}</p>
                    <span className="text-[8px] bg-white/5 px-1 rounded font-mono text-zinc-500">{req.time}</span>
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-0.5">
                    Prefers {req.requestedMode === 'video' ? 'Camera Frame sharing' : 'Voice Link stream'}
                  </p>
                </div>

                {/* Approve/Deny Conditional Routing Engine Splitter */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button 
                    onClick={() => handleRejectRemove(req.id, true)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 bg-white/[0.02] border border-white/5 hover:bg-rose-950/20 rounded-lg text-[9px] font-bold transition-all"
                  >
                    Decline
                  </button>
                  
                  {/* Select Mode directly upon accepting the channel hook */}
                  <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-white/5">
                    <button 
                      onClick={() => handleAcceptRequest(req, 'audio')}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1"
                      title="Accept as Voice Only"
                    >
                      <Mic size={8} /> Audio
                    </button>
                    <button 
                      onClick={() => handleAcceptRequest(req, 'video')}
                      className="px-2 py-1 ml-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 shadow-md shadow-purple-600/10"
                      title="Accept with Video Capture"
                    >
                      <Video size={8} /> +Video
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {pendingRequests.length === 0 && (
            <div className="p-3 bg-zinc-900/30 rounded-xl border border-white/5 text-center py-6">
              <Radio size={18} className="text-zinc-700 mx-auto mb-1.5 opacity-40" />
              <p className="text-xs font-bold text-zinc-400">Queue is Clear</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">Viewer requests will propagate real-time updates here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestManager;
