const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('./db');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:no-reply@tanishuv-chat.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function saveSubscription(userId, subscription) {
  const existing = await get('SELECT id FROM push_subscriptions WHERE endpoint = ?', [subscription.endpoint]);
  if (existing) {
    await run('UPDATE push_subscriptions SET user_id = ? WHERE endpoint = ?', [userId, subscription.endpoint]);
    return;
  }
  await run(
    'INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );
}

async function removeSubscription(endpoint) {
  await run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

// Foydalanuvchi sayt yopiq/oflayn bo'lsa ham OS darajasidagi push orqali bildirishnoma yuboradi
async function sendPushToUser(userId, { title, body, tag, url }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subs = await all('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, tag, url });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        // Obuna eskirgan/bekor qilingan bo'lsa, uni bazadan tozalaymiz
        if (err.statusCode === 404 || err.statusCode === 410) {
          await removeSubscription(sub.endpoint).catch(() => {});
        } else {
          console.error('Push xatolik:', err.message);
        }
      }
    })
  );
}

module.exports = { saveSubscription, removeSubscription, sendPushToUser, VAPID_PUBLIC_KEY };
