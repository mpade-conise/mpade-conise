import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Check, Search, Info, Languages, Sparkles, Loader2 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- CONFIGURATION ---
const LANGUAGES = [
  { id: "en-MW", name: "English", region: "Malawi", local: "English", code: "en" },
  { id: "ny-MW", name: "Chichewa", region: "Malawi", local: "Chinyanja", code: "ny" },
  { id: "fr-FR", name: "French", region: "France", local: "Français", code: "fr" },
  { id: "pt-MZ", name: "Portuguese", region: "Mozambique", local: "Português", code: "pt" },
  { id: "sw-KE", name: "Swahili", region: "East Africa", local: "Kiswahili", code: "sw" },
  { id: "zh-CN", name: "Chinese", region: "China", local: "简体中文", code: "zh" },
  { id: "ar-SA", name: "Arabic", region: "Saudi Arabia", local: "العربية", code: "ar" },
];

const LanguageSettings = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState("en-MW");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // UI Labels that need immediate translation preview
  const [uiLabels, setUiLabels] = useState({
    title: "Universe Language",
    saveBtn: "Save Changes",
    searchPlaceholder: "Search all languages...",
    infoText: "Choosing a new language triggers an automated sync across your Mpade Universe profile."
  });

  // --- GLOBAL API SIMULATION / i18next INTEGRATION ---
  const translateInterface = useCallback(async (targetCode) => {
    // In production: await i18n.changeLanguage(targetCode);
    const dictionary = {
      en: { title: "Universe Language", saveBtn: "Save Changes", search: "Search languages...", info: "Choosing a new language triggers an automated sync." },
      ny: { title: "Chilangu m'chilengedwe", saveBtn: "Sungani Kusintha", search: "Sakasaka zilankhulo...", info: "Kusankha chilankhulo chatsopano kumasintha mbiri yanu." },
      fr: { title: "Langue de l'Univers", saveBtn: "Enregistrer", search: "Rechercher...", info: "Le choix d'une langue déclenche une synchronisation." },
      // ... Add others as needed
    };

    const translation = dictionary[targetCode] || dictionary['en'];
    setUiLabels({
      title: translation.title,
      saveBtn: translation.saveBtn,
      searchPlaceholder: translation.search,
      infoText: translation.info
    });
  }, []);

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
          const langObj = LANGUAGES.find(l => l.id === data.app_language);
          if (langObj) translateInterface(langObj.code);
        }
      }
      setLoading(false);
    };
    fetchUserLanguage();
  }, [translateInterface]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_preferences')
        .upsert({ id: user.id, app_language: selectedLang });

      if (!error) {
        // Optimized: Only reload if your global i18n provider 
        // doesn't support hot-swapping.
        window.location.reload(); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lang.local.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-40 selection:bg-cyan-500/30">
      {/* --- HEADER --- */}
      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-4 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full mr-2 transition-all">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[3px] italic">{uiLabels.title}</h1>
        </div>
        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Languages size={16} className="text-cyan-500" />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto pt-6 px-4">
        
        {/* --- SEARCH BAR --- */}
        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder={uiLabels.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/30 border border-white/10 rounded-[24px] py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-zinc-900/60 transition-all placeholder:text-zinc-600"
          />
        </div>

        {/* --- PREVIEW CARD --- */}
        <motion.div 
          layout
          className="mb-8 p-6 rounded-[32px] bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 border border-white/10 relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System API Active</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.h2 
              key={selectedLang}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="text-2xl font-black italic"
            >
              {uiLabels.saveBtn}
            </motion.h2>
          </AnimatePresence>
        </motion.div>

        {/* --- LANGUAGE LIST --- */}
        <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-md">
          {filteredLanguages.map((lang, index) => (
            <LangItem 
              key={lang.id}
              lang={lang} 
              active={selectedLang === lang.id} 
              onClick={() => {
                setSelectedLang(lang.id);
                translateInterface(lang.code);
              }}
              border={index !== filteredLanguages.length - 1}
            />
          ))}
        </div>

        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-[32px] flex gap-4">
          <Info className="text-zinc-500 shrink-0" size={20} />
          <p className="text-[11px] text-zinc-500 leading-relaxed italic">
            {uiLabels.infoText} <span className="text-cyan-400">Mpade Universe</span> profile logic.
          </p>
        </div>
      </div>

      {/* --- ACTION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/90 to-transparent z-[60]">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-[3px] shadow-2xl transition-all flex items-center justify-center gap-3 ${
            saving ? 'bg-zinc-800 text-zinc-600' : 'bg-cyan-500 text-black shadow-cyan-500/20'
          }`}
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saving ? 'Syncing...' : uiLabels.saveBtn}
        </motion.button>
      </div>
    </div>
  );
};

const LangItem = ({ lang, active, onClick, border }) => (
  <motion.div 
    onClick={onClick}
    className={`flex items-center justify-between p-6 cursor-pointer group transition-all ${active ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'} ${border ? 'border-b border-white/5' : ''}`}
  >
    <div className="flex flex-col">
      <span className={`text-sm font-black tracking-tight transition-colors ${active ? 'text-cyan-400' : 'text-zinc-200 group-hover:text-white'}`}>
        {lang.local}
      </span>
      <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter mt-1">
        {lang.name} • {lang.region}
      </span>
    </div>
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-cyan-500 border-cyan-500 scale-110' : 'border-white/10'}`}>
      {active && <Check size={12} className="text-black stroke-[4px]" />}
    </div>
  </motion.div>
);

export default LanguageSettings;
