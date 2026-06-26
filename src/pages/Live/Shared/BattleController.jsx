// src/pages/Live/Shared/BattleController.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Swords, Trophy, Users, ShieldAlert } from 'lucide-react';

const BattleController = ({ streamId, onBack }) => {
  const [isBattleActive, setIsBattleActive] = useState(() => {
    return localStorage.getItem(`mpade_pk_active_${streamId}`) === 'true';
  });

  // Mock initial scores for live simulation layout
  const [scores, setScores] = useState({ host: 1250, opponent: 940 });
  const [timeLeft, setTimeLeft] = useState(300); // 5 Minutes Race timer

  // Top gifters array mock data structure for seating placement below grids
  const topHostGifters = [
    { id: 1, avatar: '👑', border: 'border-amber-400' },
    { id: 2, avatar: '💎', border: 'border-cyan-400' },
    { id: 3, avatar: '🔥', border: 'border-zinc-500' }
  ];

  const topOpponentGifters = [
    { id: 1, avatar: '🦄', border: 'border-amber-400' },
    { id: 2, avatar: '⚡', border: 'border-cyan-400' },
    { id: 3, avatar: '🌟', border: 'border-zinc-500' }
  ];

  // Calculate percentages for the dynamic animated coin bar math
  const totalPoints = scores.host + scores.opponent || 1;
  const hostPercentage = Math.max(10, Math.min(90, (scores.host / totalPoints) * 100));
  const opponentPercentage = 100 - hostPercentage;

  useEffect(() => {
    let styleElement = document.getElementById(`mpade-pk-layout-${streamId}`);
    
    if (isBattleActive) {
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = `mpade-pk-layout-${streamId}`;
        document.head.appendChild(styleElement);
      }

      // Generate HTML string for top gifter profiles seats dynamically
      const hostSeatsHTML = topHostGifters.map(g => `<div class="w-7 h-7 rounded-full bg-zinc-900 border ${g.border} flex items-center justify-center text-xs shadow-md backdrop-blur-md">${g.avatar}</div>`).join('');
      const opponentSeatsHTML = topOpponentGifters.map(g => `<div class="w-7 h-7 rounded-full bg-zinc-900 border ${g.border} flex items-center justify-center text-xs shadow-md backdrop-blur-md">${g.avatar}</div>`).join('');

      // Injecting absolute layouts directly over the native video dashboard layer wrappers without altering them
      styleElement.innerHTML = `
        /* Force dynamic vertical side-by-side splitting on parent video grids */
        [class*="video-container"], [class*="stream-grid"], [class*="video-wrapper"] {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 4px !important;
          position: relative !important;
          padding-top: 40px !important; /* Make workspace clearance for PK tracking bar */
          background: #000 !important;
        }

        /* Enforce vertical panel scaling alignment rules */
        [class*="video-container"] video, [class*="video-wrapper"] > div {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 16px !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
        }

        /* Inject PK Live Tracker Bar overlay to the screen */
        [class*="video-container"]::before, [class*="video-wrapper"]::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 4%;
          width: 92%;
          height: 14px;
          border-radius: 99px;
          background: linear-gradient(to right, #ef4444 ${hostPercentage}%, #f59e0b ${hostPercentage}%) !important;
          z-index: 40;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
          transition: background 0.4s cubic-bezier(0.1, 0.8, 0.2, 1);
        }

        /* Append dynamic scores label data directly into layout headers */
        [class*="video-container"]::after, [class*="video-wrapper"]::after {
          content: 'PK MATCH  •  ${scores.host} pts vs ${scores.opponent} pts';
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          font-family: monospace;
          font-size: 9px;
          font-weight: 900;
          color: #fff;
          letter-spacing: 1px;
          z-index: 41;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
      `;

      // Dynamic Real-time Injection of Gifter Rows directly inside Layout Viewport
      let overlayContainer = document.getElementById(`mpade-pk-gifters-row-${streamId}`);
      if (!overlayContainer) {
        overlayContainer = document.createElement('div');
        overlayContainer.id = `mpade-pk-gifters-row-${streamId}`;
        overlayContainer.className = "fixed left-0 right-0 z-40 px-4 pointer-events-none flex justify-between";
        
        // Target layout position right below standard video grid matrix height metrics
        const gridRef = document.querySelector('[class*="video-container"], [class*="stream-grid"]');
        if (gridRef) {
          gridRef.appendChild(overlayContainer);
        }
      }
      
      overlayContainer.innerHTML = `
        <div class="flex gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-full border border-white/5">${hostSeatsHTML}</div>
        <div class="flex gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-full border border-white/5">${opponentSeatsHTML}</div>
      `;

    } else {
      if (styleElement) styleElement.remove();
      const seatsRow = document.getElementById(`mpade-pk-gifters-row-${streamId}`);
      if (seatsRow) seatsRow.remove();
    }

    localStorage.setItem(`mpade_pk_active_${streamId}`, isBattleActive);
  }, [isBattleActive, scores, streamId]);

  // Simulation timer tick rate logic loop
  useEffect(() => {
    if (!isBattleActive || timeLeft <= 0) return;
    const counter = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(counter);
  }, [isBattleActive, timeLeft]);

  const handleToggleBattle = () => {
    setIsBattleActive(!isBattleActive);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-4 text-white font-sans">
      
      {/* Navigation Layer Control */}
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors w-fit group">
        <ArrowLeft size={14} className="transform group-hover:-translate-x-0.5 transition-transform" /> Back to Menu
      </button>

      {/* Control Board Matrix Interface */}
      <div className="p-4 bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full pointer-events-none" />
        
        <div className="text-center">
          <Swords size={26} className={`mx-auto mb-2 ${isBattleActive ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`} />
          <h4 className="text-xs font-black uppercase tracking-[0.15em] mb-0.5">PK Battle Matrix</h4>
          <p className="text-[10px] text-zinc-500 mb-4">
            {isBattleActive ? `Battle active • Time remaining: ${formatTime(timeLeft)}` : 'Launch vertical split-screen 5-minute points race challenge'}
          </p>

          {/* Action Trigger Node */}
          <button 
            onClick={handleToggleBattle}
            className={`w-full py-2.5 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 select-none ${
              isBattleActive 
                ? 'bg-zinc-800 border border-red-500/30 text-red-400 hover:bg-zinc-800/80' 
                : 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white hover:opacity-95 shadow-red-950/20'
            }`}
          >
            {isBattleActive ? 'Terminate Current PK Match' : 'Match & Split Screens'}
          </button>
        </div>

        {/* Real-time Simulator Panel adjustments visibility */}
        {isBattleActive && (
          <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-center">
            <button 
              onClick={() => setScores(s => ({ ...s, host: s.host + 150 }))}
              className="py-1 bg-white/5 hover:bg-white/10 text-[9px] font-mono rounded text-zinc-300"
            >
              +150 Host Coins
            </button>
            <button 
              onClick={() => setScores(s => ({ ...s, opponent: s.opponent + 150 }))}
              className="py-1 bg-white/5 hover:bg-white/10 text-[9px] font-mono rounded text-zinc-300"
            >
              +150 Rival Coins
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default BattleController;
