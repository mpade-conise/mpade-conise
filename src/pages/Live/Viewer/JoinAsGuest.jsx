import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, VideoOff, Mic, MicOff, X, Zap, ShieldCheck, Loader2 } from 'lucide-react';

const JoinAsGuest = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    startPreview();
    fetchUser();
    return () => stopStream();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(data);
    }
  };

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Camera access denied", err);
      setIsCamOn(false);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const handleSendRequest = async () => {
    setIsRequesting(true);
    
    // 🔥 Supabase Logic: Insert a guest request for the host to see
    const { error } = await supabase.from('live_guest_requests').insert([{
      stream_id: streamId,
      user_id: userProfile?.id,
      status: 'pending',
      username: userProfile?.username,
      avatar_url: userProfile?.avatar_url
    }]);

    if (!error) {
      // Logic for waiting or navigating back to watch while pending
      setTimeout(() => {
        navigate(`/live/watch/${streamId}`);
      }, 2000);
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative p-6">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fe2c55]/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
          <X size={20} className="text-white" />
        </button>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-[#fe2c55] uppercase tracking-widest">Guest Mode</span>
          <span className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Preview your setup</span>
        </div>
      </div>

      {/* Camera Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-[340px] aspect-[3/4] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900"
      >
        {isCamOn ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-950">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
              <VideoOff size={32} className="text-white/20" />
            </div>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Camera Disabled</p>
          </div>
        )}

        {/* User Info Overlay */}
        <div className="absolute bottom-6 left-6 flex items-center gap-3">
          <img src={userProfile?.avatar_url} className="w-10 h-10 rounded-full border-2 border-[#fe2c55] shadow-lg" alt="" />
          <span className="text-white font-bold text-sm">{userProfile?.username}</span>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-6">
        <button 
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isMicOn ? 'bg-white/10 border-white/20 text-white' : 'bg-red-500/20 border-red-500/40 text-red-500'}`}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button 
          onClick={handleSendRequest}
          disabled={isRequesting}
          className="bg-[#fe2c55] px-10 py-4 rounded-full text-white font-black uppercase text-xs tracking-widest shadow-[0_0_30px_rgba(254,44,85,0.4)] flex items-center gap-3 active:scale-95 transition-all"
        >
          {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
          {isRequesting ? 'Requesting...' : 'Request to Join'}
        </button>

        <button 
          onClick={toggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isCamOn ? 'bg-white/10 border-white/20 text-white' : 'bg-red-500/20 border-red-500/40 text-red-500'}`}
        >
          {isCamOn ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>

      {/* Rules Footer */}
      <div className="mt-12 flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
        <ShieldCheck size={14} className="text-cyan-400" />
        <span className="text-[9px] text-white/50 font-bold uppercase tracking-tighter">Community guidelines apply</span>
      </div>
    </div>
  );
};

export default JoinAsGuest;