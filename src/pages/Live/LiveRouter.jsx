import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Compass, Video, Home, Zap, ShieldCheck } from 'lucide-react';

// Host Pages
import GoLive from './Host/GoLive';
import StreamDashboard from './Host/StreamDashboard';
import HostAnalytics from './Host/HostAnalytics';

// Viewer Pages
import StreamDiscovery from './Viewer/StreamDiscovery';
import LivePlayer from './Viewer/LivePlayer';
import Recharge from './Viewer/Recharge'; 
import PaymentVerify from './Viewer/PaymentVerify'; // 🔥 ADDED: The verification logic
import JoinAsGuest from './Viewer/JoinAsGuest'; // 🔥 NEW: Guest Module

// Moderator Pages
import ModDashboard from './Moderator/ModDashboard';

const LiveRouter = () => {
  const location = useLocation();

  // 🔥 UI Logic: Hide navigation when watching a stream or joining as guest
  // This keeps the "TikTok" feel clean without overlapping buttons
  const isWatching = location.pathname.includes('/watch/') || location.pathname.includes('/join-guest');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      
      {/* --- GLOBAL LIVE NAVIGATION --- */}
      {!isWatching && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-8">
          <NavLink to="/live" icon={<Compass size={20} />} label="Explore" />
          
          <NavLink to="/live/recharge" icon={<Zap size={20} className="text-cyan-400" />} label="Coins" />

          {/* THE CENTERPIECE: GO LIVE BUTTON */}
          <Link 
            to="/live/go-live" 
            className="bg-[#fe2c55] p-4 rounded-2xl shadow-[0_0_20px_rgba(254,44,85,0.4)] hover:scale-110 transition-all active:scale-95"
          >
            <Video size={24} className="text-white" />
          </Link>

          <NavLink to="/profile" icon={<Home size={20} />} label="Home" />
        </nav>
      )}

      {/* --- PAGE CONTENT --- */}
      <div className={`flex-1 ${!isWatching ? 'pb-24' : ''}`}> 
        <Routes>
          {/* Discovery */}
          <Route index element={<StreamDiscovery />} />
          <Route path="explore" element={<StreamDiscovery />} />

          {/* 🔥 Recharge & Verification Flow 🔥 */}
          <Route path="recharge" element={<Recharge />} />
          <Route path="payment-verify" element={<PaymentVerify />} />

          {/* Host Flow */}
          <Route path="go-live" element={<GoLive />} />
          <Route path="dashboard/:streamId" element={<StreamDashboard />} />
          <Route path="analytics/:streamId" element={<HostAnalytics />} />

          {/* Viewer Flow */}
          <Route path="watch/:streamId" element={<LivePlayer />} />
          
         {/* Inside the <Routes> block of LiveRouter.jsx */}
<Route path="watch/:streamId/join-guest" element={<JoinAsGuest />} />

          {/* Mod Flow */}
          <Route path="mod/:streamId" element={<ModDashboard />} />

          {/* Ended State */}
          <Route path="ended" element={<UniverseOffline />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/live" replace />} />
        </Routes>
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const NavLink = ({ to, icon, label }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Link to={to} className="flex flex-col items-center gap-1 group">
      <div className={`transition-colors ${isActive ? 'text-cyan-500' : 'text-zinc-500 group-hover:text-white'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-600'}`}>
        {label}
      </span>
    </Link>
  );
};

const UniverseOffline = () => (
  <div className="h-screen flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-1 bg-[#fe2c55] animate-pulse" />
    <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs">Universe Offline</p>
    <Link 
      to="/live" 
      className="mt-4 text-[10px] font-bold text-zinc-400 border border-white/10 px-6 py-3 rounded-full hover:bg-white/5 transition-all"
    >
      Return to Discovery
    </Link>
  </div>
);

export default LiveRouter;