import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
const dir = process.env.DATA_DIR || path.join(process.cwd(),'data');
mkdirSync(path.join(dir,'uploads'),{recursive:true});
const db = new DatabaseSync(path.join(dir,'portfolio.sqlite'));
try {
  db.exec("CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime TEXT NOT NULL, title TEXT NOT NULL, alt TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', language TEXT NOT NULL, kind TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL)");
  const id='00000000-0000-4000-8000-000000000001';
  if (!db.prepare('SELECT id FROM media WHERE id=?').get(id)) {
    copyFileSync(path.join(process.cwd(),'CV ASY 2025 ID2 latest.pdf'),path.join(dir,'uploads',id));
    db.prepare('INSERT INTO media (id,filename,mime,title,alt,language,kind,active,created) VALUES (?,?,?,?,?,?,?,?,?)').run(id,'Ashabul-Yamin-CV-ID-2025.pdf','application/pdf','CV Indonesia 2025','','id','cv',1,new Date().toISOString());
    console.log('Original Indonesian CV imported.');
  } else console.log('Original CV already imported.');
} finally {db.close();}
