import { NextResponse, type NextRequest } from 'next/server';
export function proxy(request: NextRequest) {
  const first = request.nextUrl.pathname.split('/')[1];
  if (!['', 'id', 'en', 'admin', 'api', 'cv', 'robots.txt', 'sitemap.xml', 'favicon.svg'].includes(first)) {
    return new NextResponse('<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>404 — Ashabul Yamin</title><body style="font-family:Arial;padding:10%;background:#f5f3ed"><h1>404</h1><p>Halaman tidak ditemukan / Page not found.</p><a href="/id">← Portfolio</a></body></html>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const headers = new Headers(request.headers);
  headers.set('x-portfolio-language', first === 'en' ? 'en' : 'id');
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
