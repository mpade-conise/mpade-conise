import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Camera, Check, Globe, 
  Zap, Fingerprint, Cpu, Share2, Eye, 
  Lock, Wallet, Award, Activity, Palette, 
  Music, Heart, MapPin, User, Film, HelpCircle, Calendar, Shield
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  
  // Fully manual state explicitly handling every single updatable column from your public.profiles schema
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
    verified_status: 'none' // 'none', 'blue', 'gold' etc.
  });

  // Separate social links inputs to avoid nested object reference structural bugs during edits
  const [website, setWebsite] = useState('');
  const [youtube, setYoutube] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');

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
          username: data.username || '',
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          cover_url: data.cover_url || '',
          profile_video_url: data.profile_video_url || '',
          profile_music_url: data.profile_music_url || '',
          status_message: data.status_message || '',
          district: data.district || 'Blantyre',
          interests: Array.isArray(data.interests) ? data.interests : [],
          phone_number: data.phone_number || '',
          gender: data.gender || '',
          dob: data.dob || '',
          location: data.location || '',
          theme_preference: data.theme_preference || 'neon',
          accent_color: data.accent_color || '#06b6d4',
          layout_style: data.layout_style || 'grid',
          payout_method: data.payout_method || 'Mobile Money',
          currency_preference: data.currency_preference || 'MWK',
          is_private: data.is_private ?? false,
          verified_status: data.verified_status || 'none'
        });

        // Unpack jsonb object keys safely into manual fields
        const links = data.social_links || {};
        setWebsite(links.website || '');
        setYoutube(links.youtube || '');
        setWhatsapp(links.whatsapp || '');
        setInstagram(links.instagram || '');
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
          dob: formData.dob === "" ? null : formData.dob, // standard formatting fallback
          location: formData.location,
          theme_preference: formData.theme_preference,
          accent_color: formData.accent_color,
          layout_style: formData.layout_style,
          payout_method: formData.payout_method,
          currency_preference: formData.currency_preference,
          is_private: formData.is_private,
          verified_status: formData.verified_status,
          // Re-pack your text fields explicitly back to database JSON configuration layout
          social_links: { website, youtube, whatsapp, instagram }
        })
        .eq('id', user.id);

      if (!error) {
        setShowStatus(true);
        setTimeout(() => navigate(-1), 1500);
      } else {
        console.error("Database Update Error: ", error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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
      {/* HEADER CONTROL PROTOCOL */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-black/60 backdrop-blur-2xl z-50">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900/50 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[10px] font-black uppercase tracking-[4px]">Edit Public Profiles</h2>
        <button onClick={handleUpdate} disabled={saving} className="text-cyan-400 font-black text-[10px] uppercase tracking-widest">
          {saving ? 'Saving...' : 'Deploy'}
        </button>
      </nav>

      <div className="px-5 mt-8 space-y-8">
        
        {/* SECTION 1: CORE PROFILE INFORMATION */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Identity Core</p>
          <div className="bg-zinc-900/20 rounded-[32px] p-2 border border-white/5 space-y-1">
            <EditField icon={<User size={14}/>} label="Full Name (full_name)" value={formData.full_name} onChange={(v) => setFormData({...formData, full_name: v})} placeholder="Enter full identity name" />
            <EditField icon={<Zap size={14}/>} label="Username (username)" value={formData.username} onChange={(v) => setFormData({...formData, username: v})} placeholder="Unique username identifier" />
            <EditField icon={<Activity size={14}/>} label="Bio Description (bio)" value={formData.bio} onChange={(v) => setFormData({...formData, bio: v})} placeholder="Write a short statement about yourself" />
            <EditField icon={<HelpCircle size={14}/>} label="Status Message (status_message)" value={formData.status_message} onChange={(v) => setFormData({...formData, status_message: v})} placeholder="What are you up to right now?" />
          </div>
        </div>

        {/* SECTION 2: GRAPHICAL & AUDIO LINK ASSETS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Media & Content URL Vectors</p>
          <div className="bg-zinc-900/20 rounded-[32px] p-2 border border-white/5 space-y-1">
            <EditField icon={<Camera size={14} className="text-blue-400" />} label="Avatar Photo Link (avatar_url)" value={formData.avatar_url} onChange={(v) => setFormData({...formData, avatar_url: v})} placeholder="https://domain.com/image.jpg" />
            <EditField icon={<Sparkles size={14} className="text-amber-400" />} label="Cover Banner Link (cover_url)" value={formData.cover_url} onChange={(v) => setFormData({...formData, cover_url: v})} placeholder="https://domain.com/banner.png" />
            <EditField icon={<Film size={14} className="text-purple-400" />} label="Profile Video Loop Link (profile_video_url)" value={formData.profile_video_url} onChange={(v) => setFormData({...formData, profile_video_url: v})} placeholder="https://domain.com/video.mp4" />
            <EditField icon={<Music size={14} className="text-pink-400" />} label="Profile Music Track Link (profile_music_url)" value={formData.profile_music_url} onChange={(v) => setFormData({...formData, profile_music_url: v})} placeholder="https://domain.com/audio.mp3" />
          </div>
        </div>

        {/* SECTION 3: SOCIAL MEDIA LINKS NODE */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Social Hyperlinks Array (social_links jsonb)</p>
          <div className="bg-zinc-900/20 rounded-[32px] p-2 border border-white/5 space-y-1">
            <EditField icon={<Globe size={14}/>} label="Website Routing Link" value={website} onChange={setWebsite} placeholder="Personal portfolio web route" />
            <EditField icon={<Share2 size={14} className="text-red-500" />} label="YouTube Channel Route" value={youtube} onChange={setYoutube} placeholder="Channel or custom profile routing link" />
            <EditField icon={<Smartphone size={14} className="text-emerald-500" />} label="WhatsApp Messaging Route" value={whatsapp} onChange={setWhatsapp} placeholder="API endpoint or messaging number sequence" />
            <EditField icon={<Heart size={14} className="text-pink-500" />} label="Instagram Account Link" value={instagram} onChange={setInstagram} placeholder="Instagram handle profile endpoint" />
          </div>
        </div>

        {/* SECTION 4: REGIONAL PROTOCOLS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Regional Protocols</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <div className="flex items-center p-4 border-b border-white/5">
              <MapPin size={16} className="text-cyan-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Home District (district)</p>
                <select 
                  value={formData.district} 
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white mt-1 select-dropdown"
                >
                  {['Blantyre', 'Lilongwe', 'Mzuzu', 'Nkhotakota', 'Zomba'].map(d => (
                    <option key={d} value={d} className="bg-black">{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <EditField icon={<Globe size={14}/>} label="Specific Geographic Location (location)" value={formData.location} onChange={(v) => setFormData({...formData, location: v})} placeholder="Specific township, area, or address details" />
          </div>
        </div>

        {/* SECTION 5: BIOMETRICS & DEMOGRAPHICS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Biometrics & Metadata</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <div className="flex items-center p-4 border-b border-white/5">
              <Fingerprint size={16} className="text-pink-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Gender Identity (gender)</p>
                <select 
                  value={formData.gender} 
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white mt-1"
                >
                  <option value="" className="bg-black">Unspecified Profile State</option>
                  <option value="Male" className="bg-black">Male</option>
                  <option value="Female" className="bg-black">Female</option>
                </select>
              </div>
            </div>
            <div className="flex items-center p-4">
              <Calendar size={16} className="text-emerald-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Date of Birth (dob)</p>
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

        {/* SECTION 6: INTEREST NODES */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Interest Vector Matrix (interests array)</p>
          <div className="flex flex-wrap gap-2 p-1">
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

        {/* SECTION 7: PRIVACY & SYSTEM VERIFICATION STATES */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Security Framework</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5 space-y-1">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center">
                {formData.is_private ? <Lock size={16} className="text-red-500 mr-4" /> : <Eye size={16} className="text-emerald-500 mr-4" />}
                <div>
                  <p className="text-[8px] font-black text-zinc-500 uppercase">Private Profile Mode (is_private)</p>
                  <p className="text-[10px] text-zinc-400 font-bold">Restrict profile feed access parameters</p>
                </div>
              </div>
              <input 
                type="checkbox"
                checked={formData.is_private}
                onChange={(e) => setFormData({...formData, is_private: e.target.checked})}
                className="w-4 h-4 accent-cyan-500 bg-transparent rounded"
              />
            </div>
            
            <div className="flex items-center p-4">
              <Shield size={16} className="text-blue-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Verification Badge Override (verified_status)</p>
                <select 
                  value={formData.verified_status} 
                  onChange={(e) => setFormData({...formData, verified_status: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-white mt-1"
                >
                  <option value="none" className="bg-black">None (Standard Profile)</option>
                  <option value="blue" className="bg-black">Blue Checked Core</option>
                  <option value="gold" className="bg-black">Gold Organization Badge</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 8: FINANCIAL PIPELINE SETTINGS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">Financial Node Parameters</p>
          <div className="bg-zinc-900/40 rounded-[32px] p-2 border border-white/5">
            <EditField icon={<Smartphone size={14}/>} label="Payment Distribution Target (phone_number)" value={formData.phone_number} onChange={(v) => setFormData({...formData, phone_number: v})} placeholder="Ex: +265XXXXXXXXX" />
            <div className="flex items-center p-4 border-b border-white/5">
              <Award size={16} className="text-amber-500 mr-4" />
              <div className="flex-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase">Distribution Gateway (payout_method)</p>
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
                <p className="text-[8px] font-black text-zinc-500 uppercase italic">Active Operating Currency (currency_preference)</p>
                <span className="text-sm font-black text-cyan-400 mt-1 block">{formData.currency_preference}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 9: STYLING & APPEARANCE SYSTEM */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] ml-2">System Interface Config</p>
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                <Palette size={14} className="text-cyan-500 mb-2" />
                <p className="text-[8px] font-black text-zinc-500 uppercase">Accent Hex Rule (accent_color)</p>
                <input 
                  type="color" 
                  value={formData.accent_color} 
                  onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                  className="w-full h-8 bg-transparent border-none rounded cursor-pointer mt-1"
                />
             </div>
             <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                <Sparkles size={14} className="text-yellow-500 mb-2" />
                <p className="text-[8px] font-black text-zinc-500 uppercase">Active Engine Theme (theme_preference)</p>
                <select 
                  value={formData.theme_preference} 
                  onChange={(e) => setFormData({...formData, theme_preference: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-xs font-black text-white mt-2"
                >
                  <option value="neon" className="bg-black">Neon Core</option>
                  <option value="minimal" className="bg-black">Minimal Plane</option>
                </select>
             </div>
          </div>
          <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
            <Cpu size={14} className="text-purple-500 mb-2" />
            <p className="text-[8px] font-black text-zinc-500 uppercase">Interface Matrix Layout (layout_style)</p>
            <select 
              value={formData.layout_style} 
              onChange={(e) => setFormData({...formData, layout_style: e.target.value})}
              className="w-full bg-transparent border-none outline-none text-xs font-black text-white mt-2"
            >
              <option value="grid" className="bg-black">Grid Showcase Array</option>
              <option value="feed" className="bg-black">Vertical Video Stream Layout</option>
            </select>
          </div>
        </div>

      </div>

      {/* TOAST SYSTEM MONITOR OVERLAY */}
      <AnimatePresence>
        {showStatus && (
          <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-6 py-3 rounded-full font-black text-[10px] uppercase z-[100]">
            Database Synced Successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditField = ({ icon, label, value, onChange, placeholder }) => (
  <div className="flex items-center gap-4 py-4 px-4 bg-transparent border-b border-white/5">
    <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 shadow-inner">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
      <input 
        type="text" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-zinc-800 transition-all focus:placeholder:text-zinc-700 mt-0.5"
      />
    </div>
  </div>
);

export default EditProfile;
