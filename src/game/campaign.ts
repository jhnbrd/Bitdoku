import type { Difficulty, PuzzleDefinition } from '../types';
import { generateValidPuzzle } from './generator';

// In-memory level bundle cache
const levelCache: Map<string, PuzzleDefinition> = new Map();

export function getCampaignLevel(difficulty: Difficulty, levelIndex: number): PuzzleDefinition {
  const levelKey = `${difficulty}_${levelIndex}`;
  if (levelCache.has(levelKey)) {
    return levelCache.get(levelKey)!;
  }

  // Base deterministic seed by difficulty and index
  const difficultyBases: Record<Difficulty, number> = {
    easy: 10000,
    normal: 20000,
    hard: 30000,
    very_hard: 40000
  };

  const seed = difficultyBases[difficulty] + levelIndex * 1337;
  const puzzle = generateValidPuzzle(levelKey, difficulty, seed);
  puzzle.name = `${difficulty.toUpperCase().replace('_', ' ')} SECTOR #${String(levelIndex).padStart(2, '0')}`;
  levelCache.set(levelKey, puzzle);
  return puzzle;
}

// In infinite mode, there is no hard cap
export function getTotalLevels(_difficulty: Difficulty): number {
  return 999999;
}
