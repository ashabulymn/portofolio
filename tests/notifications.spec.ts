import {test, expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {deliverNotifications, notificationQueue, notificationHealth} from '../lib/notifications';

test('notification outbox retries safely and sends no inquiry personal data', async () => {
  const saved = {...process.env};
  const db = new DatabaseSync(':memory:');
  try {
    process.env.NOTIFICATION_API_KEY='test-only';
    process.env.NOTIFICATION_FROM='Portfolio <notifications@example.test>';
    process.env.NOTIFICATION_TO='owner@example.test';
    process.env.SITE_URL='https://portfolio.example.test';
    db.exec('CREATE TABLE inquiries (id INTEGER PRIMARY KEY); INSERT INTO inquiries VALUES (1)');
    notificationQueue(db);
    db.exec('INSERT INTO inquiry_notifications (inquiry) VALUES (1)');
    let calls=0;
    const fail: typeof fetch = async () => { calls++; return new Response('',{status:503}); };
    expect(notificationHealth(db)).toMatchObject({configured:true,pending:1,exhausted:0,delivered:0});
    expect(await deliverNotifications(db,fail)).toEqual({delivered:0,failed:1});
    expect(await deliverNotifications(db,fail)).toEqual({delivered:0,failed:0});
    expect(calls).toBe(1);
    db.exec('UPDATE inquiry_notifications SET available=0');
    const success: typeof fetch = async (url,options) => {
      expect(url).toBe('https://api.resend.com/emails');
      const message=JSON.parse(String(options?.body));
      expect(message.text).toContain('https://portfolio.example.test/admin/dashboard');
      expect(Object.keys(message).sort()).toEqual(['from','subject','text','to']);
      return new Response('{}',{status:200});
    };
    expect(await deliverNotifications(db,success)).toEqual({delivered:1,failed:0});
    expect(await deliverNotifications(db,fail)).toEqual({delivered:0,failed:0});
    db.exec('DELETE FROM inquiries');
    await deliverNotifications(db,fail);
    expect(db.prepare('SELECT COUNT(*) AS count FROM inquiry_notifications').get()?.count).toBe(0);
  } finally { db.close(); process.env=saved; }
});
