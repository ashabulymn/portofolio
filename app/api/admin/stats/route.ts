import { getStats, getStatsRange, statsToCsv } from '@/lib/analytics';
import { currentAdmin } from '@/lib/security';

export const runtime = 'nodejs';

/**
 * Agregat statistik pengunjung untuk halaman laporan admin.
 * Query:
 *   days=7|30|90            -> rentang preset
 *   from=YYYY-MM-DD&to=YYYY-MM-DD -> rentang custom (WIB, inklusif)
 *   format=csv&view=daily|pages|referrers|browsers|devices|hours|recent -> unduh CSV
 */
export async function GET(request: Request) {
  if (!(await currentAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const from = q.get('from') || '';
  const to = q.get('to') || '';
  const stats = from && to
    ? getStatsRange(from, to)
    : getStats([7, 30, 90].includes(Number(q.get('days'))) ? Number(q.get('days')) : 30);
  if (!stats) return Response.json({ error: 'Rentang tanggal tidak valid.' }, { status: 400 });
  const format = q.get('format');
  if (format === 'csv') {
    const view = q.get('view') || 'daily';
    const csv = statsToCsv(stats, view);
    if (csv === null) return Response.json({ error: 'Tampilan CSV tidak dikenal.' }, { status: 400 });
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-${view}-${stats.from}-${stats.to}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
