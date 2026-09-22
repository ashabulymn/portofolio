import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

async function main() {
  if (process.env.NOTIFICATION_ENABLED !== 'true') throw new Error('Notifications are disabled. Set NOTIFICATION_ENABLED=true.');
  const modulePath = '../lib/notifications.ts';
  const { deliverNotifications } = await import(modulePath);
  const db = new DatabaseSync(path.join(process.env.DATA_DIR || 'data', 'portfolio.sqlite'));
  try {
    db.exec('PRAGMA busy_timeout=5000');
    const result = await deliverNotifications(db);
    console.log(JSON.stringify(result));
    if (result.failed) process.exitCode = 1;
  } finally { db.close(); }
}
main().catch(() => { console.error('Notification worker failed. Check database and notification configuration.'); process.exitCode = 1; });
