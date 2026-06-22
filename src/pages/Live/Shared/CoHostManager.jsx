import React from 'react';

const CoHostManager = ({ streamId, onBack }) => {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">Manage stream rooms for {streamId}</p>
      <button onClick={onBack} className="text-xs text-cyan-400 bg-white/5 px-3 py-1.5 rounded-lg">
        ← Return to Matrix
      </button>
    </div>
  );
};

export default CoHostManager;
