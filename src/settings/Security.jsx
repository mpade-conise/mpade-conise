import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Fingerprint, 
  Smartphone, KeyRound, History, AlertTriangle,
  ChevronRight, CheckCircle2, Loader2, ShieldCheck, 
  Zap, Globe, Lock, ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const SecuritySettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [twoFactor, setTwoFactor] = useState(false);
  const [securityScore, setSecurityScore] = useState(0); 
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    fetchSecurityState();
  }, []);

  const fetchSecurityState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser) {
      setUser(currentUser);
      setSessionInfo(session);
      
      // Real fetch from your preferences table
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('two_factor_enabled')
        .eq('id', currentUser.id)
        .maybeSingle();

      // Simulation of a deep system scan
      setTimeout(() => {
        const is2FA = prefs?.two_factor_enabled || false;
        setTwoFactor(is2FA);
        setSecurityScore(is2FA ? 98 : 65);
        setScanning(false);
      }, 1200);
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      alert(`Security link sent to ${user.email}`);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleToggle2FA = async () => {
    const nextValue = !twoFactor;
    setTwoFactor(nextValue); 

    const { error } = await supabase
      .from('user_preferences')
      .upsert({ id: user.id, two_factor_enabled: nextValue });

    if (error) {
      setTwoFactor(!nextValue); 
      alert("Database Sync Failed");
    } else {
      setSecurityScore(nextValue ? 98 : 65);
    }
  };

  const handleLogoutAll = async () => {
    const confirm = window.confirm("Terminate all active Mpade Universe sessions?");
    if (confirm) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <Loader2 className="text-cyan-500" size={32} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-10 overflow-x-hidden">
      {/* --- FX BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>

      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-4 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[3px] italic text-zinc-400">Security Center</h1>
        </div>
        <div className="bg-zinc-900 px-3 py-1 rounded-full border border-white/10">
           <p className="text-[9px] font-black text-cyan-400 uppercase">Live Shield Active</p>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto pt-6 px-4 relative z-10">
        
        {/* --- SCORE CARD --- */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-8 rounded-[40px] bg-zinc-900/40 border border-white/10 backdrop-blur-md overflow-hidden relative"
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-zinc-500 mb-1">Protection Level</p>
              <h2 className="text-3xl font-black italic">
                {securityScore >= 90 ? 'ULTRA' : 'STANDARD'}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-2 bg-black/40 p-2 rounded-lg border border-white/5 inline-block">
                UUID: {user?.id.slice(0, 18)}...
              </p>
            </div>
            
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                <motion.circle 
                  cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 - (251.2 * securityScore) / 100 }}
                  className={securityScore >= 90 ? "text-cyan-500" : "text-orange-500 shadow-lg"}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-black text-xl italic">{securityScore}%</span>
            </div>
          </div>
        </motion.div>

        {/* --- ACTIONS --- */}
        <section className="mb-8">
          <SectionHeader title="Authorization" />
          <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] overflow-hidden">
            <SecurityItem 
              icon={<KeyRound className="text-cyan-400" size={20}/>} 
              title="Reset Password" 
              desc="Sends secure link to your Gmail"
              onClick={handlePasswordReset}
            />
            <SecurityToggle 
              icon={<Smartphone className="text-green-400" size={20}/>} 
              title="Two-Factor (2FA)" 
              desc="Verify login via secure preferences"
              active={twoFactor}
              onToggle={handleToggle2FA}
              border={false}
            />
          </div>
        </section>

        {/* --- REAL DEVICE INFO --- */}
        <section className="mb-8">
          <SectionHeader title="Authenticated Devices" />
          <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] p-2">
            <DeviceItem 
              device={sessionInfo?.user?.app_metadata?.provider || "Web Browser"} 
              location="Current Session" 
              status="Active" 
              isCurrent 
            />
          </div>
          <button 
            onClick={handleLogoutAll}
            className="w-full mt-6 py-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-[10px] font-black uppercase text-red-500/60 tracking-[4px] hover:bg-red-500 hover:text-white transition-all"
          >
            Force Global Logout
          </button>
        </section>

        <div className="p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-[24px] flex gap-5">
          <ShieldAlert className="text-cyan-500 shrink-0" size={20} />
          <p className="text-[10px] text-zinc-500 leading-relaxed uppercase">
            Your security settings are synced with the <span className="text-white">Supabase Auth Edge</span>. Changes apply instantly across the Universe.
          </p>
        </div>

      </div>
    </div>
  );
};

// Reusable Sub-components
const SectionHeader = ({ title }) => (
  <h3 className="px-6 mb-4 text-[10px] font-black text-zinc-600 uppercase tracking-[4px]">{title}</h3>
);

const SecurityItem = ({ icon, title, desc, onClick, border = true }) => (
  <div onClick={onClick} className={`flex items-center justify-between p-6 hover:bg-white/5 cursor-pointer ${border ? 'border-b border-white/5' : ''}`}>
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-black rounded-2xl border border-white/10 flex items-center justify-center">{icon}</div>
      <div>
        <h4 className="text-sm font-black text-zinc-100 italic">{title}</h4>
        <p className="text-[10px] text-zinc-500 tracking-tighter">{desc}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-zinc-700" />
  </div>
);

const SecurityToggle = ({ icon, title, desc, active, onToggle, border = true }) => (
  <div className={`flex items-center justify-between p-6 ${border ? 'border-b border-white/5' : ''}`}>
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-black rounded-2xl border border-white/10 flex items-center justify-center">{icon}</div>
      <div>
        <h4 className="text-sm font-black text-zinc-100 italic">{title}</h4>
        <p className="text-[10px] text-zinc-500 tracking-tighter">{desc}</p>
      </div>
    </div>
    <button onClick={onToggle} className={`w-12 h-6 rounded-full relative transition-all duration-300 ${active ? 'bg-cyan-500' : 'bg-zinc-800'}`}>
      <motion.div animate={{ x: active ? 26 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" />
    </button>
  </div>
);

const DeviceItem = ({ device, location, status, isCurrent }) => (
  <div className="flex items-center justify-between p-5 bg-black/20 rounded-[24px]">
    <div className="flex gap-5 items-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <Smartphone size={20} />
      </div>
      <div>
        <h4 className="text-sm font-black text-zinc-200 uppercase">{device}</h4>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{location} • <span className="text-cyan-400">{status}</span></p>
      </div>
    </div>
    {isCurrent && <CheckCircle2 size={18} className="text-cyan-500" />}
  </div>
);

export default SecuritySettings;