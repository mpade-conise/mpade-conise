import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, Copy, Download, Check, Plus, Trash2, Clock } from 'lucide-react';

const VideoCallNotes = ({ isOpen, onClose, peerName = "Caller" }) => {
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem('active_call_scratchpad') || '';
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('active_call_scratchpad', notes);
  }, [notes]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertTimestamp = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotes((prev) => prev + `\n[${timeStr}] `);
  };

  const handleDownload = () => {
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `call-notes-${peerName}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setNotes('');
  };

  return (
    <motion.div
      initial={{ x: 250, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 250, opacity: 0 }}
      className="absolute top-16 right-4 bottom-28 w-80 max-w-[calc(100vw-2rem)] z-40 bg-zinc-950/95 border border-white/20 backdrop-blur-2xl p-4 rounded-3xl flex flex-col justify-between shadow-2xl"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-wider text-white">Call Agenda & Notes</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleInsertTimestamp}
            title="Insert Timestamp"
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 text-xs"
          >
            <Clock size={14} />
          </button>
          <button
            onClick={handleCopy}
            title="Copy Notes"
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleDownload}
            title="Save as File"
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleClear}
            title="Clear All"
            className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"
          >
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white ml-1">
            <X size={16} />
          </button>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={`Jot down key takeaways, action items, or reminders with @${peerName}...`}
        className="flex-1 my-3 bg-zinc-900/60 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50 resize-none font-mono leading-relaxed"
      />

      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
        <span>Auto-saved to device</span>
        <span>{notes.length} chars</span>
      </div>
    </motion.div>
  );
};

export default VideoCallNotes;
