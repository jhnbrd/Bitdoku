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

  // Patch any orphaned cells (rare edge case)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === -1) {
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 && nr < size &&
            nc >= 0 && nc < size &&
            grid[nr][nc] !== -1
          ) {
            grid[r][c] = grid[nr][nc];
            break;
          }
        }
      }
    }
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Build the list of cells for each region (precomputed for solver speed)
// ---------------------------------------------------------------------------
function buildRegionCells(size: number, regions: number[][]): [number, number][][] {
  const cells: [number, number][][] = Array.from({ length: size }, () => []);
  for (let r = 0; r < size; r++) {
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
// Count solutions — region-by-region solver (correct, deadlock-aware)
//
// This solver iterates over each region in turn and tries to place a queen
// in any valid cell of that region.  Because regions are tried in order, the
// solver immediately detects when a region has NO valid remaining cell and
// backtracks — catching "boxed-out region" deadlocks that the old row-by-row
// approach missed.
//
// Constraints enforced:
//   • 1 queen per region   (outer loop)
//   • 1 queen per row      (usedRows set)
//   • 1 queen per column   (usedCols set)
//   • No adjacency / touching (Chebyshev distance > 1)
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
// Logical solvability check — full constraint propagation (no guessing)
//
// Uses a candidate-elimination approach:
//   1. Tracks a boolean candidate grid (which cells are still valid)
//   2. Propagates eliminations when a queen is placed (row, col, adjacency)
//   3. Detects forced moves via:
//      • Naked single in region  (only 1 candidate cell left for a region)
//      • Naked single in row     (only 1 unplaced region has any candidate in this row)
//      • Naked single in column  (same for columns)
//      • Pointing region-row     (all region candidates in 1 row → eliminate
//                                  that row from all other unplaced regions)
//      • Pointing region-col     (same for columns)
//
// Returns true only if the puzzle resolves fully without any guessing.
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

  // Eliminate cell (r, c) from candidates (idempotent)
  function eliminate(r: number, c: number): void {
    candidate[r][c] = false;
  }

  // Place a queen at (r, c) for region reg.
  // Propagates: eliminates entire row, entire col, all adjacent cells.
  function placeQueen(reg: number, r: number, c: number): void {
    placedRegions.add(reg);
    usedRows.add(r);
    usedCols.add(c);
    // Eliminate row and col
    for (let i = 0; i < size; i++) {
      candidate[r][i] = false;
      candidate[i][c] = false;
    }
    // Eliminate adjacent 8 cells
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

  // Get live candidate cells for a region
  function getRegionCandidates(reg: number): [number, number][] {
    return regionCells[reg].filter(([r, c]) =>
      !placedRegions.has(reg) && candidate[r][c]
    );
  }

  // Constraint propagation loop
  let progress = true;
  while (progress) {
    progress = false;

    // --- 1. Naked single in region (only 1 candidate cell) ---
    for (let reg = 0; reg < size; reg++) {
      if (placedRegions.has(reg)) continue;
      const cands = getRegionCandidates(reg);
      if (cands.length === 0) return false; // Deadlock
      if (cands.length === 1) {
        placeQueen(reg, cands[0][0], cands[0][1]);
        progress = true;
      }
    }

    // --- 2. Hidden single in row (only 1 region can go in this row) ---
    for (let row = 0; row < size; row++) {
      if (usedRows.has(row)) continue;
      let matchReg = -1, matchCol = -1, matchCount = 0;
      for (let reg = 0; reg < size; reg++) {
        if (placedRegions.has(reg)) continue;
        const rowCands = getRegionCandidates(reg).filter(([r]) => r === row);
        if (rowCands.length > 0) {
          if (matchCount === 0) {
            // All row candidates of this region must be in 1 col to be forced
            matchReg = reg;
            matchCount++;
            // We might have multiple cols in the row — need to check if forced
            if (rowCands.length === 1) matchCol = rowCands[0][1];
          } else {
            matchCount++;
            break;
          }
        }
      }
      // Only 1 region can place in this row AND it has exactly 1 col option
      if (matchCount === 1 && matchCol !== -1 && !placedRegions.has(matchReg)) {
        placeQueen(matchReg, row, matchCol);
        progress = true;
      }
    }

    // --- 3. Hidden single in column ---
    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue;
      let matchReg = -1, matchRow = -1, matchCount = 0;
      for (let reg = 0; reg < size; reg++) {
        if (placedRegions.has(reg)) continue;
        const colCands = getRegionCandidates(reg).filter(([, c]) => c === col);
        if (colCands.length > 0) {
          if (matchCount === 0) {
            matchReg = reg;
            matchCount++;
            if (colCands.length === 1) matchRow = colCands[0][0];
          } else {
            matchCount++;
            break;
          }
        }
      }
      if (matchCount === 1 && matchRow !== -1 && !placedRegions.has(matchReg)) {
        placeQueen(matchReg, matchRow, col);
        progress = true;
      }
    }

    // --- 4. Pointing: region's candidates all in same row → eliminate that
    //        row from all other unplaced regions' candidates ---
    for (let reg = 0; reg < size; reg++) {
      if (placedRegions.has(reg)) continue;
      const cands = getRegionCandidates(reg);
      if (cands.length === 0) return false;
      const rows = new Set(cands.map(([r]) => r));
      if (rows.size === 1) {
        // All this region's candidates are in row `pointedRow`.
        // No other region can use this row.
        const pointedRow = cands[0][0];
        for (let otherReg = 0; otherReg < size; otherReg++) {
          if (otherReg === reg || placedRegions.has(otherReg)) continue;
          for (const [r, c] of regionCells[otherReg]) {
            if (r === pointedRow && candidate[r][c]) {
              eliminate(r, c);
              progress = true;
            }
          }
        }
      }
    }

    // --- 5. Pointing: region's candidates all in same col ---
    for (let reg = 0; reg < size; reg++) {
      if (placedRegions.has(reg)) continue;
      const cands = getRegionCandidates(reg);
      if (cands.length === 0) return false;
      const cols = new Set(cands.map(([, c]) => c));
      if (cols.size === 1) {
        const pointedCol = cands[0][1];
        for (let otherReg = 0; otherReg < size; otherReg++) {
          if (otherReg === reg || placedRegions.has(otherReg)) continue;
          for (const [r, c] of regionCells[otherReg]) {
            if (c === pointedCol && candidate[r][c]) {
              eliminate(r, c);
              progress = true;
            }
          }
        }
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
//   ✓ Unique solution (exactly 1)
//   ✓ Solution passes all rules (1/row, 1/col, 1/region, no adjacency)
//   ✓ Logically solvable without guessing (constraint propagation only)
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

  // Scale attempt count with board size — larger boards need more seeds to find
  // a logically-solvable unique puzzle.
  const maxPrimaryAttempts = size <= 6 ? 100 : size <= 8 ? 300 : size <= 9 ? 800 : 2000;

  let currentSeed = seed;
  for (let attempt = 0; attempt < maxPrimaryAttempts; attempt++) {
    const rng = new SeededRandom(currentSeed);
    const queens = findQueenPlacements(size, rng);

    if (queens && queens.length === size) {
      const regions = generateRegions(size, queens, rng);

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

      // 3. Logical solvability — no guessing required
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

  // Extended fallback: try a much wider seed range with a different step.
  // Still tries for logical solvability first, then relaxes that requirement.
  const fallbackStep = 104729;
  let fallbackSeed = seed + 1_000_000;
  const maxFallbackAttempts = size <= 8 ? 500 : 1500;
  for (let attempt = 0; attempt < maxFallbackAttempts; attempt++) {
    const rng = new SeededRandom(fallbackSeed);
    const queens = findQueenPlacements(size, rng);

    if (queens && queens.length === size) {
      const regions = generateRegions(size, queens, rng);
      const solCount = countSolutions(size, regions, 2);

      if (solCount === 1 && validateSolution(size, regions, queens)) {
        // Prefer logically solvable, but accept non-logical after half the budget
        const requireLogical = attempt < maxFallbackAttempts / 2;
        if (!requireLogical || isLogicallySolvable(size, regions)) {
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


  // Absolute last resort: find a puzzle with a unique solution (still must be valid).
  // Drops the "no guessing" requirement but never returns a multi-solution puzzle.
  let lastResortSeed = seed + 10_000_000;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const rng = new SeededRandom(lastResortSeed);
    const queens = findQueenPlacements(size, rng);
    if (queens && queens.length === size) {
      const regions = generateRegions(size, queens, rng);
      // Must have exactly 1 solution and pass integrity check — no exceptions
      if (
        countSolutions(size, regions, 2) === 1 &&
        validateSolution(size, regions, queens)
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
    lastResortSeed += 3; // dense stepping to cover more ground
  }

  // Should be unreachable — but TypeScript requires a return
  throw new Error(
    `[Bitdoku] Failed to generate a valid puzzle for ${difficulty} with seed ${seed}. ` +
    `Please report this as a bug.`
  );
}
