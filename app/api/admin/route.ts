import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { database } from '@/lib/db';
import { currentAdmin, digest, hashPassword, rateLimit, readJson, sameOrigin, verifyPassword } from '@/lib/security';
import { getContent, saveContent } from '@/lib/store';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!await currentAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'id';
  const content = getContent(lang, true);
  const db = database();
  try { return Response.json({ content, inquiries: db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 100').all(), revisions: db.prepare('SELECT id,lang,created,editor FROM revisions WHERE lang=? ORDER BY id DESC LIMIT 30').all(lang), media: db.prepare('SELECT * FROM media ORDER BY created DESC').all(), health: { database: true, aiConfigured: !!process.env.AI_API_KEY } }, { headers: { 'Cache-Control': 'no-store' } }); }
  finally { db.close(); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origin rejected' }, { status: 403 });
  try {
    const body = await readJson(request);
    if (body.action === 'login') {
      if (!rateLimit(request, 'login', 5, 900000)) return Response.json({ error: 'Try again later' }, { status: 429 });
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 200) throw new Error('Invalid credentials');
      const db = database();
      try {
        const admin = db.prepare('SELECT * FROM admins WHERE email=?').get(body.email.toLowerCase()) as { id: number; password: string } | undefined;
        const valid = verifyPassword(body.password, admin?.password || hashPassword(randomBytes(32).toString('hex')));
        if (!admin || !valid) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
        const token = randomBytes(32).toString('hex');
        db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
        db.prepare('INSERT INTO sessions (token,admin,expires) VALUES (?,?,?)').run(digest(token), admin.id, Date.now() + 8 * 3600000);
        (await cookies()).set('portfolio-session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 3600 });
        return Response.json({ ok: true });
      } finally { db.close(); }
    }
    const admin = await currentAdmin();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (body.action === 'logout') {
      const jar = await cookies(); const token = jar.get('portfolio-session')?.value;
      const db = database(); try { if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token)); } finally { db.close(); }
      jar.delete('portfolio-session'); return Response.json({ ok: true });
    }
    const lang = body.lang === 'en' ? 'en' : 'id';
    if (body.action === 'restore') {
      const db = database();
      try {
        const row = db.prepare('SELECT content FROM revisions WHERE id=? AND lang=?').get(Number(body.id), lang) as { content: string } | undefined;
        if (!row) throw new Error('Revision not found');
        saveContent(lang, JSON.parse(row.content), false, admin.email);
      } finally { db.close(); }
    } else if (body.action === 'save' || body.action === 'publish') {
      saveContent(lang, body.content, body.action === 'publish', admin.email);
    } else if (body.action === 'delete-inquiry') {
      const db = database(); try { db.prepare('DELETE FROM inquiries WHERE id=?').run(Number(body.id)); } finally { db.close(); }
    } else { throw new Error('Invalid action'); }
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'Operation failed. Check input and retry.' }, { status: 400 }); }
}
