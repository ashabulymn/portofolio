import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 14 || password.length > 200) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (14–200 characters) in the environment. No default credentials exist.');
  process.exit(1);
}
const dir = process.env.DATA_DIR || path.join(process.cwd(),'data');
mkdirSync(dir,{recursive:true});
const db = new DatabaseSync(path.join(dir,'portfolio.sqlite'));
try {
  db.exec('CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL)');
  const salt=randomBytes(16).toString('hex');
  const hash=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
  db.prepare('INSERT INTO admins (email,password) VALUES (?,?)').run(email,hash);
  console.log('Administrator created. Remove ADMIN_PASSWORD from your environment.');
} finally { db.close(); }
