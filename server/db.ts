import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'bitdoku.sqlite');
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uuid TEXT NOT NULL,
    mode TEXT NOT NULL, -- 'campaign' or 'daily'
    stat_type TEXT NOT NULL, -- 'level_attained' or 'daily_streak'
    value INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_uuid) REFERENCES users(uuid),
    UNIQUE(user_uuid, mode, stat_type)
  );

  CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores(stat_type, value DESC);
`);

export default db;
