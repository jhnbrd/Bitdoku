import React, { useState, useRef } from 'react';
import type { CellState, CellViolation, PuzzleDefinition } from '../types';
import { REGION_PALETTES } from '../game/rules';
import { BitSprite } from './BitSprite';
import { sounds } from '../audio/sounds';
import { X } from 'lucide-react';

interface GridBoardProps {
  puzzle: PuzzleDefinition;
  grid: CellState[][];
  violations: CellViolation[];
  inputMode: 'bit' | 'blocked';
  readOnly?: boolean;
  onCellChange: (row: number, col: number, newState: CellState) => void;
}

export const GridBoard: React.FC<GridBoardProps> = ({
  puzzle,
  grid,
  violations,
  inputMode,
  readOnly = false,
  onCellChange
}) => {
  const size = puzzle.size;
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const isDraggingRef = useRef(false);
  const dragTargetStateRef = useRef<CellState | null>(null);

  // Quick lookup for violations
  const violationMap = new Set(violations.map(v => `${v.row},${v.col}`));

  const applyCellState = (r: number, c: number, state: CellState) => {
    if (readOnly) return;
    if (grid[r][c] !== state) {
      if (state === 'blocked') sounds.playCross();
      else if (state === 'bit') sounds.playClick(900);
      else sounds.playClick(600);
      onCellChange(r, c, state);
    }
  };

  const handlePointerDown = (r: number, c: number, e: React.PointerEvent) => {
    if (readOnly) return;
    isDraggingRef.current = true;

    // Right-click or touch/left click when in 'blocked' mode
    if (e.button === 2) {
      e.preventDefault();
      const target: CellState = grid[r][c] === 'blocked' ? 'empty' : 'blocked';
      dragTargetStateRef.current = target;
      applyCellState(r, c, target);
      return;
    }

    if (inputMode === 'blocked') {
      const target: CellState = grid[r][c] === 'blocked' ? 'empty' : 'blocked';
      dragTargetStateRef.current = target;
      applyCellState(r, c, target);
    } else {
      // Bit mode click
      const current = grid[r][c];
      const target: CellState = current === 'bit' ? 'empty' : 'bit';
      dragTargetStateRef.current = target;
      applyCellState(r, c, target);
    }
  };

  const handlePointerEnter = (r: number, c: number) => {
    setHoveredCell([r, c]);
    if (readOnly || !isDraggingRef.current || dragTargetStateRef.current === null) return;
    // When dragging in 'blocked' mode or right-click dragging, quickly paint the target state
    if (inputMode === 'blocked' || dragTargetStateRef.current === 'blocked' || dragTargetStateRef.current === 'empty') {
      applyCellState(r, c, dragTargetStateRef.current);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragTargetStateRef.current = null;
  };

  // Touch drag support via coordinates
  const handleTouchMove = (e: React.TouchEvent) => {
    if (readOnly || !isDraggingRef.current || dragTargetStateRef.current === null) return;
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elem) return;
    const rStr = elem.getAttribute('data-row');
    const cStr = elem.getAttribute('data-col');
    if (rStr !== null && cStr !== null) {
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);
      if (!isNaN(r) && !isNaN(c)) {
        applyCellState(r, c, dragTargetStateRef.current);
      }
    }
  };

  // Helper to determine region border thickness between adjacent cells
  const getBorderClasses = (r: number, c: number) => {
    const region = puzzle.regions[r][c];
    const classes = [];

    // Top border
    if (r > 0 && puzzle.regions[r - 1][c] !== region) {
      classes.push('border-t-2 border-t-slate-200/80');
    } else if (r === 0) {
      classes.push('border-t-2 border-t-slate-600/90');
    } else {
      classes.push('border-t border-t-slate-800/40');
    }

    // Bottom border
    if (r < size - 1 && puzzle.regions[r + 1][c] !== region) {
      classes.push('border-b-2 border-b-slate-200/80');
    } else if (r === size - 1) {
      classes.push('border-b-2 border-b-slate-600/90');
    } else {
      classes.push('border-b border-b-slate-800/40');
    }

    // Left border
    if (c > 0 && puzzle.regions[r][c - 1] !== region) {
      classes.push('border-l-2 border-l-slate-200/80');
    } else if (c === 0) {
      classes.push('border-l-2 border-l-slate-600/90');
    } else {
      classes.push('border-l border-l-slate-800/40');
    }

    // Right border
    if (c < size - 1 && puzzle.regions[r][c + 1] !== region) {
      classes.push('border-r-2 border-r-slate-200/80');
    } else if (c === size - 1) {
      classes.push('border-r-2 border-r-slate-600/90');
    } else {
      classes.push('border-r border-r-slate-800/40');
    }

    return classes.join(' ');
  };

  return (
    <div className="relative inline-block select-none p-1.5 rounded-xl bg-[#080d1a] border-2 border-slate-700/80 shadow-[0_0_35px_rgba(0,0,0,0.6)]">
      {/* Grid Matrix */}
      <div
        className="grid gap-0 touch-none"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          width: `min(90vw, ${size * (size >= 9 ? 44 : 52)}px)`,
          height: `min(90vw, ${size * (size >= 9 ? 44 : 52)}px)`
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePointerUp}
      >
        {grid.map((row, r) =>
          row.map((cellState, c) => {
            const regionId = puzzle.regions[r][c];
            const palette = REGION_PALETTES[regionId % REGION_PALETTES.length];
            const isViolating = violationMap.has(`${r},${c}`);
            const isHovered = hoveredCell && hoveredCell[0] === r && hoveredCell[1] === c;
            const borderClasses = getBorderClasses(r, c);

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                data-row={r}
                data-col={c}
                onPointerDown={(e) => handlePointerDown(r, c, e)}
                onPointerEnter={() => handlePointerEnter(r, c)}
                onPointerLeave={() => setHoveredCell(null)}
                onContextMenu={(e) => e.preventDefault()}
                disabled={readOnly}
                className={`relative flex items-center justify-center transition-colors aspect-square cursor-pointer touch-none ${palette.bg} ${borderClasses} ${
                  isViolating ? 'bg-rose-950/70' : ''
                } ${isHovered && !readOnly ? 'brightness-125' : ''}`}
              >
                {/* Region Tint Overlay */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{ backgroundColor: palette.hex }}
                />

                {/* Placed Bit Sprite */}
                {cellState === 'bit' && (
                  <BitSprite
                    isViolating={isViolating}
                    size={size >= 9 ? 24 : 32}
                  />
                )}

                {/* Placed Cross / Blocked Mark */}
                {cellState === 'blocked' && (
                  <div className="flex items-center justify-center text-slate-500/80 font-bold">
                    <X className={size >= 9 ? "w-4 h-4 text-slate-500" : "w-5 h-5 text-slate-400"} strokeWidth={3} />
                  </div>
                )}

                {/* Subtle row / col index on corner borders */}
                {r === 0 && (
                  <span className="absolute -top-3.5 text-[8px] font-mono text-slate-600">
                    {c}
                  </span>
                )}
                {c === 0 && (
                  <span className="absolute -left-3 text-[8px] font-mono text-slate-600">
                    {r}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
