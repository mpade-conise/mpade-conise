import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Camera, Check, ChevronRight, 
  Smartphone, ShieldCheck, Sparkles, Globe, 
  Zap, Fingerprint, Cpu, Share2, Eye, 
  Lock, Wallet, Award, Activity, Palette, 
  Music, Heart, MapPin, User, EyeOff, Film, HelpCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  
  // Expanded state to perfectly match your SQL schema columns
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    cover_url: '',
    profile_video_url: '',
    profile_music_url: '',
    status_message: '',
    district: 'Blantyre',
    interests: [],
    phone_number: '',
    gender: '',
    dob: '',
    location: '',
    theme_preference: 'neon',
    accent_color: '#06b6d4',
    layout_style: 'grid',
    payout_method: 'Mobile Money',
    currency_preference: 'MWK',
    is_private: false,
    social_links: { website: '', youtube: '', whatsapp: '', instagram: '' }
  });

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
          interests: Array.isArray(data.interests) ? data.interests : [],
          social_links: data.social_links || { website: '', youtube: '', whatsapp: '', instagram: '' },
          is_private: data.is_private ?? false,
          gender: data.gender || '',
          dob: data.dob || '',
          location: data.location || '',
          avatar_url: data.avatar_url || '',
          cover_url: data.cover_url || '',
          profile_video_url: data.profile_video_url || '',
          profile_music_url: data.profile_music_url || '',
          status_message: data.status_message || '',
          layout_style: data.layout_style || 'grid'
        });
      }
    }
    setLoading(false);
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
          avatar_url: formData.avatar_url,
          cover_url: formData.cover_url,
          profile_video_url: formData.profile_video_url,
          profile_music_url: formData.profile_music_url,
          status_message: formData.status_message,
          district: formData.district,
          interests: formData.interests,
          phone_number: formData.phone_number,
          gender: formData.gender,
          dob: formData.dob,
          location: formData.location,
          theme_preference: formData.theme_preference,
          accent_color: formData.accent_color,
          layout_style: formData.layout_style,
          payout_method: formData.payout_method,
          currency_preference: formData.currency_preference,
          is_private: formData.is_private,
          social_links: formData.social_links
        })
        .eq('id', user.id);

      if (!error) {
        setShowStatus(true);
        setTimeout(() => navigate(-1), 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Helper to toggle interests in the array
  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center space-y-4">
      <div className="w-16 h-16 border-t-2 border-cyan-500 rounded-full animate-spin" />
      <p className="text-[10px] font-black tracking-[6px] text-cyan-500 uppercase">Syncing Universe</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24">
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-black/60 backdrop-blur-2xl z-50">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900/50 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[10px] font-black uppercase tracking-[4px]">Edit Interface</h2>
        <button onClick={handleUpdate} disabled={saving} className="text-cyan-400 font-black text-[10px] uppercase tracking-widest">
          {saving ? 'Saving...' : 'Deploy'}
        </button>
      </nav>

      <div className="px-5 mt-8 space-y-6">
        {/* Profile Identity Section */}
        <div className="space-y-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Identity Core</p>
          <div className="bg-zinc-900/20 rounded-[32px] p-2 border border-white/5 space-y-1">
            <EditField icon={<User size={14}/>} label="Full Name" value={formData.full_name} onChange={(v) => setFormData({...formData, full_name: v})} />
            <EditField icon={<Zap size={14}/>} label="Username" value={formData.username} onChange={(v) => setFormData({...formData, username: v})} />
            <EditField icon={<Activity size={14}/>} label="Bio" value={formData.bio} onChange={(v) => setFormData({...formData, bio: v})} />
            <EditField icon={<HelpCircle size={14}/>} label="Status Message" value={formData.status_message} onChange={(v) => setFormData({...formData, status_message: v})} />
          </div>
        </div>

        {/* Media URLs Section */}
        <div className="space-y-2 pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Media Assets</p>
          <div className="bg-zinc-900/20 rounded-[32px] p-2 border border-white/5 space-y-1">
            <EditField icon={<Camera size={14}/>} label="Avatar URL" value={formData.avatar_url} onChange={(v) => setFormData({...formData, avatar_url: v})} />
            <EditField icon={<Sparkles size={14}/>} label="Cover Banner URL" value={formData.cover_url} onChange={(v) => setFormData({...formData, cover_url: v})} />
            <EditField icon={<Film size={14}/>} label="Profile Video URL" value={formData.profile_video_url} onChange={(v) => setFormData({...formData, profile_video_url: v})} />
            <EditField icon={<Music size={14}/>} label="Profile Music URL" value={formData.profile_music_url} onChange={(v) => setFormData({...formData, profile_music_url: v})} />
          </div>
        </div>

        {/* Regional & Personal Section */}
        <div className="space-y-4 pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Regional Protocols</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <div className="flex items-center p-4 border-b border-white/5">
              <MapPin size={16} className="text-cyan-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Home District</p>
                <select 
                  value={formData.district} 
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white mt-1"
                >
                  {['Blantyre', 'Lilongwe', 'Mzuzu', 'Nkhotakota', 'Zomba'].map(d => (
                    <option key={d} value={d} className="bg-black">{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <EditField icon={<Globe size={14}/>} label="Specific Location" value={formData.location} onChange={(v) => setFormData({...formData, location: v})} />
          </div>
        </div>

        {/* Demographic Nodes */}
        <div className="space-y-4 pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Biometrics</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <div className="flex items-center p-4 border-b border-white/5">
              <Fingerprint size={16} className="text-pink-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Gender Identity</p>
                <select 
                  value={formData.gender} 
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white mt-1"
                >
                  <option value="" className="bg-black">Unspecified</option>
                  <option value="Male" className="bg-black">Male</option>
                  <option value="Female" className="bg-black">Female</option>
                </select>
              </div>
            </div>
            <div className="flex items-center p-4">
              <Activity size={16} className="text-emerald-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Date of Birth</p>
                <input 
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white mt-1 scheme-dark"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Matrix Matrix Social Node */}
        <div className="space-y-2 pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Matrix Hyperlinks</p>
          <div className="bg-zinc-900/20 rounded-[32px] p-2 border border-white/5 space-y-1">
            <EditField icon={<Globe size={14}/>} label="Website Link" value={formData.social_links.website} onChange={(v) => setFormData({...formData, social_links: { ...formData.social_links, website: v }})} />
            <EditField icon={<Share2 size={14}/>} label="YouTube Route" value={formData.social_links.youtube} onChange={(v) => setFormData({...formData, social_links: { ...formData.social_links, youtube: v }})} />
            <EditField icon={<Smartphone size={14}/>} label="WhatsApp Protocol" value={formData.social_links.whatsapp} onChange={(v) => setFormData({...formData, social_links: { ...formData.social_links, whatsapp: v }})} />
            <EditField icon={<Heart size={14}/>} label="Instagram Handle" value={formData.social_links.instagram} onChange={(v) => setFormData({...formData, social_links: { ...formData.social_links, instagram: v }})} />
          </div>
        </div>

        {/* Interests Section (Array Handling) */}
        <div className="pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2 mb-4">Interest Nodes</p>
          <div className="flex flex-wrap gap-2">
            {['Music', 'Comedy', 'Lake Vibes', 'Tech', 'Art', 'Sports', 'Fashion', 'Football'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleInterest(tag)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${
                  formData.interests.includes(tag) 
                    ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'bg-zinc-900 border-white/5 text-zinc-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Security / Privacy Node */}
        <div className="pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2 mb-4">Privacy Framework</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                {formData.is_private ? <Lock size={16} className="text-red-500 mr-4" /> : <Eye size={16} className="text-emerald-500 mr-4" />}
                <div>
                  <p className="text-[8px] font-black text-zinc-500 uppercase">Private Profile</p>
                  <p className="text-[10px] text-zinc-400 font-bold">Restrict core stream visibility</p>
                </div>
              </div>
              <input 
                type="checkbox"
                checked={formData.is_private}
                onChange={(e) => setFormData({...formData, is_private: e.target.checked})}
                className="w-4 h-4 accent-cyan-500 bg-transparent rounded"
              />
            </div>
          </div>
        </div>

        {/* Financial & Security Node */}
        <div className="pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2 mb-4">Financial Node</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <EditField icon={<Smartphone size={14}/>} label="Payment Phone" value={formData.phone_number} onChange={(v) => setFormData({...formData, phone_number: v})} />
            <div className="flex items-center p-4 border-b border-white/5">
              <Award size={16} className="text-amber-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Payout Gateway</p>
                <select 
                  value={formData.payout_method} 
                  onChange={(e) => setFormData({...formData, payout_method: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white mt-1"
                >
                  <option value="Mobile Money" className="bg-black">Mobile Money</option>
                  <option value="Bank Transfer" className="bg-black">Bank Transfer</option>
                  <option value="PayPal" className="bg-black">PayPal</option>
                </select>
              </div>
            </div>
            <div className="p-4 flex items-center">
              <Wallet size={16} className="text-purple-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase italic">Currency Preference</p>
                <span className="text-sm font-black text-cyan-400">{formData.currency_preference}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Preference */}
        <div className="pt-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2 mb-4">Visual Aesthetics</p>
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                <Palette size={14} className="text-cyan-500 mb-2" />
                <p className="text-[8px] font-black text-zinc-500 uppercase">Accent Color</p>
                <input 
                  type="color" 
                  value={formData.accent_color} 
                  onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                  className="w-full h-8 bg-transparent border-none rounded cursor-pointer mt-1"
                />
             </div>
             <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                <Sparkles size={14} className="text-yellow-500 mb-2" />
                <p className="text-[8px] font-black text-zinc-500 uppercase">Theme</p>
                <select 
                  value={formData.theme_preference} 
                  onChange={(e) => setFormData({...formData, theme_preference: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-xs font-black text-white mt-2"
                >
                  <option value="neon" className="bg-black">Neon</option>
                  <option value="minimal" className="bg-black">Minimal</option>
                </select>
             </div>
          </div>
          <div className="mt-3 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
            <Cpu size={14} className="text-purple-500 mb-2" />
            <p className="text-[8px] font-black text-zinc-500 uppercase">Layout Style Override</p>
            <select 
              value={formData.layout_style} 
              onChange={(e) => setFormData({...formData, layout_style: e.target.value})}
              className="w-full bg-transparent border-none outline-none text-xs font-black text-white mt-2"
            >
              <option value="grid" className="bg-black">Grid Engine</option>
              <option value="feed" className="bg-black">Feed Stream</option>
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showStatus && (
          <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-6 py-3 rounded-full font-black text-[10px] uppercase z-[100]">
            Database Synced
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditField = ({ icon, label, value, onChange }) => (
  <div className="flex items-center gap-4 py-4 px-4 bg-transparent border-b border-white/5">
    <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
      <input 
        type="text" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-zinc-800"
      />
    </div>
  </div>
);

export default EditProfile;
