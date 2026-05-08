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

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-purple-500/10 rounded-full blur-[120px]" />

      <nav className="flex items-center justify-between mb-8 relative z-10">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-full border border-white/10">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-[10px] font-black uppercase tracking-[4px] italic">Universal ID</h2>
        <div className="w-10" />
      </nav>

      {/* --- THE VIRTUAL ID CARD --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group mb-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-[40px] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Globe size={80} strokeWidth={1} />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-cyan-500/50 p-1 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <img 
                src={profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                className="w-full h-full object-cover rounded-[20px]" 
                alt="Profile"
              />
            </div>

            <h1 className="text-xl font-black tracking-tight">{profile?.full_name}</h1>
            <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">@{profile?.username}</p>
            
            <p className="text-zinc-400 text-[11px] leading-relaxed mb-8 max-w-[200px]">
              {profile?.bio || "Exploring the Mpade Universe ecosystem."}
            </p>

            {/* QR CODE CONTAINER */}
            <div className="bg-white p-4 rounded-3xl shadow-2xl">
              <QRCodeSVG 
                value={shareUrl} 
                size={120}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            <p className="mt-4 text-[8px] font-black text-zinc-500 uppercase tracking-[2px]">Scan to Connect</p>
          </div>
        </div>
      </motion.div>

      {/* --- ACTION BUTTONS --- */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <button 
          onClick={copyToClipboard}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 border border-white/5 rounded-[30px] active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
            {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} className="text-zinc-400" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {copied ? 'Copied' : 'Copy Link'}
          </span>
        </button>

        <button 
          onClick={handleNativeShare}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 border border-white/5 rounded-[30px] active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-3">
            <Share2 size={20} className="text-cyan-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">External Share</span>
        </button>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-0 right-0 flex justify-center px-10 z-[100]"
          >
            <div className="bg-cyan-500 text-black px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[2px] shadow-2xl shadow-cyan-500/40">
              Universe Link Secured
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareProfile;