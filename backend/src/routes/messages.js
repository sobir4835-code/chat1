const { Router } = require('express');
const { all } = require('../db');

const router = Router();

// Suhbatlar ro'yxati: joriy foydalanuvchi xabar almashgan barcha odamlar, oxirgi xabar bilan
router.get('/conversations', async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).json({ error: 'userId majburiy' });

  try {
    const rows = await all(
      `
      SELECT u.id, u.username, u.ism, u.familiya, u.yosh, u.shahar, u.avatar, u.last_seen AS lastSeen,
             m.text AS lastText, m.type AS lastType, m.created_at AS lastAt,
             m.deleted AS lastDeleted
      FROM (
        SELECT
          CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id,
          text,
          type,
          created_at,
          deleted,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
            ORDER BY created_at DESC
          ) AS rn
        FROM messages
        WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL
      ) m
      JOIN users u ON u.id = m.partner_id
      WHERE m.rn = 1
      ORDER BY m.created_at DESC
      `,
      [userId, userId, userId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Suhbatlar ro\'yxatini olishda xatolik' });
  }
});

// Ikki foydalanuvchi orasidagi xabarlar tarixi
router.get('/:otherUserId', async (req, res) => {
  const userId = String(req.query.userId || '');
  const otherUserId = String(req.params.otherUserId);
  if (!userId) return res.status(400).json({ error: 'userId majburiy' });

  try {
    const rows = await all(
      `SELECT id, sender_id AS senderId, receiver_id AS receiverId, text, type, status, edited, deleted, created_at AS createdAt
       FROM messages
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND group_id IS NULL
       ORDER BY created_at ASC`,
      [userId, otherUserId, otherUserId, userId]
    );

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const reactionRows = await all(
        `SELECT message_id AS messageId, user_id AS userId, emoji FROM reactions WHERE message_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      const byMessage = new Map();
      for (const r of reactionRows) {
        if (!byMessage.has(r.messageId)) byMessage.set(r.messageId, new Map());
        const byEmoji = byMessage.get(r.messageId);
        if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
        byEmoji.get(r.emoji).push(r.userId);
      }
      for (const row of rows) {
        const byEmoji = byMessage.get(row.id);
        row.reactions = byEmoji ? Array.from(byEmoji, ([emoji, userIds]) => ({ emoji, userIds })) : [];
      }
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xabarlarni olishda xatolik' });
  }
});

module.exports = router;
