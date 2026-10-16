import { randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { database } from './db';
import { digest } from './security';

// Zona waktu laporan: Asia/Jakarta (UTC+7, tanpa DST).
const JAKARTA_OFFSET_S = 7 * 3600;

const BOT_RE = /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|ahrefs|semrush|mj12|dotbot|petal|bytespider|gptbot|ccbot|anthropic-ai|claudebot|headless|lighthouse|pingdom|uptimerobot|monitor/i;

export function parseUA(ua: string) {
  const u = ua || '';
  let browser = 'Lainnya';
  if (/Edg\//i.test(u)) browser = 'Edge';
  else if (/SamsungBrowser/i.test(u)) browser = 'Samsung Internet';
  else if (/OPR\/|Opera/i.test(u)) browser = 'Opera';
  else if (/Firefox\//i.test(u)) browser = 'Firefox';
  else if (/Chrome\//i.test(u)) browser = 'Chrome';
  else if (/Safari\//i.test(u)) browser = 'Safari';
  let os = 'Lainnya';
  if (/Windows NT/i.test(u)) os = 'Windows';
  else if (/Android/i.test(u)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(u)) os = 'iOS';
  else if (/Mac OS X/i.test(u)) os = 'macOS';
  else if (/Linux/i.test(u)) os = 'Linux';
  let device = 'Desktop';
  if (/iPad|Tablet/i.test(u) || (/Android/i.test(u) && !/Mobile/i.test(u))) device = 'Tablet';
  else if (/Mobi|iPhone|Android/i.test(u)) device = 'Mobile';
  return { browser, os, device, isBot: BOT_RE.test(u) };
}

function refDomain(ref: string) {
  if (!ref) return '(langsung)';
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    return h || '(langsung)';
  } catch {
    return '(tidak valid)';
  }
}

/** Catat satu page view. Dipanggil dari Server Component / Route Handler (runtime nodejs). */
export async function trackPageView(path: string) {
  try {
    const h = await headers();
    const c = await cookies();
    const ua = h.get('user-agent') || '';
    const { browser, os, device, isBot } = parseUA(ua);
    // Cookie pv_id dipasang oleh middleware (proxy.ts); baca saja di sini.
    const visitor = c.get('pv_id')?.value || randomUUID();
    // IP tidak disimpan mentah — hanya hash untuk membantu deduplikasi.
    const fwd = h.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const ipHash = fwd ? digest('pv|' + fwd) : '';
    const referrer = h.get('referer') || '';
    const now = Date.now();
    const db = database();
    try {
      db.prepare(
        'INSERT INTO visits (ts, visitor, path, referrer, ref_domain, ua, browser, os, device, ip_hash, is_bot) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      ).run(
        now, visitor, path.slice(0, 200), referrer.slice(0, 500),
        refDomain(referrer).slice(0, 120), ua.slice(0, 500),
        browser, os, device, ipHash, isBot ? 1 : 0
      );
      // Retensi 400 hari.
      db.prepare('DELETE FROM visits WHERE ts < ?').run(now - 400 * 86400000);
    } finally {
      db.close();
    }
  } catch {
    // Statistik tidak boleh merusak halaman.
  }
}

export type DayRow = { d: string; c: number; u: number };
export type CountRow = { label: string; c: number; u?: number };
export type Stats = {
  days: number;
  total: number;
  unique: number;
  today: number;
  todayUnique: number;
  bots: number;
  daily: DayRow[];
  pages: CountRow[];
  referrers: CountRow[];
  browsers: CountRow[];
  systems: CountRow[];
  devices: CountRow[];
  hours: { h: string; c: number }[];
};

function jakartaDayStart(ts: number) {
  const d = new Date(ts + JAKARTA_OFFSET_S * 1000);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - JAKARTA_OFFSET_S * 1000;
}

/** Agregat statistik untuk halaman laporan admin. Bot selalu dikecualikan. */
export function getStats(days: number): Stats {
  const db = database();
  try {
    const cutoff = Date.now() - days * 86400000;
    const human = 'is_bot=0 AND ts>=?';
    const one = (sql: string, ...p: (string | number)[]) =>
      db.prepare(sql).get(...p) as { c: number; u: number };
    const rows = (sql: string, ...p: (string | number)[]) =>
      db.prepare(sql).all(...p) as Record<string, string | number>[];
    const t = one(`SELECT COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human}`, cutoff);
    const td = one(`SELECT COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human} AND ts>=?`, cutoff, jakartaDayStart(Date.now()));
    const bots = one('SELECT COUNT(*) c FROM visits WHERE is_bot=1 AND ts>=?', cutoff);
    const daily = rows(
      `SELECT date(ts/1000,'unixepoch','+7 hours') d, COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human} GROUP BY d ORDER BY d`,
      cutoff
    ).map(r => ({ d: String(r.d), c: Number(r.c), u: Number(r.u) }));
    const grp = (col: string, limit: number, withUnique: boolean) =>
      rows(
        `SELECT ${col} label, COUNT(*) c${withUnique ? ', COUNT(DISTINCT visitor) u' : ''} FROM visits WHERE ${human} GROUP BY ${col} ORDER BY c DESC LIMIT ?`,
        cutoff, limit
      ).map(r => ({ label: String(r.label), c: Number(r.c), u: withUnique ? Number(r.u) : undefined }));
    const hours = rows(
      `SELECT strftime('%H', ts/1000,'unixepoch','+7 hours') h, COUNT(*) c FROM visits WHERE ${human} GROUP BY h ORDER BY h`,
      cutoff
    ).map(r => ({ h: String(r.h), c: Number(r.c) }));
    return {
      days,
      total: t.c, unique: t.u,
      today: td.c, todayUnique: td.u,
      bots: bots.c,
      daily,
      pages: grp('path', 10, true),
      referrers: grp('ref_domain', 10, false),
      browsers: grp('browser', 8, false),
      systems: grp('os', 8, false),
      devices: grp('device', 5, false),
      hours,
    };
  } finally {
    db.close();
  }
}
