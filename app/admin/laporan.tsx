'use client';
import { useEffect, useState } from 'react';
import type { Stats } from '@/lib/analytics';

function fmt(n: number) { return n.toLocaleString('id-ID'); }

function wib(ts: number) {
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

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

function Table({ title, rows, suffix, csvHref }: { title: string; rows: { label: string; c: number; u?: number }[]; suffix?: string; csvHref?: string }) {
  if (!rows.length) return null;
  return (
    <div style={{ flex: '1 1 280px', minWidth: 260 }}>
      <h3>{title} {csvHref && <a href={csvHref} style={{ fontWeight: 400, fontSize: 11 }}>Unduh CSV</a>}</h3>
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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const custom = days === 0;

  function applyPreset(n: number) { setDaysState(n); setFrom(''); setTo(''); setErr(''); setLoading(true); }
  function applyCustom() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      setErr('Format tanggal: YYYY-MM-DD.');
      return;
    }
    setErr(''); setDaysState(0); setLoading(true);
  }

  useEffect(() => {
    let active = true;
    const q = custom ? `from=${from}&to=${to}` : `days=${days}`;
    fetch(`/api/admin/stats?${q}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(s => { if (active) setStats(s); })
      .catch(() => { if (active) { setStats(null); setErr(custom ? 'Rentang tanggal tidak valid.' : 'Gagal memuat statistik.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, custom, from, to]);

  const rangeLabel = stats ? (stats.days ? `${stats.days} hari terakhir` : `${stats.from} → ${stats.to}`) : '';
  const q = custom ? `from=${from}&to=${to}` : `days=${days}`;
  const cards: [string, number, string][] = stats ? [
    ['Total Kunjungan', stats.total, rangeLabel],
    ['Pengunjung Unik', stats.unique, 'berdasarkan cookie perangkat'],
    ['Sesi', stats.sessions, `${fmt(stats.todaySessions)} sesi hari ini`],
    ['Kunjungan Hari Ini', stats.today, `${fmt(stats.todayUnique)} unik`],
    ['Sepanjang Waktu', stats.allTime, `${fmt(stats.allTimeUnique)} unik`],
    ['Bahasa Indonesia', stats.lang.id, `Inggris: ${fmt(stats.lang.en)}${stats.lang.other ? ` · Lainnya: ${fmt(stats.lang.other)}` : ''}`],
  ] : [];

  return (
    <section>
      <h2>Laporan Pengunjung</h2>
      <div className="inline" style={{ marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <label>Rentang
          <select value={custom ? 0 : days} onChange={e => applyPreset(Number(e.target.value))}>
            <option value={7}>7 hari</option>
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
            {custom && <option value={0}>Custom</option>}
          </select>
        </label>
        <label>Dari <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>Sampai <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <button type="button" onClick={applyCustom}>Terapkan</button>
      </div>
      {loading && <p role="status">Memuat statistik…</p>}
      {!loading && !stats && <p>{err || 'Gagal memuat statistik.'}</p>}
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
        <h3>Kunjungan Harian <span style={{ fontWeight: 400, fontSize: 12 }}>(hijau tua = kunjungan, hijau muda = unik)</span> <a href={`/api/admin/stats?format=csv&view=daily&${q}`} style={{ fontWeight: 400, fontSize: 11 }}>Unduh CSV</a></h3>
        {stats.daily.length ? <BarChart daily={stats.daily} /> : <p>Belum ada data.</p>}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 20 }}>
          <Table title="Halaman Terpopuler" rows={stats.pages} csvHref={`/api/admin/stats?format=csv&view=pages&${q}`} />
          <Table title="Sumber Referrer" rows={stats.referrers} csvHref={`/api/admin/stats?format=csv&view=referrers&${q}`} />
          <Table title="Browser" rows={stats.browsers} csvHref={`/api/admin/stats?format=csv&view=browsers&${q}`} />
          <Table title="Sistem Operasi" rows={stats.systems} />
          <Table title="Perangkat" rows={stats.devices} csvHref={`/api/admin/stats?format=csv&view=devices&${q}`} />
        </div>
        <h3 style={{ marginTop: 20 }}>Jam Ramai (WIB) <a href={`/api/admin/stats?format=csv&view=hours&${q}`} style={{ fontWeight: 400, fontSize: 11 }}>Unduh CSV</a></h3>
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
        <h3 style={{ marginTop: 20 }}>Aktivitas Terbaru <a href={`/api/admin/stats?format=csv&view=recent&${q}`} style={{ fontWeight: 400, fontSize: 11 }}>Unduh CSV</a></h3>
        {stats.recent.length ? (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#62695e' }}>
                <th style={{ padding: '6px 4px' }}>Waktu (WIB)</th>
                <th style={{ padding: '6px 4px' }}>Halaman</th>
                <th style={{ padding: '6px 4px' }}>Perangkat / Browser</th>
                <th style={{ padding: '6px 4px' }}>Referrer</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #d9dcd0' }}>
                  <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{wib(r.ts)}</td>
                  <td style={{ padding: '6px 4px' }}>{r.path}</td>
                  <td style={{ padding: '6px 4px' }}>{r.device} · {r.browser} · {r.os}</td>
                  <td style={{ padding: '6px 4px', wordBreak: 'break-all' }}>{r.referrer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>Belum ada data.</p>}
        <p className="small" style={{ marginTop: 16 }}>
          Bot dan crawler otomatis dikecualikan dari semua angka ({fmt(stats.bots)} kunjungan bot tercatat pada rentang ini).
          Sesi = rangkaian kunjungan satu pengunjung dengan jeda &lt; 30 menit.
          Alamat IP tidak disimpan — hanya hash anonim untuk deduplikasi. Data disimpan 400 hari.
        </p>
      </>}
    </section>
  );
}
