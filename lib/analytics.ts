import { randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import geoip from 'geoip-lite';
import { database } from './db';
import { digest } from './security';

// Lookup GeoIP offline (database MaxMind GeoLite2, dibundel via geoip-lite).
// Hanya negara (kode ISO) dan kota yang dipakai — IP mentah tidak disimpan.
// Lokasi file data: env GEODATADIR (di Docker: /app/geo-data), fallback ../data/ relatif paket.

const regionNames = new Intl.DisplayNames(['id'], { type: 'region' });
/** Kode ISO 'ID' -> 'Indonesia'. '' -> ''. */
export function countryName(code: string): string {
  if (!code) return '';
  try {
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}
const UNKNOWN = '(tidak diketahui)';

// Zona waktu laporan: Asia/Jakarta (UTC+7, tanpa DST).
const JAKARTA_OFFSET_S = 7 * 3600;
// Sesi baru bila jeda antar-kunjungan satu pengunjung > 30 menit.
const SESSION_GAP_MS = 30 * 60 * 1000;

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
    // Lokasi diperkirakan dari IP saat kunjungan (negara + kota), lalu IP dibuang.
    // X-Forwarded-For hanya dipercaya bila TRUST_PROXY=true (proxy terkonfigurasi memfilter header).
    const fwd = process.env.TRUST_PROXY === 'true' ? h.get('x-forwarded-for')?.split(',')[0]?.trim() || '' : '';
    const ipHash = fwd ? digest('pv|' + fwd) : '';
    let country = '';
    let city = '';
    try {
      const g = fwd ? geoip.lookup(fwd) : null;
      if (g?.country) country = g.country.toUpperCase().slice(0, 2);
      if (g?.city) city = g.city.slice(0, 120);
    } catch {
      // Lookup gagal: catat tanpa lokasi.
    }
    const referrer = h.get('referer') || '';
    const now = Date.now();
    const db = database();
    try {
      db.prepare(
        'INSERT INTO visits (ts, visitor, path, referrer, ref_domain, ua, browser, os, device, ip_hash, is_bot, country, city) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).run(
        now, visitor, path.slice(0, 200), referrer.slice(0, 500),
        refDomain(referrer).slice(0, 120), ua.slice(0, 500),
        browser, os, device, ipHash, isBot ? 1 : 0, country, city
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
export type RecentRow = { ts: number; path: string; browser: string; os: string; device: string; referrer: string; country: string; countryCode: string; city: string };
export type Stats = {
  days: number | null;
  total: number;
  unique: number;
  sessions: number;
  today: number;
  todayUnique: number;
  todaySessions: number;
  allTime: number;
  allTimeUnique: number;
  bots: number;
  lang: { id: number; en: number; other: number };
  daily: DayRow[];
  pages: CountRow[];
  referrers: CountRow[];
  browsers: CountRow[];
  systems: CountRow[];
  devices: CountRow[];
  countries: { code: string; name: string; c: number; u: number }[];
  cities: CountRow[];
  hours: { h: string; c: number }[];
  recent: RecentRow[];
  from: string;
  to: string;
};

function jakartaDayStart(ts: number) {
  const d = new Date(ts + JAKARTA_OFFSET_S * 1000);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - JAKARTA_OFFSET_S * 1000;
}

function jakartaDayStr(ts: number) {
  return new Date(ts + JAKARTA_OFFSET_S * 1000).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' (WIB) -> awal hari itu dalam ms. NaN bila tidak valid. */
function wibDateToMs(s: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  const t = Date.parse(s + 'T00:00:00Z');
  return Number.isNaN(t) ? NaN : t - JAKARTA_OFFSET_S * 1000;
}

function computeStats(cutoff: number, end: number, days: number | null): Stats {
  const db = database();
  try {
    const human = 'is_bot=0 AND ts>=? AND ts<?';
    const one = (sql: string, ...p: (string | number)[]) =>
      db.prepare(sql).get(...p) as { c: number; u: number };
    const rows = (sql: string, ...p: (string | number)[]) =>
      db.prepare(sql).all(...p) as Record<string, string | number>[];
    const t = one(`SELECT COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human}`, cutoff, end);
    const td = one(`SELECT COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human} AND ts>=?`, cutoff, end, jakartaDayStart(end));
    const at = one('SELECT COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE is_bot=0');
    const bots = one('SELECT COUNT(*) c FROM visits WHERE is_bot=1 AND ts>=? AND ts<?', cutoff, end);
    const sess = one(
      `SELECT COALESCE(SUM(ns),0) c FROM (SELECT CASE WHEN LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) IS NULL OR ts - LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) > ? THEN 1 ELSE 0 END ns FROM visits WHERE ${human})`,
      SESSION_GAP_MS, cutoff, end
    );
    const tsess = one(
      `SELECT COALESCE(SUM(ns),0) c FROM (SELECT CASE WHEN LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) IS NULL OR ts - LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) > ? THEN 1 ELSE 0 END ns FROM visits WHERE ${human})`,
      SESSION_GAP_MS, jakartaDayStart(end), end
    );
    const lang = one(
      `SELECT COUNT(*) c FROM visits WHERE ${human} AND (path='/id' OR path LIKE '/id/%')`, cutoff, end
    );
    const langEn = one(
      `SELECT COUNT(*) c FROM visits WHERE ${human} AND (path='/en' OR path LIKE '/en/%')`, cutoff, end
    );
    const daily = rows(
      `SELECT date(ts/1000,'unixepoch','+7 hours') d, COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human} GROUP BY d ORDER BY d`,
      cutoff, end
    ).map(r => ({ d: String(r.d), c: Number(r.c), u: Number(r.u) }));
    const grp = (col: string, limit: number, withUnique: boolean) =>
      rows(
        `SELECT ${col} label, COUNT(*) c${withUnique ? ', COUNT(DISTINCT visitor) u' : ''} FROM visits WHERE ${human} GROUP BY ${col} ORDER BY c DESC LIMIT ?`,
        cutoff, end, limit
      ).map(r => ({ label: String(r.label), c: Number(r.c), u: withUnique ? Number(r.u) : undefined }));
    const hours = rows(
      `SELECT strftime('%H', ts/1000,'unixepoch','+7 hours') h, COUNT(*) c FROM visits WHERE ${human} GROUP BY h ORDER BY h`,
      cutoff, end
    ).map(r => ({ h: String(r.h), c: Number(r.c) }));
    const countries = rows(
      `SELECT country code, COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human} GROUP BY country ORDER BY c DESC LIMIT 10`,
      cutoff, end
    ).map(r => {
      const code = String(r.code);
      return { code, name: code ? countryName(code) : UNKNOWN, c: Number(r.c), u: Number(r.u) };
    });
    const cities = rows(
      `SELECT country, city, COUNT(*) c, COUNT(DISTINCT visitor) u FROM visits WHERE ${human} GROUP BY country, city ORDER BY c DESC LIMIT 10`,
      cutoff, end
    ).map(r => {
      const code = String(r.country);
      const city = String(r.city);
      const name = code ? countryName(code) : UNKNOWN;
      return { label: city ? `${city}, ${name}` : UNKNOWN, c: Number(r.c), u: Number(r.u) };
    });
    const recent = rows(
      `SELECT ts, path, browser, os, device, ref_domain, country, city FROM visits WHERE ${human} ORDER BY ts DESC LIMIT 20`,
      cutoff, end
    ).map(r => ({
      ts: Number(r.ts), path: String(r.path), browser: String(r.browser),
      os: String(r.os), device: String(r.device), referrer: String(r.ref_domain),
      countryCode: String(r.country), country: String(r.country) ? countryName(String(r.country)) : '',
      city: String(r.city),
    }));
    return {
      days,
      total: t.c, unique: t.u,
      sessions: sess.c,
      today: td.c, todayUnique: td.u, todaySessions: tsess.c,
      allTime: at.c, allTimeUnique: at.u,
      bots: bots.c,
      lang: { id: lang.c, en: langEn.c, other: t.c - lang.c - langEn.c },
      daily,
      pages: grp('path', 10, true),
      referrers: grp('ref_domain', 10, false),
      browsers: grp('browser', 8, false),
      systems: grp('os', 8, false),
      devices: grp('device', 5, false),
      countries,
      cities,
      hours,
      recent,
      from: jakartaDayStr(cutoff),
      to: jakartaDayStr(end - 1),
    };
  } finally {
    db.close();
  }
}

/** Agregat statistik untuk halaman laporan admin. Bot selalu dikecualikan. */
export function getStats(days: number): Stats {
  const end = Date.now();
  return computeStats(end - days * 86400000, end, days);
}

/** Rentang tanggal custom (WIB, inklusif, format 'YYYY-MM-DD'). Null bila tidak valid. */
export function getStatsRange(from: string, to: string): Stats | null {
  const start = wibDateToMs(from);
  const endDay = wibDateToMs(to);
  if (Number.isNaN(start) || Number.isNaN(endDay) || endDay < start) return null;
  return computeStats(start, endDay + 86400000, null);
}

/** Serialisasi satu tampilan statistik ke CSV. */
export function statsToCsv(s: Stats, view: string): string | null {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const line = (a: (string | number)[]) => a.map(esc).join(',') + '\n';
  let out = '';
  if (view === 'daily') {
    out = line(['tanggal', 'kunjungan', 'unik']);
    for (const d of s.daily) out += line([d.d, d.c, d.u]);
  } else if (view === 'pages') {
    out = line(['halaman', 'kunjungan', 'unik']);
    for (const r of s.pages) out += line([r.label, r.c, r.u ?? '']);
  } else if (view === 'referrers') {
    out = line(['referrer', 'kunjungan']);
    for (const r of s.referrers) out += line([r.label, r.c]);
  } else if (view === 'browsers') {
    out = line(['browser', 'kunjungan']);
    for (const r of s.browsers) out += line([r.label, r.c]);
  } else if (view === 'devices') {
    out = line(['perangkat', 'kunjungan']);
    for (const r of s.devices) out += line([r.label, r.c]);
  } else if (view === 'hours') {
    out = line(['jam_wib', 'kunjungan']);
    for (const r of s.hours) out += line([r.h, r.c]);
  } else if (view === 'countries') {
    out = line(['negara', 'kode_negara', 'kunjungan', 'unik']);
    for (const r of s.countries) out += line([r.name, r.code || '-', r.c, r.u]);
  } else if (view === 'cities') {
    out = line(['kota', 'kunjungan', 'unik']);
    for (const r of s.cities) out += line([r.label, r.c, r.u ?? '']);
  } else if (view === 'recent') {
    out = line(['waktu_wib', 'halaman', 'browser', 'os', 'perangkat', 'referrer', 'negara', 'kota']);
    for (const r of s.recent) {
      const w = new Date(r.ts).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      out += line([w, r.path, r.browser, r.os, r.device, r.referrer, r.country || '-', r.city || '-']);
    }
  } else {
    return null;
  }
  return '\uFEFF' + out; // BOM agar Excel membaca UTF-8 dengan benar.
}
