import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PhoneOff, Mic, MicOff, Phone, Shield } from 'lucide-react';

const VoiceCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const peerUserId = searchParams.get('userId');
  
  const [peerProfile, setPeerProfile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const fetchPeerProfile = async () => {
      if (!peerUserId) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', peerUserId)
        .single();
      if (!error && data) setPeerProfile(data);
    };
    fetchPeerProfile();
  }, [peerUserId]);

  return (
    <div className="fixed inset-0 bg-[#08080a] text-white flex flex-col items-center justify-between p-6 font-sans">
      {/* Top Security Banner */}
      <div className="w-full flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">Secure Audio Channel</span>
        </div>
        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full font-bold animate-pulse">Dialing...</span>
      </div>

      {/* Voice Avatar Profile Core Display */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 w-32 h-32 bg-cyan-500/10 rounded-full animate-ping duration-1000 opacity-40" />
          {peerProfile?.avatar_url ? (
            <img 
              src={peerProfile.avatar_url} 
              alt="Avatar" 
              className="w-28 h-28 rounded-full object-cover border border-white/10 relative z-10"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center relative z-10 text-zinc-500">
              <Phone size={32} />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold tracking-tight mt-2">@{peerProfile?.username || 'User'}</h2>
        <p className="text-xs text-zinc-500 tracking-wide font-medium">Mpade Audio Connection</p>
      </div>

      {/* Control Panel Block */}
      <div className="flex items-center gap-6 bg-zinc-950 border border-white/5 px-8 py-4 rounded-full shadow-2xl mb-4">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button 
          onClick={() => navigate(-1)} 
          className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/30"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};

export default VoiceCall;
