const { v4: uuidv4 } = require('uuid');
const { get, run, all } = require('./db');
const { sendPushToUser } = require('./push');

// userId -> Set of socket ids (a user can have multiple tabs/devices open)
const onlineUsers = new Map();

function markOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function markOffline(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

function isOnline(userId) {
  return onlineUsers.has(userId);
}

// REST route'lar orqali (masalan, guruhga yangi a'zo qo'shilganda) ulangan foydalanuvchini
// biror xona (room)ga real vaqtda qo'shish uchun ishlatiladi
function addUserToRoom(io, userId, room) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  for (const socketId of set) {
    io.sockets.sockets.get(socketId)?.join(room);
  }
}

const TEXT_TYPES = new Set(['text', 'sticker', 'image', 'gif']);
const REACTION_EMOJIS = new Set(['👍', '❤️', '😂', '😮', '😢', '🙏']);

async function isBlocked(a, b) {
  const row = await get(
    'SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [a, b, b, a]
  );
  return !!row;
}

async function isGroupMember(groupId, userId) {
  const row = await get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  return !!row;
}

async function reactionsFor(messageId) {
  const rows = await all('SELECT user_id AS userId, emoji FROM reactions WHERE message_id = ?', [messageId]);
  const byEmoji = new Map();
  for (const r of rows) {
    if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
    byEmoji.get(r.emoji).push(r.userId);
  }
  return Array.from(byEmoji, ([emoji, userIds]) => ({ emoji, userIds }));
}

function attach(io) {
  io.on('connection', (socket) => {
    socket.on('register', async ({ userId }) => {
      try {
        const user = await get('SELECT id, username, ism, familiya, yosh, shahar FROM users WHERE id = ?', [userId]);
        if (!user) return;

        socket.userId = user.id;
        socket.profile = user;
        socket.join(`user:${user.id}`);
        markOnline(user.id, socket.id);

        const myGroups = await all('SELECT group_id AS groupId FROM group_members WHERE user_id = ?', [user.id]);
        for (const g of myGroups) socket.join(`group:${g.groupId}`);

        io.emit('presence', { userId: user.id, online: true });

        // Foydalanuvchi ulanganda undan boshqalarga yuborilgan, hali yetkazilmagan xabarlarni "delivered" qilamiz
        const pending = await all(
          "SELECT id, sender_id AS senderId FROM messages WHERE receiver_id = ? AND status = 'sent'",
          [user.id]
        );
        if (pending.length > 0) {
          await run("UPDATE messages SET status = 'delivered' WHERE receiver_id = ? AND status = 'sent'", [user.id]);
          const bySender = new Map();
          for (const m of pending) {
            if (!bySender.has(m.senderId)) bySender.set(m.senderId, []);
            bySender.get(m.senderId).push(m.id);
          }
          for (const [senderId, ids] of bySender) {
            io.to(`user:${senderId}`).emit('status_update', { ids, status: 'delivered' });
          }
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('send_message', async ({ to, groupId, text, type }) => {
      if (!socket.userId || (!to && !groupId) || !text) return;
      if (to && (await isBlocked(socket.userId, to))) return;
      if (groupId && !(await isGroupMember(groupId, socket.userId))) return;

      const msgType = TEXT_TYPES.has(type) ? type : 'text';
      const maxLen = msgType === 'sticker' ? 8 : msgType === 'image' || msgType === 'gif' ? 500 : 2000;
      const trimmed = String(text).trim().slice(0, maxLen);
      if (!trimmed) return;

      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const status = groupId ? 'sent' : isOnline(to) ? 'delivered' : 'sent';

      try {
        await run(
          'INSERT INTO messages (id, sender_id, receiver_id, group_id, text, type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, socket.userId, to || '', groupId || null, trimmed, msgType, status, createdAt]
        );
      } catch (err) {
        console.error(err);
        return;
      }

      const payload = {
        id,
        senderId: socket.userId,
        senderName: groupId && socket.profile ? `${socket.profile.ism} ${socket.profile.familiya}` : undefined,
        receiverId: to || null,
        groupId: groupId || null,
        text: trimmed,
        type: msgType,
        status,
        edited: 0,
        deleted: 0,
        reactions: [],
        createdAt,
      };

      if (groupId) {
        io.to(`group:${groupId}`).emit('message', payload);
      } else {
        io.to(`user:${socket.userId}`).emit('message', payload);
        io.to(`user:${to}`).emit('message', payload);
      }

      // Sayt umuman yopiq/oflayn bo'lgan qabul qiluvchilarga OS darajasidagi push bildirishnoma yuboramiz
      const senderName = socket.profile ? `${socket.profile.ism} ${socket.profile.familiya}` : 'Kimdir';
      const preview = msgType === 'sticker' ? 'Stiker yubordi' : msgType === 'image' || msgType === 'gif' ? 'Rasm yubordi' : trimmed;

      if (groupId) {
        try {
          const group = await get('SELECT name FROM groups WHERE id = ?', [groupId]);
          const members = await all('SELECT user_id AS userId FROM group_members WHERE group_id = ?', [groupId]);
          for (const m of members) {
            if (m.userId === socket.userId || isOnline(m.userId)) continue;
            sendPushToUser(m.userId, {
              title: group?.name || 'Guruh',
              body: `${senderName}: ${preview}`,
              tag: `group-${groupId}`,
              url: '/messages',
            }).catch(() => {});
          }
        } catch (err) {
          console.error(err);
        }
      } else if (!isOnline(to)) {
        sendPushToUser(to, {
          title: senderName,
          body: preview,
          tag: `user-${socket.userId}`,
          url: '/messages',
        }).catch(() => {});
      }
    });

    socket.on('react_message', async ({ id, emoji }) => {
      if (!socket.userId || !id || !REACTION_EMOJIS.has(emoji)) return;

      try {
        const msg = await get('SELECT * FROM messages WHERE id = ?', [id]);
        if (!msg) return;
        if (msg.group_id) {
          if (!(await isGroupMember(msg.group_id, socket.userId))) return;
        } else if (msg.sender_id !== socket.userId && msg.receiver_id !== socket.userId) {
          return;
        }

        const existing = await get('SELECT emoji FROM reactions WHERE message_id = ? AND user_id = ?', [id, socket.userId]);
        if (existing && existing.emoji === emoji) {
          await run('DELETE FROM reactions WHERE message_id = ? AND user_id = ?', [id, socket.userId]);
        } else {
          await run(
            'INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?) ON CONFLICT(message_id, user_id) DO UPDATE SET emoji = excluded.emoji',
            [id, socket.userId, emoji]
          );
        }

        const reactions = await reactionsFor(id);
        const payload = { id, reactions, senderId: msg.sender_id, receiverId: msg.receiver_id, groupId: msg.group_id };
        if (msg.group_id) {
          io.to(`group:${msg.group_id}`).emit('reaction_update', payload);
        } else {
          io.to(`user:${msg.sender_id}`).emit('reaction_update', payload);
          io.to(`user:${msg.receiver_id}`).emit('reaction_update', payload);
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('block_user', async ({ userId }) => {
      if (!socket.userId || !userId) return;
      try {
        await run('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)', [socket.userId, userId]);
        socket.emit('block_status', { userId, iBlocked: true });
        io.to(`user:${userId}`).emit('blocked_by_update', { by: socket.userId, blocked: true });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('unblock_user', async ({ userId }) => {
      if (!socket.userId || !userId) return;
      try {
        await run('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [socket.userId, userId]);
        socket.emit('block_status', { userId, iBlocked: false });
        io.to(`user:${userId}`).emit('blocked_by_update', { by: socket.userId, blocked: false });
      } catch (err) {
        console.error(err);
      }
    });

    // `to` bilan bo'lgan suhbat ochilganda, undan kelgan barcha xabarlarni "read" deb belgilaymiz
    socket.on('mark_read', async ({ from }) => {
      if (!socket.userId || !from) return;

      try {
        const rows = await all(
          "SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ? AND status != 'read'",
          [from, socket.userId]
        );
        if (rows.length === 0) return;

        await run("UPDATE messages SET status = 'read' WHERE sender_id = ? AND receiver_id = ? AND status != 'read'", [
          from,
          socket.userId,
        ]);

        const ids = rows.map((r) => r.id);
        io.to(`user:${from}`).emit('status_update', { ids, status: 'read' });
        io.to(`user:${socket.userId}`).emit('status_update', { ids, status: 'read' });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('edit_message', async ({ id, text }) => {
      if (!socket.userId || !id || !text) return;
      const trimmed = String(text).trim().slice(0, 2000);
      if (!trimmed) return;

      try {
        const msg = await get('SELECT * FROM messages WHERE id = ?', [id]);
        if (!msg || msg.sender_id !== socket.userId || msg.deleted || msg.type !== 'text') return;

        await run('UPDATE messages SET text = ?, edited = 1 WHERE id = ?', [trimmed, id]);
        const payload = { id, text: trimmed, senderId: msg.sender_id, receiverId: msg.receiver_id, groupId: msg.group_id };
        if (msg.group_id) {
          io.to(`group:${msg.group_id}`).emit('message_edited', payload);
        } else {
          io.to(`user:${msg.sender_id}`).emit('message_edited', payload);
          io.to(`user:${msg.receiver_id}`).emit('message_edited', payload);
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('delete_message', async ({ id }) => {
      if (!socket.userId || !id) return;

      try {
        const msg = await get('SELECT * FROM messages WHERE id = ?', [id]);
        if (!msg || msg.sender_id !== socket.userId) return;

        await run("UPDATE messages SET deleted = 1, text = '' WHERE id = ?", [id]);
        const payload = { id, senderId: msg.sender_id, receiverId: msg.receiver_id, groupId: msg.group_id };
        if (msg.group_id) {
          io.to(`group:${msg.group_id}`).emit('message_deleted', payload);
        } else {
          io.to(`user:${msg.sender_id}`).emit('message_deleted', payload);
          io.to(`user:${msg.receiver_id}`).emit('message_deleted', payload);
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('typing', ({ to, groupId }) => {
      if (!socket.userId) return;
      if (groupId) socket.to(`group:${groupId}`).emit('typing', { from: socket.userId, groupId });
      else if (to) io.to(`user:${to}`).emit('typing', { from: socket.userId });
    });

    socket.on('stop_typing', ({ to, groupId }) => {
      if (!socket.userId) return;
      if (groupId) socket.to(`group:${groupId}`).emit('stop_typing', { from: socket.userId, groupId });
      else if (to) io.to(`user:${to}`).emit('stop_typing', { from: socket.userId });
    });

    socket.on('is_online', ({ userId }, callback) => {
      if (typeof callback === 'function') callback({ online: isOnline(userId) });
    });

    socket.on('get_online_ids', (callback) => {
      if (typeof callback === 'function') callback({ ids: Array.from(onlineUsers.keys()) });
    });

    socket.on('join_group', ({ groupId }) => {
      if (!socket.userId || !groupId) return;
      socket.join(`group:${groupId}`);
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        markOffline(socket.userId, socket.id);
        if (!isOnline(socket.userId)) {
          const lastSeen = new Date().toISOString();
          try {
            await run('UPDATE users SET last_seen = ? WHERE id = ?', [lastSeen, socket.userId]);
          } catch (err) {
            console.error(err);
          }
          io.emit('presence', { userId: socket.userId, online: false, lastSeen });
        }
      }
    });
  });
}

module.exports = { attach, addUserToRoom };
