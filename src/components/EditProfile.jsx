import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Camera, Check, ChevronRight, 
  Smartphone, ShieldCheck, Sparkles, Globe, 
  Zap, Fingerprint, Cpu, Share2, Eye, 
  Lock, Wallet, Award, Activity, Palette, 
  Music, Heart, MapPin, User
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  
  // Expanded state to match your SQL schema
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    district: 'Blantyre',
    interests: [],
    phone_number: '',
    gender: '',
    dob: '',
    location: '',
    theme_preference: 'neon',
    accent_color: '#06b6d4',
    payout_method: 'Mobile Money',
    currency_preference: 'MWK',
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
          // Ensure interests is always an array for your ARRAY column
          interests: Array.isArray(data.interests) ? data.interests : [],
          social_links: data.social_links || { website: '', youtube: '', whatsapp: '', instagram: '' }
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
          district: formData.district,
          interests: formData.interests,
          phone_number: formData.phone_number,
          gender: formData.gender,
          dob: formData.dob,
          location: formData.location,
          theme_preference: formData.theme_preference,
          accent_color: formData.accent_color,
          payout_method: formData.payout_method,
          currency_preference: formData.currency_preference,
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
          <EditField icon={<User size={14}/>} label="Full Name" value={formData.full_name} onChange={(v) => setFormData({...formData, full_name: v})} />
          <EditField icon={<Zap size={14}/>} label="Username" value={formData.username} onChange={(v) => setFormData({...formData, username: v})} />
          <EditField icon={<Activity size={14}/>} label="Bio" value={formData.bio} onChange={(v) => setFormData({...formData, bio: v})} />
        </div>

        {/* Regional & Personal Section */}
        <div className="space-y-4 pt-4">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Regional Protocols</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <div className="flex items-center p-4 border-b border-white/5">
              <MapPin size={16} className="text-cyan-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Home District</p>
                <select 
                  value={formData.district} 
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white"
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

        {/* Interests Section (Array Handling) */}
        <div className="pt-4">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2 mb-4">Interest Nodes</p>
          <div className="flex flex-wrap gap-2">
            {['Music', 'Comedy', 'Lake Vibes', 'Tech', 'Art', 'Sports'].map(tag => (
              <button
                key={tag}
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

        {/* Financial & Security Node */}
        <div className="pt-4">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2 mb-4">Financial Node</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <EditField icon={<Smartphone size={14}/>} label="Payment Phone" value={formData.phone_number} onChange={(v) => setFormData({...formData, phone_number: v})} />
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
        <div className="pt-4">
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
