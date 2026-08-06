// src/components/upload/Module07_Monetization.jsx
import React from 'react';
import { DollarSign, Gift, Lock, Link, Coins, Sparkles } from 'lucide-react';

const Module07_Monetization = ({ formData, updateField, onNext, onPrev }) => {
  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div>
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(254,44,85,0.6)]">
          MONETIZATION & TIPS
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Turn on creator features and earn from your content
        </p>
      </div>

      <div className="flex-1 my-4 space-y-4 overflow-y-auto hide-scrollbar pr-1">
        
        {/* Enable Creator Tipping */}
        <div className="flex items-center justify-between p-4 rounded-3xl bg-zinc-950/70 border-none shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 drop-shadow-[0_0_8px_rgba(254,44,85,0.5)]">
              <Gift size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Enable Virtual Gifts & Tips</h4>
              <p className="text-[10px] text-zinc-500">Allow viewers to send coins or gifts</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={formData.enableTips}
            onChange={(e) => updateField('enableTips', e.target.checked)}
            className="accent-[#fe2c55] w-4 h-4 cursor-pointer"
          />
        </div>

        {/* Paywall Content Settings */}
        <div className="p-4 rounded-3xl bg-zinc-950/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Require Unlock Fee</h4>
                <p className="text-[10px] text-zinc-500">Lock post behind coin payment</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.isPaidContent}
              onChange={(e) => updateField('isPaidContent', e.target.checked)}
              className="accent-cyan-400 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Pricing Field */}
          {formData.isPaidContent && (
            <div className="pt-2 flex items-center gap-2">
              <Coins size={16} className="text-cyan-400" />
              <input
                type="number"
                min="1"
                placeholder="Coins required to view (e.g. 50)"
                value={formData.priceCoins || ''}
                onChange={(e) => updateField('priceCoins', Number(e.target.value))}
                className="w-full bg-zinc-900/80 border-none rounded-2xl py-2 px-4 text-xs text-cyan-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Commercial Links / Sponsor Tagging */}
        <div className="p-4 rounded-3xl bg-zinc-950/70 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Link size={14} />
            <span>Product / Sponsor Link</span>
          </div>
          <input
            type="url"
            placeholder="https://yourstore.com/item"
            className="w-full bg-zinc-900/80 border-none rounded-2xl py-2.5 px-4 text-xs text-cyan-100 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex gap-4">
        <button
          onClick={onPrev}
          className="w-1/3 py-4 rounded-full font-bold text-xs uppercase tracking-wider text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-all border-none"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="w-2/3 py-4 rounded-full font-black text-xs uppercase tracking-widest text-white bg-[#fe2c55] shadow-[0_0_15px_rgba(254,44,85,0.6)] hover:shadow-[0_0_25px_rgba(254,44,85,0.9)] active:scale-95 transition-all border-none"
        >
          Next: Advanced →
        </button>
      </div>
    </div>
  );
};

export default Module07_Monetization;
