import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, MapPin, User, Zap, Mail, Lock, LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

const Auth = () => {
  const [mode, setMode] = useState('signup'); // 'signup' or 'login'
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', username: '', email: '', password: '', bio: '', district: '', interests: []
  });

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const interestOptions = ["Music", "Comedy", "Chewa Culture", "Tech", "Football", "Business", "Fashion", "Lake Vibes"];
  const districts = ["Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Mangochi", "Salima", "Nkhotakota", "Other"];

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  // --- LOGIN LOGIC ---
  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      
      alert("Welcome back to the Universe!");
      // window.location.href = '/feed'; 
    } catch (error) {
      alert("Login Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SIGN UP LOGIC (UNTOUCHED) ---
  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            bio: formData.bio,
            district: formData.district,
            interests: formData.interests 
          })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;
        alert("Takulandirani! Your profile is ready.");
      }
    } catch (error) {
      alert("Registration Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6 overflow-hidden relative font-sans">
      
      {/* Background Neon Blobs */}
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-600/30 rounded-full blur-[140px] pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[140px] pointer-events-none" />

      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-lg bg-zinc-950/70 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] relative z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[3px] bg-red-500 shadow-[0_0_25px_#ef4444]" />

        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-r from-white via-red-400 to-red-600 bg-clip-text text-transparent uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
              {mode === 'signup' ? 'Progress' : 'Welcome'}
            </h1>
            <p className="text-red-400/80 text-xs font-bold tracking-[0.2em] mt-1 uppercase drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">Mpade Universe</p>
          </div>
          {mode === 'signup' && (
            <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-[10px] text-red-400 font-black tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)]">STEP {step} / 3</div>
          )}
        </div>

        <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.div key="login" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <p className="text-zinc-400 text-sm font-bold mb-4 italic opacity-80">Sign in to continue your journey...</p>
                <div className="relative group">
                  <Mail className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-red-400 group-focus-within:drop-shadow-[0_0_8px_#ef4444] transition-all" size={20} />
                  <input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} type="email" placeholder="Email Address" className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 pl-12 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none transition-all placeholder:text-zinc-600 text-white" />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-red-400 group-focus-within:drop-shadow-[0_0_8px_#ef4444] transition-all" size={20} />
                  <input value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} type="password" placeholder="Password" className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 pl-12 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none transition-all placeholder:text-zinc-600 text-white" />
                </div>
              </motion.div>
            )}

            {/* SIGNUP STEPS */}
            {mode === 'signup' && step === 1 && (
              <motion.div key="s1" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <div className="relative group">
                  <User className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-red-400 group-focus-within:drop-shadow-[0_0_8px_#ef4444] transition-all" size={20} />
                  <input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} type="text" placeholder="Full Name" className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 pl-12 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none transition-all placeholder:text-zinc-600 text-white" />
                </div>
                <input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} type="text" placeholder="@username" className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none transition-all placeholder:text-zinc-600 text-white" />
                <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} placeholder="Tell your story..." rows="3" className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none resize-none placeholder:text-zinc-600 text-white transition-all" />
              </motion.div>
            )}

            {mode === 'signup' && step === 2 && (
              <motion.div key="s2" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-red-500 drop-shadow-[0_0_8px_#ef4444]" size={20} />
                  <select value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 pl-12 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none appearance-none cursor-pointer text-white transition-all">
                    <option value="">Select District</option>
                    {districts.map(d => <option key={d} value={d} className="bg-zinc-900 text-white">{d}</option>)}
                  </select>
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-red-400 group-focus-within:drop-shadow-[0_0_8px_#ef4444] transition-all" size={20} />
                  <input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} type="email" placeholder="Email Address" className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 pl-12 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none transition-all placeholder:text-zinc-600 text-white" />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-red-400 group-focus-within:drop-shadow-[0_0_8px_#ef4444] transition-all" size={20} />
                  <input value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} type="password" placeholder="Password" className="w-full bg-black/60 border border-red-500/20 rounded-2xl p-4 pl-12 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.4)] outline-none transition-all placeholder:text-zinc-600 text-white" />
                </div>
              </motion.div>
            )}

            {mode === 'signup' && step === 3 && (
              <motion.div key="s3" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                <p className="text-red-400/80 text-center mb-6 text-xs font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">What do you love?</p>
                <div className="grid grid-cols-2 gap-3">
                  {interestOptions.map(topic => (
                    <button key={topic} onClick={() => toggleInterest(topic)} className={`p-4 rounded-2xl border-2 transition-all font-bold text-sm ${formData.interests.includes(topic) ? 'border-red-500 bg-red-500/30 text-white shadow-[0_0_25px_rgba(239,68,68,0.6)]' : 'border-red-500/20 bg-black/40 text-zinc-400 hover:border-red-500/40'}`}>
                      {topic}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-4 mt-8">
          {mode === 'signup' && step > 1 && (
            <motion.button whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(239, 68, 68, 0.3)" }} whileTap={{ scale: 0.95 }} onClick={prevStep} className="p-5 rounded-2xl bg-zinc-900 border border-red-500/30 text-red-400"><ChevronLeft size={24} /></motion.button>
          )}
          
          <motion.button 
            disabled={loading}
            whileHover={{ scale: 1.02, boxShadow: "0 0 35px rgba(239, 68, 68, 0.7)" }} 
            whileTap={{ scale: 0.98 }} 
            onClick={mode === 'login' ? handleLogin : (step === 3 ? handleSignUp : nextStep)} 
            className="flex-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all"
          >
            {loading ? 'SYNCING...' : mode === 'login' ? 'ENTER UNIVERSE' : (step === 3 ? 'JOIN CULTURE' : 'CONTINUE')}
            {!loading && (mode === 'login' ? <LogIn size={20} /> : step === 3 ? <Zap size={20} className="drop-shadow-[0_0_8px_#ffffff]" /> : <ChevronRight size={20} />)}
          </motion.button>
        </div>

        {/* Toggle between Login and Signup */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setStep(1); }} 
            className="text-zinc-400 text-xs font-bold uppercase tracking-widest hover:text-red-400 hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all"
          >
            {mode === 'login' ? "Don't have an account? Create One" : "Already a member? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
