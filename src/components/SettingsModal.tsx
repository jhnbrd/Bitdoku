import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Trash2, Volume2, VolumeX, ShieldAlert, Check, Edit3 } from 'lucide-react';
import { sounds } from '../audio/sounds';

interface SettingsModalProps {
  username: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onUpdateUsername: (newName: string) => Promise<void>;
  onResetProgress: () => Promise<void>;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  username,
  soundEnabled,
  onToggleSound,
  onUpdateUsername,
  onResetProgress,
  onClose
}) => {
  const [editingName, setEditingName] = useState(false);
  const [handleInput, setHandleInput] = useState(username);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleSaveName = async () => {
    const clean = handleInput.trim().toUpperCase();
    if (!clean) {
      setNameError('EMPTY HANDLE');
      sounds.playError();
      return;
    }
    if (clean.length > 12) {
      setNameError('MAX 12 CHARS');
      sounds.playError();
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(clean)) {
      setNameError('ALPHANUMERIC ONLY');
      sounds.playError();
      return;
    }

    try {
      await onUpdateUsername(clean);
      sounds.playClick(1000);
      setNameSaved(true);
      setEditingName(false);
      setNameError('');
      setTimeout(() => setNameSaved(false), 2000);
    } catch {
      setNameError('SAVE FAILED');
      sounds.playError();
    }
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      sounds.playError();
      return;
    }

    setIsResetting(true);
    sounds.playError();
    await onResetProgress();
    setIsResetting(false);
    setResetDone(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono">
      <div className="w-full max-w-sm bg-[#0B0F19] border-2 border-slate-700 p-6 rounded-2xl shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-emerald-400 font-bold mb-5 pb-3 border-b border-slate-800">
          <SettingsIcon className="w-4 h-4" />
          <span className="text-sm tracking-wider">[SYSTEM CONFIGURATION]</span>
        </div>

        <div className="space-y-4 text-xs">
          {/* Operator Handle Edit */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">OPERATOR HANDLE:</span>
              {!editingName && (
                <button
                  onClick={() => {
                    sounds.playTap();
                    setEditingName(true);
                  }}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>CHANGE</span>
                </button>
              )}
            </div>

            {editingName ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={12}
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-[#050811] border border-emerald-500/60 px-2.5 py-1.5 font-mono text-emerald-300 uppercase tracking-widest text-xs rounded focus:outline-none focus:border-emerald-400"
                    placeholder="HANDLE"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded cursor-pointer text-xs"
                  >
                    SAVE
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setHandleInput(username);
                      setNameError('');
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer text-xs"
                  >
                    CANCEL
                  </button>
                </div>
                {nameError && <div className="text-[10px] text-rose-400">{nameError}</div>}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-sm tracking-wider">{username}</span>
                {nameSaved && <span className="text-[10px] text-emerald-400">UPDATED ✓</span>}
              </div>
            )}
          </div>

          {/* Audio Feedback */}
          <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              SFX AUDIO:
            </span>
            <button
              onClick={onToggleSound}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {soundEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          {/* Reset Progress Section */}
          <div className="bg-rose-950/20 border border-rose-900/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>DANGER ZONE</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Clears all locally saved campaign sector completions, best records, and in-progress matrices.
            </p>

            {resetDone ? (
              <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold py-2 bg-emerald-950/40 border border-emerald-500/40 rounded">
                <Check className="w-4 h-4" />
                <span>PROGRESS PURGED</span>
              </div>
            ) : (
              <button
                onClick={handleReset}
                disabled={isResetting}
                className={`w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  confirmReset
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/60 text-rose-300'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmReset ? 'CLICK TO CONFIRM FULL PURGE' : 'RESET CAMPAIGN PROGRESS'}</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase tracking-wider text-xs rounded transition-colors cursor-pointer"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
