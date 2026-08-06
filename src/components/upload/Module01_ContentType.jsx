// src/components/upload/Module01_ContentType.jsx
import React from 'react';
import { 
  Camera, Film, Image, Images, Radio, Mic, 
  ShoppingBag, HelpCircle, Calendar, FileText, Sparkles 
} from 'lucide-react';

const CONTENT_TYPES = [
  { id: 'reel', label: 'Short Reel', icon: Film, glow: 'cyan' },
  { id: 'photo', label: 'Single Photo', icon: Image, glow: 'pink' },
  { id: 'carousel', label: 'Carousel', icon: Images, glow: 'cyan' },
  { id: 'video', label: 'Long Video', icon: Camera, glow: 'pink' },
  { id: 'story', label: 'Story', icon: Sparkles, glow: 'cyan' },
  { id: 'live', label: 'Live Stream', icon: Radio, glow: 'pink' },
  { id: 'audio', label: 'Audio / Podcast', icon: Mic, glow: 'cyan' },
  { id: 'marketplace', label: 'Product / Item', icon: ShoppingBag, glow: 'pink' },
  { id: 'poll', label: 'Poll / Question', icon: HelpCircle, glow: 'cyan' },
  { id: 'event', label: 'Event', icon: Calendar, glow: 'pink' },
  { id: 'document', label: 'Document', icon: FileText, glow: 'cyan' },
];

const Module01_ContentType = ({ selectedType, onSelect, onNext }) => {
  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div className="mb-6">
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(254,44,85,0.6)]">
          SELECT CONTENT TYPE
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Choose what format you want to publish today
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 overflow-y-auto hide-scrollbar pb-4">
        {CONTENT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          const isCyan = type.glow === 'cyan';

          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`relative flex flex-col items-center justify-center p-5 rounded-3xl transition-all duration-300 ${
                isSelected
                  ? isCyan
                    ? 'bg-cyan-500/20 text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] border-none'
                    : 'bg-[#fe2c55]/20 text-pink-400 drop-shadow-[0_0_15px_rgba(254,44,85,0.6)] border-none'
                  : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/80 hover:text-white border-none'
              }`}
            >
              <Icon 
                size={32} 
                className={`mb-3 transition-transform duration-300 ${
                  isSelected ? 'scale-110' : ''
                }`} 
              />
              <span className="text-xs font-bold tracking-wider uppercase">
                {type.label}
              </span>

              {/* Glowing active indicator dot */}
              {isSelected && (
                <div 
                  className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                    isCyan 
                      ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' 
                      : 'bg-[#fe2c55] shadow-[0_0_8px_#fe2c55]'
                  }`} 
                />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full mt-4 py-4 rounded-full font-black text-xs uppercase tracking-widest text-white bg-[#fe2c55] shadow-[0_0_15px_rgba(254,44,85,0.6)] hover:shadow-[0_0_25px_rgba(254,44,85,0.9)] active:scale-95 transition-all"
      >
        Continue to Media Selection →
      </button>
    </div>
  );
};

export default Module01_ContentType;
