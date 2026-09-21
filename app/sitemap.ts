import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.SITE_URL; return base ? ['id','en'].map(lang => ({ url: `${base}/${lang}`, changeFrequency: 'monthly' as const, priority: 1 })) : []; }
