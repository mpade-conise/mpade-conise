import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Share2, Copy, Check, 
  QrCode, Download, Globe 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabaseClient';

const ShareProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const shareUrl = `${window.location.origin}/u/${profile?.username}`;

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url, bio')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${profile?.full_name} on Mpade Universe`,
          text: `Check out my profile on the Universe!`,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-2 border-cyan-400 border-t-fuchsia-500 rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
        Loading ID...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 overflow-hidden relative">
      {/* --- INTENSE BACKGROUND NEON GLOWS --- */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-cyan-500/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-80 h-80 bg-fuchsia-500/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-lime-400/15 rounded-full blur-[120px] pointer-events-none" />

      {/* --- NAV HEADER --- */}
      <nav className="flex items-center justify-between mb-8 relative z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2.5 bg-zinc-900/80 rounded-full border border-cyan-500/30 text-cyan-400 hover:text-fuchsia-400 hover:border-fuchsia-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-95"
        >
          <ChevronLeft size={22} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </button>
        <h2 className="text-[10px] font-black uppercase tracking-[4px] italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-lime-400 drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]">
          Universal ID
        </h2>
        <div className="w-10" />
      </nav>

      {/* --- VIRTUAL NEON ID CARD --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group mb-10"
      >
        {/* Animated Glow Backdrop */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-lime-400 rounded-[42px] blur-xl opacity-60 group-hover:opacity-100 transition duration-500" />
        
        <div className="relative bg-zinc-950/80 backdrop-blur-2xl border border-cyan-500/40 rounded-[40px] p-8 overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.3)]">
          {/* Decorative Glowing Globe */}
          <div className="absolute top-0 right-0 p-6 text-cyan-400/20 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Globe size={90} strokeWidth={1} />
          </div>

          <div className="flex flex-col items-center text-center relative z-10">
            {/* Glowing Avatar */}
            <div className="w-24 h-24 rounded-3xl p-1 mb-4 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.8),0_0_50px_rgba(217,70,239,0.4)]">
              <img 
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'Felix'}`} 
                className="w-full h-full object-cover rounded-[20px]" 
                alt="Profile"
              />
            </div>

            <h1 className="text-xl font-black tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
              {profile?.full_name}
            </h1>
            <p className="text-fuchsia-400 text-xs font-black tracking-widest uppercase mb-4 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">
              @{profile?.username}
            </p>
            
            <p className="text-cyan-100/70 text-[11px] leading-relaxed mb-8 max-w-[220px]">
              {profile?.bio || "Exploring the Mpade Universe ecosystem."}
            </p>

            {/* NEON QR CODE CONTAINER */}
            <div className="relative p-4 bg-white rounded-3xl border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:shadow-[0_0_40px_rgba(217,70,239,0.8)] transition-all">
              <QRCodeSVG 
                value={shareUrl} 
                size={120}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <p className="mt-4 text-[8px] font-black text-lime-400 uppercase tracking-[3px] drop-shadow-[0_0_8px_rgba(163,230,53,0.8)]">
              Scan to Connect
            </p>
          </div>
        </div>
      </motion.div>

      {/* --- ACTION BUTTONS --- */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        {/* Copy Link Button */}
        <button 
          onClick={copyToClipboard}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/80 border border-lime-400/30 rounded-[30px] hover:border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.15)] hover:shadow-[0_0_30px_rgba(163,230,53,0.4)] active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-lime-400/10 border border-lime-400/40 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(163,230,53,0.3)]">
            {copied ? (
              <Check size={20} className="text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,1)]" />
            ) : (
              <Copy size={20} className="text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,1)]" />
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-lime-300 drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]">
            {copied ? 'Copied' : 'Copy Link'}
          </span>
        </button>

        {/* External Share Button */}
        <button 
          onClick={handleNativeShare}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/80 border border-cyan-500/30 rounded-[30px] hover:border-fuchsia-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(217,70,239,0.4)] active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Share2 size={20} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,1)]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
            External Share
          </span>
        </button>
      </div>

      {/* --- NOTIFICATION TOAST --- */}
      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-0 right-0 flex justify-center px-10 z-[100]"
          >
            <div className="bg-cyan-400 text-black px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[2px] shadow-[0_0_30px_rgba(6,182,212,1)] border border-cyan-200">
              Universe Link Secured
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareProfile;
