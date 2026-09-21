import { database } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'id';
  const db = database();
  try {
    const media = db.prepare("SELECT id FROM media WHERE kind='cv' AND language=? AND active=1 ORDER BY created DESC LIMIT 1").get(lang) as { id: string } | undefined;
    if (media) return Response.redirect(new URL(`/api/media?id=${media.id}`, request.url));
    const text = lang === 'en' ? 'An English CV is not available. Download the original Indonesian CV instead.' : 'CV belum tersedia. Silakan hubungi Ashabul Yamin.';
    return new Response(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CV — Ashabul Yamin</title><body style="font-family:Arial;padding:10%;background:#f5f3ed;color:#253529"><h1>Curriculum vitae</h1><p>${text}</p>${lang === 'en' ? '<a href="/cv?lang=id">Download Indonesian CV</a><br><br>' : ''}<a href="/${lang}">← Portfolio</a></body></html>`, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } finally { db.close(); }
}
