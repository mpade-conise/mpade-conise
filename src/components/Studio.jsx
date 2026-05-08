import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, BarChart3, TrendingUp } from 'lucide-react';

const Studio = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-black text-white p-6 overflow-y-auto pb-24">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="mb-8 flex items-center gap-2 text-zinc-400 font-black uppercase text-[10px] tracking-widest"
      >
        <ChevronLeft size={18} /> Back to Profile
      </button>

      {/* Balance Card */}
      <div className="bg-white text-black p-8 rounded-[2.5rem] mb-8 shadow-xl shadow-white/10">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Estimated Revenue</p>
        <h2 className="text-4xl font-black mt-1 italic">MK 0.00</h2>
        <button className="mt-6 w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <CreditCard size={14} /> Withdraw via Mpamba / Airtel
        </button>
      </div>

      {/* Analytics */}
      <h3 className="font-black uppercase italic text-sm mb-4 tracking-tighter">Performance</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-zinc-900 rounded-[2rem] border border-white/5 text-center">
          <BarChart3 className="mx-auto mb-2 text-cyan-400" size={20} />
          <p className="text-2xl font-black">0</p>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Video Views</p>
        </div>
        <div className="p-6 bg-zinc-900 rounded-[2rem] border border-white/5 text-center">
          <TrendingUp className="mx-auto mb-2 text-[#ff0050]" size={20} />
          <p className="text-2xl font-black">0</p>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Engagement</p>
        </div>
      </div>
    </div>
  );
};

// THIS IS THE LINE YOU WERE MISSING:
export default Studio;