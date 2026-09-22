import type { DatabaseSync } from 'node:sqlite';

export function notificationQueue(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS inquiry_notifications (
    inquiry INTEGER PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 0, delivered INTEGER, error TEXT
  )`);
}

export function notificationHealth(db: DatabaseSync) {
  notificationQueue(db);
  const counts = db.prepare(`SELECT
    COUNT(CASE WHEN delivered IS NULL AND attempts<8 THEN 1 END) AS pending,
    COUNT(CASE WHEN delivered IS NULL AND attempts>=8 THEN 1 END) AS exhausted,
    COUNT(delivered) AS delivered
    FROM inquiry_notifications WHERE inquiry IN (SELECT id FROM inquiries)`).get();
  return { enabled: process.env.NOTIFICATION_ENABLED === 'true', configured: !!(process.env.NOTIFICATION_API_KEY && process.env.NOTIFICATION_FROM && process.env.NOTIFICATION_TO), ...counts };
}

export async function deliverNotifications(db: DatabaseSync, transport: typeof fetch = fetch) {
  notificationQueue(db);
  const key = process.env.NOTIFICATION_API_KEY;
  const from = process.env.NOTIFICATION_FROM;
  const to = process.env.NOTIFICATION_TO;
  if (!key || !from || !to) throw new Error('Configure NOTIFICATION_API_KEY, NOTIFICATION_FROM and NOTIFICATION_TO.');
  const site = new URL(process.env.SITE_URL || 'http://localhost:3000');
  if (!['https:', 'http:'].includes(site.protocol)) throw new Error('Invalid SITE_URL');
  const inbox = new URL('/admin/dashboard', site).href;
  db.prepare('DELETE FROM inquiry_notifications WHERE inquiry NOT IN (SELECT id FROM inquiries)').run();
  let delivered = 0;
  let failed = 0;
  for (let count = 0; count < 20; count++) {
    const now = Date.now();
    const job = db.prepare(`UPDATE inquiry_notifications SET available=?, attempts=attempts+1
      WHERE inquiry=(SELECT inquiry FROM inquiry_notifications WHERE delivered IS NULL AND available<=? AND attempts<8 ORDER BY inquiry LIMIT 1)
      RETURNING inquiry, attempts`).get(now + 120000, now) as {inquiry:number; attempts:number} | undefined;
    if (!job) break;
    try {
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: {Authorization: `Bearer ${key}`, 'Content-Type':'application/json', 'Idempotency-Key':`portfolio-inquiry-${job.inquiry}`},
        body: JSON.stringify({from, to:[to], subject:'New portfolio inquiry', text:`A new inquiry is available in your portfolio inbox. Sign in to review it: ${inbox}\n\nInquiry reference: ${job.inquiry}`})
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error('Email delivery rejected');
      db.prepare('UPDATE inquiry_notifications SET delivered=?, error=NULL WHERE inquiry=?').run(Date.now(),job.inquiry);
      delivered++;
    } catch {
      db.prepare('UPDATE inquiry_notifications SET available=?, error=? WHERE inquiry=?').run(Date.now()+Math.min(3600000,60000*2**job.attempts),'Delivery failed; check provider configuration.',job.inquiry);
      failed++;
    }
  }
  return {delivered, failed};
}
