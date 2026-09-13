import React from 'react';
import { Heart, RotateCcw, ArrowLeft, HelpCircle, XCircle } from 'lucide-react';
import { BitSprite } from './BitSprite';
import { sounds } from '../audio/sounds';

interface GameControlsProps {
  levelName: string;
  lives: number;
  maxLives: number;
  bitsPlaced: number;
  totalBitsRequired: number;
  timeMs: number;
  inputMode: 'bit' | 'blocked';
  setInputMode: (mode: 'bit' | 'blocked') => void;
  onReset: () => void;
  onBack: () => void;
  onShowRules: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  levelName,
  lives,
  maxLives,
  bitsPlaced,
  totalBitsRequired,
  timeMs,
  inputMode,
  setInputMode,
  onReset,
  onBack,
  onShowRules
}) => {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-3 font-mono">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 rounded-lg">
        <button
          onClick={() => {
            sounds.playTap();
            onBack();
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>HUB</span>
        </button>

        <div className="text-center">
          <div className="text-xs font-bold tracking-wider text-emerald-400 truncate max-w-[170px]">
            {levelName}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            TIME: {formatTime(timeMs)}
          </div>
        </div>

        <button
          onClick={() => {
            sounds.playTap();
            onShowRules();
          }}
          className="text-slate-400 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
          title="Game Rules"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Persistent On-Screen Rules Guide */}
      <div className="bg-[#0B132B]/70 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-[11px] leading-tight text-slate-300 flex items-center justify-between gap-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>RULES:</span>
        </div>
        <div className="text-[10px] text-slate-300 font-mono text-center sm:text-left flex flex-wrap gap-x-2 gap-y-0.5 justify-center">
          <span className="text-emerald-300 font-medium">1 bit/region</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-300 font-medium">1 bit/row & col</span>
          <span className="text-slate-500">•</span>
          <span className="text-rose-300 font-medium">No touching (even diag)</span>
        </div>
      </div>

      {/* Status Bar: Lives & Bit Count */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Lives / Integrity */}
        <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 px-3 py-2 rounded-lg">
          <span className="text-slate-400 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            LIVES:
          </span>
          <div className="flex gap-1">
            {Array.from({ length: maxLives }).map((_, idx) => (
              <span
                key={idx}
                className={`inline-block w-2.5 h-2.5 rounded-xs transition-colors ${
                  idx < lives ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bits Placed Status */}
        <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 px-3 py-2 rounded-lg">
          <span className="text-slate-400 flex items-center gap-1">
            <BitSprite size={16} />
            BITS:
          </span>
          <span className={`font-bold ${bitsPlaced === totalBitsRequired ? 'text-emerald-400' : 'text-slate-200'}`}>
            {bitsPlaced} / {totalBitsRequired}
          </span>
        </div>
      </div>

      {/* Input Mode Switcher & Reset Button */}
      <div className="flex items-center gap-2 mt-1">
        {/* Toggle Mode: Place Bit */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick(1000);
            setInputMode('bit');
          }}
          className={`flex-1 py-2.5 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            inputMode === 'bit'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <BitSprite size={18} />
          <span>PLACE BIT</span>
        </button>

        {/* Toggle Mode: Place Cross / Mark */}
        <button
          type="button"
          onClick={() => {
            sounds.playCross();
            setInputMode('blocked');
          }}
          className={`flex-1 py-2.5 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            inputMode === 'blocked'
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <XCircle className="w-4 h-4 text-cyan-400" />
          <span>MARK CROSS</span>
        </button>

        {/* Reset Grid */}
        <button
          type="button"
          onClick={() => {
            sounds.playTap();
            onReset();
          }}
          title="Reset board"
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
