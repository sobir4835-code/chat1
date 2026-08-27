const { Router } = require('express');
const { get, all, run } = require('../db');

const router = Router();
const PUBLIC_FIELDS = 'id, username, ism, familiya, yosh, shahar, avatar, last_seen AS lastSeen';

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const excludeId = req.query.excludeId ? String(req.query.excludeId) : null;

  if (!q) return res.json([]);

  try {
    const rows = await all(
      `SELECT ${PUBLIC_FIELDS} FROM users
       WHERE username LIKE ? AND id != ?
       ORDER BY username ASC LIMIT 20`,
      [`%${q}%`, excludeId || '']
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Qidirishda xatolik' });
  }
});

// Profilni tahrirlash (ism, familiya, yosh, shahar, avatar)
router.patch('/:id', async (req, res) => {
  const { ism, familiya, yosh, shahar, avatar } = req.body || {};
  const fields = [];
  const params = [];

  if (ism !== undefined) { fields.push('ism = ?'); params.push(String(ism).trim()); }
  if (familiya !== undefined) { fields.push('familiya = ?'); params.push(String(familiya).trim()); }
  if (shahar !== undefined) { fields.push('shahar = ?'); params.push(String(shahar).trim()); }
  if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar); }
  if (yosh !== undefined) {
    const yoshNum = Number(yosh);
    if (!Number.isInteger(yoshNum) || yoshNum < 18 || yoshNum > 100) {
      return res.status(400).json({ error: 'yosh 18 dan 100 gacha bo\'lishi kerak' });
    }
    fields.push('yosh = ?');
    params.push(yoshNum);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'Yangilanadigan maydon yo\'q' });

  try {
    const existing = await get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });

    params.push(req.params.id);
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    const user = await get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.params.id]);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profilni yangilashda xatolik' });
  }
});

// userId `:id`ni bloklaydi
router.post('/:id/block', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId majburiy' });
  if (userId === req.params.id) return res.status(400).json({ error: 'O\'zingizni bloklay olmaysiz' });

  try {
    await run('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)', [userId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bloklashda xatolik' });
  }
});

router.post('/:id/unblock', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId majburiy' });

  try {
    await run('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [userId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Blokdan chiqarishda xatolik' });
  }
});

// userId bilan `:id` orasidagi bloklash holati (ikkala yo'nalishda ham)
router.get('/:id/block-status', async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).json({ error: 'userId majburiy' });

  try {
    const iBlocked = await get('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [userId, req.params.id]);
    const blockedMe = await get('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [req.params.id, userId]);
    res.json({ iBlocked: !!iBlocked, blockedMe: !!blockedMe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xatolik' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Topilmadi' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xatolik' });
  }
});

module.exports = router;
