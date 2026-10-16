'use client';
import { useEffect, useState } from 'react';
import type { Stats } from '@/lib/analytics';

function fmt(n: number) { return n.toLocaleString('id-ID'); }

function BarChart({ daily }: { daily: Stats['daily'] }) {
  const max = Math.max(1, ...daily.map(d => d.c));
  const W = 720, H = 180, pad = 8;
  const bw = (W - pad * 2) / Math.max(1, daily.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: '#fff', border: '1px solid #bac7b9' }} role="img" aria-label="Grafik kunjungan harian">
      {daily.map((d, i) => {
        const h = Math.max(2, ((H - 40) * d.c) / max);
        const hu = Math.max(2, ((H - 40) * d.u) / max);
        const x = pad + i * bw + 1;
        return (
          <g key={d.d}>
            <title>{d.d}: {d.c} kunjungan, {d.u} unik</title>
            <rect x={x} y={H - 24 - h} width={Math.max(1, bw - 2)} height={h} fill="#35553c" />
            <rect x={x} y={H - 24 - hu} width={Math.max(1, bw - 2)} height={hu} fill="#9db89d" />
          </g>
        );
      })}
    </svg>
  );
}

function Table({ title, rows, suffix }: { title: string; rows: { label: string; c: number; u?: number }[]; suffix?: string }) {
  if (!rows.length) return null;
  return (
    <div style={{ flex: '1 1 280px', minWidth: 260 }}>
      <h3>{title}</h3>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(r => (
            <tr key={r.label} style={{ borderTop: '1px solid #d9dcd0' }}>
              <td style={{ padding: '6px 4px', wordBreak: 'break-all' }}>{r.label}</td>
              <td style={{ padding: '6px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <strong>{fmt(r.c)}</strong>{suffix || ''}{typeof r.u === 'number' ? <span style={{ color: '#62695e' }}> · {fmt(r.u)} unik</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Laporan() {
  const [days, setDaysState] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  function changeDays(n: number) { setDaysState(n); setLoading(true); }
  useEffect(() => {
    let active = true;
    fetch(`/api/admin/stats?days=${days}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(s => { if (active) setStats(s); })
      .catch(() => { if (active) setStats(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  const cards: [string, number, string][] = stats ? [
    ['Total Kunjungan', stats.total, `${days} hari terakhir`],
    ['Pengunjung Unik', stats.unique, 'berdasarkan cookie perangkat'],
    ['Kunjungan Hari Ini', stats.today, `${fmt(stats.todayUnique)} unik`],
    ['Rata-rata / Hari', Math.round(stats.total / Math.max(1, stats.days)), 'kunjungan'],
  ] : [];

  return (
    <section>
      <h2>Laporan Pengunjung</h2>
      <div className="inline" style={{ marginBottom: 12 }}>
        <label>Rentang
          <select value={days} onChange={e => changeDays(Number(e.target.value))}>
            <option value={7}>7 hari</option>
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
          </select>
        </label>
      </div>
      {loading && <p role="status">Memuat statistik…</p>}
      {!loading && !stats && <p>Gagal memuat statistik.</p>}
      {stats && <>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {cards.map(([label, value, sub]) => (
            <div key={label} style={{ flex: '1 1 180px', background: '#fff', border: '1px solid #bac7b9', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#62695e' }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#233329' }}>{fmt(value)}</div>
              <div style={{ fontSize: 11, color: '#62695e' }}>{sub}</div>
            </div>
          ))}
        </div>
        <h3>Kunjungan Harian <span style={{ fontWeight: 400, fontSize: 12 }}>(hijau tua = kunjungan, hijau muda = unik)</span></h3>
        {stats.daily.length ? <BarChart daily={stats.daily} /> : <p>Belum ada data.</p>}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 20 }}>
          <Table title="Halaman Terpopuler" rows={stats.pages} />
          <Table title="Sumber Referrer" rows={stats.referrers} />
          <Table title="Browser" rows={stats.browsers} />
          <Table title="Sistem Operasi" rows={stats.systems} />
          <Table title="Perangkat" rows={stats.devices} />
        </div>
        <h3 style={{ marginTop: 20 }}>Jam Ramai (WIB)</h3>
        {stats.hours.length ? (
          <svg viewBox="0 0 720 120" style={{ width: '100%', height: 'auto', background: '#fff', border: '1px solid #bac7b9' }} role="img" aria-label="Distribusi kunjungan per jam">
            {stats.hours.map(({ h, c }) => {
              const max = Math.max(1, ...stats.hours.map(x => x.c));
              const bh = Math.max(2, (88 * c) / max);
              const x = 8 + Number(h) * ((720 - 16) / 24);
              return <g key={h}><title>Jam {h}: {c} kunjungan</title>
                <rect x={x} y={104 - bh} width={(720 - 16) / 24 - 3} height={bh} fill="#35553c" />
                {Number(h) % 3 === 0 && <text x={x} y={116} fontSize="9" fill="#62695e">{h}</text>}
              </g>;
            })}
          </svg>
        ) : <p>Belum ada data.</p>}
        <p className="small" style={{ marginTop: 16 }}>
          Bot dan crawler otomatis dikecualikan dari semua angka ({fmt(stats.bots)} kunjungan bot tercatat pada rentang ini).
          Alamat IP tidak disimpan — hanya hash anonim untuk deduplikasi. Data disimpan 400 hari.
        </p>
      </>}
    </section>
  );
}
