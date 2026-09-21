import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const days = Number(process.env.INQUIRY_RETENTION_DAYS);
if (!Number.isInteger(days) || days < 1 || days > 3650) {
  throw new Error('Set INQUIRY_RETENTION_DAYS to an integer between 1 and 3650.');
}
const apply = process.argv.includes('--apply');
const db = new DatabaseSync(path.join(process.env.DATA_DIR || 'data', 'portfolio.sqlite'));
try {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  if (apply) {
    const result = db.prepare('DELETE FROM inquiries WHERE created < ?').run(cutoff);
    console.log(`Deleted ${result.changes} expired inquiries.`);
  } else {
    const row = db.prepare('SELECT COUNT(*) AS count FROM inquiries WHERE created < ?').get(cutoff);
    console.log(`Dry run: ${row?.count} inquiries older than ${days} days. Pass --apply to delete.`);
  }
} finally { db.close(); }
