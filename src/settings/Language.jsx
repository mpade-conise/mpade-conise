import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Search, Info, Languages, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSettings = () => {
  const navigate = useNavigate();
  const { currentLang, updateLanguage, t, loading: contextLoading } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState(currentLang);
  const [saving, setSaving] = useState(false);

  const languages = [
    { id: "en-MW", name: "English", region: "Malawi", local: "English" },
    { id: "ny-MW", name: "Chichewa", region: "Malawi", local: "Chinyanja" },
    { id: "fr-FR", name: "French", region: "France", local: "Français" },
    { id: "pt-MZ", name: "Portuguese", region: "Mozambique", local: "Português" },
    { id: "sw-KE", name: "Swahili", region: "East Africa", local: "Kiswahili" },
    { id: "zh-CN", name: "Chinese", region: "China", local: "简体中文" },
    { id: "ar-SA", name: "Arabic", region: "Saudi Arabia", local: "العربية" },
  ];

  // Sync state cleanly if context finishes loading database targets late
  useEffect(() => {
    setSelectedLang(currentLang);
  }, [currentLang]);

  const handleSave = async () => {
    setSaving(true);
    const success = await updateLanguage(selectedLang);
    setSaving(false);
    if (success) {
      navigate(-1);
    }
  };

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lang.local.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (contextLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-40 selection:bg-cyan-500/30">
      {/* --- NAVIGATION HEADER --- */}
      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full mr-1 transition-all active:scale-95">
            <ChevronLeft size={22} className="text-zinc-400 hover:text-white transition-colors" />
          </button>
          <h1 className="text-xs font-black uppercase tracking-[3px] italic bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            {t('title')}
          </h1>
        </div>
        <div className="p-2 bg-zinc-900 border border-white/5 rounded-xl">
          <Languages size={16} className="text-cyan-400" />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto pt-8 px-4">
        
        {/* --- SEARCH BAR --- */}
        <div className="relative mb-6 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
          <input 
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-zinc-900/80 transition-all placeholder:text-zinc-600 text-zinc-200"
          />
        </div>

        {/* --- LIVE PREVIEW BLANKET --- */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 p-6 rounded-[28px] bg-gradient-to-br from-cyan-500/[0.07] via-purple-500/[0.03] to-transparent border border-cyan-500/10 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400/80">{t('liveTranslator')}</span>
          </div>
          <h2 className="text-xl font-black tracking-tight mb-1 text-zinc-100">
            {saving ? t('syncing') : t('saveChanges')}
          </h2>
          <p className="text-[11px] text-zinc-500">{t('previewDesc')}</p>
        </motion.div>

        {/* --- SELECTABLE LANGUAGE LIST --- */}
        <section className="space-y-2">
          <div className="bg-zinc-900/20 border border-white/5 rounded-[28px] overflow-hidden backdrop-blur-md">
            {filteredLanguages.map((lang, index) => {
              const isSelected = selectedLang === lang.id;
              return (
                <LangItem 
                  key={lang.id}
                  lang={lang} 
                  active={isSelected} 
                  onClick={() => setSelectedLang(lang.id)}
                  border={index !== filteredLanguages.length - 1}
                />
              );
            })}
          </div>
        </section>

        {/* --- SYSTEM CONTEXT LEGAL FOOTER --- */}
        <div className="mt-8 p-5 bg-zinc-900/30 border border-white/[0.06] rounded-[24px] flex gap-4 items-start">
          <Info className="text-zinc-500 shrink-0 mt-0.5" size={16} />
          <p className="text-[11px] text-zinc-500 leading-relaxed tracking-wide">
            {t('infoNotice')}
          </p>
        </div>
      </div>

      {/* --- FIXED INTERACTION DOCK --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-[60] flex justify-center">
        <div className="w-full max-w-2xl">
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4.5 rounded-2xl font-black text-xs uppercase tracking-[3px] shadow-2xl transition-all ${
              saving 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5' 
                : 'bg-white text-black hover:bg-cyan-400 hover:text-black shadow-cyan-500/5'
            }`}
          >
            {saving ? t('syncing') : t('saveChanges')}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const LangItem = ({ lang, active, onClick, border = true }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-5.5 cursor-pointer group transition-all duration-200 ${
      active ? 'bg-cyan-500/[0.04]' : 'hover:bg-white/[0.02]'
    } ${border ? 'border-b border-white/[0.04]' : ''}`}
  >
    <div className="flex flex-col">
      <span className={`text-sm font-bold tracking-tight transition-colors duration-200 ${
        active ? 'text-cyan-400' : 'text-zinc-300 group-hover:text-white'
      }`}>
        {lang.local}
      </span>
      <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-1.5">
        {lang.name} <span className="text-zinc-700 mx-1">•</span> {lang.region}
      </span>
    </div>
    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${
      active ? 'bg-cyan-500 border-cyan-500 scale-105 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-white/20 group-hover:border-white/40'
    }`}>
      {active && <Check size={11} className="text-black stroke-[3.5px]" />}
    </div>
  </div>
);

export default LanguageSettings;
