import Dexie, { type Table } from 'dexie';

export interface UserProfile {
  id: string; // 'local_user'
  username: string;
  uuid: string; // generated client-side for leaderboard syncing
  createdAt: number;
}

export interface LevelProgress {
  levelKey: string; // e.g., 'easy_01', 'normal_12', 'hard_04', 'very_hard_01'
  difficulty: 'easy' | 'normal' | 'hard' | 'very_hard';
  completed: boolean;
  bestTimeMs: number;
  currentGridState?: ('empty' | 'bit' | 'blocked')[][];
  generatorVersion?: number;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  completed: boolean;
  timeMs: number;
  syncedToLeaderboard: boolean;
}

export class BitdokuDatabase extends Dexie {
  profile!: Table<UserProfile, string>;
  levels!: Table<LevelProgress, string>;
  daily!: Table<DailyRecord, string>;

  constructor() {
    super('BitdokuDB');
    this.version(1).stores({
      profile: 'id',
      levels: 'levelKey, difficulty, completed',
      daily: 'date, syncedToLeaderboard'
    });
  }
}

export const db = new BitdokuDatabase();
