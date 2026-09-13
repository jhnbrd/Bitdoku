import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import { BitSprite } from './BitSprite';
import { sounds } from '../audio/sounds';

interface WinModalProps {
  levelName: string;
  timeMs: number;
  bestTimeMs?: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onBackToHub: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  levelName,
  timeMs,
  bestTimeMs,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onBackToHub
}) => {
  const isNewBest = !bestTimeMs || timeMs <= bestTimeMs;

  useEffect(() => {
    // Launch celebratory kawaii retro confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#34D399', '#38BDF8', '#F472B6', '#FBBF24']
    });
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono">
      <div className="w-full max-w-sm bg-[#0A101D] border-2 border-emerald-400 p-6 rounded-2xl text-center shadow-[0_0_40px_rgba(52,211,153,0.3)] pixel-corners relative">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.4)]">
            <BitSprite size={40} />
          </div>
        </div>

        <div className="inline-block px-3 py-1 mb-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-widest uppercase rounded">
          MEMORY STABILIZED
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-1 tracking-wider">
          SECTOR CLEAR!
        </h2>
        <p className="text-xs text-slate-400 mb-5">{levelName}</p>

        {/* Time Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              CLEAR TIME:
            </span>
            <span className="font-bold text-emerald-400 text-sm">
              {formatTime(timeMs)}
            </span>
          </div>

          {isNewBest ? (
            <div className="flex items-center justify-center gap-1 text-[11px] text-amber-300 font-bold bg-amber-950/40 border border-amber-500/40 py-1 rounded">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>NEW PERSONAL BEST RECORD!</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>BEST RECORD:</span>
              <span>{formatTime(bestTimeMs)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {hasNextLevel && (
            <button
              onClick={() => {
                sounds.playClick(1000);
                onNextLevel();
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-widest text-xs rounded-lg transition-all transform active:scale-98 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>NEXT SECTOR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                sounds.playTap();
                onReplay();
              }}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REPLAY</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                onBackToHub();
              }}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              LEVELS HUB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
