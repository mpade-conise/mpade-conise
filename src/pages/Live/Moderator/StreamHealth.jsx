import React from 'react';
import { Activity, Zap, Wifi } from 'lucide-react';

const StreamHealth = ({ streamId }) => {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <Activity size={14} className="text-green-500" /> Signal Quality
      </h3>
      
      <div className="space-y-4">
        <HealthBar label="Bitrate" value="4500 kbps" percent={85} color="bg-green-500" />
        <HealthBar label="Frame Drop" value="0.2%" percent={5} color="bg-blue-500" />
        <HealthBar label="Latency" value="120ms" percent={15} color="bg-yellow-500" />
      </div>
    </div>
  );
};

const HealthBar = ({ label, value, percent, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-bold uppercase">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percent}%` }} />
    </div>
  </div>
);

export default StreamHealth;