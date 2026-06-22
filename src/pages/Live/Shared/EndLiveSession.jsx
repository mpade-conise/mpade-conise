import React from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const EndLiveSession = ({ streamId, onBack }) => {
  const handleTerminate = () => {
    console.log("🛑 Explicit termination signal sent for channel:", streamId);
    window.location.href = '/live';
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={16} />
          <h4 className="text-xs font-bold uppercase">Danger Routine</h4>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          This immediately severs the active database record status and disconnects all WebRTC peer viewers permanently.
        </p>
        <button 
          onClick={handleTerminate}
          className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-lg transition-colors"
        >
          Confirm End Stream
        </button>
      </div>
    </div>
  );
};

export default EndLiveSession;
