export type CellState = 'empty' | 'bit' | 'blocked';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'very_hard';

export interface PuzzleDefinition {
  id: string;
  difficulty: Difficulty;
  size: number;
  regions: number[][]; // size x size 2D matrix where value is region ID (0 to size-1)
  solution?: [number, number][]; // coordinates [row, col] of bits in the unique solution
  name?: string;
  lives: number;
}

export interface CellViolation {
  row: number;
  col: number;
  type: 'row' | 'col' | 'region' | 'adjacent';
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  uuid: string;
  value: number; // level_attained count or daily_streak count
  updated_at: string;
}

export interface DailyPuzzleResponse {
  date: string;
  puzzle: PuzzleDefinition;
}
