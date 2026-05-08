import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Settings, Lock, Globe, MessageSquare, ShieldCheck, 
  Zap, Save, ChevronRight, Gift, Tag, Users, AlertCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StreamSettings = ({ streamId, onClose }) => {
  const [settings, setSettings] = useState({
    title: "",
    category: "General",
    is_private: false,
    chat_enabled: true,
    slow_mode: 0, // 0, 5, 10, 30 seconds
    gifts_enabled: true,
    followers_only_chat: false,
    latency_mode: "normal",
    moderation_level: "standard"
  });
  
  const [originalSettings, setOriginalSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('*')
        .eq('id', streamId)
        .single();
      
      if (data) {
        const loaded = {
          title: data.title || "",
          category: data.category || "General",
          is_private: data.is_private || false,
          chat_enabled: data.chat_enabled ?? true,
          slow_mode: data.slow_mode || 0,
          gifts_enabled: data.gifts_enabled ?? true,
          followers_only_chat: data.followers_only_chat || false,
          latency_mode: data.latency_mode || "normal",
          moderation_level: data.moderation_level || "standard"
        };
        setSettings(loaded);
        setOriginalSettings(loaded);
      }
    };
    fetchSettings();
  }, [streamId]);

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('live_streams')
      .update(settings)
      .eq('id', streamId);

    if (!error) {
      setOriginalSettings(settings);
      setTimeout(() => setSaving(false), 800);
    } else {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-white/10 shadow-2xl w-full max-w-md ml-auto">
      {/* --- HEADER --- */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-[#fe2c55]" />
          <h3 className="text-xs font-black uppercase tracking-widest">Live Dashboard</h3>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500"><X size={20}/></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
        
        {/* SECTION: DISCOVERY */}
        <div className="space-y-4">
          <SectionHeader icon={<Tag size={14}/>} title="Broadcast Info" />
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-500 uppercase">Stream Title</p>
              <input 
                type="text"
                value={settings.title}
                onChange={(e) => setSettings({...settings, title: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#fe2c55] outline-none"
                placeholder="What are we doing today?"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-500 uppercase">Category</p>
              <select 
                value={settings.category}
                onChange={(e) => setSettings({...settings, category: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none appearance-none"
              >
                <option value="General">General</option>
                <option value="Gaming">Gaming</option>
                <option value="Music">Music</option>
                <option value="Education">Education</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION: INTERACTION */}
        <div className="space-y-4">
          <SectionHeader icon={<MessageSquare size={14}/>} title="Community & Chat" />
          <ToggleSwitch 
            label="Live Chat"
            description="Allow audience to message"
            checked={settings.chat_enabled}
            onChange={(val) => setSettings({...settings, chat_enabled: val})}
          />
          <ToggleSwitch 
            label="Followers Only"
            description="Must follow to participate"
            checked={settings.followers_only_chat}
            onChange={(val) => setSettings({...settings, followers_only_chat: val})}
          />
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-xs font-bold mb-3">Slow Mode</p>
            <div className="flex gap-2">
              {[0, 5, 10, 30].map(s => (
                <button 
                  key={s}
                  onClick={() => setSettings({...settings, slow_mode: s})}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${
                    settings.slow_mode === s ? 'bg-[#fe2c55] border-[#fe2c55]' : 'bg-zinc-800 border-transparent text-zinc-500'
                  }`}
                >
                  {s === 0 ? 'OFF' : `${s}s`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION: MONETIZATION */}
        <div className="space-y-4">
          <SectionHeader icon={<Gift size={14}/>} title="Monetization" />
          <ToggleSwitch 
            label="Enable Gifts"
            description="Allow viewers to send coins"
            checked={settings.gifts_enabled}
            onChange={(val) => setSettings({...settings, gifts_enabled: val})}
          />
        </div>

        {/* SECTION: SECURITY */}
        <div className="space-y-4">
          <SectionHeader icon={<ShieldCheck size={14}/>} title="Safety" />
          <div className="grid grid-cols-2 gap-3">
             <OptionCard 
               selected={settings.is_private}
               onClick={() => setSettings({...settings, is_private: true})}
               icon={<Lock size={16}/>}
               label="Followers Only"
             />
             <OptionCard 
               selected={!settings.is_private}
               onClick={() => setSettings({...settings, is_private: false})}
               icon={<Globe size={16}/>}
               label="Public"
             />
          </div>
        </div>
      </div>

      {/* --- FOOTER SAVE BAR --- */}
      <AnimatePresence>
        {isDirty && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="p-6 bg-zinc-900 border-t border-white/10"
          >
            <button 
              onClick={handleUpdate}
              disabled={saving}
              className="w-full bg-[#fe2c55] hover:bg-[#ef294d] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(254,44,85,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18}/>}
              {saving ? 'Syncing...' : 'Save Changes'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- HELPERS ---

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2 text-[#fe2c55]">
    {icon}
    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</span>
  </div>
);

const ToggleSwitch = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-colors">
    <div>
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="text-[10px] text-zinc-500 font-medium">{description}</p>
    </div>
    <button 
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#fe2c55]' : 'bg-zinc-700'}`}
    >
      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
);

const OptionCard = ({ selected, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
      selected 
      ? 'bg-[#fe2c55]/10 border-[#fe2c55] text-white' 
      : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/10'
    }`}
  >
    {icon}
    <span className="text-[10px] font-black uppercase">{label}</span>
  </button>
);

export default StreamSettings;