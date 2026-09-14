import React, { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { UserProfile, LevelProgress, DailyRecord } from './db';
import type { CellState, Difficulty, PuzzleDefinition } from './types';
import { analyzeBoard } from './game/rules';
import { getCampaignLevel, getTotalLevels } from './game/campaign';
import { GridBoard } from './components/GridBoard';
import { GameControls } from './components/GameControls';
import { LevelSelect } from './components/LevelSelect';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { WinModal } from './components/WinModal';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { sounds } from './audio/sounds';
import { BitSprite } from './components/BitSprite';
import { Volume2, VolumeX, Calendar, LayoutGrid, Trophy, Terminal, Settings as SettingsIcon } from 'lucide-react';

export const App: React.FC = () => {
  // Application view modes
  const [view, setView] = useState<'levels' | 'game' | 'daily' | 'leaderboard'>('levels');

  // User Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Audio mute state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Campaign level progress cache map
  const [progressMap, setProgressMap] = useState<Map<string, LevelProgress>>(new Map());

  // Active Game State
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('easy');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(1);
  const [activePuzzle, setActivePuzzle] = useState<PuzzleDefinition | null>(null);
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [inputMode, setInputMode] = useState<'bit' | 'blocked'>('blocked');
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Timer
  const [timeMs, setTimeMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Daily Record
  const [, setDailyRecord] = useState<DailyRecord | null>(null);

  // 1. Initial Load: Check Profile & Progress in Dexie
  useEffect(() => {
    async function initStorage() {
      try {
        const user = await db.profile.get('local_user');
        if (!user) {
          setShowOnboarding(true);
        } else {
          setProfile(user);
        }

        // Load all level records
        const allProgress = await db.levels.toArray();
        const map = new Map<string, LevelProgress>();
        allProgress.forEach((p) => map.set(p.levelKey, p));
        setProgressMap(map);

        // Check today's daily record
        const todayStr = new Date().toISOString().split('T')[0];
        const dRec = await db.daily.get(todayStr);
        if (dRec) setDailyRecord(dRec);
        // Sync local completed scores to server in case of prior offline play
        if (user) {
          fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uuid: user.uuid, username: user.username })
          }).then(async () => {
            const completedOverall = allProgress.filter((l) => l.completed).length;
            const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'very_hard'];
            for (const d of diffs) {
              const count = allProgress.filter((l) => l.difficulty === d && l.completed).length;
              if (count > 0) {
                fetch('/api/score/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    uuid: user.uuid,
                    mode: 'campaign',
                    stat_type: `level_attained_${d}`,
                    value: count
                  })
                }).catch(() => {});
              }
            }
            if (completedOverall > 0) {
              fetch('/api/score/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uuid: user.uuid,
                  mode: 'campaign',
                  stat_type: 'level_attained',
                  value: completedOverall
                })
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Dexie init error:', err);
      }
    }
    initStorage();
  }, []);

  // Sync profile handle if user returns
  const handleOnboardingComplete = (username: string, uuid: string) => {
    setProfile({
      id: 'local_user',
      username,
      uuid,
      createdAt: Date.now()
    });
    setShowOnboarding(false);
  };

  // 2. Start a Level
  const startLevel = async (diff: Difficulty, levelIdx: number) => {
    const puzzle = getCampaignLevel(diff, levelIdx);
    const key = `${diff}_${levelIdx}`;
    const savedProgress = await db.levels.get(key);

    let initialGrid: CellState[][];
    // Check if saved progress exists and was created under current generator engine (v2)
    const savedGenVer = (savedProgress as unknown as { generatorVersion?: number })?.generatorVersion;
    if (
      savedProgress?.currentGridState &&
      !savedProgress.completed &&
      savedProgress.currentGridState.length === puzzle.size &&
      savedGenVer === 2
    ) {
      initialGrid = savedProgress.currentGridState;
    } else {
      initialGrid = Array.from({ length: puzzle.size }, () =>
        Array(puzzle.size).fill('empty')
      );
    }

    setGrid(initialGrid);
    setActivePuzzle(puzzle);
    setCurrentDifficulty(diff);
    setCurrentLevelIndex(levelIdx);
    setInputMode('blocked'); // Default to mark cross
    setLives(puzzle.lives);
    setIsGameOver(false);
    setIsGameWon(false);
    setTimeMs(0);
    setView('game');
  };

  // Start Daily Puzzle
  const startDailyPuzzle = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    let dailyPuzzle: PuzzleDefinition;

    try {
      const res = await fetch('/api/puzzle/daily');
      const data = await res.json();
      dailyPuzzle = data.puzzle;
    } catch {
      // Fallback offline daily puzzle generated from today's date seed
      const seed = todayStr.split('-').reduce((acc, part) => acc * 100 + parseInt(part), 0);
      const puzzle = getCampaignLevel('normal', (seed % 50) + 1);
      dailyPuzzle = {
        ...puzzle,
        id: `daily_${todayStr}`,
        name: `DAILY PROTOCOL [${todayStr}]`
      };
    }

    const emptyGrid: CellState[][] = Array.from({ length: dailyPuzzle.size }, () =>
      Array(dailyPuzzle.size).fill('empty')
    );
    setGrid(emptyGrid);
    setActivePuzzle(dailyPuzzle);
    setInputMode('blocked');
    setLives(dailyPuzzle.lives);
    setIsGameOver(false);
    setIsGameWon(false);
    setTimeMs(0);
    setView('game');
  };

  // 3. Timer Effect during active gameplay
  useEffect(() => {
    if (view === 'game' && !isGameWon && !isGameOver) {
      const startTime = Date.now() - timeMs;
      timerRef.current = window.setInterval(() => {
        setTimeMs(Date.now() - startTime);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, isGameWon, isGameOver]);

  // 4. Board Analysis and Real-Time Evaluation
  const boardAnalysis = activePuzzle ? analyzeBoard(grid, activePuzzle) : null;

  // Handle cell placement
  const handleCellChange = (r: number, c: number, newState: CellState) => {
    if (!activePuzzle || isGameOver || isGameWon) return;

    const newGrid = grid.map((rowArr, ri) =>
      rowArr.map((cell, ci) => (ri === r && ci === c ? newState : cell))
    );
    setGrid(newGrid);

    // Save ongoing state to Dexie
    if (activePuzzle) {
      db.levels.put({
        levelKey: activePuzzle.id,
        difficulty: activePuzzle.difficulty,
        completed: false,
        bestTimeMs: progressMap.get(activePuzzle.id)?.bestTimeMs || 0,
        currentGridState: newGrid,
        generatorVersion: 2
      }).catch(console.error);
    }

    // Check violations when placing a bit
    if (newState === 'bit') {
      const analysis = analyzeBoard(newGrid, activePuzzle);
      // If the newly placed bit immediately created a clash, deduct a life
      const hasClash = analysis.violations.some((v) => v.row === r && v.col === c);
      if (hasClash) {
        sounds.playError();
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setIsGameOver(true);
            sounds.playError();
          }
          return next;
        });
      }
    }
  };

  // Check Victory Condition
  useEffect(() => {
    if (!boardAnalysis || !activePuzzle || isGameWon || isGameOver) return;

    if (boardAnalysis.isComplete) {
      setIsGameWon(true);
      sounds.playWin();

      const key = activePuzzle.id;
      const isDaily = key.startsWith('daily_');
      const existingProg = progressMap.get(key);
      const best = existingProg?.bestTimeMs && existingProg.bestTimeMs > 0
        ? Math.min(existingProg.bestTimeMs, timeMs)
        : timeMs;

      // Update Dexie
      if (isDaily) {
        const todayStr = key.replace('daily_', '');
        db.daily.put({
          date: todayStr,
          completed: true,
          timeMs,
          syncedToLeaderboard: false
        });
        setDailyRecord({
          date: todayStr,
          completed: true,
          timeMs,
          syncedToLeaderboard: false
        });
      } else {
        const newProg: LevelProgress = {
          levelKey: key,
          difficulty: activePuzzle.difficulty,
          completed: true,
          bestTimeMs: best,
          currentGridState: undefined
        };
        db.levels.put(newProg).then(async () => {
          const updatedMap = new Map(progressMap);
          updatedMap.set(key, newProg);
          setProgressMap(updatedMap);

          // Submit highest level attained to server if online
          if (profile?.uuid) {
            try {
              // Ensure user is synced first
              await fetch('/api/user/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid: profile.uuid, username: profile.username })
              }).catch(() => {});

              // Calculate completed counts for this specific difficulty and overall
              const allLevels = await db.levels.toArray();
              const completedOverall = allLevels.filter(l => l.completed).length;
              const completedForDiff = allLevels.filter(l => l.difficulty === activePuzzle.difficulty && l.completed).length;

              // Submit specific difficulty score (e.g., 'level_attained_easy')
              await fetch('/api/score/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uuid: profile.uuid,
                  mode: 'campaign',
                  stat_type: `level_attained_${activePuzzle.difficulty}`,
                  value: completedForDiff
                })
              }).catch(() => {});

              // Also submit overall score
              await fetch('/api/score/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uuid: profile.uuid,
                  mode: 'campaign',
                  stat_type: 'level_attained',
                  value: completedOverall
                })
              }).catch(() => {});
            } catch (err) {
              console.warn('Score submission failed:', err);
            }
          }
        });
      }
    }
  }, [boardAnalysis, isGameWon, isGameOver]);

  const handleResetBoard = () => {
    if (!activePuzzle) return;
    const emptyGrid: CellState[][] = Array.from({ length: activePuzzle.size }, () =>
      Array(activePuzzle.size).fill('empty')
    );
    setGrid(emptyGrid);
  };

  const handleNextLevel = () => {
    const total = getTotalLevels(currentDifficulty);
    if (currentLevelIndex < total) {
      startLevel(currentDifficulty, currentLevelIndex + 1);
    } else {
      setView('levels');
    }
  };

  // Toggle Sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playTap();
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 font-mono relative overflow-hidden">
      {/* Background CRT and Grid styling */}
      <div className="crt-overlay fixed inset-0 z-40 pointer-events-none opacity-40" />

      {/* Retro Header Bar */}
      <header className="border-b border-slate-800/90 bg-[#070A12]/90 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div
            onClick={() => {
              sounds.playTap();
              setView('levels');
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <BitSprite size={24} className="group-hover:rotate-12 transition-transform" />
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-base text-emerald-400 font-sans flex items-center gap-1.5">
                BITDOKU
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 rounded">
                  v1.0
                </span>
              </span>
              <span className="text-[9px] text-slate-500 font-mono -mt-0.5">
                COZY RETRO-TECH LOGIC
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profile && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 font-bold">{profile.username}</span>
              </div>
            )}

            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                setShowSettings(true);
              }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
              title="Settings & Reset Progress"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col items-center justify-center z-10">
        {/* Navigation Tabs (when not inside active game) */}
        {view !== 'game' && (
          <div className="w-full max-w-xl mb-6">
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
              <button
                onClick={() => {
                  sounds.playTap();
                  setView('levels');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  view === 'levels'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>CAMPAIGN</span>
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  startDailyPuzzle();
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  view === 'daily'
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>DAILY</span>
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setView('leaderboard');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  view === 'leaderboard'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>RANKS</span>
              </button>
            </div>
          </div>
        )}

        {/* View 1: Level Select / Campaign */}
        {view === 'levels' && (
          <LevelSelect
            currentDifficulty={currentDifficulty}
            onSelectDifficulty={(diff) => setCurrentDifficulty(diff)}
            onSelectLevel={(diff, idx) => startLevel(diff, idx)}
            progressMap={progressMap}
          />
        )}

        {/* View 2: Active Gameplay Screen */}
        {view === 'game' && activePuzzle && (
          <div className="flex flex-col items-center gap-4 w-full">
            <GameControls
              levelName={activePuzzle.name || activePuzzle.id}
              lives={lives}
              maxLives={activePuzzle.lives}
              bitsPlaced={boardAnalysis?.bitCount || 0}
              totalBitsRequired={activePuzzle.size}
              timeMs={timeMs}
              inputMode={inputMode}
              setInputMode={setInputMode}
              onReset={handleResetBoard}
              onBack={() => setView('levels')}
              onShowRules={() => setShowRules(true)}
            />

            <GridBoard
              puzzle={activePuzzle}
              grid={grid}
              violations={boardAnalysis?.violations || []}
              inputMode={inputMode}
              readOnly={isGameOver || isGameWon}
              onCellChange={handleCellChange}
            />
          </div>
        )}

        {/* View 3: Leaderboard */}
        {view === 'leaderboard' && (
          <LeaderboardScreen currentUserUuid={profile?.uuid || ''} />
        )}
      </main>

      {/* Retro Monospace Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070A12]/90 py-2.5 px-4 text-center text-[10px] text-slate-500 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>QUEENS / STAR BATTLE CONSTRAINTS • OFFLINE-READY PWA</span>
          <span className="text-slate-600">BITDOKU // HOSTED ON LOCAL LAPTOP & CLOUDFLARE TUNNEL</span>
        </div>
      </footer>

      {/* Modals */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {isGameWon && activePuzzle && (
        <WinModal
          levelName={activePuzzle.name || activePuzzle.id}
          timeMs={timeMs}
          bestTimeMs={progressMap.get(activePuzzle.id)?.bestTimeMs}
          hasNextLevel={!activePuzzle.id.startsWith('daily_') && currentLevelIndex < getTotalLevels(currentDifficulty)}
          onNextLevel={handleNextLevel}
          onReplay={handleResetBoard}
          onBackToHub={() => {
            setIsGameWon(false);
            setIsGameOver(false);
            setActivePuzzle(null);
            setView('levels');
          }}
        />
      )}

      {isGameOver && activePuzzle && (
        <GameOverModal
          levelName={activePuzzle.name || activePuzzle.id}
          onRetry={() => {
            handleResetBoard();
            setLives(activePuzzle.lives);
            setIsGameOver(false);
          }}
          onBackToHub={() => {
            setIsGameWon(false);
            setIsGameOver(false);
            setActivePuzzle(null);
            setView('levels');
          }}
        />
      )}

      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}

      {showSettings && (
        <SettingsModal
          username={profile?.username || 'OPERATOR'}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onUpdateUsername={async (newName: string) => {
            if (!profile) return;
            const updated = { ...profile, username: newName };
            await db.profile.put(updated);
            setProfile(updated);
            // Sync new handle with server
            await fetch('/api/user/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uuid: profile.uuid, username: newName })
            }).catch(() => {});
          }}
          onResetProgress={async () => {
            await db.levels.clear();
            setProgressMap(new Map());
            setView('levels');
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
