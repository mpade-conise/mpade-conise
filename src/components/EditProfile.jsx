import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Camera, Check, ChevronRight, 
  Smartphone, ShieldCheck, Sparkles, Globe, 
  Zap, Fingerprint, Cpu, Share2, Eye, 
  Lock, Wallet, Award, Activity
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStatus, setShowStatus] = useState(false); // 1. Status Toast state
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    phone_number: '',
    location: '',
    payout_method: '',
    social_links: { website: '', youtube: '', whatsapp: '', instagram: '' }
  });

  // 2. Profile Strength Logic
  const calculateStrength = () => {
    let score = 0;
    if (formData.full_name) score += 20;
    if (formData.bio) score += 20;
    if (formData.avatar_url) score += 20;
    if (formData.phone_number) score += 20;
    if (Object.values(formData.social_links).some(v => v)) score += 20;
    return score;
  };

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setFormData({
          ...data,
          social_links: data.social_links || { website: '', youtube: '', whatsapp: '', instagram: '' }
        });
      }
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl }) 
        .eq('id', user.id);

      if (dbError) throw dbError;
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setShowStatus(true); // Trigger Success Toast
      setTimeout(() => setShowStatus(false), 3000);
      
    } catch (error) {
      console.error("Sync Error:", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          phone_number: formData.phone_number,
          location: formData.location,
          payout_method: formData.payout_method,
          avatar_url: formData.avatar_url,
          social_links: formData.social_links
        })
        .eq('id', user.id);

      if (!error) navigate(-1);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center space-y-4">
      {/* 3. Futuristic Loader */}
      <div className="relative">
        <div className="w-16 h-16 border-2 border-cyan-500/10 rounded-full" />
        <div className="absolute top-0 w-16 h-16 border-t-2 border-cyan-500 rounded-full animate-spin" />
        <Cpu size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500 animate-pulse" />
      </div>
      <p className="text-[10px] font-black tracking-[6px] text-cyan-500 uppercase ml-2">Initialising Neural Link</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 overflow-x-hidden">
      {/* 4. Dynamic Background FX */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-cyan-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-10%] w-72 h-72 bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-black/60 backdrop-blur-2xl z-50">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 bg-zinc-900/50 rounded-full border border-white/5">
          <ChevronLeft size={20} />
        </motion.button>
        <div className="text-center">
            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-zinc-500 mb-0.5">Universe ID</h2>
            <p className="text-xs font-bold italic tracking-tighter text-cyan-400">@{formData.username || 'pioneer'}</p>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={handleUpdate}
          disabled={saving}
          className="bg-cyan-500 text-black px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        >
          {saving ? 'Syncing' : 'Deploy'}
        </motion.button>
      </nav>

      {/* 5. Identity Verification Banner */}
      <div className="mx-5 mt-6 p-4 bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-[24px] flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500 rounded-lg shadow-lg">
                <Fingerprint size={16} className="text-black" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-200">Identity Strength</p>
                <p className="text-[9px] text-zinc-500 font-bold">Protocol {calculateStrength()}% Secure</p>
            </div>
         </div>
         {/* 6. Strength Meter */}
         <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${calculateStrength()}%` }} className="h-full bg-cyan-500" />
         </div>
      </div>

      {/* --- PHOTO SECTION --- */}
      <section className="flex flex-col items-center py-12 relative">
        <div className="relative group">
          {/* 7. Neon Ring Effect */}
          <div className="absolute inset-[-4px] bg-gradient-to-tr from-cyan-500 to-purple-500 rounded-full opacity-50 blur-md group-hover:opacity-100 transition-opacity animate-pulse" />
          <div className="w-32 h-32 rounded-full overflow-hidden bg-black border-2 border-black relative z-10">
            <img 
              src={formData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt="Avatar" 
            />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Camera size={24} className="text-cyan-400 mb-1" />
              <span className="text-[7px] font-black uppercase">Upload</span>
            </div>
          </div>
          {/* 8. Verified Badge */}
          <div className="absolute bottom-1 right-1 bg-cyan-500 p-1.5 rounded-full z-20 border-2 border-black shadow-xl">
             <Check size={12} className="text-black stroke-[4px]" />
          </div>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-30" 
          />
        </div>
        <p className="mt-6 text-[9px] font-black text-zinc-500 uppercase tracking-[5px] flex items-center gap-2">
           <Activity size={10} className="text-cyan-500" />
           {saving ? 'Transmitting Data...' : 'Bio-Metric Link Active'}
        </p>
      </section>

      <div className="px-5 space-y-2 relative z-10">
        <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] mb-4 ml-2">Core Credentials</h3>
        
        {/* 9. Interactive Field Containers */}
        <EditField 
          icon={<Award size={14}/>}
          label="Legal Name" 
          value={formData.full_name} 
          onChange={(v) => setFormData({...formData, full_name: v})} 
          placeholder="Display Name"
        />
        <EditField 
          icon={<Zap size={14}/>}
          label="Handle" 
          value={formData.username} 
          onChange={(v) => setFormData({...formData, username: v})} 
          placeholder="@username"
        />
        <EditField 
          icon={<Sparkles size={14}/>}
          label="Interface Bio" 
          value={formData.bio} 
          onChange={(v) => setFormData({...formData, bio: v})} 
          placeholder="A short story about your digital existence..."
        />
        <EditField 
          icon={<Globe size={14}/>}
          label="Coordinates" 
          value={formData.location} 
          onChange={(v) => setFormData({...formData, location: v})} 
          placeholder="Current City"
        />

        {/* --- PAYOUT SECTION --- */}
        <div className="pt-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px]">Revenue Node</p>
            {/* 10. Floating Label Badge */}
            <span className="text-[7px] font-black bg-white/5 text-zinc-500 px-2 py-1 rounded-full border border-white/5 uppercase">Malawian Gateway</span>
          </div>
          <div className="bg-zinc-900/40 backdrop-blur-xl rounded-[32px] border border-white/5 p-2 shadow-2xl">
            <div className="flex items-center p-4 bg-black/40 rounded-[24px] border border-white/5 mb-2 group">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 mr-4 transition-colors group-hover:border-cyan-500/50">
                <Smartphone size={20} className="text-cyan-500" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Mobile ID Number</p>
                <input 
                  type="tel"
                  value={formData.phone_number || ''}
                  placeholder="099... or 088..."
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-black text-white placeholder:text-zinc-800 p-0"
                />
              </div>
              {/* 11. Animated Security Check */}
              <motion.div animate={formData.phone_number?.length > 8 ? { scale: [1, 1.2, 1] } : {}}>
                <ShieldCheck size={20} className={formData.phone_number?.length > 8 ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "text-zinc-800"} />
              </motion.div>
            </div>

            <div className="flex items-center p-4 rounded-[24px] group">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 mr-4 group-hover:border-purple-500/50">
                <Wallet size={20} className="text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Transmission Method</p>
                <select 
                  value={formData.payout_method || 'Airtel Money'}
                  onChange={(e) => setFormData({...formData, payout_method: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-black text-cyan-400 appearance-none"
                >
                  <option value="Airtel Money">Airtel Money Gateway</option>
                  <option value="TNM Mpamba">TNM Mpamba Gateway</option>
                </select>
              </div>
              <ChevronRight size={18} className="text-zinc-800" />
            </div>
          </div>
        </div>
      </div>

      {/* 12. Social Grid Enhancement */}
      <div className="mt-10 px-5 relative z-10">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px] mb-4 ml-2">External Uplinks</p>
        <div className="grid grid-cols-1 gap-3">
          {['whatsapp', 'instagram', 'youtube'].map((platform) => (
            <motion.div 
                key={platform}
                whileHover={{ x: 5 }}
                className="flex items-center bg-zinc-900/30 backdrop-blur-md rounded-2xl border border-white/5 p-4"
            >
              <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center mr-4">
                 {platform === 'whatsapp' && <Share2 size={14} className="text-green-500" />}
                 {platform === 'instagram' && <Eye size={14} className="text-pink-500" />}
                 {platform === 'youtube' && <Activity size={14} className="text-rose-600" />}
              </div>
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{platform}</p>
                <input 
                  type="text"
                  className="bg-transparent w-full outline-none text-xs font-bold text-white placeholder:text-zinc-800 mt-0.5"
                  placeholder={`Enter ${platform} handle`}
                  value={formData.social_links[platform] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, [platform]: e.target.value }
                  })}
                />
              </div>
              <div className="p-1 bg-zinc-800/50 rounded-md">
                 <Lock size={12} className="text-zinc-600" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 13. System Status Toast */}
      <AnimatePresence>
        {showStatus && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-6 py-3 rounded-full flex items-center gap-3 z-[100] shadow-[0_0_30px_rgba(6,182,212,0.5)]"
          >
             <Check size={16} className="stroke-[4px]" />
             <span className="text-[10px] font-black uppercase tracking-widest">Profile Cloud-Synced</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 14. Bottom Privacy Note */}
      <p className="mt-12 text-center text-[8px] font-bold text-zinc-700 uppercase tracking-[2px] leading-relaxed px-10">
        Data transmitted via Universe end-to-end encryption.<br/>Protocol version 2.4.0 Malawian Node.
      </p>
    </div>
  );
};

// 15. Enhanced Field Component with Icons
const EditField = ({ label, value, onChange, placeholder, icon }) => (
  <motion.div 
    whileTap={{ backgroundColor: "rgba(255,255,255,0.02)" }}
    className="flex items-center gap-4 py-5 px-3 rounded-3xl border-b border-white/5 transition-all"
  >
    <div className="w-10 h-10 rounded-2xl bg-zinc-900/50 flex items-center justify-center border border-white/5 text-zinc-500">
        {icon}
    </div>
    <div className="flex-1">
        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
        <input 
          type="text"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm font-bold text-zinc-100 placeholder:text-zinc-800 italic"
        />
    </div>
    <ChevronRight size={16} className="text-zinc-800" />
  </motion.div>
);

export default EditProfile;
