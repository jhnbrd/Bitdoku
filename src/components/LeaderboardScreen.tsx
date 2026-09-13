import React, { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../types';
import { Trophy, Flame, RefreshCw, UserCheck } from 'lucide-react';
import { sounds } from '../audio/sounds';

interface LeaderboardScreenProps {
  currentUserUuid: string;
}

type RankCategory = 
  | 'level_attained_easy'
  | 'level_attained_normal'
  | 'level_attained_hard'
  | 'level_attained_very_hard'
  | 'level_attained'
  | 'daily_streak';

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ currentUserUuid }) => {
  const [tab, setTab] = useState<RankCategory>('level_attained_easy');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tabs: { id: RankCategory; label: string; sub: string }[] = [
    { id: 'level_attained_easy', label: 'EASY', sub: '6×6' },
    { id: 'level_attained_normal', label: 'NORMAL', sub: '8×8' },
    { id: 'level_attained_hard', label: 'HARD', sub: '9×9' },
    { id: 'level_attained_very_hard', label: 'VERY HARD', sub: '10×10' },
    { id: 'level_attained', label: 'OVERALL', sub: 'Total' },
    { id: 'daily_streak', label: 'DAILY', sub: 'Streak' }
  ];

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leaderboard?type=${tab}&limit=50`);
      if (!res.ok) throw new Error('Could not connect to leaderboard node');
      const data = await res.json();
      setEntries(data.leaderboard || []);
    } catch (err: unknown) {
      console.warn('Leaderboard fetch error (offline mode):', err);
      setError('OFFLINE / SERVER UNREACHABLE - LOCAL CACHE ACTIVE');
      // Mock / fallback placeholder for offline preview
      setEntries([
        { rank: 1, username: 'CYBER_VIPER', uuid: 'mock-1', value: 24, updated_at: '2026-09-14' },
        { rank: 2, username: 'NEO_GLITCH', uuid: 'mock-2', value: 18, updated_at: '2026-09-14' },
        { rank: 3, username: 'BIT_MASTER', uuid: currentUserUuid, value: 12, updated_at: '2026-09-14' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [tab]);

  const activeTabConfig = tabs.find(t => t.id === tab);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 font-mono">
      {/* Category Pills */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-slate-900/70 border border-slate-800 rounded-xl">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                sounds.playTap();
                setTab(t.id);
              }}
              className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer ${
                isActive
                  ? t.id === 'daily_streak'
                    ? 'bg-amber-950/90 border border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-emerald-950/90 border border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[10px] font-bold tracking-wider">{t.label}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">{t.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-[#0A0F1D]/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            {tab === 'daily_streak' ? (
              <Flame className="w-4 h-4 text-amber-400" />
            ) : (
              <Trophy className="w-4 h-4 text-emerald-400" />
            )}
            <span>
              {activeTabConfig?.label} RANKINGS (TOP 50)
            </span>
          </div>

          <button
            onClick={() => {
              sounds.playClick(1100);
              fetchLeaderboard();
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 p-1 flex items-center gap-1 cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>SYNC</span>
          </button>
        </div>

        {error && (
          <div className="text-[11px] text-amber-400/90 bg-amber-950/40 border border-amber-500/30 p-2 rounded mb-3 text-center">
            {error}
          </div>
        )}

        {/* Entries list */}
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {entries.length === 0 && !loading && (
            <div className="text-center text-xs text-slate-500 py-8">
              NO OPERATORS INDEXED FOR THIS CATEGORY YET
            </div>
          )}

          {entries.map((item, idx) => {
            const isSelf = item.uuid === currentUserUuid;
            return (
              <div
                key={item.uuid || idx}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                  isSelf
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 text-center font-bold ${
                      idx === 0
                        ? 'text-amber-400'
                        : idx === 1
                        ? 'text-slate-300'
                        : idx === 2
                        ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tracking-wider">{item.username}</span>
                    {isSelf && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                        <UserCheck className="w-2.5 h-2.5" /> YOU
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-bold text-sm">
                  {item.value} <span className="text-[10px] text-slate-500 font-normal">
                    {tab === 'daily_streak' ? 'DAYS' : 'SECTORS'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
