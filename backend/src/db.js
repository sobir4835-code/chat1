const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'app.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      ism TEXT NOT NULL,
      familiya TEXT NOT NULL,
      yosh INTEGER NOT NULL,
      shahar TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Mavjud bazalarga yangi ustunlarni qo'shish (allaqachon bo'lsa xatoni e'tiborsiz qoldiradi)
  db.run("ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT 'text'", () => {});
  db.run("ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'sent'", () => {});
  db.run("ALTER TABLE messages ADD COLUMN edited INTEGER NOT NULL DEFAULT 0", () => {});
  db.run("ALTER TABLE messages ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0", () => {});
  db.run("ALTER TABLE users ADD COLUMN avatar TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN last_seen TEXT", () => {});
  db.run("ALTER TABLE messages ADD COLUMN group_id TEXT", () => {});

  db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages (receiver_id)');

  db.run(`
    CREATE TABLE IF NOT EXISTS blocks (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (blocker_id, blocked_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (message_id, user_id)
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions (message_id)');

  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, user_id)
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_group ON messages (group_id)');

  db.run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id)');
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { db, run, get, all };
