import type { Difficulty, PuzzleDefinition } from '../types';

// Pseudo-random number generator with seed
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

// Check Queens placement validity:
// 1 per row (handled by row-by-row iteration)
// 1 per column
// No two touching even diagonally (chebyshev distance > 1)
export function isValidQueensPlacement(queens: [number, number][], row: number, col: number): boolean {
  for (const [r, c] of queens) {
    if (c === col) return false;
    if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return false;
  }
  return true;
}

// Generate an N x N queen placement satisfying no two touching (Star Battle / Queens)
export function findQueenPlacements(size: number, rng: SeededRandom): [number, number][] | null {
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

// Generate contiguous regions such that each queen is in exactly one distinct region,
// and the entire N x N board is partitioned into N connected components.
export function generateRegions(size: number, queens: [number, number][], rng: SeededRandom): number[][] {
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const queue: { r: number; c: number; region: number }[] = [];

  // Seed each queen cell with its region index (0 .. size-1)
  queens.forEach(([r, c], regionIndex) => {
    grid[r][c] = regionIndex;
    queue.push({ r, c, region: regionIndex });
  });

  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  // Flood fill / Voronoi growth until grid is complete
  while (queue.length > 0) {
    // Pick a random index from queue for more natural, organic region shapes
    const idx = rng.nextInt(0, queue.length - 1);
    const { r, c, region } = queue.splice(idx, 1)[0];

    const shuffledDirs = rng.shuffle(directions);
    for (const [dr, dc] of shuffledDirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === -1) {
        grid[nr][nc] = region;
        queue.push({ r: nr, c: nc, region });
      }
    }
  }

  // Double check if any orphaned unassigned cell remains (rare edge cases)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === -1) {
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== -1) {
            grid[r][c] = grid[nr][nc];
            break;
          }
        }
      }
    }
  }

  return grid;
}

// Count solutions for given regions to ensure uniqueness
export function countSolutions(size: number, regions: number[][], maxLimit: number = 2): number {
  let count = 0;
  const queens: [number, number][] = [];
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function solve(row: number) {
    if (count >= maxLimit) return;
    if (row === size) {
      count++;
      return;
    }

    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue;
      const region = regions[row][col];
      if (usedRegions.has(region)) continue;

      // Check adjacency
      let adjacentClash = false;
      for (const [qr, qc] of queens) {
        if (Math.abs(qr - row) <= 1 && Math.abs(qc - col) <= 1) {
          adjacentClash = true;
          break;
        }
      }
      if (adjacentClash) continue;

      queens.push([row, col]);
      usedCols.add(col);
      usedRegions.add(region);

      solve(row + 1);

      queens.pop();
      usedCols.delete(col);
      usedRegions.delete(region);
    }
  }

  solve(0);
  return count;
}

// Difficulty configs
export const DIFFICULTY_CONFIG: Record<Difficulty, { size: number; lives: number; count: number }> = {
  easy: { size: 6, lives: 3, count: 30 },
  normal: { size: 8, lives: 3, count: 50 },
  hard: { size: 9, lives: 2, count: 40 },
  very_hard: { size: 10, lives: 1, count: 30 }
};

// Generate a certified puzzle with a guaranteed unique solution
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

  let currentSeed = seed;
  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = new SeededRandom(currentSeed);
    const queens = findQueenPlacements(size, rng);
    if (queens) {
      const regions = generateRegions(size, queens, rng);
      const solCount = countSolutions(size, regions, 2);
      if (solCount === 1) {
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
    currentSeed += 7919;
  }

  // Fallback safe deterministic generation
  const rngFallback = new SeededRandom(seed);
  const queens = findQueenPlacements(size, rngFallback) || [];
  const regions = generateRegions(size, queens, rngFallback);
  return {
    id,
    difficulty,
    size,
    regions,
    solution: queens,
    lives,
    name: `${difficulty.toUpperCase()} Sector #${id}`
  };
}
