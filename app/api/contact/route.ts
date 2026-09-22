import { z } from 'zod';
import { database } from '@/lib/db';
import { getContent } from '@/lib/store';
import { notificationQueue } from '@/lib/notifications';
import { rateLimit, readJson, sameOrigin } from '@/lib/security';
export const runtime = 'nodejs';
const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(200), category: z.string().min(1).max(100), message: z.string().trim().min(10).max(4000), website: z.string().max(0), lang: z.enum(['id', 'en']) });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origin rejected' }, { status: 403 });
  if (!rateLimit(request, 'contact', 5, 600000)) return Response.json({ error: 'Please try again later' }, { status: 429 });
  try {
    const data = schema.parse(await readJson(request, 10000));
    const content = getContent(data.lang);
    const allowed = ['consultation', 'other', ...content.entries.filter(e => e.category === 'services' && e.visible).map(e => e.id)];
    if (!allowed.includes(data.category)) return Response.json({ error: 'Invalid category' }, { status: 400 });
    const db = database();
    try {
      notificationQueue(db);
      db.exec('BEGIN IMMEDIATE');
      const inquiry = db.prepare('INSERT INTO inquiries (name,email,category,message,created) VALUES (?,?,?,?,?)').run(data.name, data.email, data.category, data.message, new Date().toISOString());
      if (process.env.NOTIFICATION_ENABLED === 'true') db.prepare('INSERT INTO inquiry_notifications (inquiry) VALUES (?)').run(inquiry.lastInsertRowid);
      db.exec('COMMIT');
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
    finally { db.close(); }
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'Unable to save inquiry. Check input or use WhatsApp.' }, { status: 400 }); }
}
