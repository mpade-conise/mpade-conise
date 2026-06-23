import React, { useState } from 'react';
import { 
  X, Sliders, Shield, Volume2, Video, Users, UserCheck, 
  Gift, Swords, Power, Mic, Image, Sparkles, Pause, Play, Trophy, BarChart2 
} from 'lucide-react';

// --- MODULAR COMPONENT IMPORTS ---
import CoHostManager from './CoHostManager';
import GuestManager from './GuestManager';
import GiftSender from './GiftSender';
import BattleController from './BattleController';
import EndLiveSession from '../Host/EndStream';
import AIVoiceEffects from './AIVoiceEffects';
import BackgroundChanger from './BackgroundChanger';
import AIFilters from './AIFilters';
import PauseLiveSession from './PauseLiveSession';
import TopGifterTracker from './TopGifterTracker';
import LeaderboardPanel from './LeaderboardPanel';

/**
 * SettingsPanel - Modular Live Streaming Feature Hub
 * @param {string} streamId - The active live room unique identifier
 * @param {object} streamData - Supabase stream metadata payload
 * @param {object} socket - The active WebSockets instance passed from the root room hook
 * @param {array} currentCoHosts - Collection of active panel peers
 * @param {function} onDropUser - Handler to eject a co-host
 * @param {function} onDropAll - Handler to terminate all co-hosts
 * @param {function} onClose - React state callback to toggle panel drawer visibility
 */
const SettingsPanel = ({ 
  streamId, 
  streamData, 
  socket, 
  currentCoHosts, 
  onDropUser, 
  onDropAll, 
  onClose 
}) => {
  // Navigation switch to route inside the settings drawer panel
  const [currentTab, setCurrentTab] = useState('menu');
  const [isLivePaused, setIsLivePaused] = useState(false);

  // Fallback guards to protect Vercel production build engines
  const streamTitle = streamData?.title || "Mpade Live Session";

  // Sub-menu rendering director switch matrix
  const renderTabContent = () => {
    switch (currentTab) {
      case 'cohost': 
        return (
          <CoHostManager 
            streamId={streamId} 
            socket={socket} 
            currentCoHosts={currentCoHosts}
            onDropUser={onDropUser}
            onDropAll={onDropAll}
            onBack={() => setCurrentTab('menu')} 
          />
        );
      case 'guest': return <GuestManager streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'gifts': return <GiftSender streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'battle': return <BattleController streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'voice': return <AIVoiceEffects streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'bg': return <BackgroundChanger streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'filters': return <AIFilters streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'topgifter': return <TopGifterTracker streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'leaderboard': return <LeaderboardPanel streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      case 'endlive': return <EndLiveSession streamId={streamId} onBack={() => setCurrentTab('menu')} />;
      default: return renderMainMenu();
    }
  };

  const renderMainMenu = () => (
    <div className="space-y-4 overflow-y-auto pr-1 max-h-[calc(100vh-140px)] custom-scrollbar">
      {/* ROOM IDENTITY BLOCK */}
      <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">Control Terminal</p>
        <p className="text-xs font-semibold truncate text-cyan-400">{streamTitle}</p>
      </div>

      {/* CORE DOCK ACTIONS */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => setIsLivePaused(!isLivePaused)}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
            isLivePaused ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          {isLivePaused ? <Play size={16} /> : <Pause size={16} />}
          <span className="text-[11px] font-medium">{isLivePaused ? 'Resume Stream' : 'Pause Stream'}</span>
          <PauseLiveSession streamId={streamId} isPaused={isLivePaused} />
        </button>

        <button 
          onClick={() => setCurrentTab('endlive')}
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <Power size={16} />
          <span className="text-[11px] font-medium">Terminate Live</span>
        </button>
      </div>

      {/* INTERACTIONS CATEGORY */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">Interactions</p>
        <div className="grid grid-cols-1 gap-1">
          <button onClick={() => setCurrentTab('cohost')} className="menu-btn"><Users size={14} /><span>Co-Host Connect</span></button>
          <button onClick={() => setCurrentTab('guest')} className="menu-btn"><UserCheck size={14} /><span>Guest Queue</span></button>
          <button onClick={() => setCurrentTab('battle')} className="menu-btn"><Swords size={14} /><span>PK Battle Mode</span></button>
          <button onClick={() => setCurrentTab('gifts')} className="menu-btn"><Gift size={14} /><span>Send Testing Gifts</span></button>
        </div>
      </div>

      {/* STUDIO FX CATEGORY */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">Studio Effects</p>
        <div className="grid grid-cols-1 gap-1">
          <button onClick={() => setCurrentTab('voice')} className="menu-btn"><Mic size={14} /><span>AI Voice Changer</span></button>
          <button onClick={() => setCurrentTab('bg')} className="menu-btn"><Image size={14} /><span>Virtual Background</span></button>
          <button onClick={() => setCurrentTab('filters')} className="menu-btn"><Sparkles size={14} /><span>AI Camera Filters</span></button>
        </div>
      </div>

      {/* METRICS & LEADERBOARDS */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">Metrics & Rewards</p>
        <div className="grid grid-cols-1 gap-1">
          <button onClick={() => setCurrentTab('topgifter')} className="menu-btn"><Trophy size={14} /><span>Top Gifter List</span></button>
          <button onClick={() => setCurrentTab('leaderboard')} className="menu-btn"><BarChart2 size={14} /><span>Stream Leaderboard</span></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-zinc-950 text-white select-none border-l border-white/5">
      
      {/* OVERLAY PANEL CONTEXT DOCK */}
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-cyan-400" />
            <h3 className="font-bold text-sm tracking-wide uppercase text-zinc-200">
              {currentTab === 'menu' ? 'Stream Matrix' : `${currentTab} node`}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTROLLER LAYER STAGE ROUTING CONTAINER */}
        {renderTabContent()}
      </div>

      {/* STATIC PROD BACKUP ENGINE FOOTER */}
      {currentTab === 'menu' && (
        <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[10px] font-bold text-zinc-600 tracking-widest uppercase mt-4">
          <div className="flex items-center gap-1">
            <Shield size={10} />
            <span>Secure Matrix</span>
          </div>
          <span>v1.0.8-PROD</span>
        </div>
      )}

      {/* CSS Tailwind Utility Style Rule for Buttons */}
      <style>{`
        .menu-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.02);
          text-align: left;
          font-size: 12px;
          font-weight: 500;
          color: #d4d4d8;
          transition: all 0.2s;
        }
        .menu-btn:hover {
          background-color: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(6, 182, 212, 0.2);
        }
      `}</style>

    </div>
  );
};

export default SettingsPanel;
