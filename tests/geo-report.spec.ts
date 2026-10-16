import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import path from 'node:path';

const dbPath = () => path.join(process.env.DATA_DIR || 'data', 'portfolio.sqlite');
const email = `geo-${Date.now()}@example.com`;
const password = 'testpass12345678!';
let adminId = 0;

test.beforeAll(async () => {
  const db = new DatabaseSync(dbPath());
  const salt = randomBytes(16).toString('hex');
  adminId = Number(db.prepare('INSERT INTO admins(email,password) VALUES (?,?)').run(email, `${salt}:${scryptSync(password, salt, 64).toString('hex')}`).lastInsertRowid);
  db.close();
});

test.afterAll(async () => {
  const db = new DatabaseSync(dbPath());
  db.prepare('DELETE FROM sessions WHERE admin=?').run(adminId);
  db.prepare('DELETE FROM admins WHERE id=?').run(adminId);
  db.close();
});

// Verifikasi halaman laporan menampilkan fitur lokasi (negara + kota).
test('laporan menampilkan negara, kota, dan kolom lokasi', async ({ page }) => {
  // sameOrigin membandingkan header Origin dengan SITE_URL (default http://localhost:3000)
  const login = await page.request.post('/api/admin', { headers: { Origin: 'http://localhost:3000' }, data: { action: 'login', email, password } });
  expect(login.ok()).toBeTruthy();

  await page.goto('/admin');
  // buka tab laporan
  await page.getByRole('button', { name: 'laporan', exact: true }).click();

  await expect(page.getByText('Laporan Pengunjung')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('cell', { name: 'Amerika Serikat (US)' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Negara' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kota' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Lokasi' })).toBeVisible();
  await page.screenshot({ path: '/tmp/laporan-geo.png', fullPage: true });
});
