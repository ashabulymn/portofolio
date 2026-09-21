import { database } from './db';
import { initialContent, type Content, type Language } from './content';
import { z } from 'zod';

const text = z.string().max(10000);
export const contentSchema = z.object({
  appearance: z.object({ font: z.enum(['sans','serif']), spacing: z.enum(['compact','relaxed']) }).optional(),
  aiOptions: z.object({ temperature: z.number().min(0).max(1), maxTokens: z.number().int().min(50).max(2000), timeoutMs: z.number().int().min(1000).max(30000), welcome: z.string().max(500), suggestions: z.array(z.string().min(1).max(200)).max(6) }).optional(),
  name: z.string().min(1).max(100), role: text, intro: text, email: z.email(), whatsapp: z.string().regex(/^\d{8,15}$/), location: text, headline: text,
  seo: z.object({ title: text, description: text, noindex: z.boolean().optional(), imageId: z.string().regex(/^[0-9a-f-]{36}$/).optional() }),
  settings: z.object({ motion: z.boolean(), ai: z.boolean(), maintenance: z.boolean(), theme: z.enum(['light', 'dark']), aiModel: z.string().max(200), aiBaseUrl: z.string().url(), aiPrompt: text, whatsappMessage: text }),
  entries: z.array(z.object({ url: z.string().max(2048).refine(value => !value || /^https:\/\/[^\s]+$/.test(value) || /^#[a-z][a-z0-9-]*$/.test(value), 'Use HTTPS or a section anchor').optional(), mediaId: z.string().regex(/^[0-9a-f-]{36}$/).optional(), id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), category: z.string().max(50), title: text, subtitle: text, body: text, order: z.number().int().min(0), visible: z.boolean(), featured: z.boolean() })).max(500),
});
export function getContent(lang: Language, draft = false): Content {
  const db = database();
  try {
    const row = db.prepare('SELECT draft, published FROM content WHERE lang = ?').get(lang) as { draft: string; published: string } | undefined;
    if (row) return JSON.parse(draft ? row.draft : row.published);
    const content = initialContent(lang);
    db.prepare('INSERT INTO content (lang,draft,published,updated) VALUES (?,?,?,?)').run(lang, JSON.stringify(content), JSON.stringify(content), new Date().toISOString());
    return content;
  } finally { db.close(); }
}
export function saveContent(lang: Language, input: unknown, publish: boolean, editor: string) {
  const content = contentSchema.parse(input);
  getContent(lang);
  const db = database();
  try {
    db.exec('BEGIN IMMEDIATE');
    const old = db.prepare('SELECT draft FROM content WHERE lang = ?').get(lang) as { draft: string };
    db.prepare('INSERT INTO revisions (lang,content,created,editor) VALUES (?,?,?,?)').run(lang, old.draft, new Date().toISOString(), editor);
    db.prepare(`UPDATE content SET draft=?, ${publish ? 'published=?,' : ''} version=version+1, updated=? WHERE lang=?`).run(...[JSON.stringify(content), ...(publish ? [JSON.stringify(content)] : []), new Date().toISOString(), lang]);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; } finally { db.close(); }
}
