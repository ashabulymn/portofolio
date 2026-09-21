import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
export const metadata: Metadata = { title: 'Ashabul Yamin — IT Technical Support', description: 'Practical IT support in Pelalawan, Indonesia.', icons: { icon: '/favicon.svg' } };
export default async function RootLayout({ children }: { children: React.ReactNode }) { const lang = (await headers()).get('x-portfolio-language') === 'en' ? 'en' : 'id'; return <html lang={lang} suppressHydrationWarning><body>{children}</body></html>; }
