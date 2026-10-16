import { getStats } from '@/lib/analytics';
import { currentAdmin } from '@/lib/security';

export const runtime = 'nodejs';

/** Agregat statistik pengunjung untuk halaman laporan admin. */
export async function GET(request: Request) {
  if (!(await currentAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const raw = Number(new URL(request.url).searchParams.get('days'));
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  return Response.json(getStats(days), { headers: { 'Cache-Control': 'no-store' } });
}
