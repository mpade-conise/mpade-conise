import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Moon, Zap, Sparkles, Monitor, Loader2, Save } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeSettings = () => {
  const navigate = useNavigate();
  const { currentTheme, glassEffect, updateGlobalTheme, loading } = useTheme();
  
  // UI States (Drafts before applying)
  const [selectedTheme, setSelectedTheme] = useState("neon-glow");
  const [glassActive, setGlassActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const themes = [
    { 
      id: "neon-glow", 
      name: "Neon Glow", 
      desc: "Signature Mpade Universe aesthetic", 
      colors: ["#00f2ea", "#ff0050", "#7000ff"],
      icon: <Zap size={18} className="text-cyan-400" />
    },
    { 
      id: "deep-dark", 
      name: "Midnight Black", 
      desc: "Pure black for OLED battery saving", 
      colors: ["#ffffff", "#111111", "#222222"],
      icon: <Moon size={18} className="text-zinc-400" />
    },
    { 
      id: "cyber-punk", 
      name: "Cyberpunk", 
      desc: "High contrast yellow and purple", 
      colors: ["#f3ec1a", "#7000ff", "#000000"],
      icon: <Sparkles size={18} className="text-yellow-400" />
    }
  ];

  // Map initial settings when loaded from provider
  useEffect(() => {
    if (!loading) {
      setSelectedTheme(currentTheme);
      setGlassActive(glassEffect);
    }
  }, [currentTheme, glassEffect, loading]);

  const hasChanges = selectedTheme !== currentTheme || glassActive !== glassEffect;

  const handleSave = async () => {
    setSaving(true);
    const success = await updateGlobalTheme(selectedTheme, glassActive);
    setSaving(false);
    if (success) {
      navigate(-1);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-cyan-500 animate-spin" size={28} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      {/* --- HEADER --- */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-5 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2 active:scale-95">
          <ChevronLeft size={22} className="text-zinc-400 hover:text-white" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-[3px] italic bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Visual Theme</h1>
      </nav>

      <div className="max-w-2xl mx-auto pt-8 px-4">
        
        {/* --- LIVE MOCKUP PREVIEW CARD --- */}
        <div className="mb-10 flex justify-center">
          <div className={`w-44 h-76 rounded-[36px] border-4 border-zinc-800 relative overflow-hidden transition-all duration-500 bg-black`}>
            <div className="p-4 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div 
                  className="h-2 w-14 rounded-full transition-colors duration-300" 
                  style={{ backgroundColor: selectedTheme === 'neon-glow' ? '#00f2ea' : selectedTheme === 'cyber-punk' ? '#f3ec1a' : '#ffffff' }}
                />
                <div 
                  className={`h-24 w-full rounded-2xl bg-zinc-900/40 border border-white/5 flex items-center justify-center transition-all duration-300 ${
                    glassActive ? 'backdrop-blur-md bg-white/[0.03]' : ''
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-full border-2 transition-colors duration-300 animate-pulse" 
                    style={{ borderColor: selectedTheme === 'neon-glow' ? '#ff0050' : selectedTheme === 'cyber-punk' ? '#7000ff' : '#444444' }}
                  />
                </div>
              </div>
              <div className="h-8 w-full rounded-xl bg-zinc-900/20 border border-white/5" />
            </div>
          </div>
        </div>

        {/* --- EXPERIENCE THEME LIST --- */}
        <section className="mb-8">
          <h3 className="px-2 mb-4 text-[10px] font-black text-zinc-500 uppercase tracking-[3px]">Select Experience</h3>
          <div className="space-y-3">
            {themes.map((t) => {
              const isSelected = selectedTheme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTheme(t.id)}
                  className={`p-5 rounded-[24px] border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-zinc-900 border-cyan-500/40 shadow-xl' 
                      : 'bg-zinc-950 border-white/5 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-black rounded-xl flex items-center justify-center border border-white/5">{t.icon}</div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200">{t.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- PERFORMANCE / RENDERING SETTINGS --- */}
        <section>
          <h3 className="px-2 mb-4 text-[10px] font-black text-zinc-500 uppercase tracking-[3px]">Rendering</h3>
          <div className="bg-[#0A0A0A] border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Monitor size={16} className="text-zinc-500" />
              <h4 className="text-sm font-bold text-zinc-200">Glassmorphism</h4>
            </div>
            <button 
              onClick={() => setGlassActive(!glassActive)}
              className={`w-10 h-5 rounded-full relative transition-all duration-300 ${glassActive ? 'bg-cyan-500' : 'bg-zinc-800'}`}
            >
              <motion.div 
                animate={{ x: glassActive ? 22 : 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute top-1 w-3 h-3 bg-white rounded-full" 
              />
            </button>
          </div>
        </section>
      </div>

      {/* --- FLOATING ACTION NOTIFICATION DOCK --- */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-8 left-0 right-0 px-6 z-50"
          >
            <div className="max-w-md mx-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-3.5 pl-6 rounded-full flex items-center justify-between shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Unsaved Customizations</p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-white hover:bg-cyan-400 text-black px-6 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span className="text-xs font-black uppercase tracking-wider italic">Save</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSettings;
