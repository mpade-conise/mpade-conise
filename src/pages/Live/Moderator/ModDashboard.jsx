import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, MessageSquare, Activity, Shield, Eye, Settings } from 'lucide-react';
import ReportsPanel from './ReportsPanel';
import { motion } from 'framer-motion';

const ModDashboard = () => {
  const { streamId } = useParams();
  const [activeTab, setActiveTab] = useState('reports');

  // Stats for the top bar
  const stats = [
    { label: 'Viewers', value: '1.2k', icon: Users, color: 'text-cyan-400' },
    { label: 'Avg Bitrate', value: '4.5 Mbps', icon: Activity, color: 'text-[#fe2c55]' },
    { label: 'Health', value: 'Stable', icon: Shield, color: 'text-green-400' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <span className="bg-[#fe2c55] p-2 rounded-xl shadow-[0_0_15px_rgba(254,44,85,0.5)]">
              <Shield size={24} />
            </span>
            Universe Control
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1 ml-1">
            Mod ID: {streamId?.substring(0, 8)}...
          </p>
        </div>

        {/* Real-time Stats Row */}
        <div className="flex gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-zinc-900/50 border border-white/5 p-3 rounded-2xl flex items-center gap-3 min-w-[120px]">
              <stat.icon size={18} className={stat.color} />
              <div>
                <p className="text-[8px] font-black text-zinc-500 uppercase">{stat.label}</p>
                <p className="text-sm font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Navigation & Moderation Tools */}
        <div className="lg:col-span-3 space-y-4">
          <nav className="bg-zinc-900/30 border border-white/5 rounded-3xl p-2">
            <button 
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'reports' ? 'bg-[#fe2c55] text-white' : 'hover:bg-white/5 text-zinc-500'}`}
            >
              <Shield size={16} /> Reports
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'chat' ? 'bg-[#fe2c55] text-white' : 'hover:bg-white/5 text-zinc-500'}`}
            >
              <MessageSquare size={16} /> Live Chat
            </button>
          </nav>

          <div className="bg-gradient-to-br from-[#fe2c55]/20 to-transparent border border-[#fe2c55]/20 p-6 rounded-3xl">
            <h4 className="text-[10px] font-black uppercase mb-2">Stream Status</h4>
            <div className="flex items-center gap-2 text-[#fe2c55] animate-pulse">
              <div className="w-2 h-2 bg-[#fe2c55] rounded-full" />
              <span className="text-xs font-bold uppercase tracking-tighter">Live Broadcast</span>
            </div>
          </div>
        </div>

        {/* Center Column: The Active Panel */}
        <main className="lg:col-span-9">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'reports' ? (
              <ReportsPanel streamId={streamId} />
            ) : (
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-12 text-center opacity-20">
                <MessageSquare size={48} className="mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest">Chat Feed Loading...</p>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default ModDashboard;