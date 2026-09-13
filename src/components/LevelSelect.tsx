import React from 'react';
import type { Difficulty } from '../types';
import { DIFFICULTY_CONFIG } from '../game/generator';
import type { LevelProgress } from '../db';
import { Play, CheckCircle2, ChevronRight } from 'lucide-react';
import { sounds } from '../audio/sounds';
import { BitSprite } from './BitSprite';

interface LevelSelectProps {
  currentDifficulty: Difficulty;
  onSelectDifficulty: (diff: Difficulty) => void;
  onSelectLevel: (diff: Difficulty, index: number) => void;
  progressMap: Map<string, LevelProgress>;
}

export const LevelSelect: React.FC<LevelSelectProps> = ({
  currentDifficulty,
  onSelectDifficulty,
  onSelectLevel,
  progressMap
}) => {
  const difficulties: { id: Difficulty; label: string; grid: string; lives: string }[] = [
    { id: 'easy', label: 'EASY', grid: '6×6', lives: '3 Lives' },
    { id: 'normal', label: 'NORMAL', grid: '8×8', lives: '3 Lives' },
    { id: 'hard', label: 'HARD', grid: '9×9', lives: '2 Lives' },
    { id: 'very_hard', label: 'VERY HARD', grid: '10×10', lives: '1 Life' }
  ];

  const config = DIFFICULTY_CONFIG[currentDifficulty];

  // Calculate highest attained (current active level) without arbitrary upper bound
  let currentLevel = 1;
  let completedCount = 0;

  // Scan until first non-completed sector
  while (progressMap.get(`${currentDifficulty}_${currentLevel}`)?.completed) {
    completedCount++;
    currentLevel++;
  }

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const prevBestTime = progressMap.get(`${currentDifficulty}_${Math.max(1, currentLevel - 1)}`)?.bestTimeMs;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 font-mono">
      {/* Difficulty Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/70 border border-slate-800 rounded-xl">
        {difficulties.map((diff) => {
          const isActive = currentDifficulty === diff.id;
          return (
            <button
              key={diff.id}
              onClick={() => {
                sounds.playTap();
                onSelectDifficulty(diff.id);
              }}
              className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-950/90 border border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold tracking-wider">{diff.label}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{diff.grid}</div>
            </button>
          );
        })}
      </div>

      {/* Minimalist Sector Progress Card */}
      <div className="bg-[#0A0F1D]/90 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="flex justify-center mb-3">
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <BitSprite size={48} />
          </div>
        </div>

        <div className="inline-block px-3 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-widest uppercase rounded mb-2">
          {currentDifficulty.toUpperCase().replace('_', ' ')} CAMPAIGN • INFINITE
        </div>

        <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">
          CURRENT OBJECTIVE
        </div>

        <div className="text-3xl font-extrabold text-slate-100 tracking-wider mb-2">
          SECTOR {String(currentLevel).padStart(2, '0')}
        </div>

        {/* Status Pills */}
        <div className="flex justify-center gap-3 text-xs text-slate-400 mb-6 font-mono">
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-bold">
            {completedCount} SECTORS CLEARED
          </span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400">
            GRID: {config.size}×{config.size}
          </span>
        </div>

        {/* Big Action: CONTINUE PLAYING */}
        <button
          onClick={() => {
            sounds.playClick(1000);
            onSelectLevel(currentDifficulty, currentLevel);
          }}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold uppercase tracking-widest text-sm rounded-xl transition-all transform active:scale-98 shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>START SECTOR {String(currentLevel).padStart(2, '0')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Quick previous sector replay if completed >= 1 */}
        {currentLevel > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              PREVIOUS: SECTOR {String(currentLevel - 1).padStart(2, '0')}
            </span>
            <button
              onClick={() => {
                sounds.playTap();
                onSelectLevel(currentDifficulty, currentLevel - 1);
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 underline cursor-pointer"
            >
              Replay ({prevBestTime ? formatTime(prevBestTime) : 'Done'})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
