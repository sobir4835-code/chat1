const { Router } = require('express');
const { saveSubscription, removeSubscription, VAPID_PUBLIC_KEY } = require('../push');

const router = Router();

router.get('/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(500).json({ error: 'Serverda VAPID kaliti sozlanmagan' });
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post('/subscribe', async (req, res) => {
  const { userId, subscription } = req.body || {};
  if (!userId || !subscription?.endpoint || !subscription?.keys) {
    return res.status(400).json({ error: 'userId va subscription majburiy' });
  }

  try {
    await saveSubscription(userId, subscription);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Obuna bo\'lishda xatolik' });
  }
});

router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint majburiy' });

  try {
    await removeSubscription(endpoint);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Obunani bekor qilishda xatolik' });
  }
});

module.exports = router;
