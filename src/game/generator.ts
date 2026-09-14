import type { Difficulty, PuzzleDefinition } from '../types';

// ---------------------------------------------------------------------------
// Pseudo-random number generator with seed
// ---------------------------------------------------------------------------
export class SeededRandom {
  private s: number;
  constructor(seed: number) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }

  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// ---------------------------------------------------------------------------
// Check adjacency: no two queens may touch (including diagonally)
// ---------------------------------------------------------------------------
export function isValidQueensPlacement(
  queens: [number, number][],
  row: number,
  col: number
): boolean {
  for (const [r, c] of queens) {
    if (c === col) return false;
    if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Find a valid N-queens placement (1/row, 1/col, no adjacency)
// ---------------------------------------------------------------------------
export function findQueenPlacements(
  size: number,
  rng: SeededRandom
): [number, number][] | null {
  const queens: [number, number][] = [];

  function solve(row: number): boolean {
    if (row === size) return true;
    const cols = rng.shuffle(Array.from({ length: size }, (_, i) => i));
    for (const col of cols) {
      if (isValidQueensPlacement(queens, row, col)) {
        queens.push([row, col]);
        if (solve(row + 1)) return true;
        queens.pop();
      }
    }
    return false;
  }

  if (solve(0)) return queens;
  return null;
}

// ---------------------------------------------------------------------------
// Generate contiguous regions (Voronoi flood-fill from queen seeds)
// ---------------------------------------------------------------------------
export function generateRegions(
  size: number,
  queens: [number, number][],
  rng: SeededRandom
): number[][] {
  const grid: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(-1)
  );
  const queue: { r: number; c: number; region: number }[] = [];

  queens.forEach(([r, c], regionIndex) => {
    grid[r][c] = regionIndex;
    queue.push({ r, c, region: regionIndex });
  });

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const idx = rng.nextInt(0, queue.length - 1);
    const { r, c, region } = queue.splice(idx, 1)[0];
    const shuffledDirs = rng.shuffle(directions);
    for (const [dr, dc] of shuffledDirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 && nr < size &&
        nc >= 0 && nc < size &&
        grid[nr][nc] === -1
      ) {
        grid[nr][nc] = region;
        queue.push({ r: nr, c: nc, region });
      }
    }
  }

  // Check that no region is starved (< 2 cells on small boards, < 3 cells on larger boards)
  // If any region is undersized, reject and let caller re-seed for a balanced board.
  const minCells = size <= 6 ? 2 : 3;
  const counts = Array(size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] >= 0 && grid[r][c] < size) {
        counts[grid[r][c]]++;
      }
    }
  }
  if (counts.some(cnt => cnt < minCells)) {
    // Return empty grid to signal unacceptable region balance
    return [];
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Build the list of cells for each region (precomputed for solver speed)
// ---------------------------------------------------------------------------
function buildRegionCells(size: number, regions: number[][]): [number, number][][] {
  const cells: [number, number][][] = Array.from({ length: size }, () => []);
  if (!regions || regions.length !== size) return cells;
  for (let r = 0; r < size; r++) {
    if (!regions[r] || regions[r].length !== size) continue;
    for (let c = 0; c < size; c++) {
      const reg = regions[r][c];
      if (reg >= 0 && reg < size) {
        cells[reg].push([r, c]);
      }
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Count solutions -- region-by-region solver (correct, deadlock-aware)
//
// Iterates over each region and tries placing a queen in every valid cell.
// Immediately detects boxed-out regions (no valid cells) and backtracks.
//
// Constraints enforced:
//   1 queen per region / 1 per row / 1 per col / no adjacency
// ---------------------------------------------------------------------------
export function countSolutions(
  size: number,
  regions: number[][],
  maxLimit: number = 2
): number {
  const regionCells = buildRegionCells(size, regions);

  // Validate that every region has at least one cell
  for (let reg = 0; reg < size; reg++) {
    if (regionCells[reg].length === 0) return 0;
  }

  let count = 0;
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();
  const queens: [number, number][] = [];

  function solve(regIdx: number): void {
    if (count >= maxLimit) return;
    if (regIdx === size) {
      count++;
      return;
    }

    for (const [r, c] of regionCells[regIdx]) {
      if (usedRows.has(r)) continue;
      if (usedCols.has(c)) continue;

      // Check no-adjacency against all placed queens
      let adjacentClash = false;
      for (const [qr, qc] of queens) {
        if (Math.abs(qr - r) <= 1 && Math.abs(qc - c) <= 1) {
          adjacentClash = true;
          break;
        }
      }
      if (adjacentClash) continue;

      queens.push([r, c]);
      usedRows.add(r);
      usedCols.add(c);

      solve(regIdx + 1);

      queens.pop();
      usedRows.delete(r);
      usedCols.delete(c);
    }
  }

  solve(0);
  return count;
}

// ---------------------------------------------------------------------------
// Logical solvability check -- full constraint propagation (no guessing)
//
// Uses a candidate-elimination approach with 7 deduction techniques:
//
//   1. Naked single in region
//         Only 1 candidate cell left for a region -> place queen there
//
//   2. Pointing region->row
//         All candidates of region R are in the same row ->
//         no OTHER region can use that row -> eliminate from others
//
//   3. Pointing region->col
//         Same as above but for columns
//
//   4. Row-locked region  [KEY MISSING DEDUCTION]
//         Only 1 unplaced region has any candidate in row R ->
//         that region MUST use row R ->
//         eliminate all of that region's cells NOT in row R
//
//   5. Col-locked region  [KEY MISSING DEDUCTION]
//         Same as above but for columns
//
//   6. Hidden single in row
//         Only 1 specific (region, col) combo can fill row R -> place it
//
//   7. Hidden single in col
//         Only 1 specific (region, row) combo can fill col C -> place it
//
// Returns true only if the puzzle fully resolves without any guessing.
// ---------------------------------------------------------------------------
export function isLogicallySolvable(size: number, regions: number[][]): boolean {
  const regionCells = buildRegionCells(size, regions);

  for (let reg = 0; reg < size; reg++) {
    if (regionCells[reg].length === 0) return false;
  }

  // candidate[r][c] = true means cell (r,c) is still a valid placement
  const candidate: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(true)
  );
  const placedRegions = new Set<number>();
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  function eliminate(r: number, c: number): void {
    candidate[r][c] = false;
  }

  // Place queen at (r,c) for region reg.
  // Propagates: eliminates entire row, col, and all 8 adjacent cells.
  function placeQueen(reg: number, r: number, c: number): void {
    placedRegions.add(reg);
    usedRows.add(r);
    usedCols.add(c);
    for (let i = 0; i < size; i++) {
      candidate[r][i] = false;
      candidate[i][c] = false;
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          candidate[nr][nc] = false;
        }
      }
    }
  }

  // Live candidate cells for a region
  function getRegionCandidates(reg: number): [number, number][] {
    if (placedRegions.has(reg)) return [];
    return regionCells[reg].filter(([r, c]) => candidate[r][c]);
  }

  // Constraint propagation loop
  let progress = true;
  while (progress) {
    progress = false;

    // --- Deadlock check: unplaced region with 0 candidates -> unsolvable ---
    for (let reg = 0; reg < size; reg++) {
      if (placedRegions.has(reg)) continue;
      if (getRegionCandidates(reg).length === 0) return false;
    }

    // --- 1. Naked single in region ---
    for (let reg = 0; reg < size; reg++) {
      if (placedRegions.has(reg)) continue;
      const cands = getRegionCandidates(reg);
      if (cands.length === 0) return false;
      if (cands.length === 1) {
        placeQueen(reg, cands[0][0], cands[0][1]);
        progress = true;
      }
    }

    // --- 2. Pointing region->row ---
    for (let reg = 0; reg < size; reg++) {
      if (placedRegions.has(reg)) continue;
      const cands = getRegionCandidates(reg);
      if (cands.length === 0) return false;
      const rowSet = new Set(cands.map(([r]) => r));
      if (rowSet.size === 1) {
        const lockedRow = cands[0][0];
        for (let otherReg = 0; otherReg < size; otherReg++) {
          if (otherReg === reg || placedRegions.has(otherReg)) continue;
          for (const [r, c] of regionCells[otherReg]) {
            if (r === lockedRow && candidate[r][c]) {
              eliminate(r, c);
              progress = true;
            }
          }
        }
      }
    }

    // --- 3. Pointing region->col ---
    for (let reg = 0; reg < size; reg++) {
      if (placedRegions.has(reg)) continue;
      const cands = getRegionCandidates(reg);
      if (cands.length === 0) return false;
      const colSet = new Set(cands.map(([, c]) => c));
      if (colSet.size === 1) {
        const lockedCol = cands[0][1];
        for (let otherReg = 0; otherReg < size; otherReg++) {
          if (otherReg === reg || placedRegions.has(otherReg)) continue;
          for (const [r, c] of regionCells[otherReg]) {
            if (c === lockedCol && candidate[r][c]) {
              eliminate(r, c);
              progress = true;
            }
          }
        }
      }
    }

    // --- 4. Row-locked region ---
    // If only 1 unplaced region has any candidate in row R, that region
    // MUST place its queen in row R -> eliminate its cells NOT in row R.
    for (let row = 0; row < size; row++) {
      if (usedRows.has(row)) continue;
      let lockedReg = -1;
      let ambiguous = false;
      for (let reg = 0; reg < size; reg++) {
        if (placedRegions.has(reg)) continue;
        if (getRegionCandidates(reg).some(([r]) => r === row)) {
          if (lockedReg === -1) {
            lockedReg = reg;
          } else {
            ambiguous = true;
            break;
          }
        }
      }
      if (!ambiguous && lockedReg !== -1) {
        for (const [r, c] of regionCells[lockedReg]) {
          if (r !== row && candidate[r][c]) {
            eliminate(r, c);
            progress = true;
          }
        }
      }
    }

    // --- 5. Col-locked region ---
    // If only 1 unplaced region has any candidate in col C, that region
    // MUST place its queen in col C -> eliminate its cells NOT in col C.
    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue;
      let lockedReg = -1;
      let ambiguous = false;
      for (let reg = 0; reg < size; reg++) {
        if (placedRegions.has(reg)) continue;
        if (getRegionCandidates(reg).some(([, c]) => c === col)) {
          if (lockedReg === -1) {
            lockedReg = reg;
          } else {
            ambiguous = true;
            break;
          }
        }
      }
      if (!ambiguous && lockedReg !== -1) {
        for (const [r, c] of regionCells[lockedReg]) {
          if (c !== col && candidate[r][c]) {
            eliminate(r, c);
            progress = true;
          }
        }
      }
    }

    // --- 6. Hidden single in row ---
    // Only 1 specific (region, col) pair has a candidate in row R -> place it.
    for (let row = 0; row < size; row++) {
      if (usedRows.has(row)) continue;
      const rowOptions: { reg: number; col: number }[] = [];
      for (let reg = 0; reg < size; reg++) {
        if (placedRegions.has(reg)) continue;
        for (const [r, c] of getRegionCandidates(reg)) {
          if (r === row) rowOptions.push({ reg, col: c });
        }
      }
      if (rowOptions.length === 1 && !placedRegions.has(rowOptions[0].reg)) {
        placeQueen(rowOptions[0].reg, row, rowOptions[0].col);
        progress = true;
      }
    }

    // --- 7. Hidden single in col ---
    // Only 1 specific (region, row) pair has a candidate in col C -> place it.
    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue;
      const colOptions: { reg: number; row: number }[] = [];
      for (let reg = 0; reg < size; reg++) {
        if (placedRegions.has(reg)) continue;
        for (const [r, c] of getRegionCandidates(reg)) {
          if (c === col) colOptions.push({ reg, row: r });
        }
      }
      if (colOptions.length === 1 && !placedRegions.has(colOptions[0].reg)) {
        placeQueen(colOptions[0].reg, colOptions[0].row, col);
        progress = true;
      }
    }
  }

  return placedRegions.size === size;
}

// ---------------------------------------------------------------------------
// Validate that the generated solution array matches the regions
// ---------------------------------------------------------------------------
function validateSolution(
  size: number,
  regions: number[][],
  queens: [number, number][]
): boolean {
  if (queens.length !== size) return false;

  const usedRows = new Set<number>();
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  for (let i = 0; i < queens.length; i++) {
    const [r, c] = queens[i];
    const reg = regions[r]?.[c];
    if (reg === undefined || reg < 0 || reg >= size) return false;
    if (usedRows.has(r) || usedCols.has(c) || usedRegions.has(reg)) return false;
    // Check adjacency against other queens
    for (let j = 0; j < i; j++) {
      const [qr, qc] = queens[j];
      if (Math.abs(qr - r) <= 1 && Math.abs(qc - c) <= 1) return false;
    }
    usedRows.add(r);
    usedCols.add(c);
    usedRegions.add(reg);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Difficulty configs
// ---------------------------------------------------------------------------
export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { size: number; lives: number; count: number }
> = {
  easy: { size: 6, lives: 3, count: 30 },
  normal: { size: 8, lives: 3, count: 50 },
  hard: { size: 9, lives: 2, count: 40 },
  very_hard: { size: 10, lives: 1, count: 30 }
};

// ---------------------------------------------------------------------------
// Generate a certified puzzle
//   1. Unique solution (exactly 1)
//   2. Solution passes all rules (1/row, 1/col, 1/region, no adjacency)
//   3. Logically solvable without guessing (constraint propagation only)
// ---------------------------------------------------------------------------
export function generateValidPuzzle(
  id: string,
  difficulty: Difficulty,
  seed: number,
  customSize?: number,
  customLives?: number
): PuzzleDefinition {
  const config = DIFFICULTY_CONFIG[difficulty];
  const size = customSize || config.size;
  const lives = customLives || config.lives;

  // Scale attempt count with board size -- larger boards need more seeds.
  const maxPrimaryAttempts = size <= 6 ? 100 : size <= 8 ? 300 : size <= 9 ? 800 : 2000;

  let currentSeed = seed;
  for (let attempt = 0; attempt < maxPrimaryAttempts; attempt++) {
    const rng = new SeededRandom(currentSeed);
    const queens = findQueenPlacements(size, rng);

    if (queens && queens.length === size) {
      const regions = generateRegions(size, queens, rng);
      if (regions.length !== size) {
        currentSeed += 7919;
        continue;
      }

      // 1. Unique solution check
      const solCount = countSolutions(size, regions, 2);
      if (solCount !== 1) {
        currentSeed += 7919;
        continue;
      }

      // 2. Solution integrity check
      if (!validateSolution(size, regions, queens)) {
        currentSeed += 7919;
        continue;
      }

      // 3. Logical solvability -- no guessing required
      if (!isLogicallySolvable(size, regions)) {
        currentSeed += 7919;
        continue;
      }

      return {
        id,
        difficulty,
        size,
        regions,
        solution: queens,
        lives,
        name: `${difficulty.toUpperCase()} Sector #${id.split('_')[1] || id}`
      };
    }

    currentSeed += 7919;
  }

  // Extended fallback: wider seed range with unique prime stepping.
  // Strictly enforces all rules: unique solution, valid solution, and logical solvability.
  const fallbackStep = 104729;
  let fallbackSeed = seed + 1_000_000;
  const maxFallbackAttempts = size <= 8 ? 800 : 2500;
  for (let attempt = 0; attempt < maxFallbackAttempts; attempt++) {
    const rng = new SeededRandom(fallbackSeed);
    const queens = findQueenPlacements(size, rng);

    if (queens && queens.length === size) {
      const regions = generateRegions(size, queens, rng);
      if (regions.length === size) {
        const solCount = countSolutions(size, regions, 2);

        if (
          solCount === 1 &&
          validateSolution(size, regions, queens) &&
          isLogicallySolvable(size, regions)
        ) {
          return {
            id,
            difficulty,
            size,
            regions,
            solution: queens,
            lives,
            name: `${difficulty.toUpperCase()} Sector #${id.split('_')[1] || id}`
          };
        }
      }
    }

    fallbackSeed += fallbackStep;
  }

  // Absolute last resort: wider search with high-density step.
  // Still guarantees 100% compliance with all rules.
  let lastResortSeed = seed + 10_000_000;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const rng = new SeededRandom(lastResortSeed);
    const queens = findQueenPlacements(size, rng);
    if (queens && queens.length === size) {
      const regions = generateRegions(size, queens, rng);
      if (
        regions.length === size &&
        countSolutions(size, regions, 2) === 1 &&
        validateSolution(size, regions, queens) &&
        isLogicallySolvable(size, regions)
      ) {
        return {
          id,
          difficulty,
          size,
          regions,
          solution: queens,
          lives,
          name: `${difficulty.toUpperCase()} Sector #${id.split('_')[1] || id}`
        };
      }
    }
    lastResortSeed += 37;
  }

  throw new Error(
    `[Bitdoku] Failed to generate a valid puzzle for ${difficulty} with seed ${seed}. ` +
    `Please report this as a bug.`
  );
}
