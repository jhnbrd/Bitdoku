import React from 'react';
import { X, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';
import { BitSprite } from './BitSprite';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="w-full max-w-md bg-[#0C1220] border-2 border-slate-700 p-6 rounded-xl text-slate-200 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-emerald-400 font-bold mb-4 border-b border-slate-800 pb-3">
          <Cpu className="w-5 h-5" />
          <span className="text-base tracking-wider">[MEMORY OPERATOR PROTOCOL]</span>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <p className="text-slate-400">
            You must allocate exactly one Kawaii Bit-Sprite (<BitSprite size={14} className="inline-flex" />) into each memory partition without triggering hardware interference.
          </p>

          <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-2">
            <div className="flex items-start gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span><strong>One Bit Per Row & Column:</strong> Every row and every column must contain exactly 1 bit.</span>
            </div>
            <div className="flex items-start gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span><strong>One Bit Per Sector:</strong> Every colored memory sector region must contain exactly 1 bit.</span>
            </div>
            <div className="flex items-start gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span><strong>No Touching:</strong> Bits emit electrostatic interference! No two bits may touch horizontally, vertically, or diagonally.</span>
            </div>
          </div>

          <div className="space-y-1 text-slate-400">
            <div className="text-slate-200 font-bold">OPERATOR CONTROLS:</div>
            <div>- <strong>Click/Tap:</strong> Place Bit or Cross based on active mode.</div>
            <div>- <strong>Right-Click (Desktop):</strong> Instantly toggle Cross mark (X).</div>
            <div>- <strong>Mark Cross (X):</strong> Use crosses to rule out impossible memory cells.</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-wider text-xs rounded transition-colors cursor-pointer"
        >
          ACKNOWLEDGE PROTOCOL
        </button>
      </div>
    </div>
  );
};
