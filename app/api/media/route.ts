import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { database } from '@/lib/db';
import { currentAdmin, readBody, readJson, sameOrigin } from '@/lib/security';
const directory = () => path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  const db = database();
  try {
    const row = db.prepare('SELECT * FROM media WHERE id=?').get(id) as { filename: string; mime: string; active: number; kind: string } | undefined;
    if (!row || (!row.active && !await currentAdmin())) return new Response('Not found', { status: 404 });
    const data = await readFile(path.join(directory(), id));
    return new Response(data, { headers: { 'Content-Type': row.mime, 'Content-Disposition': `${row.kind === 'cv' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(row.filename)}`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' } });
  } catch { return new Response('Not found', { status: 404 }); } finally { db.close(); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request) || !await currentAdmin()) return new Response('Forbidden', { status: 403 });
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data;')) throw new Error('Multipart required');
    const body = await readBody(request, 6 * 1024 * 1024);
    const form = await new Response(body, { headers: { 'Content-Type': contentType } }).formData(); const file = form.get('file');
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024) throw new Error('Invalid file');
    const bytes = Buffer.from(await file.arrayBuffer());
    const pdf = bytes.subarray(0, 5).toString() === '%PDF-';
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
    if (!pdf && !png && !jpg && !webp) throw new Error('Unsupported file');
    const kind = pdf ? 'cv' : 'image'; const mime = pdf ? 'application/pdf' : 'image/webp';
    const storedBytes = pdf ? bytes : await sharp(bytes, { limitInputPixels: 24000000, failOn: 'warning' }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const filename = pdf ? file.name : `${path.parse(file.name).name}.webp`;
    const language = form.get('language') === 'en' ? 'en' : 'id';
    const id = randomUUID(); await mkdir(directory(), { recursive: true }); await writeFile(path.join(directory(), id), storedBytes, { flag: 'wx' });
    const db = database();
    try { db.prepare('INSERT INTO media (id,filename,mime,title,alt,language,kind,created) VALUES (?,?,?,?,?,?,?,?)').run(id, filename.slice(0,150), mime, String(form.get('title') || file.name).slice(0,200), String(form.get('alt') || '').slice(0,500), language, kind, new Date().toISOString()); }
    catch (error) { await unlink(path.join(directory(), id)); throw error; }
    finally { db.close(); }
    return Response.json({ ok: true, id });
  } catch { return Response.json({ error: 'Upload failed. Use PDF, PNG, JPEG or WebP, maximum 5 MB.' }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request) || !await currentAdmin()) return new Response('Forbidden', { status: 403 });
  const db = database();
  try {
    const body = await readJson(request, 4000);
    const row = db.prepare('SELECT kind,language FROM media WHERE id=?').get(String(body.id)) as { kind: string; language: string } | undefined;
    if (!row || typeof body.active !== 'boolean') throw new Error('Invalid media');
    db.exec('BEGIN IMMEDIATE');
    if (row.kind === 'cv' && body.active) db.prepare('UPDATE media SET active=0 WHERE kind=? AND language=?').run('cv', row.language);
    db.prepare('UPDATE media SET active=?,title=?,alt=?,description=? WHERE id=?').run(body.active ? 1 : 0, String(body.title || '').slice(0,200), String(body.alt || '').slice(0,500), String(body.description || '').slice(0,1000), String(body.id));
    db.exec('COMMIT'); return Response.json({ ok: true });
  } catch { if (db.isTransaction) db.exec('ROLLBACK'); return Response.json({ error: 'Update failed' }, { status: 400 }); } finally { db.close(); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request) || !await currentAdmin()) return new Response('Forbidden', { status: 403 });
  const db = database();
  try {
    const { id } = await readJson(request, 1000);
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid ID');
    await unlink(path.join(directory(), id)); db.prepare('DELETE FROM media WHERE id=?').run(id);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'Delete failed' }, { status: 400 }); } finally { db.close(); }
}
