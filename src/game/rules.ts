import type { CellState, CellViolation, PuzzleDefinition } from '../types';

export interface BoardAnalysis {
  violations: CellViolation[];
  isComplete: boolean;
  isFlawless: boolean;
  bitCount: number;
  rowCounts: number[];
  colCounts: number[];
  regionCounts: number[];
}

export function analyzeBoard(grid: CellState[][], puzzle: PuzzleDefinition): BoardAnalysis {
  const size = puzzle.size;
  const violations: CellViolation[] = [];
  const bitLocations: [number, number][] = [];

  const rowCounts = Array(size).fill(0);
  const colCounts = Array(size).fill(0);
  const regionCounts = Array(size).fill(0);

  if (!grid || !Array.isArray(grid) || grid.length !== size || !puzzle.regions) {
    return {
      violations: [],
      isComplete: false,
      isFlawless: true,
      bitCount: 0,
      rowCounts,
      colCounts,
      regionCounts
    };
  }

  for (let r = 0; r < size; r++) {
    if (!grid[r]) continue;
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 'bit') {
        bitLocations.push([r, c]);
        rowCounts[r]++;
        colCounts[c]++;
        const region = puzzle.regions[r]?.[c];
        if (region !== undefined && region >= 0 && region < size) {
          regionCounts[region]++;
        }
      }
    }
  }

  // Check adjacency violations (no two bits may touch orthogonally or diagonally)
  for (let i = 0; i < bitLocations.length; i++) {
    const [r1, c1] = bitLocations[i];
    for (let j = i + 1; j < bitLocations.length; j++) {
      const [r2, c2] = bitLocations[j];
      if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) {
        violations.push({ row: r1, col: c1, type: 'adjacent' });
        violations.push({ row: r2, col: c2, type: 'adjacent' });
      }
    }
  }

  // Check row violations (> 1 bit in row)
  for (let r = 0; r < size; r++) {
    if (rowCounts[r] > 1) {
      for (const [br, bc] of bitLocations) {
        if (br === r) {
          violations.push({ row: br, col: bc, type: 'row' });
        }
      }
    }
  }

  // Check col violations (> 1 bit in col)
  for (let c = 0; c < size; c++) {
    if (colCounts[c] > 1) {
      for (const [br, bc] of bitLocations) {
        if (bc === c) {
          violations.push({ row: br, col: bc, type: 'col' });
        }
      }
    }
  }

  // Check region violations (> 1 bit in region)
  for (let reg = 0; reg < size; reg++) {
    if (regionCounts[reg] > 1) {
      for (const [br, bc] of bitLocations) {
        if (puzzle.regions[br]?.[bc] === reg) {
          violations.push({ row: br, col: bc, type: 'region' });
        }
      }
    }
  }

  // Puzzle complete condition:
  // Exactly `size` bits placed, no violations, every row has 1, col has 1, region has 1
  const isComplete =
    bitLocations.length === size &&
    violations.length === 0 &&
    rowCounts.every(cnt => cnt === 1) &&
    colCounts.every(cnt => cnt === 1) &&
    regionCounts.every(cnt => cnt === 1);

  return {
    violations,
    isComplete,
    isFlawless: violations.length === 0,
    bitCount: bitLocations.length,
    rowCounts,
    colCounts,
    regionCounts
  };
}

// Visual color palette for memory block regions (pastel phosphor cyberpunk)
export const REGION_PALETTES = [
  { bg: 'bg-emerald-950/40', border: 'border-emerald-500/40', text: 'text-emerald-400', hex: '#10b981' },
  { bg: 'bg-cyan-950/40', border: 'border-cyan-500/40', text: 'text-cyan-400', hex: '#06b6d4' },
  { bg: 'bg-violet-950/40', border: 'border-violet-500/40', text: 'text-violet-400', hex: '#8b5cf6' },
  { bg: 'bg-amber-950/40', border: 'border-amber-500/40', text: 'text-amber-400', hex: '#f59e0b' },
  { bg: 'bg-pink-950/40', border: 'border-pink-500/40', text: 'text-pink-400', hex: '#ec4899' },
  { bg: 'bg-indigo-950/40', border: 'border-indigo-500/40', text: 'text-indigo-400', hex: '#6366f1' },
  { bg: 'bg-teal-950/40', border: 'border-teal-500/40', text: 'text-teal-400', hex: '#14b8a6' },
  { bg: 'bg-rose-950/40', border: 'border-rose-500/40', text: 'text-rose-400', hex: '#f43f5e' },
  { bg: 'bg-lime-950/40', border: 'border-lime-500/40', text: 'text-lime-400', hex: '#84cc16' },
  { bg: 'bg-sky-950/40', border: 'border-sky-500/40', text: 'text-sky-400', hex: '#0ea5e9' }
];
