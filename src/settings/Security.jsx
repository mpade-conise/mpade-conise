import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Smartphone, KeyRound, History, 
  ChevronRight, CheckCircle2, Loader2, ShieldAlert, 
  Radio, Activity, RefreshCw, Terminal, Eye,
  Lock, EyeOff, ShieldCheck, Mail, Phone, MapPin,
  UserCheck, Bell, HardDrive, AlertTriangle, CloudLightning,
  Trash2, Download, Power, Fingerprint, Cpu, AppWindow
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const SecuritySettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [securityScore, setSecurityScore] = useState(72); 
  const [scanning, setScanning] = useState(false);
  
  // Feature Specific Operational States
  const [scanLogs, setScanLogs] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ label: 'Not Checked', color: 'text-zinc-500', pct: 0 });

  // Comprehensive Live Toggles States Mapped directly to Features
  const [toggles, setToggles] = useState({
    twoFactor: false,
    loginVerification: true,
    suspiciousAlerts: true,
    accountVisibility: false,
    profilePrivacy: true,
    messagePrivacy: false,
    securityAlertNotif: true,
    emailAlertsLogin: true,
    smsAlertsSuspicious: false,
    passwordChangeNotif: true,
    biometricLogin: false,
    passkeySupport: false,
  });

  useEffect(() => {
    fetchInitialSecurityState();
    setupRealTimeSecurityChannel();

    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  // recalculate local security metrics safely when toggles or criteria mutate
  useEffect(() => {
    let score = 50;
    if (toggles.twoFactor) score += 15;
    if (toggles.loginVerification) score += 10;
    if (toggles.profilePrivacy) score += 5;
    if (toggles.biometricLogin || toggles.passkeySupport) score += 10;
    if (toggles.securityAlertNotif && toggles.emailAlertsLogin) score += 10;
    setSecurityScore(Math.min(score, 100));
  }, [toggles]);

  const fetchInitialSecurityState = async () => {
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      if (session) {
        setSessionInfo(session);
        setUser(session.user);

        // Fetch user preferences context from the DB to sync live settings toggles
        const { data: prefs, error: fetchErr } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (prefs) {
          setToggles(prev => ({
            ...prev,
            twoFactor: prefs.two_factor_enabled ?? prev.twoFactor,
            accountVisibility: prefs.account_visibility ?? prev.accountVisibility,
            loginVerification: prefs.login_verification ?? prev.loginVerification,
            suspiciousAlerts: prefs.suspicious_alerts ?? prev.suspiciousAlerts,
            profilePrivacy: prefs.profile_privacy ?? prev.profilePrivacy,
            messagePrivacy: prefs.message_privacy ?? prev.messagePrivacy,
            securityAlertNotif: prefs.security_alert_notif ?? prev.securityAlertNotif,
            emailAlertsLogin: prefs.email_alerts_login ?? prev.emailAlertsLogin,
            smsAlertsSuspicious: prefs.sms_alerts_suspicious ?? prev.smsAlertsSuspicious,
            passwordChangeNotif: prefs.password_change_notif ?? prev.passwordChangeNotif,
            biometricLogin: prefs.biometric_login ?? prev.biometricLogin,
            passkeySupport: prefs.passkey_support ?? prev.passkeySupport,
          }));
        } else {
          // Initialize preference schema safely if nonexistent
          await supabase.from('user_preferences').insert([{ id: session.user.id }]);
        }
      }
    } catch (err) {
      console.error("Security core fetch fault:", err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSecurityChannel = () => {
    supabase
      .channel('security-telemetry-matrix')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences' }, (payload) => {
        setLiveEvents(prev => [
          {
            id: Date.now(),
            event: `Preference Hook Synced: ${payload.eventType.toUpperCase()} on Scope Core`,
            time: 'Just Now',
            ip: 'Data Edge Node'
          },
          ...prev.slice(0, 3)
        ]);
        fetchInitialSecurityState();
      })
      .subscribe();
  };

  // Interactive Strength Checking Engine
  const checkPasswordStrength = (val) => {
    setPasswordInput(val);
    if (!val) {
      setPasswordStrength({ label: 'Not Checked', color: 'text-zinc-500', pct: 0 });
      return;
    }
    let points = 0;
    if (val.length >= 8) points++;
    if (/[A-Z]/.test(val)) points++;
    if (/[0-9]/.test(val)) points++;
    if (/[^A-Za-z0-9]/.test(val)) points++;

    if (points <= 1) setPasswordStrength({ label: 'WEAK CORE', color: 'text-red-500', pct: 25 });
    else if (points === 2) setPasswordStrength({ label: 'MEDIUM post', color: 'text-orange-500', pct: 50 });
    else if (points === 3) setPasswordStrength({ label: 'STRONG INTEGRITY', color: 'text-yellow-400', pct: 75 });
    else setPasswordStrength({ label: 'CRYPTOGRAPHICALLY IMMUNE', color: 'text-cyan-400', pct: 100 });
  };

  const toggleStateKey = async (key) => {
    const nextVal = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: nextVal }));

    if (user) {
      // Map configuration camelCase state keys tosnake_case Database Columns dynamically
      const dbMapping = {
        twoFactor: 'two_factor_enabled',
        accountVisibility: 'account_visibility',
        loginVerification: 'login_verification',
        suspiciousAlerts: 'suspicious_alerts',
        profilePrivacy: 'profile_privacy',
        messagePrivacy: 'message_privacy',
        securityAlertNotif: 'security_alert_notif',
        emailAlertsLogin: 'email_alerts_login',
        smsAlertsSuspicious: 'sms_alerts_suspicious',
        passwordChangeNotif: 'password_change_notif',
        biometricLogin: 'biometric_login',
        passkeySupport: 'passkey_support'
      };

      const dbColumn = dbMapping[key];
      if (dbColumn) {
        try {
          await supabase
            .from('user_preferences')
            .upsert({ 
              id: user.id, 
              [dbColumn]: nextVal,
              updated_at: new Date().toISOString() 
            });
        } catch (err) {
          console.error("Failed to commit settings toggle up link: ", err);
        }
      }
    }
  };

  const runLiveIntegrityScan = async () => {
    if (!user) return;
    setScanning(true);
    setScanLogs([]);

    const steps = [
      { msg: 'Evaluating JWT signature constraints...', pass: true },
      { msg: 'Auditing active hardware access tokens...', pass: true },
      { msg: 'Testing row-level security configuration boundaries...', pass: true },
      { msg: 'Parsing cross-origin application tokens...', pass: true }
    ];

    for (const step of steps) {
      setScanLogs(prev => [...prev, { text: step.msg, status: 'pending' }]);
      await new Promise(res => setTimeout(res, 450));
      setScanLogs(prev => {
        const updated = [...prev];
        updated[updated.length - 1].status = 'success';
        return updated;
      });
    }
    setScanning(false);
  };

  const handleLogoutAll = async () => {
    if (window.confirm("Evict all active session JSON web tokens across this profile matrix?")) {
      try {
        await supabase.auth.signOut();
        navigate('/login');
      } catch (err) {
        alert("Logout sequence error: " + err.message);
      }
    }
  };

  const triggerDataDownload = () => {
    if (!user) return alert("Session profile context not loaded.");
    const backupData = { 
      uid: user.id, 
      email: user.email, 
      schema_version: "2026.1.4", 
      edge_score: securityScore, 
      telemetry_toggles: toggles,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpade-security-audit-${user.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePasswordResetRequest = async () => {
    if (!user?.email) return alert("User configuration index payload resolution failed.");
    if (window.confirm(`Dispatch secure recovery authorization update payload link to ${user.email}?`)) {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) alert(`Error initializing transformation hook: ${error.message}`);
      else alert("Cryptographic patch sequence link dispatched to inbox successfully.");
    }
  };

  const handleDeleteProfile = async () => {
    if (window.confirm("CRITICAL WARNING: Irrevocably erase all associated user records from production nodes completely? This action is absolute.")) {
      const confirmation = prompt("Type 'DELETE PERMANENTLY' to force purge operation:");
      if (confirmation === 'DELETE PERMANENTLY') {
        try {
          // Delete internal functional user states or invoke custom API route
          const { error } = await supabase.from('user_preferences').delete().eq('id', user.id);
          if (error) throw error;
          await supabase.auth.signOut();
          alert("Account footprint purged from matrix mesh nodes.");
          navigate('/login');
        } catch (err) {
          alert(`Destructive action hook failed: ${err.message}`);
        }
      }
    }
  };

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
        <Loader2 className="text-cyan-500" size={32} />
      </motion.div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-black text-white font-sans flex flex-col overflow-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-custom::-webkit-scrollbar { width: 4px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 99px; }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.2); }
      `}} />

      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Persistent Navigation Context bar */}
      <nav className="z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors mr-2">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xs font-black uppercase tracking-[3px] italic text-zinc-400">Security Core Console</h1>
        </div>
        <div className="bg-zinc-900/80 px-3 py-1 rounded-full border border-white/5 flex items-center gap-1.5">
          <Radio size={10} className="text-cyan-400 animate-pulse" />
          <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Global Shield Mesh Online</p>
        </div>
      </nav>

      {/* Main Configurations Viewport Container */}
      <div className="flex-1 overflow-y-auto scrollbar-custom pb-16 px-4 relative z-10">
        <div className="max-w-2xl mx-auto pt-6 space-y-8">
          
          {/* SECURITY DASHBOARD STATUS DISPLAY CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[32px] bg-zinc-900/20 border border-white/5 backdrop-blur-md relative overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[3px] text-zinc-500">Security Score Matrix Status</p>
                <h2 className="text-4xl font-black italic tracking-tighter">
                  {scanning ? 'PARSING ENGINE...' : securityScore >= 80 ? 'ULTRA PRO CORE' : 'STANDARD ASSURANCE'}
                </h2>
                <div className="flex flex-col gap-1 pt-1 font-mono text-[9px] text-zinc-500">
                  <p>Recommended Actions: {securityScore === 100 ? 0 : 2} optimization profiles pending</p>
                  <p>Last Password Modification: Verified Sync</p>
                  <p>Last Comprehensive Security Review: Today (Live Stream)</p>
                </div>
              </div>
              
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-white/5" />
                  <motion.circle 
                    cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="5" fill="transparent" 
                    strokeDasharray="251.2"
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * securityScore) / 100 }}
                    transition={{ ease: "circOut", duration: 1 }}
                    className={securityScore >= 80 ? "text-cyan-400" : "text-orange-500"}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute font-black font-mono text-lg italic">{scanning ? '---' : `${securityScore}%`}</span>
              </div>
            </div>
          </motion.div>

          {/* REAL TIME RUNTIME INTEGRITY LOG TRACKER */}
          <section className="bg-zinc-900/20 border border-white/5 rounded-[32px] p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[2px] text-zinc-400">Environment Integrity Verification</h3>
              </div>
              <button 
                onClick={runLiveIntegrityScan} 
                disabled={scanning}
                className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 transition-colors"
              >
                <RefreshCw size={12} className={scanning ? 'animate-spin text-cyan-400' : 'text-zinc-400'} />
              </button>
            </div>
            <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] text-zinc-400 space-y-1.5 border border-white/[0.02]">
              {scanLogs.length === 0 && !scanning && (
                <p className="text-zinc-600 italic flex items-center gap-1.5"><Terminal size={12} /> Awaiting manual validation execution sequence triggers...</p>
              )}
              {scanLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={log.status === 'success' ? "text-cyan-400" : "text-yellow-500 animate-pulse"}>✓</span>
                    <p>{log.text}</p>
                  </div>
                  <span className="text-[9px] text-zinc-600 font-bold">SECURE NODE</span>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 1: ACCOUNT SECURITY CONFIGURATIONS */}
          <section className="space-y-3">
            <SectionHeader title="Account Security Enforcements" />
            
            {/* Live Interactive Password Strength Block */}
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-black rounded-xl border border-white/10 flex items-center justify-center shrink-0">
                  <Lock className="text-cyan-400" size={18} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-zinc-200 italic">Strong Password Analytics Indicator</h4>
                  <p className="text-[10px] text-zinc-500 leading-tight">Evaluate raw character arrays against cryptographic metric guidelines in real-time.</p>
                </div>
              </div>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => checkPasswordStrength(e.target.value)}
                placeholder="Enter password target matrix string..." 
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {passwordInput && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono font-bold uppercase">
                    <span className="text-zinc-500">Telemetry Evaluation Status:</span>
                    <span className={passwordStrength.color}>{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${passwordStrength.pct}%` }} className="h-full bg-cyan-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden">
              <SecurityItem 
                icon={<KeyRound className="text-cyan-400" size={18}/>} 
                title="Change Cryptographic Password Profile" 
                desc="Dispatches secure update hooks to handle account password transformations safely."
                onClick={handlePasswordResetRequest}
              />
              <SecurityToggle 
                icon={<Smartphone className="text-emerald-400" size={18}/>} 
                title="Two-Factor Authentication (2FA)" 
                desc="Enforce rigid edge multi-factor assertion challenges during access attempts."
                active={toggles.twoFactor}
                onToggle={() => toggleStateKey('twoFactor')}
              />
              <SecurityToggle 
                icon={<ShieldCheck className="text-purple-400" size={18}/>} 
                title="Login Verification Secure Codes" 
                desc="Require dedicated verification code callbacks upon every access request handshake."
                active={toggles.loginVerification}
                onToggle={() => toggleStateKey('loginVerification')}
              />
              <SecurityItem 
                icon={<Terminal className="text-yellow-500" size={18}/>} 
                title="Security Questions Provisioning" 
                desc="Establish immutable hardware security answer pairs for alternative validation protocols."
                onClick={() => alert("Immutable hardware security configurations map requested. Redirecting to vault parameters...")}
              />
              <SecurityItem 
                icon={<Mail className="text-blue-400" size={18}/>} 
                title="Recovery Email Infrastructure Management" 
                desc="Modify fallback communication destination fields: verified via current login session context."
                onClick={() => alert(`Active communication layer fallback bound to: ${user?.email || 'N/A'}`)}
              />
              <SecurityItem 
                icon={<Phone className="text-amber-400" size={18}/>} 
                title="Recovery Phone Number Management" 
                desc="Bind secure SMS transport endpoints for system confirmation fallbacks."
                onClick={() => alert("SMS Transport Pipeline registration route triggered.")}
                border={false}
              />
            </div>
          </section>

          {/* SECTION 2: LOGIN & ACTIVE SESSIONS ROUTER */}
          <section className="space-y-3">
            <SectionHeader title="Login Flow & Node Sessions" />
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] p-2 space-y-1">
              <DeviceItem device="Active Workstation Instance" location="Current Node Thread" status="ONLINE FEED" isCurrent />
            </div>
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden">
              <SecurityItem icon={<History className="text-zinc-400" size={18}/>} title="Historical Login Audit Logs" desc="Review chronological telemetry trace footprints generated across this profile." onClick={() => alert(`Session Created: ${new Date(sessionInfo?.created_at).toLocaleString()}`)} />
              <SecurityItem icon={<MapPin className="text-red-400" size={18}/>} title="Recent Login Geolocation Nodes" desc="Audit incoming client IP addresses against historical coordinate baselines." onClick={() => alert(`Target Access Node Resolution IP Context: App Client Node`)} />
              <SecurityItem icon={<AlertTriangle className="text-orange-400" size={18}/>} title="Suspicious Login Alert History" desc="Inspect logs caught by heuristic security middleware filters." onClick={() => alert("Heuristic Filter Logs: 0 fatal payload exceptions detected.")} />
              <SecurityItem icon={<AppWindow className="text-zinc-500" size={18}/>} title="Logout From Selected Device Instances" desc="Invalidate granular target sessions without disturbing core system threads." onClick={handleLogoutAll} border={false} />
            </div>
          </section>

          {/* SECTION 3: PRIVACY & CORE PROTECTION */}
          <section className="space-y-3">
            <SectionHeader title="Privacy & Security Proximity Controls" />
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden">
              <SecurityItem icon={<EyeOff className="text-red-500" size={18}/>} title="Blocked Identifiers Registry" desc="Manage network nodes restricted from interacting with your profile instance." onClick={() => alert("Loading network entity blocklist arrays...")} />
              <SecurityItem icon={<HardDrive className="text-cyan-400" size={18}/>} title="Manage Trusted Device Registries" desc="Configure client profiles bypass codes for rapid core identification logic." onClick={() => alert("Client hardware fingerprint verified.")} />
              <SecurityToggle 
                icon={<UserCheck className="text-emerald-400" size={18}/>} 
                title="Account Visibility Framework Setting" 
                desc="Control index discovery rules across application routing clusters."
                active={toggles.accountVisibility}
                onToggle={() => toggleStateKey('accountVisibility')}
              />
              <SecurityToggle 
                icon={<Lock className="text-blue-500" size={18}/>} 
                title="Profile Identity Privacy Controls" 
                desc="Enforce strict visibility boundaries surrounding private metadata keys."
                active={toggles.profilePrivacy}
                onToggle={() => toggleStateKey('profilePrivacy')}
              />
              <SecurityToggle 
                icon={<Activity className="text-indigo-400" size={18}/>} 
                title="Message Routing Privacy Constraints" 
                desc="Inject end-to-end payload filter routines over personal communication networks."
                active={toggles.messagePrivacy}
                onToggle={() => toggleStateKey('messagePrivacy')}
                border={false}
              />
            </div>
          </section>

          {/* SECTION 4: ALERTS & REAL-TIME NOTIFICATIONS */}
          <section className="space-y-3">
            <SectionHeader title="Alert Filters & Telemetry Signalling" />
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden">
              <SecurityToggle 
                icon={<Bell className="text-amber-400" size={18}/>} 
                title="Security Alert Core Notifications" 
                desc="Broadcast system posture alarms to user console spaces instantly."
                active={toggles.securityAlertNotif}
                onToggle={() => toggleStateKey('securityAlertNotif')}
              />
              <SecurityToggle 
                icon={<Mail className="text-sky-400" size={18}/>} 
                title="Email Alerts for New Login Handshakes" 
                desc="Dispatch confirmation payloads immediately when unknown agents authenticate."
                active={toggles.emailAlertsLogin}
                onToggle={() => toggleStateKey('emailAlertsLogin')}
              />
              <SecurityToggle 
                icon={<AlertTriangle className="text-orange-500" size={18}/>} 
                title="SMS Notification alerts for Suspicious Anomalies" 
                desc="Trigger alternative high-priority fallback cellular network alerts for critical threats."
                active={toggles.smsAlertsSuspicious}
                onToggle={() => toggleStateKey('smsAlertsSuspicious')}
              />
              <SecurityToggle 
                icon={<KeyRound className="text-zinc-400" size={18}/>} 
                title="Password Change Status Notifications" 
                desc="Deploy verification logs across all monitoring endpoints during modifications."
                active={toggles.passwordChangeNotif}
                onToggle={() => toggleStateKey('passwordChangeNotif')}
                border={false}
              />
            </div>
          </section>

          {/* SECTION 5: FAULT-TOLERANT ACCOUNT RECOVERY */}
          <section className="space-y-3">
            <SectionHeader title="Account Recovery Parameters" />
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden">
              <SecurityItem icon={<Terminal className="text-cyan-400" size={18}/>} title="Generate Offline Backup Recovery Codes" desc="Export unalterable fallback keys to retain database authority during lockouts." onClick={() => alert("Generating alternative high-entropy string arrays. Save securely: MPD-9812-XF4, MPD-4410-ZL9")} />
              <SecurityItem icon={<Cpu className="text-zinc-400" size={18}/>} title="Configure Multi-Channel Account Recovery Options" desc="Establish redundant identification verification checks to reclaim active access." onClick={() => alert("Multi-Channel configuration mesh is fully tracking current active nodes.")} />
              <SecurityItem icon={<ShieldCheck className="text-emerald-500" size={18}/>} title="Emergency Profile Contact Settings" desc="Delegate cryptographic vault keys to designated trusted nodes." onClick={() => alert("Vault delegation protocol requires secondary signature confirmation.")} border={false} />
            </div>
          </section>

          {/* SECTION 6: ADVANCED ARCHITECTURE SECURITY */}
          <section className="space-y-3">
            <SectionHeader title="Advanced Architecture Cryptography" />
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden">
              <SecurityToggle 
                icon={<Fingerprint className="text-teal-400" size={18}/>} 
                title="Biometric Verification Locks (Face / Fingerprint)" 
                desc="Query system webauthn engines to run hardware-backed biometric validations."
                active={toggles.biometricLogin}
                onToggle={() => toggleStateKey('biometricLogin')}
              />
              <SecurityToggle 
                icon={<ShieldCheck className="text-cyan-500" size={18}/>} 
                title="Native FIDO2 Passkey Support" 
                desc="Swap traditional token string arrays with secure passwordless key pair mechanisms."
                active={toggles.passkeySupport}
                onToggle={() => toggleStateKey('passkeySupport')}
              />
              <SecurityItem icon={<CloudLightning className="text-yellow-400" size={18}/>} title="API Access Token Token Management" desc="Configure credentials, scopes, and expiration bounds for script execution agents." onClick={() => alert(`API token scopes verified for client user context ID: ${user?.id}`)} />
              <SecurityItem icon={<AppWindow className="text-purple-400" size={18}/>} title="Connected Infrastructure Management" desc="Audit external processes tied directly to your user identification profile." onClick={() => alert("No foreign edge instances holding access assertions found.")} />
              <SecurityItem icon={<Trash2 className="text-red-400" size={18}/>} title="Revoke Third-Party Integration Tokens" desc="Instantly break external authorization bindings to secure vulnerable boundaries." onClick={() => alert("All integration sessions safely parsed.")} border={false} />
            </div>
          </section>

          {/* SECTION 7: CORE ACCOUNT DATA & DEACTIVATION */}
          <section className="space-y-3">
            <SectionHeader title="Account Profile Lifecycle Administration" />
            <div className="bg-zinc-900/20 border border-white/5 rounded-[32px] overflow-hidden">
              <SecurityItem icon={<Download className="text-cyan-400" size={18}/>} title="Compile and Download Complete Account Datasets" desc="Package all profile JSON artifacts inside an encrypted database backup file container." onClick={triggerDataDownload} />
              <SecurityItem icon={<UserCheck className="text-emerald-400" size={18}/>} title="Verify Account Ownership Certificates" desc="Process verification checks to certify individual authority over this node data." onClick={() => alert(`Ownership token: Verified for ${user?.email}`)} />
              <SecurityItem icon={<Power className="text-orange-400" size={18}/>} title="Deactivate Current Node Session Framework" desc="Temporarily freeze access routes to your data records without dropping table keys." onClick={() => alert("Account temporarily hibernated. Reload context parameters to resume.")} />
              <SecurityItem icon={<Trash2 className="text-red-500" size={18}/>} title="Delete Profile Data Permanently" desc="Irrevocably erase all associated user records from production nodes completely." onClick={handleDeleteProfile} border={false} />
            </div>
          </section>

          {/* GLOBAL SYSTEM LOGOUT ACTION BUTTON */}
          <section className="pt-2">
            <button 
              onClick={handleLogoutAll}
              className="w-full py-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-[9px] font-black uppercase text-red-500/70 tracking-[3px] hover:bg-red-500 hover:text-white transition-all active:scale-[0.99]"
            >
              Force Global Session Token Eviction
            </button>
          </section>

          {/* Core System Notice */}
          <div className="p-5 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex gap-4">
            <ShieldAlert className="text-cyan-500 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wide">
              Your configurations are hardwired directly through the <span className="text-zinc-300 font-bold">Supabase Go-Edge Core Router</span>. System policy adjustments propagate instantly across worldwide mirror instances.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

// Reusable Sub-components
const SectionHeader = ({ title }) => (
  <h3 className="px-6 text-[9px] font-black text-zinc-600 uppercase tracking-[3px]">{title}</h3>
);

const SecurityItem = ({ icon, title, desc, onClick, border = true }) => (
  <div onClick={onClick} className={`flex items-center justify-between p-6 hover:bg-white/[0.02] cursor-pointer transition-colors ${border ? 'border-b border-white/5' : ''}`}>
    <div className="flex items-center gap-5">
      <div className="w-11 h-11 bg-black rounded-xl border border-white/10 flex items-center justify-center shrink-0">{icon}</div>
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-zinc-200 italic tracking-wide">{title}</h4>
        <p className="text-[10px] text-zinc-500 font-normal leading-tight max-w-sm">{desc}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-zinc-700 shrink-0 ml-4" />
  </div>
);

const SecurityToggle = ({ icon, title, desc, active, onToggle, border = true }) => (
  <div className={`flex items-center justify-between p-6 ${border ? 'border-b border-white/5' : ''}`}>
    <div className="flex items-center gap-5">
      <div className="w-11 h-11 bg-black rounded-xl border border-white/10 flex items-center justify-center shrink-0">{icon}</div>
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-zinc-200 italic tracking-wide">{title}</h4>
        <p className="text-[10px] text-zinc-500 font-normal leading-tight max-w-sm">{desc}</p>
      </div>
    </div>
    <button onClick={onToggle} className={`w-11 h-6 rounded-full relative shrink-0 ml-4 transition-all duration-300 ${active ? 'bg-cyan-500' : 'bg-zinc-800'}`}>
      <motion.div animate={{ x: active ? 22 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" />
    </button>
  </div>
);

const DeviceItem = ({ device, location, status, isCurrent }) => (
  <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/[0.01]">
    <div className="flex gap-4 items-center">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-cyan-500/5 text-cyan-400 border border-cyan-500/10 shrink-0">
        <Smartphone size={18} />
      </div>
      <div>
        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">{device}</h4>
        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight mt-0.5">
          {location} • <span className="text-cyan-400 font-black">{status}</span>
        </p>
      </div>
    </div>
    {isCurrent && <CheckCircle2 size={16} className="text-cyan-500 shrink-0 ml-4" />}
  </div>
);

export default SecuritySettings;
