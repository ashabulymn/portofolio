import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { database } from './db';
import { cookies } from 'next/headers';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(':');
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(key || '', 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
export async function currentAdmin() {
  const token = (await cookies()).get('portfolio-session')?.value;
  if (!token) return null;
  const db = database();
  try { return db.prepare('SELECT admins.id, admins.email FROM sessions JOIN admins ON admins.id=sessions.admin WHERE token=? AND expires>?').get(digest(token), Date.now()) as { id: number; email: string } | undefined; }
  finally { db.close(); }
}
export function sameOrigin(request: Request) {
  const expected = new URL(process.env.SITE_URL || 'http://localhost:3000').origin;
  return request.headers.get('origin') === expected;
}
export function rateLimit(request: Request, bucket: string, max = 5, windowMs = 60000) {
  // Proxy headers are trusted only behind an explicitly configured, filtering proxy.
  const ip = process.env.TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'shared';
  const key = `${bucket}:${digest(ip)}`;
  const db = database();
  try {
    const now = Date.now();
    db.prepare('DELETE FROM limits WHERE until < ?').run(now);
    db.prepare('INSERT INTO limits (key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, now + windowMs);
    const row = db.prepare('SELECT count FROM limits WHERE key=?').get(key) as { count: number };
    return row.count <= max;
  } finally { db.close(); }
}
export async function readBody(request: Request, max: number) {
  if (Number(request.headers.get('content-length') || 0) > max) throw new Error('Request too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Body required');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new Error('Request too large'); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request, max = 200000) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('JSON required');
  return JSON.parse((await readBody(request, max)).toString('utf8'));
}
