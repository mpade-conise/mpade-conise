import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, User, ShieldCheck, Bell, Lock, 
  Eye, Globe, Smartphone, HelpCircle, LogOut, 
  ChevronRight, Wallet, Palette, Share2, Database,
  Zap, Languages
} from 'lucide-react';
import { supabase } from '../supabaseClient'; // Ensure this path is correct

const SettingsPage = () => {
  const navigate = useNavigate();
  const [dataSaver, setDataSaver] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-10">
      {/* --- FIXED HEADER --- */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-5 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-[3px] italic">Settings and Privacy</h1>
      </nav>

      <div className="max-w-2xl mx-auto pt-4">
        
        {/* --- ACCOUNT SECTION --- */}
        <section className="mb-8">
          <SectionHeader title="Account" />
          <div className="bg-[#0A0A0A] border-y border-white/5 lg:border-x lg:rounded-3xl overflow-hidden">
            <SettingLink 
              icon={<User className="text-cyan-400"/>} 
              title="Account Information" 
              onClick={() => navigate('/edit-profile')} 
            />
            <SettingLink 
              icon={<Lock className="text-purple-400"/>} 
              title="Password & Security" 
              onClick={() => navigate('/settings/security')} 
            />
            <SettingLink 
              icon={<Wallet className="text-green-400"/>} 
              title="Balance / Creator Fund" 
              badge="MK 45,000" 
              onClick={() => navigate('/payouts')} 
            />
            <SettingLink 
              icon={<Share2 className="text-blue-400"/>} 
              title="Share Profile" 
              border={false} 
              onClick={() => navigate('/profile')} 
            />
          </div>
        </section>

        {/* --- CONTENT & DISPLAY --- */}
        <section className="mb-8">
          <SectionHeader title="Content & Display" />
          <div className="bg-[#0A0A0A] border-y border-white/5 lg:border-x lg:rounded-3xl overflow-hidden">
            <SettingLink 
              icon={<Bell className="text-red-400"/>} 
              title="Notifications" 
              onClick={() => navigate('/settings/notifications')} 
            />
            <SettingLink 
              icon={<Languages className="text-yellow-400"/>} 
              title="App Language" 
              badge="English" 
              onClick={() => navigate('/settings/language')} 
            />
            <SettingLink 
              icon={<Palette className="text-pink-400"/>} 
              title="Visual Theme" 
              badge="Neon Glow" 
              onClick={() => navigate('/settings/theme')} 
            />
            <SettingToggle 
              icon={<Database className="text-orange-400"/>} 
              title="Data Saver" 
              desc="Reduces video quality to save mobile data" 
              active={dataSaver} 
              onToggle={() => setDataSaver(!dataSaver)}
              border={false}
            />
          </div>
        </section>

        {/* --- CREATOR TOOLS --- */}
        <section className="mb-8">
          <SectionHeader title="Creator Tools" />
          <div className="bg-[#0A0A0A] border-y border-white/5 lg:border-x lg:rounded-3xl overflow-hidden">
            <SettingLink 
              icon={<Zap className="text-cyan-400"/>} 
              title="Analytics" 
              onClick={() => navigate('/universe-tools')} 
            />
            <SettingLink 
              icon={<Globe className="text-emerald-400"/>} 
              title="Live Center" 
              onClick={() => navigate('/live-universe')} 
            />
            <SettingLink 
              icon={<ShieldCheck className="text-blue-500"/>} 
              title="Copyright Status" 
              border={false} 
              onClick={() => navigate('/settings/copyright')} 
            />
          </div>
        </section>

        {/* --- SUPPORT --- */}
        <section className="mb-8">
          <SectionHeader title="Support" />
          <div className="bg-[#0A0A0A] border-y border-white/5 lg:border-x lg:rounded-3xl overflow-hidden">
            <SettingLink icon={<HelpCircle className="text-zinc-400"/>} title="Help Center" onClick={() => navigate('/support')} />
            <SettingLink icon={<Eye className="text-zinc-400"/>} title="Privacy Policy" onClick={() => navigate('/privacy')} />
            <SettingLink icon={<Smartphone className="text-zinc-400"/>} title="About Mpade Universe" border={false} onClick={() => navigate('/about')} />
          </div>
        </section>

        {/* --- CACHE & LOGIN --- */}
        <div className="px-5 space-y-4 mt-10">
          <button className="w-full py-4 bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-[2px] transition-all">
            Free up space (Cache: 14.2MB)
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-[11px] font-black uppercase tracking-[2px] text-red-500 transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Log Out
          </button>
          
          <p className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest py-4">
            v2.4.0-Beta • Lilongwe Node
          </p>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const SectionHeader = ({ title }) => (
  <h3 className="px-6 mb-3 text-[10px] font-black text-zinc-500 uppercase tracking-[3px]">
    {title}
  </h3>
);

const SettingLink = ({ icon, title, badge, onClick, border = true }) => (
  <motion.div 
    whileTap={{ backgroundColor: "rgba(255,255,255,0.05)" }}
    onClick={onClick}
    className={`flex items-center justify-between p-5 cursor-pointer group transition-colors ${border ? 'border-b border-white/5' : ''}`}
  >
    <div className="flex items-center gap-4">
      <span className="p-2 bg-black rounded-xl border border-white/5 group-hover:border-white/20 transition-all">
        {icon}
      </span>
      <span className="text-[13px] font-bold text-zinc-200">{title}</span>
    </div>
    <div className="flex items-center gap-3">
      {badge && (
        <span className="text-[10px] font-black text-zinc-500 bg-white/5 px-2 py-1 rounded-md uppercase">
          {badge}
        </span>
      )}
      <ChevronRight size={18} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
    </div>
  </motion.div>
);

const SettingToggle = ({ icon, title, desc, active, onToggle, border = true }) => (
  <div className={`flex items-center justify-between p-5 ${border ? 'border-b border-white/5' : ''}`}>
    <div className="flex items-center gap-4">
      <span className="p-2 bg-black rounded-xl border border-white/5">
        {icon}
      </span>
      <div>
        <h4 className="text-[13px] font-bold text-zinc-200">{title}</h4>
        {desc && <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{desc}</p>}
      </div>
    </div>
    <button 
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-all duration-300 ${active ? 'bg-cyan-500' : 'bg-zinc-800'}`}
    >
      <motion.div 
        animate={{ x: active ? 22 : 4 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
      />
    </button>
  </div>
);

export default SettingsPage;