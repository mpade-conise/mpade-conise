import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Check, Search, Info, Languages, Sparkles
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const LanguageSettings = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState("en-MW");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translatedLabel, setTranslatedLabel] = useState("Save Changes");

  const languages = [
    { id: "en-MW", name: "English", region: "Malawi", local: "English", code: "en" },
    { id: "ny-MW", name: "Chichewa", region: "Malawi", local: "Chinyanja", code: "ny" },
    { id: "fr-FR", name: "French", region: "France", local: "Français", code: "fr" },
    { id: "pt-MZ", name: "Portuguese", region: "Mozambique", local: "Português", code: "pt" },
    { id: "sw-KE", name: "Swahili", region: "East Africa", local: "Kiswahili", code: "sw" },
    { id: "zh-CN", name: "Chinese", region: "China", local: "简体中文", code: "zh" },
    { id: "ar-SA", name: "Arabic", region: "Saudi Arabia", local: "العربية", code: "ar" },
  ];

  // --- ONLINE TRANSLATOR LOGIC ---
  const translateInterface = async (targetCode) => {
    // Note: In a real production environment, you would call your 
    // backend or a service like Google Translate API here.
    const mockTranslations = {
      en: "Save Changes",
      ny: "Sungani Kusintha",
      fr: "Enregistrer les modifications",
      pt: "Salvar alterações",
      sw: "Hifadhi mabadiliko",
      zh: "保存更改",
      ar: "حفظ التغييرات"
    };
    
    setTranslatedLabel(mockTranslations[targetCode] || "Save Changes");
  };

  useEffect(() => {
    const fetchUserLanguage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('app_language')
          .eq('id', user.id)
          .maybeSingle();

        if (data?.app_language) {
          setSelectedLang(data.app_language);
          const langObj = languages.find(l => l.id === data.app_language);
          if (langObj) translateInterface(langObj.code);
        }
      }
      setLoading(false);
    };

    fetchUserLanguage();
  }, []);

  const handleLangChange = (lang) => {
    setSelectedLang(lang.id);
    translateInterface(lang.code);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ app_language: selectedLang })
        .eq('id', user.id);

      if (!error) {
        // Trigger a global state refresh or reload if using i18n
        window.location.reload(); 
        navigate(-1);
      }
    }
    setSaving(false);
  };

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lang.local.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-40">
      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-4 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full mr-2 transition-all">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[3px] italic">Universe Language</h1>
        </div>
        <Languages size={18} className="text-cyan-500 mr-2" />
      </nav>

      <div className="max-w-2xl mx-auto pt-6 px-4">
        
        {/* --- SEARCH BAR --- */}
        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search all languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/30 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-zinc-900/60 transition-all"
          />
        </div>

        {/* --- DYNAMIC PREVIEW CARD --- */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-[32px] bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/10 relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Translator Active</span>
          </div>
          <h2 className="text-2xl font-black italic mb-1">{translatedLabel}</h2>
          <p className="text-[10px] text-zinc-500">Previewing UI labels for your selection.</p>
        </motion.div>

        {/* --- LIST --- */}
        <section>
          <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-md">
            {filteredLanguages.map((lang, index) => (
              <LangItem 
                key={lang.id}
                lang={lang} 
                active={selectedLang === lang.id} 
                onClick={() => handleLangChange(lang)}
                border={index !== filteredLanguages.length - 1}
              />
            ))}
          </div>
        </section>

        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-[32px] flex gap-4">
          <Info className="text-zinc-500 shrink-0" size={20} />
          <p className="text-[11px] text-zinc-500 leading-relaxed italic">
            Choosing a new language triggers an automated sync across your <span className="text-cyan-400">Mpade Universe</span> profile. Content generated by AI remains in its source language.
          </p>
        </div>

      </div>

      {/* --- FIXED APPLY BUTTON --- */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/90 to-transparent z-[60]">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-[3px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all ${
            saving ? 'bg-zinc-800 text-zinc-600' : 'bg-cyan-500 text-black hover:bg-cyan-400'
          }`}
        >
          {saving ? 'Syncing...' : translatedLabel}
        </motion.button>
      </div>
    </div>
  );
};

const LangItem = ({ lang, active, onClick, border = true }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-6 cursor-pointer group transition-all ${active ? 'bg-cyan-500/5' : 'hover:bg-white/[0.02]'} ${border ? 'border-b border-white/5' : ''}`}
  >
    <div className="flex flex-col">
      <span className={`text-sm font-black tracking-tight transition-colors ${active ? 'text-cyan-400' : 'text-zinc-200 group-hover:text-white'}`}>
        {lang.local}
      </span>
      <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter mt-1">
        {lang.name} • {lang.region}
      </span>
    </div>
    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${active ? 'bg-cyan-500 border-cyan-500' : 'border-white/10'}`}>
      {active && <Check size={14} className="text-black stroke-[4px]" />}
    </div>
  </div>
);

export default LanguageSettings;