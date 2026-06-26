
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Shield } from 'lucide-react';

const VideoCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const peerUserId = searchParams.get('userId');
  
  const [peerProfile, setPeerProfile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

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
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-6 font-sans">
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">End-to-End Encrypted</span>
        </div>
        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full font-bold">Connecting...</span>
      </div>

      {/* Main Video Presentation Sandbox */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 my-8 relative w-full max-w-md rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl">
        {/* Remote User Placeholder (Will hook to WebRTC stream) */}
        {peerProfile?.avatar_url ? (
          <img 
            src={peerProfile.avatar_url} 
            alt="Peer Avatar" 
            className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/30 animate-pulse"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center animate-pulse">
            <Video size={32} className="text-cyan-400" />
          </div>
        )}
        <h2 className="text-lg font-bold">@{peerProfile?.username || 'User'}</h2>
        <p className="text-xs text-zinc-500">Video calling...</p>

        {/* Local Self-Preview Window Minimal Pin */}
        <div className="absolute bottom-4 right-4 w-28 h-40 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md overflow-hidden flex items-center justify-center">
          <p className="text-[10px] font-bold text-zinc-400">Your Preview</p>
        </div>
      </div>

      {/* Media Controller Action Dock */}
      <div className="flex items-center gap-4 bg-zinc-900/80 border border-white/5 px-6 py-4 rounded-full backdrop-blur-xl shadow-xl">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button 
          onClick={() => navigate(-1)} 
          className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/20"
        >
          <PhoneOff size={20} />
        </button>

        <button 
          onClick={() => setIsVideoOff(!isVideoOff)} 
          className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
