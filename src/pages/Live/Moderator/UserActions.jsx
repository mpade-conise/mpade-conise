import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { VolumeX, UserMinus, ShieldAlert, Search } from 'lucide-react';

const UserActions = ({ streamId }) => {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-3xl backdrop-blur-md">
       <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <ShieldAlert size={14} className="text-[#fe2c55]" /> Direct Actions
      </h3>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
        <input 
          type="text"
          placeholder="Search viewer name..."
          className="w-full bg-black border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:border-[#fe2c55] outline-none transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
         <ActionButton icon={<VolumeX size={16}/>} label="Mute User" color="hover:bg-yellow-500/20 hover:text-yellow-500" />
         <ActionButton icon={<UserMinus size={16}/>} label="Kick" color="hover:bg-orange-500/20 hover:text-orange-500" />
         <ActionButton icon={<ShieldAlert size={16}/>} label="Shadow Ban" color="hover:bg-purple-500/20 hover:text-purple-500" />
         <ActionButton icon={<ShieldAlert size={16}/>} label="Perm Ban" color="hover:bg-red-500/20 hover:text-red-500" />
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, color }) => (
  <button className={`flex flex-col items-center justify-center p-4 bg-black/40 border border-white/5 rounded-2xl gap-2 text-zinc-500 transition-all ${color} group`}>
    <div className="group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default UserActions;