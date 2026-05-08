import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, MessageSquare, Heart, 
  UserPlus, Gift, Volume2, Smartphone, 
  Moon, Loader2, Save
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Current UI State
  const [prefs, setPrefs] = useState({
    likes: true,
    comments: true,
    new_followers: true,
    mentions: true,
    direct_messages: true,
    live_streams: true,
    gifts: true,
    quiet_mode: false
  });

  // Tracking original state to show/hide save button
  const [initialPrefs, setInitialPrefs] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          // Exclude database metadata from our state
          const { user_id, id, created_at, ...purePrefs } = data;
          setPrefs(purePrefs);
          setInitialPrefs(purePrefs);
        } else {
          // Initialize for new users
          await supabase.from('notification_settings').insert({ user_id: user.id });
          setInitialPrefs(prefs);
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const hasChanges = JSON.stringify(prefs) !== JSON.stringify(initialPrefs);

  const togglePref = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveToDatabase = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('notification_settings')
        .update(prefs)
        .eq('user_id', user.id);

      if (!error) {
        setInitialPrefs(prefs);
      } else {
        alert("Failed to sync settings: " + error.message);
      }
    }
    setSaving(false);
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
        <h1 className="text-sm font-black uppercase tracking-[3px] italic">Notifications</h1>
      </nav>

      <div className="max-w-2xl mx-auto pt-6 px-4">
        
        {/* --- MASTER QUIET MODE --- */}
        <section className="mb-8">
          <div className="p-6 rounded-[32px] bg-zinc-900/40 border border-white/5 backdrop-blur-md">
            <NotifyToggle 
              icon={<Moon className={prefs.quiet_mode ? "text-purple-400" : "text-zinc-500"} size={20}/>} 
              title="Quiet Mode" 
              desc="Mute all notifications temporarily"
              active={prefs.quiet_mode}
              onToggle={() => togglePref('quiet_mode')}
              border={false}
            />
          </div>
        </section>

        {/* --- INTERACTIONS --- */}
        <section className="mb-8">
          <SectionHeader title="Interactions" />
          <div className="bg-[#0A0A0A] border border-white/5 rounded-[24px] overflow-hidden">
            <NotifyToggle 
              icon={<Heart className="text-pink-500" size={18}/>} 
              title="Likes" 
              active={prefs.likes}
              onToggle={() => togglePref('likes')}
            />
            <NotifyToggle 
              icon={<MessageSquare className="text-cyan-400" size={18}/>} 
              title="Comments" 
              active={prefs.comments}
              onToggle={() => togglePref('comments')}
            />
            <NotifyToggle 
              icon={<UserPlus className="text-blue-400" size={18}/>} 
              title="New Followers" 
              active={prefs.new_followers}
              onToggle={() => togglePref('new_followers')}
              border={false}
            />
          </div>
        </section>

        {/* --- REVENUE --- */}
        <section className="mb-8">
          <SectionHeader title="Messages & Revenue" />
          <div className="bg-[#0A0A0A] border border-white/5 rounded-[24px] overflow-hidden">
            <NotifyToggle 
              icon={<MessageSquare className="text-emerald-400" size={18}/>} 
              title="Direct Messages" 
              active={prefs.direct_messages}
              onToggle={() => togglePref('direct_messages')}
            />
            <NotifyToggle 
              icon={<Gift className="text-orange-400" size={18}/>} 
              title="Gifts & Tips" 
              desc="Alerts for earning coins"
              active={prefs.gifts}
              onToggle={() => togglePref('gifts')}
              border={false}
            />
          </div>
        </section>

        {/* --- FEEDBACK --- */}
        <section className="mb-8">
          <SectionHeader title="System Style" />
          <div className="bg-[#0A0A0A] border border-white/5 rounded-[24px] overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-4">
                <Volume2 size={18} className="text-zinc-500" />
                <span className="text-sm font-bold text-zinc-200">In-App Sound</span>
              </div>
              <div className="text-[10px] font-black text-cyan-500 uppercase px-3 py-1 bg-cyan-500/10 rounded-lg">Enabled</div>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Smartphone size={18} className="text-zinc-500" />
                <span className="text-sm font-bold text-zinc-200">Haptic Feedback</span>
              </div>
              <div className="text-[10px] font-black text-cyan-500 uppercase px-3 py-1 bg-cyan-500/10 rounded-lg">Enabled</div>
            </div>
          </div>
        </section>
      </div>

      {/* --- SAVE ACTION BAR --- */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-0 right-0 px-6 z-50"
          >
            <div className="max-w-md mx-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-full flex items-center justify-between shadow-2xl">
              <p className="ml-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Sync settings?</p>
              <button
                onClick={saveToDatabase}
                disabled={saving}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-full flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span className="text-xs font-black uppercase italic">Save</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- COMPONENTS ---

const SectionHeader = ({ title }) => (
  <h3 className="px-4 mb-3 text-[10px] font-black text-zinc-500 uppercase tracking-[3px]">
    {title}
  </h3>
);

const NotifyToggle = ({ icon, title, desc, active, onToggle, border = true }) => (
  <div className={`flex items-center justify-between p-5 ${border ? 'border-b border-white/5' : ''}`}>
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-black rounded-xl border border-white/5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-200">{title}</h4>
        {desc && <p className="text-[10px] text-zinc-500">{desc}</p>}
      </div>
    </div>
    <button 
      onClick={onToggle}
      className={`w-10 h-5 rounded-full relative transition-all duration-300 ${active ? 'bg-cyan-500' : 'bg-zinc-800'}`}
    >
      <motion.div 
        animate={{ x: active ? 22 : 4 }}
        className="absolute top-1 w-3 h-3 bg-white rounded-full"
      />
    </button>
  </div>
);

export default NotificationSettings;