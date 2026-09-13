import React, { useState } from 'react';
import { Terminal, ShieldAlert, Cpu } from 'lucide-react';
import { db } from '../db';
import { sounds } from '../audio/sounds';

interface OnboardingModalProps {
  onComplete: (username: string, uuid: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim().toUpperCase();
    if (!clean) {
      setError('HANDLE CANNOT BE EMPTY');
      sounds.playError();
      return;
    }
    if (clean.length > 12) {
      setError('MAX 12 CHARACTERS');
      sounds.playError();
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(clean)) {
      setError('ALPHANUMERIC ONLY (_ / - allowed)');
      sounds.playError();
      return;
    }

    setLoading(true);
    sounds.playClick(1000);

    const uuid = crypto.randomUUID();
    const userProfile = {
      id: 'local_user',
      username: clean,
      uuid,
      createdAt: Date.now()
    };

    try {
      await db.profile.put(userProfile);

      // Attempt remote sync if server is reachable
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid, username: clean })
        });
      } catch (err) {
        console.warn('Offline mode or server unavailable during sync:', err);
      }

      sounds.playWin();
      onComplete(clean, uuid);
    } catch (err) {
      console.error(err);
      setError('FAILED TO INITIALIZE MEMORY');
      sounds.playError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md border-2 border-emerald-500/80 bg-[#0c1220] p-6 text-slate-100 shadow-[0_0_30px_rgba(16,185,129,0.3)] pixel-corners relative">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-widest text-sm">
            <Terminal className="w-4 h-4 animate-pulse" />
            <span>[SYS_INIT]: IDENTIFY OPERATOR</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300">
            ROOT//v1.0
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-5 font-mono">
          Security protocol requires a registered memory operator identifier for sector indexing and leaderboard cryptographic signatures.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-emerald-300 mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Enter Handle (Max 12 chars):
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                maxLength={12}
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                  setError('');
                }}
                placeholder="OPERATOR_01"
                className="w-full bg-[#050811] border-2 border-emerald-500/50 focus:border-emerald-400 focus:outline-none px-3.5 py-2.5 font-mono text-emerald-300 uppercase tracking-widest text-base placeholder:text-slate-600"
              />
              <div className="absolute right-3 top-2.5 text-xs text-emerald-500/60 font-mono">
                {handle.length}/12
              </div>
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-widest text-sm transition-all transform active:scale-98 shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            <span>{loading ? 'INITIALIZING...' : '[ INITIALIZE BIT ]'}</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between font-mono">
          <span>MEM_ALLOC: 512KB</span>
          <span>OFFLINE_CAPABLE: TRUE</span>
        </div>
      </div>
    </div>
  );
};
