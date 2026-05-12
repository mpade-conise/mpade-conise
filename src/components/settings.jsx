import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, User, ShieldCheck, Bell, Lock, 
  Eye, Globe, Smartphone, HelpCircle, LogOut, 
  ChevronRight, Wallet, Palette, Share2, Database,
  Zap, Languages
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [dataSaver, setDataSaver] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate('/');
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-cyan-500/30">
      {/* --- PREMIUM HEADER --- */}
      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/[0.03] px-6 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)} 
            className="p-2.5 hover:bg-white/5 rounded-full transition-colors mr-3 border border-white/5"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <h1 className="text-xs font-black uppercase tracking-[4px] text-zinc-400">Settings</h1>
        </div>
        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
      </nav>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto pt-8 px-4 lg:px-0"
      >
        {/* --- SECTION: ACCOUNT --- */}
        <SettingsSection title="Profile & Financials" variants={itemVariants}>
          <SettingLink 
            icon={<User size={18} className="text-cyan-400"/>} 
            title="Account Information" 
            onClick={() => navigate('/edit-profile')} 
          />
          <SettingLink 
            icon={<Lock size={18} className="text-purple-400"/>} 
            title="Security Center" 
            onClick={() => navigate('/settings/security')} 
          />
          <SettingLink 
            icon={<Wallet size={18} className="text-emerald-400"/>} 
            title="Creator Balance" 
            badge="MK 45,000" 
            onClick={() => navigate('/payouts')} 
          />
          <SettingLink 
            icon={<Share2 size={18} className="text-blue-400"/>} 
            title="Share Profile" 
            isLast 
            onClick={() => navigate('/profile')} 
          />
        </SettingsSection>

        {/* --- SECTION: PREFERENCES --- */}
        <SettingsSection title="Experience" variants={itemVariants}>
          <SettingLink 
            icon={<Bell size={18} className="text-red-400"/>} 
            title="Notifications" 
            onClick={() => navigate('/settings/notifications')} 
          />
          <SettingLink 
            icon={<Languages size={18} className="text-amber-400"/>} 
            title="Language" 
            badge="English" 
            onClick={() => navigate('/settings/language')} 
          />
          <SettingLink 
            icon={<Palette size={18} className="text-pink-400"/>} 
            title="Interface Theme" 
            badge="Neon" 
            onClick={() => navigate('/settings/theme')} 
          />
          <SettingToggle 
            icon={<Database size={18} className="text-orange-400"/>} 
            title="Data Saver" 
            desc="Optimizes video streaming for Malawian networks" 
            active={dataSaver} 
            onToggle={() => setDataSaver(!dataSaver)}
            isLast
          />
        </SettingsSection>

        {/* --- SECTION: CREATOR --- */}
        <SettingsSection title="Mpade Universe Tools" variants={itemVariants}>
          <SettingLink 
            icon={<Zap size={18} className="text-cyan-400"/>} 
            title="Creator Analytics" 
            onClick={() => navigate('/universe-tools')} 
          />
          <SettingLink 
            icon={<Globe size={18} className="text-indigo-400"/>} 
            title="Live Stream Center" 
            onClick={() => navigate('/live-universe')} 
          />
          <SettingLink 
            icon={<ShieldCheck size={18} className="text-blue-500"/>} 
            title="Intellectual Property" 
            isLast 
            onClick={() => navigate('/settings/copyright')} 
          />
        </SettingsSection>

        {/* --- SECTION: SUPPORT --- */}
        <SettingsSection title="Legal & Help" variants={itemVariants}>
          <SettingLink icon={<HelpCircle size={18} className="text-zinc-400"/>} title="Help Center" onClick={() => navigate('/support')} />
          <SettingLink icon={<Eye size={18} className="text-zinc-400"/>} title="Privacy Policy" onClick={() => navigate('/privacy')} />
          <SettingLink icon={<Smartphone size={18} className="text-zinc-400"/>} title="About App" isLast onClick={() => navigate('/about')} />
        </SettingsSection>

        {/* --- ACTION GROUP --- */}
        <motion.div variants={itemVariants} className="space-y-4 mt-12 pb-10">
          <button className="w-full py-4 bg-zinc-900/30 hover:bg-zinc-900/60 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[3px] text-zinc-400 transition-all active:scale-[0.98]">
            Clear Cache (14.2 MB)
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[3px] text-red-500 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <LogOut size={14} />
            Terminate Session
          </button>
          
          <div className="text-center pt-4">
             <p className="text-zinc-700 text-[9px] font-black uppercase tracking-[4px]">
               Build 2.4.0 • Distributed by Lilongwe Node
             </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- REUSABLE COMPONENTS ---

const SettingsSection = ({ title, children, variants }) => (
  <motion.section variants={variants} className="mb-10">
    <h3 className="px-5 mb-4 text-[9px] font-black text-zinc-500 uppercase tracking-[4px]">
      {title}
    </h3>
    <div className="bg-zinc-900/20 border border-white/[0.04] rounded-[32px] overflow-hidden backdrop-blur-sm">
      {children}
    </div>
  </motion.section>
);

const SettingLink = ({ icon, title, badge, onClick, isLast }) => (
  <motion.div 
    whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
    whileTap={{ scale: 0.995 }}
    onClick={onClick}
    className={`flex items-center justify-between p-5 cursor-pointer group transition-all ${!isLast ? 'border-b border-white/[0.03]' : ''}`}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-black rounded-2xl border border-white/[0.05] flex items-center justify-center group-hover:border-cyan-500/30 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
        {icon}
      </div>
      <span className="text-[14px] font-medium text-zinc-200 group-hover:text-white transition-colors">{title}</span>
    </div>
    <div className="flex items-center gap-3">
      {badge && (
        <span className="text-[9px] font-black text-cyan-500/80 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
    </div>
  </motion.div>
);

const SettingToggle = ({ icon, title, desc, active, onToggle, isLast }) => (
  <div className={`flex items-center justify-between p-5 ${!isLast ? 'border-b border-white/[0.03]' : ''}`}>
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-black rounded-2xl border border-white/[0.05] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="text-[14px] font-medium text-zinc-200">{title}</h4>
        {desc && <p className="text-[10px] text-zinc-500 font-medium leading-tight mt-1 max-w-[200px]">{desc}</p>}
      </div>
    </div>
    <button 
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-all duration-500 ${active ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-zinc-800'}`}
    >
      <motion.div 
        animate={{ 
          x: active ? 26 : 4,
          backgroundColor: active ? "#ffffff" : "#a1a1aa"
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full shadow-md"
      />
    </button>
  </div>
);

export default SettingsPage;
