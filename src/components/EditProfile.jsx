import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Camera, Check, ChevronRight, 
  Smartphone, ShieldCheck 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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

  // --- ATOMIC IMAGE UPLOAD & DB SYNC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 3. IMMEDIATE DATABASE UPDATE (Prevents disappearing)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl }) 
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 4. Update Local State
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
    } catch (error) {
      console.error("Sync Error:", error.message);
      alert("Failed to sync image: " + error.message);
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
          avatar_url: formData.avatar_url, // Ensure current URL is saved
          social_links: formData.social_links
        })
        .eq('id', user.id);

      if (!error) navigate(-1);
      else console.error("Update error:", error.message);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      <p className="text-[10px] font-black tracking-[4px] text-zinc-500 uppercase">Syncing Universe</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-10">
      <nav className="flex items-center justify-between px-4 py-4 border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={28} />
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest italic">Edit Profile</h2>
        <button 
          onClick={handleUpdate}
          disabled={saving}
          className={`font-black text-sm uppercase tracking-tighter ${saving ? 'text-zinc-600' : 'text-cyan-400'}`}
        >
          {saving ? '...' : 'Done'}
        </button>
      </nav>

      {/* --- PHOTO SECTION --- */}
      <section className="flex flex-col items-center py-10">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-zinc-900 border-2 border-white/5 shadow-2xl relative">
            <img 
              src={formData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
              className="w-full h-full object-cover" 
              alt="Avatar" 
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white/80" />
            </div>
          </div>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageUpload}
            className="absolute inset-0 opacity-0 cursor-pointer" 
          />
        </div>
        <p className="mt-4 text-[9px] font-black text-zinc-500 uppercase tracking-[3px]">
          {saving ? 'Synchronizing...' : 'Update Identity'}
        </p>
      </section>

      <div className="px-5 space-y-1">
        <EditField 
          label="Name" 
          value={formData.full_name} 
          onChange={(v) => setFormData({...formData, full_name: v})} 
          placeholder="Display Name"
        />
        <EditField 
          label="Username" 
          value={formData.username} 
          onChange={(v) => setFormData({...formData, username: v})} 
          placeholder="@username"
        />
        <EditField 
          label="Bio" 
          value={formData.bio} 
          onChange={(v) => setFormData({...formData, bio: v})} 
          placeholder="Write something about yourself..."
        />
        <EditField 
          label="Location" 
          value={formData.location} 
          onChange={(v) => setFormData({...formData, location: v})} 
          placeholder="e.g. Lilongwe, Malawi"
        />

        {/* --- PAYOUT SECTION --- */}
        <div className="pt-6">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px] mb-4 ml-1">Payout Settings</p>
          <div className="bg-zinc-900/30 rounded-3xl border border-white/5 px-4 overflow-hidden">
            <div className="flex items-center py-5 border-b border-white/5">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-white/5 mr-4">
                <Smartphone size={18} className="text-cyan-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Mobile Money Number</p>
                <input 
                  type="tel"
                  value={formData.phone_number || ''}
                  placeholder="099... or 088..."
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-md font-bold text-white placeholder:text-zinc-700 p-0"
                />
              </div>
              <ShieldCheck size={18} className={formData.phone_number?.length > 8 ? "text-green-500" : "text-zinc-800"} />
            </div>

            <div className="flex items-center py-5">
              <span className="text-[11px] font-black text-zinc-500 uppercase tracking-tighter w-24">Method</span>
              <select 
                value={formData.payout_method || 'Airtel Money'}
                onChange={(e) => setFormData({...formData, payout_method: e.target.value})}
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-cyan-400"
              >
                <option value="Airtel Money">Airtel Money</option>
                <option value="TNM Mpamba">TNM Mpamba</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 px-5">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px] mb-4 ml-1">Social Ecosystem</p>
        <div className="bg-zinc-900/30 rounded-3xl border border-white/5 px-2">
          {['whatsapp', 'instagram', 'youtube'].map((platform, idx, arr) => (
            <div key={platform} className={`flex items-center justify-between py-5 px-4 ${idx !== arr.length - 1 ? 'border-b border-white/5' : ''}`}>
              <span className="text-[11px] font-black text-zinc-400 uppercase tracking-tighter capitalize">{platform}</span>
              <input 
                type="text"
                className="bg-transparent text-right outline-none text-[11px] font-bold text-cyan-500 placeholder:text-zinc-800 flex-1 ml-4"
                placeholder="Link or Number"
                value={formData.social_links[platform] || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  social_links: { ...formData.social_links, [platform]: e.target.value }
                })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const EditField = ({ label, value, onChange, placeholder }) => (
  <div className="flex items-center py-5 border-b border-white/5 mx-2">
    <span className="w-24 text-[11px] font-black text-zinc-500 uppercase tracking-tighter">{label}</span>
    <input 
      type="text"
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-zinc-200 placeholder:text-zinc-700"
    />
    <ChevronRight size={16} className="text-zinc-800" />
  </div>
);

export default EditProfile;