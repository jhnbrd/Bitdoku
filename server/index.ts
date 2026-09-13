import express, { Request, Response } from 'express';
import cors from 'cors';
import db from './db';
import { generateValidPuzzle } from '../src/game/generator';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. POST /api/user/sync: Accepts { uuid, username }. Registers user or updates handle.
app.post('/api/user/sync', (req: Request, res: Response) => {
  const { uuid, username } = req.body;
  if (!uuid || !username) {
    return res.status(400).json({ error: 'uuid and username are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO users (uuid, username)
      VALUES (?, ?)
      ON CONFLICT(uuid) DO UPDATE SET username = excluded.username
    `);
    stmt.run(uuid, username.toUpperCase().trim());
    return res.json({ success: true, uuid, username });
  } catch (err: unknown) {
    console.error('Error syncing user:', err);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
});

// 2. POST /api/score/submit: Submits highest level reached or active win streak.
app.post('/api/score/submit', (req: Request, res: Response) => {
  const { uuid, mode, stat_type, value } = req.body;
  if (!uuid || !mode || !stat_type || typeof value !== 'number') {
    return res.status(400).json({ error: 'Missing required score parameters' });
  }

  try {
    // Ensure user exists
    const userCheck = db.prepare('SELECT uuid FROM users WHERE uuid = ?').get(uuid);
    if (!userCheck) {
      db.prepare('INSERT INTO users (uuid, username) VALUES (?, ?)').run(uuid, 'OPERATOR');
    }

    const stmt = db.prepare(`
      INSERT INTO scores (user_uuid, mode, stat_type, value, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_uuid, mode, stat_type) DO UPDATE SET
        value = MAX(scores.value, excluded.value),
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(uuid, mode, stat_type, value);
    return res.json({ success: true });
  } catch (err: unknown) {
    console.error('Error submitting score:', err);
    return res.status(500).json({ error: 'Failed to submit score' });
  }
});

// 3. GET /api/leaderboard?type=...&limit=50
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const rawType = String(req.query.type || 'level_attained_easy');
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  try {
    const stmt = db.prepare(`
      SELECT 
        u.username,
        s.user_uuid as uuid,
        s.value,
        s.updated_at
      FROM scores s
      JOIN users u ON s.user_uuid = u.uuid
      WHERE s.stat_type = ?
      ORDER BY s.value DESC, s.updated_at ASC
      LIMIT ?
    `);

    const rows = stmt.all(rawType, limit) as {
      username: string;
      uuid: string;
      value: number;
      updated_at: string;
    }[];

    const leaderboard = rows.map((row, idx) => ({
      rank: idx + 1,
      username: row.username,
      uuid: row.uuid,
      value: row.value,
      updated_at: row.updated_at
    }));

    return res.json({ statType: rawType, leaderboard });
  } catch (err: unknown) {
    console.error('Error querying leaderboard:', err);
    return res.status(500).json({ error: 'Leaderboard query error' });
  }
});

// 4. GET /api/puzzle/daily: Returns today's pre-computed puzzle seed and region matrix
app.get('/api/puzzle/daily', (_req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const seed = todayStr.split('-').reduce((acc, part) => acc * 100 + parseInt(part), 0);
    // 8x8 daily puzzle with 3 lives
    const puzzle = generateValidPuzzle(`daily_${todayStr}`, 'normal', seed, 8, 3);
    puzzle.name = `DAILY PROTOCOL [${todayStr}]`;
    return res.json({ date: todayStr, puzzle });
  } catch (err: unknown) {
    console.error('Error generating daily puzzle:', err);
    return res.status(500).json({ error: 'Failed to generate daily puzzle' });
  }
});

app.listen(PORT, () => {
  console.log(`[Bitdoku Server] listening on http://localhost:${PORT}`);
});
