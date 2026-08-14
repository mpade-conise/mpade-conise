import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Video, Phone, VolumeX, Volume2, PhoneOff, MessageSquare } from 'lucide-react';

/**
 * ActiveCallOverlay Component
 * Renders on top of the global App layout. Triggered by global socket incoming call events.
 * Persists across navigation and provides WhatsApp-style caller details with Accept/Reject controls.
 */
const ActiveCallOverlay = ({
  incomingCall,
  onAccept,
  onReject,
  onQuickReply,
  isRingtoneMuted,
  onToggleMute,
  selectedRingtone,
  onToggleRingtoneSound,
}) => {
  if (!incomingCall) return null;

  const callType = incomingCall.callType || 'video';
  const username = incomingCall.callerUsername || 'User';
  const avatar = incomingCall.callerAvatar;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed inset-0 z-[9999] bg-[#0b141a]/90 backdrop-blur-2xl flex items-center justify-center p-4 select-none"
      >
        <div className="bg-[#111b21] border border-emerald-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col items-center gap-6 relative overflow-hidden">
          
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Call Badge */}
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-black uppercase tracking-wider shadow-inner">
            <ShieldCheck size={14} />
            <span>WhatsApp {callType} Call</span>
          </div>

          {/* Pulsing Avatar Radar Container */}
          <div className="relative my-2">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping scale-125 pointer-events-none" />
            <div className="absolute -inset-4 rounded-full bg-emerald-500/10 animate-pulse pointer-events-none" />
            
            {avatar ? (
              <img
                src={avatar}
                alt={username}
                className="w-28 h-28 rounded-full object-cover border-4 border-emerald-500/50 relative z-10 shadow-2xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-emerald-950/80 border-4 border-emerald-500/50 flex items-center justify-center relative z-10 shadow-2xl">
                {callType === 'video' ? (
                  <Video size={48} className="text-emerald-400" />
                ) : (
                  <Phone size={48} className="text-emerald-400" />
                )}
              </div>
            )}
          </div>

          {/* Caller Profile Meta */}
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">@{username}</h3>
            <p className="text-xs text-emerald-400/90 font-semibold mt-1 tracking-wide uppercase">
              Incoming {callType} call • Ringing...
            </p>
          </div>

          {/* Ringtone Audio Controls Bar */}
          <div className="flex items-center justify-center gap-2 bg-black/40 border border-white/5 p-1.5 rounded-2xl w-full">
            <button
              type="button"
              onClick={onToggleMute}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                isRingtoneMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/10 text-emerald-300 hover:bg-white/15'
              }`}
            >
              {isRingtoneMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{isRingtoneMuted ? 'Muted' : 'Ringtone On'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleRingtoneSound}
              className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              {selectedRingtone === 'whatsapp' ? '🔔 WhatsApp Sound' : '☎️ Classic Ring'}
            </button>
          </div>

          {/* Primary Action Buttons Bar */}
          <div className="flex items-center gap-6 w-full justify-center mt-2">
            {/* Decline / Reject Call */}
            <button
              type="button"
              onClick={onReject}
              className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-90 shadow-xl shadow-red-600/40 flex items-center justify-center"
              title="Decline Call"
            >
              <PhoneOff size={26} />
            </button>

            {/* Quick Reply Message */}
            {onQuickReply && (
              <button
                type="button"
                onClick={onQuickReply}
                className="p-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-transform active:scale-90 border border-white/10"
                title="Quick Reply Message"
              >
                <MessageSquare size={20} />
              </button>
            )}

            {/* Accept / Answer Call */}
            <button
              type="button"
              onClick={onAccept}
              className="p-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-transform active:scale-90 shadow-xl shadow-emerald-500/50 animate-pulse flex items-center justify-center"
              title="Answer Call"
            >
              <Phone size={26} fill="currentColor" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ActiveCallOverlay;
