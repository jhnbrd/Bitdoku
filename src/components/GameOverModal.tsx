import React from 'react';
import { ShieldAlert, RotateCcw, Home } from 'lucide-react';
import { sounds } from '../audio/sounds';

interface GameOverModalProps {
  levelName: string;
  onRetry: () => void;
  onBackToHub: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  levelName,
  onRetry,
  onBackToHub
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono">
      <div className="w-full max-w-sm bg-[#150A0F] border-2 border-rose-500/80 p-6 rounded-2xl text-center shadow-[0_0_40px_rgba(244,63,94,0.4)] pixel-corners">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <ShieldAlert className="w-9 h-9 text-rose-400 animate-pulse" />
          </div>
        </div>

        <div className="inline-block px-3 py-1 mb-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold tracking-widest uppercase rounded">
          MEMORY CORRUPTION
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-1 tracking-wider">
          INTEGRITY DEPLETED
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Rule violation threshold exceeded in {levelName}. All CPU cache registers dumped.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => {
              sounds.playClick(1000);
              onRetry();
            }}
            className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold uppercase tracking-widest text-xs rounded-lg transition-all transform active:scale-98 shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RETRY SECTOR</span>
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              onBackToHub();
            }}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>ABORT TO HUB</span>
          </button>
        </div>
      </div>
    </div>
  );
};
