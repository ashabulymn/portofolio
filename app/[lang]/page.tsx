import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getContent } from '@/lib/store';
import { currentAdmin } from '@/lib/security';
import Portfolio from '@/app/portfolio';
import type { Metadata } from 'next';
import { database } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ preview?: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== 'id' && lang !== 'en') return {};
  const content = getContent(lang);
  const base = process.env.SITE_URL;
  const preview = (await searchParams).preview === '1';
  const db = database();
  let image;
  try { image = content.seo.imageId && db.prepare("SELECT id FROM media WHERE id=? AND active=1 AND kind='image'").get(content.seo.imageId); } finally { db.close(); }
  return { robots: preview || content.seo.noindex ? { index: false, follow: false } : undefined, title: content.seo.title, description: content.seo.description, alternates: base ? { canonical: `${base}/${lang}`, languages: { id: `${base}/id`, en: `${base}/en` } } : undefined, openGraph: { images: base && image ? [`${base}/api/media?id=${content.seo.imageId}`] : undefined, title: content.seo.title, description: content.seo.description, locale: lang === 'id' ? 'id_ID' : 'en_US', type: 'website' } };
}
export default async function Page({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { lang } = await params;
  if (lang !== 'id' && lang !== 'en') notFound();
  const preview = (await searchParams).preview === '1' && !!await currentAdmin();
  const content = getContent(lang, preview);
  // Provider configuration and instructions never enter the public client payload.
  const publicContent = { ...content, settings: { ...content.settings, aiBaseUrl: '', aiModel: '', aiPrompt: '' }, entries: content.entries.filter(e => e.visible && e.category !== 'ai-knowledge') };
  const db = database();
  let media: { id: string; alt: string; title: string }[];
  try { media = db.prepare("SELECT id,alt,title FROM media WHERE active=1 AND kind='image'").all() as typeof media; } finally { db.close(); }
  const structured = { '@context': 'https://schema.org', '@type': 'Person', name: content.name, jobTitle: content.role, email: content.email, url: process.env.SITE_URL ? process.env.SITE_URL + '/' + lang : undefined };
  const nonce = (await headers()).get('x-nonce') || undefined;
  return <><script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} /><Portfolio content={publicContent} lang={lang} preview={preview} media={media} /></>;
}
