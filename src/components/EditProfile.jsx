import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Camera, Check, Globe, 
  Zap, Fingerprint, Cpu, Share2, Eye, 
  Lock, Wallet, Award, Activity, Palette, 
  Music, Heart, MapPin, User, Film, HelpCircle, Calendar, Shield,
  Smartphone, Sparkles, UploadCloud, Loader2, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditProfile = () => {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  
  // Entire updatable dataset from public.profiles schema
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
    verified_status: 'none'
  });

  const [website, setWebsite] = useState('');
  const [youtube, setYoutube] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
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

          const links = data.social_links || {};
          setWebsite(links.website || '');
          setYoutube(links.youtube || '');
          setWhatsapp(links.whatsapp || '');
          setInstagram(links.instagram || '');
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      loading && setLoading(false);
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    const isAvatar = type === 'avatar';
    if (isAvatar) setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authorized user identified.");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const bucketName = isAvatar ? 'avatars' : 'covers';
      const filePath = `${bucketName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [isAvatar ? 'avatar_url' : 'cover_url']: publicUrl
      }));

    } catch (error) {
      console.error(`Upload error routing to target bucket:`, error.message);
      alert(`Upload Failed: ${error.message}`);
    } finally {
      if (isAvatar) setUploadingAvatar(false);
      else setUploadingCover(false);
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
          avatar_url: formData.avatar_url,
          cover_url: formData.cover_url,
          profile_video_url: formData.profile_video_url,
          profile_music_url: formData.profile_music_url,
          status_message: formData.status_message,
          district: formData.district,
          interests: formData.interests,
          phone_number: formData.phone_number,
          gender: formData.gender,
          dob: formData.dob === "" ? null : formData.dob,
          location: formData.location,
          theme_preference: formData.theme_preference,
          accent_color: formData.accent_color,
          layout_style: formData.layout_style,
          payout_method: formData.payout_method,
          currency_preference: formData.currency_preference,
          is_private: formData.is_private,
          verified_status: formData.verified_status,
          social_links: { website, youtube, whatsapp, instagram }
        })
        .eq('id', user.id);

      if (!error) {
        setShowStatus(true);
        setTimeout(() => navigate(-1), 1500);
      } else {
        console.error("Database Save Error:", error.message);
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
    <div className="h-screen bg-[#040408] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_20px_#00f3ff]" />
      <p className="text-[10px] font-black tracking-[4px] text-cyan-400 uppercase drop-shadow-[0_0_8px_#00f3ff]">Synchronizing Matrix</p>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#040408] text-zinc-100 font-sans overflow-y-auto selection:bg-cyan-500 selection:text-black style-scrollbar">
      
      {/* INLINE CSS FOR EVERYWHERE NEON GLOW SCROLLBAR */}
      <style>{`
        .style-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .style-scrollbar::-webkit-scrollbar-track {
          background: #040408;
        }
        .style-scrollbar::-webkit-scrollbar-thumb {
          background: #111124;
          border-radius: 10px;
          border: 1px solid rgba(0, 243, 255, 0.2);
        }
        .style-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00f3ff;
          box-shadow: 0 0 10px #00f3ff;
        }
      `}</style>

      {/* GLITCH SHIELD BACKGROUND ACCENTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* TOP GLOW CONTROLS */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 sticky top-0 bg-[#06060e]/80 backdrop-blur-xl z-50 max-w-7xl mx-auto w-full shadow-[0_4px_25px_rgba(0,243,255,0.08)]">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-[#0d0d1a] border border-cyan-500/30 rounded-xl hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all text-cyan-400">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-[11px] font-black uppercase tracking-[5px] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Profile Customization</h2>
          <p className="text-[8px] font-extrabold text-cyan-400 uppercase tracking-widest mt-0.5 drop-shadow-[0_0_6px_#00f3ff]">Control Terminal</p>
        </div>
        <button 
          onClick={handleUpdate} 
          disabled={saving || uploadingAvatar || uploadingCover} 
          className="relative px-5 py-2 btn-neon-cyan rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none"
        >
          {saving ? 'Syncing...' : 'Deploy Changes'}
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8 pb-32">
        
        {/* PREMIUM VISUAL HERO MANAGER */}
        <div className="relative w-full rounded-3xl bg-[#0b0b18] border border-cyan-500/30 overflow-hidden mb-8 shadow-[0_0_30px_rgba(0,243,255,0.15)]">
          {/* Banner Graphic Layer */}
          <div className="relative h-48 sm:h-64 w-full bg-[#080812] overflow-hidden group border-b border-cyan-500/20">
            {formData.cover_url ? (
              <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c0c1e] to-[#040408] text-cyan-500/40">
                <ImageIcon size={32} strokeWidth={1} className="drop-shadow-[0_0_10px_#00f3ff]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <button 
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="px-4 py-2 bg-[#0a0a14] hover:bg-black border border-cyan-400/50 rounded-xl text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all"
              >
                {uploadingCover ? <Loader2 size={14} className="animate-spin text-cyan-400" /> : <UploadCloud size={14} className="text-cyan-400" />}
                Upload Custom Banner
              </button>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} className="hidden" />
          </div>

          {/* Identity Placement Metadata Line */}
          <div className="px-6 pb-6 pt-16 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Avatar Absolute Layout Grid */}
            <div className="absolute -top-16 left-6 relative group">
              <div className="w-28 h-28 rounded-3xl bg-[#080812] p-1.5 border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.3)] overflow-hidden">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <div className="w-full h-full bg-[#101024] rounded-2xl flex items-center justify-center text-cyan-400">
                    <User size={36} strokeWidth={1} />
                  </div>
                )}
              </div>
              <button 
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-1.5 rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-cyan-300 border border-cyan-400/50 backdrop-blur-sm cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.4)]"
              >
                {uploadingAvatar ? <Loader2 size={16} className="animate-spin text-cyan-400" /> : (
                  <>
                    <Camera size={18} className="drop-shadow-[0_0_8px_#00f3ff]" />
                    <span className="text-[8px] font-black uppercase tracking-wider">Change</span>
                  </>
                )}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} className="hidden" />
            </div>

            <div className="flex-1 sm:pl-4 mt-2 sm:mt-0">
              <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                {formData.full_name || 'Identity Core'}
                {formData.verified_status !== 'none' && (
                  <span className={`w-2.5 h-2.5 rounded-full ${formData.verified_status === 'gold' ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-cyan-400 shadow-[0_0_10px_#00f3ff]'}`} />
                )}
              </h3>
              <p className="text-xs font-bold text-cyan-400 drop-shadow-[0_0_6px_#00f3ff]">@{formData.username || 'username'}</p>
            </div>
          </div>
        </div>

        {/* DUAL CUBIC CONTEXT SEPARATOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COMPONENT COLUMN: TEXT VECTOR INTERFACES */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* PROFILE ESSENTIALS NODE */}
            <div className="bg-[#0a0a16] border border-cyan-500/20 rounded-3xl p-6 space-y-5 shadow-[0_0_20px_rgba(0,243,255,0.05)]">
              <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-4">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                  <User size={15} />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">Identity Matrix</h4>
              </div>

              <div className="space-y-4">
                <InputField label="Full Account Identity" value={formData.full_name} onChange={(v) => setFormData({...formData, full_name: v})} placeholder="Ex: Gotince Trojan" />
                <InputField label="Username Tag" value={formData.username} onChange={(v) => setFormData({...formData, username: v})} placeholder="Ex: Gotince" />
                <TextAreaField label="Bio Description" value={formData.bio} onChange={(v) => setFormData({...formData, bio: v})} placeholder="Tell the universe who you are..." />
                <InputField label="Status Core" value={formData.status_message} onChange={(v) => setFormData({...formData, status_message: v})} placeholder="What's happening right now?" icon={<HelpCircle size={14} className="text-cyan-400"/>} />
              </div>
            </div>

            {/* CLOUD MULTIMEDIA VECTOR LINK INJECTIONS */}
            <div className="bg-[#0a0a16] border border-purple-500/20 rounded-3xl p-6 space-y-5 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
              <div className="flex items-center gap-3 border-b border-purple-500/20 pb-4">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  <Cpu size={15} />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">Streaming & Audio Nodes</h4>
              </div>

              <div className="space-y-4">
                <InputField label="Profile Background Video URL Loop" value={formData.profile_video_url} onChange={(v) => setFormData({...formData, profile_video_url: v})} placeholder="https://domain.com/loop-sequence.mp4" icon={<Film size={14} className="text-purple-400"/>} />
                <InputField label="Profile Showcase Music Audio Track URL" value={formData.profile_music_url} onChange={(v) => setFormData({...formData, profile_music_url: v})} placeholder="https://domain.com/audio-stream.mp3" icon={<Music size={14} className="text-purple-400"/>} />
              </div>
            </div>

            {/* SOCIAL CORE NETWORK OVERLAYS */}
            <div className="bg-[#0a0a16] border border-pink-500/20 rounded-3xl p-6 space-y-5 shadow-[0_0_20px_rgba(255,0,80,0.05)]">
              <div className="flex items-center gap-3 border-b border-pink-500/20 pb-4">
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-500 shadow-[0_0_10px_rgba(255,0,80,0.2)]">
                  <Share2 size={15} />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">Social Matrix Hooks</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Personal Website" value={website} onChange={setWebsite} placeholder="https://portfolio.com" icon={<Globe size={14} className="text-cyan-400"/>} />
                <InputField label="YouTube Engine" value={youtube} onChange={setYoutube} placeholder="https://youtube.com/c/channel" icon={<Share2 size={14} className="text-pink-500"/>} />
                <InputField label="WhatsApp API Endpoint" value={whatsapp} onChange={setWhatsapp} placeholder="Ex: +265XXXXXXXXX" icon={<Smartphone size={14} className="text-emerald-400"/>} />
                <InputField label="Instagram Vector" value={instagram} onChange={setInstagram} placeholder="https://instagram.com/handle" icon={<Heart size={14} className="text-pink-400"/>} />
              </div>
            </div>

          </div>

          {/* RIGHT COMPONENT COLUMN: SYSTEM ENGINE MODIFIERS & PARAMETERS */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* REGIONAL MATRIX CONFIGURATION */}
            <div className="bg-[#0a0a16] border border-cyan-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_20px_rgba(0,243,255,0.05)]">
              <h4 className="text-[10px] font-black uppercase tracking-[3px] text-cyan-400 mb-2 block drop-shadow-[0_0_6px_#00f3ff]">Geographic Matrix</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">Home District</label>
                  <div className="relative bg-[#0d0d1e] border border-cyan-500/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-cyan-400 shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]">
                    <MapPin size={16} className="text-cyan-400 drop-shadow-[0_0_8px_#00f3ff]" />
                    <select 
                      value={formData.district} 
                      onChange={(e) => setFormData({...formData, district: e.target.value})}
                      className="w-full bg-transparent border-none outline-none text-xs font-black text-white appearance-none cursor-pointer"
                    >
                      {['Blantyre', 'Lilongwe', 'Mzuzu', 'Nkhotakota', 'Zomba'].map(d => (
                        <option key={d} value={d} className="bg-[#090914] text-white">{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <InputField label="Specific Location Coordinate" value={formData.location} onChange={(v) => setFormData({...formData, location: v})} placeholder="Ex: Area 49, Lilongwe" icon={<MapPin size={14} className="text-cyan-400"/>} />
              </div>
            </div>

            {/* DEMOGRAPHICS AND IDENTITY PARAMETERS */}
            <div className="bg-[#0a0a16] border border-pink-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_20px_rgba(255,0,80,0.05)]">
              <h4 className="text-[10px] font-black uppercase tracking-[3px] text-pink-400 mb-2 block drop-shadow-[0_0_6px_#ff0050]">Demographics Core</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">Gender State</label>
                  <div className="relative bg-[#0d0d1e] border border-pink-500/30 rounded-xl px-3 py-3 flex items-center gap-2 shadow-[inset_0_0_10px_rgba(255,0,80,0.05)]">
                    <Fingerprint size={14} className="text-pink-500 drop-shadow-[0_0_8px_#ff0050]" />
                    <select 
                      value={formData.gender} 
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full bg-transparent border-none outline-none text-xs font-black text-white cursor-pointer"
                    >
                      <option value="" className="bg-[#090914]">Unspecified</option>
                      <option value="Male" className="bg-[#090914]">Male</option>
                      <option value="Female" className="bg-[#090914]">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">Date of Birth</label>
                  <div className="relative bg-[#0d0d1e] border border-emerald-500/30 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]">
                    <Calendar size={14} className="text-emerald-400 drop-shadow-[0_0_8px_#10b981]" />
                    <input 
                      type="date"
                      value={formData.dob || ''}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      className="w-full bg-transparent border-none outline-none text-xs font-black text-white scheme-dark cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* INTEREST ARRAYS */}
            <div className="bg-[#0a0a16] border border-cyan-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_20px_rgba(0,243,255,0.05)]">
              <h4 className="text-[10px] font-black uppercase tracking-[3px] text-cyan-400 mb-1 block drop-shadow-[0_0_6px_#00f3ff]">Interest Map Arrays</h4>
              <div className="flex flex-wrap gap-2">
                {['Music', 'Comedy', 'Lake Vibes', 'Tech', 'Art', 'Sports', 'Fashion', 'Football'].map(tag => {
                  const isActive = formData.interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase transition-all duration-300 border ${
                        isActive 
                          ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.4)]' 
                          : 'bg-[#0d0d1e] border-white/5 text-zinc-400 hover:border-cyan-500/30 hover:text-cyan-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ENGINE APPEARANCE AND GLOBAL THEMES */}
            <div className="bg-[#0a0a16] border border-purple-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
              <h4 className="text-[10px] font-black uppercase tracking-[3px] text-purple-400 block drop-shadow-[0_0_6px_#a855f7]">Interface Environment</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0d0d1e] border border-purple-500/30 rounded-xl">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Accent Hex</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="color" 
                      value={formData.accent_color} 
                      onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                      className="w-7 h-7 bg-transparent border-none rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-purple-300 uppercase font-bold">{formData.accent_color}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#0d0d1e] border border-cyan-500/30 rounded-xl flex flex-col justify-between">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-1">System Engine Theme</label>
                  <select 
                    value={formData.theme_preference} 
                    onChange={(e) => setFormData({...formData, theme_preference: e.target.value})}
                    className="w-full bg-transparent border-none outline-none text-xs font-black text-cyan-400 cursor-pointer"
                  >
                    <option value="neon" className="bg-[#090914]">Neon Matrix</option>
                    <option value="minimal" className="bg-[#090914]">Minimal Plane</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-[#0d0d1e] border border-purple-500/30 rounded-xl">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Grid System Layout</label>
                <select 
                  value={formData.layout_style} 
                  onChange={(e) => setFormData({...formData, layout_style: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-xs font-black text-purple-300 cursor-pointer mt-1"
                >
                  <option value="grid" className="bg-[#090914]">Grid Showcase Array</option>
                  <option value="feed" className="bg-[#090914]">Vertical Streaming Feed Layout</option>
                </select>
              </div>
            </div>

            {/* PRIVACY FRAMEWORKS & OVERRIDES */}
            <div className="bg-[#0a0a16] border border-cyan-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_20px_rgba(0,243,255,0.05)]">
              <h4 className="text-[10px] font-black uppercase tracking-[3px] text-cyan-400 block drop-shadow-[0_0_6px_#00f3ff]">Security & Flags</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-[#0d0d1e] border border-cyan-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    {formData.is_private ? <Lock size={15} className="text-pink-500 drop-shadow-[0_0_8px_#ff0050]" /> : <Eye size={15} className="text-emerald-400 drop-shadow-[0_0_8px_#10b981]" />}
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Private Feed Isolation</p>
                      <p className="text-[8px] text-zinc-400 font-medium">Restrict un-followed connection parameters</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={formData.is_private}
                    onChange={(e) => setFormData({...formData, is_private: e.target.checked})}
                    className="w-4 h-4 accent-cyan-400 bg-transparent rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-[#0d0d1e] border border-cyan-500/20 rounded-xl">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-1">System Verification Badge Override</label>
                  <select 
                    value={formData.verified_status} 
                    onChange={(e) => setFormData({...formData, verified_status: e.target.value})}
                    className="w-full bg-transparent border-none outline-none text-xs font-black text-cyan-300 cursor-pointer mt-1"
                  >
                    <option value="none" className="bg-[#090914]">None (Standard Matrix Identity)</option>
                    <option value="blue" className="bg-[#090914]">Blue verified standard core</option>
                    <option value="gold" className="bg-[#090914]">Gold organizational matrix link</option>
                  </select>
                </div>
              </div>
            </div>

            {/* FINANCIAL INBOUND PIPELINES */}
            <div className="bg-[#0a0a16] border border-emerald-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
              <h4 className="text-[10px] font-black uppercase tracking-[3px] text-emerald-400 block drop-shadow-[0_0_6px_#10b981]">Financial Inbound Nodes</h4>

              <div className="space-y-4">
                <InputField label="Payment Distribution Core Address" value={formData.phone_number} onChange={(v) => setFormData({...formData, phone_number: v})} placeholder="Ex: +265XXXXXXXXX" icon={<Smartphone size={14} className="text-emerald-400"/>} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#0d0d1e] border border-emerald-500/30 rounded-xl">
                    <label className="text-[8px] font-black text-zinc-400 uppercase block mb-1">Gateway Pipeline</label>
                    <select 
                      value={formData.payout_method} 
                      onChange={(e) => setFormData({...formData, payout_method: e.target.value})}
                      className="w-full bg-transparent border-none outline-none text-xs font-black text-white cursor-pointer"
                    >
                      <option value="Mobile Money" className="bg-[#090914]">Mobile Money</option>
                      <option value="Bank Transfer" className="bg-[#090914]">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="p-3 bg-[#0d0d1e] border border-emerald-500/30 rounded-xl flex flex-col justify-between">
                    <label className="text-[8px] font-black text-zinc-400 uppercase block">Active Currency</label>
                    <span className="text-xs font-black text-emerald-400 block drop-shadow-[0_0_6px_#10b981]">{formData.currency_preference}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FLOATING SUCCESS TOAST NOTIFIER */}
      <AnimatePresence>
        {showStatus && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 btn-neon-cyan px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest z-[100] flex items-center gap-2">
            <Check size={14} strokeWidth={3} /> Matrix Synced Successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* INPUT FIELDS */
const InputField = ({ label, value, onChange, placeholder, icon }) => (
  <div>
    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">{label}</label>
    <div className="w-full bg-[#0d0d1e] border border-cyan-500/20 rounded-xl px-4 py-3 flex items-center gap-3 transition-all focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(0,243,255,0.2)]">
      {icon && <div className="text-cyan-400 flex items-center justify-center">{icon}</div>}
      <input 
        type="text" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-zinc-600 focus:placeholder:text-zinc-500"
      />
    </div>
  </div>
);

const TextAreaField = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">{label}</label>
    <div className="w-full bg-[#0d0d1e] border border-cyan-500/20 rounded-2xl px-4 py-3 flex items-center gap-3 transition-all focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(0,243,255,0.2)]">
      <textarea 
        rows={3}
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-zinc-600 focus:placeholder:text-zinc-500 resize-none leading-relaxed"
      />
    </div>
  </div>
);

export default EditProfile;
