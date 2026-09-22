import { notFound } from 'next/navigation';
import { categories } from '@/lib/content';
import Admin from '../page';

export default async function AdminSection({params}: {params: Promise<{section: string}>}) {
  const {section} = await params;
  if (!['dashboard','profile',...categories,'settings','seo','media','revisions','advanced'].includes(section)) notFound();
  return <Admin/>;
}
