import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export function database() {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, 'portfolio.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS content (lang TEXT PRIMARY KEY, draft TEXT NOT NULL, published TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY, lang TEXT NOT NULL, content TEXT NOT NULL, created TEXT NOT NULL, editor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, admin INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, category TEXT NOT NULL, message TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime TEXT NOT NULL, title TEXT NOT NULL, alt TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', language TEXT NOT NULL, kind TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, visitor TEXT NOT NULL, path TEXT NOT NULL, referrer TEXT NOT NULL DEFAULT '', ref_domain TEXT NOT NULL DEFAULT '', ua TEXT NOT NULL DEFAULT '', browser TEXT NOT NULL DEFAULT '', os TEXT NOT NULL DEFAULT '', device TEXT NOT NULL DEFAULT '', ip_hash TEXT NOT NULL DEFAULT '', is_bot INTEGER NOT NULL DEFAULT 0, country TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '');
    CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts);
    CREATE INDEX IF NOT EXISTS idx_visits_path ON visits(path);
  `);
  // Migrasi additive: database lama tidak punya kolom country/city — tambahkan tanpa menghapus data.
  const cols = db.prepare('PRAGMA table_info(visits)').all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('country')) db.exec("ALTER TABLE visits ADD COLUMN country TEXT NOT NULL DEFAULT ''");
  if (!names.has('city')) db.exec("ALTER TABLE visits ADD COLUMN city TEXT NOT NULL DEFAULT ''");
  return db;
}
