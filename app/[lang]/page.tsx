import { notFound } from 'next/navigation';
import { getContent } from '@/lib/store';
import { currentAdmin } from '@/lib/security';
import Portfolio from '@/app/portfolio';
import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== 'id' && lang !== 'en') return {};
  const content = getContent(lang);
  const base = process.env.SITE_URL;
  return { title: content.seo.title, description: content.seo.description, alternates: base ? { canonical: `${base}/${lang}`, languages: { id: `${base}/id`, en: `${base}/en` } } : undefined, openGraph: { title: content.seo.title, description: content.seo.description, locale: lang === 'id' ? 'id_ID' : 'en_US', type: 'website' } };
}
export default async function Page({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { lang } = await params;
  if (lang !== 'id' && lang !== 'en') notFound();
  const preview = (await searchParams).preview === '1' && !!await currentAdmin();
  const content = getContent(lang, preview);
  // Provider configuration and instructions never enter the public client payload.
  const publicContent = { ...content, settings: { ...content.settings, aiBaseUrl: '', aiModel: '', aiPrompt: '' }, entries: content.entries.filter(e => e.visible && e.category !== 'ai-knowledge') };
  return <Portfolio content={publicContent} lang={lang} preview={preview} />;
}
