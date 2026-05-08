import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Palette, Moon, Sun, 
  Zap, Sparkles, Monitor, CheckCircle2, 
  Loader2, Save 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const ThemeSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // UI States (Drafts)
  const [selectedTheme, setSelectedTheme] = useState("neon-glow");
  const [glassEffect, setGlassEffect] = useState(true);
  
  // Initial States (To detect changes)
  const [initialPrefs, setInitialPrefs] = useState({ theme: "", glass: true });

  const themes = [
    { 
      id: "neon-glow", 
      name: "Neon Glow", 
      desc: "Signature Mpade Universe aesthetic", 
      colors: ["#00f2ea", "#ff0050", "#7000ff"],
      icon: <Zap size={20} className="text-cyan-400" />
    },
    { 
      id: "deep-dark", 
      name: "Midnight Black", 
      desc: "Pure black for OLED battery saving", 
      colors: ["#000000", "#111111", "#222222"],
      icon: <Moon size={20} className="text-zinc-400" />
    },
    { 
      id: "cyber-punk", 
      name: "Cyberpunk", 
      desc: "High contrast yellow and purple", 
      colors: ["#f3ec1a", "#7000ff", "#000000"],
      icon: <Sparkles size={20} className="text-yellow-400" />
    }
  ];

  useEffect(() => {
    const fetchTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('selected_theme, glass_effect')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setSelectedTheme(data.selected_theme);
          setGlassEffect(data.glass_effect);
          setInitialPrefs({ theme: data.selected_theme, glass: data.glass_effect });
        }
      }
      setLoading(false);
    };
    fetchTheme();
  }, []);

  // Check if anything has changed to show the Save button
  const hasChanges = selectedTheme !== initialPrefs.theme || glassEffect !== initialPrefs.glass;

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ 
          selected_theme: selectedTheme, 
          glass_effect: glassEffect 
        })
        .eq('id', user.id);

      if (!error) {
        setInitialPrefs({ theme: selectedTheme, glass: glassEffect });
        // Apply Global CSS Logic here if needed
        applyGlobalStyles(selectedTheme);
      } else {
        alert("Error saving preferences: " + error.message);
      }
    }
    setSaving(false);
  };

  const applyGlobalStyles = (themeId) => {
    const root = document.documentElement;
    const colors = {
      'neon-glow': '#00f2ea',
      'cyber-punk': '#f3ec1a',
      'deep-dark': '#ffffff'
    };
    root.style.setProperty('--primary-glow', colors[themeId] || '#ffffff');
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-cyan-500 animate-spin" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      {/* --- HEADER --- */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-5 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-[3px] italic">Visual Theme</h1>
      </nav>

      <div className="max-w-2xl mx-auto pt-6 px-4">
        
        {/* --- PREVIEW MOCKUP --- */}
        <div className="mb-10 flex justify-center">
          <div className={`w-40 h-72 rounded-[32px] border-4 border-zinc-800 relative overflow-hidden transition-all duration-500 ${selectedTheme === 'neon-glow' ? 'shadow-[0_0_40px_rgba(0,242,234,0.2)]' : ''}`}>
            <div className="absolute inset-0 bg-black">
              <div className="p-4 space-y-3">
                <div className={`h-2 w-12 rounded-full ${selectedTheme === 'neon-glow' ? 'bg-cyan-400' : selectedTheme === 'cyber-punk' ? 'bg-yellow-400' : 'bg-zinc-700'}`} />
                <div className={`h-20 w-full rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center ${glassEffect ? 'backdrop-blur-md' : ''}`}>
                   <div className={`w-8 h-8 rounded-full border-2 ${selectedTheme === 'neon-glow' ? 'border-pink-500' : 'border-zinc-700'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- THEME LIST --- */}
        <section className="mb-8">
          <h3 className="px-4 mb-4 text-[10px] font-black text-zinc-500 uppercase tracking-[3px]">Select Experience</h3>
          <div className="space-y-4">
            {themes.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTheme(t.id)}
                className={`p-5 rounded-[24px] border transition-all cursor-pointer flex items-center justify-between ${
                  selectedTheme === t.id 
                  ? 'bg-zinc-900 border-cyan-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)]' 
                  : 'bg-zinc-950 border-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5">{t.icon}</div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">{t.name}</h4>
                    <p className="text-[10px] text-zinc-500">{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- RENDERING SETTINGS --- */}
        <section>
          <h3 className="px-4 mb-4 text-[10px] font-black text-zinc-500 uppercase tracking-[3px]">Rendering</h3>
          <div className="bg-[#0A0A0A] border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Monitor size={18} className="text-zinc-500" />
              <h4 className="text-sm font-bold text-zinc-200">Glassmorphism</h4>
            </div>
            <button 
              onClick={() => setGlassEffect(!glassEffect)}
              className={`w-10 h-5 rounded-full relative transition-all ${glassEffect ? 'bg-cyan-500' : 'bg-zinc-800'}`}
            >
              <motion.div 
                animate={{ x: glassEffect ? 22 : 4 }}
                className="absolute top-1 w-3 h-3 bg-white rounded-full" 
              />
            </button>
          </div>
        </section>
      </div>

      {/* --- FLOATING SAVE ACTION BAR --- */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-0 right-0 px-6 z-50"
          >
            <div className="max-w-md mx-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-full flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <p className="ml-4 text-[10px] font-black uppercase text-zinc-400">Unsaved Changes</p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span className="text-xs font-black uppercase italic">Save</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSettings;