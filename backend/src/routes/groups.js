const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db');
const { addUserToRoom } = require('../socket');

const router = Router();

async function assertMember(groupId, userId) {
  const row = await get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  return !!row;
}

// Joriy foydalanuvchi a'zo bo'lgan guruhlar, oxirgi xabar bilan
router.get('/', async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).json({ error: 'userId majburiy' });

  try {
    const rows = await all(
      `
      SELECT g.id, g.name, g.created_by AS createdBy,
             (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS memberCount,
             m.text AS lastText, m.type AS lastType, m.created_at AS lastAt, m.deleted AS lastDeleted
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
      LEFT JOIN (
        SELECT group_id, text, type, created_at, deleted,
               ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at DESC) AS rn
        FROM messages WHERE group_id IS NOT NULL
      ) m ON m.group_id = g.id AND m.rn = 1
      ORDER BY COALESCE(m.created_at, g.created_at) DESC
      `,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Guruhlarni olishda xatolik' });
  }
});

// Yangi guruh yaratish
router.post('/', async (req, res) => {
  const { name, creatorId, memberIds } = req.body || {};
  const cleanName = String(name || '').trim();
  const members = Array.isArray(memberIds) ? [...new Set(memberIds.filter(Boolean))] : [];

  if (!cleanName || !creatorId) return res.status(400).json({ error: 'name va creatorId majburiy' });
  if (members.length === 0) return res.status(400).json({ error: 'Kamida bitta a\'zo tanlang' });

  const id = uuidv4();
  try {
    await run('INSERT INTO groups (id, name, created_by) VALUES (?, ?, ?)', [id, cleanName, creatorId]);
    await run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [id, creatorId]);
    for (const memberId of members) {
      if (memberId === creatorId) continue;
      await run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [id, memberId]);
    }

    const io = req.app.get('io');
    if (io) {
      addUserToRoom(io, creatorId, `group:${id}`);
      for (const memberId of members) addUserToRoom(io, memberId, `group:${id}`);
      io.to(`group:${id}`).emit('group_created', { id, name: cleanName });
    }

    res.status(201).json({ id, name: cleanName, createdBy: creatorId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Guruh yaratishda xatolik' });
  }
});

// Guruh a'zolari
router.get('/:id/members', async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId || !(await assertMember(req.params.id, userId))) {
    return res.status(403).json({ error: 'Siz bu guruh a\'zosi emassiz' });
  }

  try {
    const rows = await all(
      `SELECT u.id, u.username, u.ism, u.familiya, u.avatar
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ? ORDER BY gm.joined_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'A\'zolarni olishda xatolik' });
  }
});

// Guruhga yangi a'zo qo'shish (faqat mavjud a'zo qo'sha oladi)
router.post('/:id/members', async (req, res) => {
  const { userId, newMemberId } = req.body || {};
  if (!userId || !newMemberId) return res.status(400).json({ error: 'userId va newMemberId majburiy' });
  if (!(await assertMember(req.params.id, userId))) {
    return res.status(403).json({ error: 'Siz bu guruh a\'zosi emassiz' });
  }

  try {
    await run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [req.params.id, newMemberId]);
    const io = req.app.get('io');
    if (io) addUserToRoom(io, newMemberId, `group:${req.params.id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'A\'zo qo\'shishda xatolik' });
  }
});

// Guruhdan chiqish
router.post('/:id/leave', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId majburiy' });

  try {
    await run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Guruhdan chiqishda xatolik' });
  }
});

// Guruh xabarlari tarixi
router.get('/:id/messages', async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId || !(await assertMember(req.params.id, userId))) {
    return res.status(403).json({ error: 'Siz bu guruh a\'zosi emassiz' });
  }

  try {
    const rows = await all(
      `SELECT id, sender_id AS senderId, group_id AS groupId, text, type, status, edited, deleted, created_at AS createdAt
       FROM messages WHERE group_id = ? ORDER BY created_at ASC`,
      [req.params.id]
    );

    if (rows.length > 0) {
      const senderIds = [...new Set(rows.map((r) => r.senderId))];
      const senders = await all(
        `SELECT id, ism, familiya FROM users WHERE id IN (${senderIds.map(() => '?').join(',')})`,
        senderIds
      );
      const senderMap = new Map(senders.map((s) => [s.id, s]));

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
        const sender = senderMap.get(row.senderId);
        row.senderName = sender ? `${sender.ism} ${sender.familiya}` : 'Foydalanuvchi';
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
