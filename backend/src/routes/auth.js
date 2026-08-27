const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { run, get } = require('../db');

const router = Router();
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const PUBLIC_FIELDS = 'id, username, ism, familiya, yosh, shahar, email, avatar';

function validateProfile({ username, ism, familiya, yosh, shahar }) {
  if (!username || !ism || !familiya || !shahar || yosh === undefined) {
    return 'username, ism, familiya, yosh, shahar majburiy';
  }
  if (!USERNAME_RE.test(String(username).trim().toLowerCase())) {
    return 'Username 3-20 belgidan iborat bo\'lib, faqat harf, raqam va pastki chiziqdan iborat bo\'lishi kerak';
  }
  const yoshNum = Number(yosh);
  if (!Number.isInteger(yoshNum) || yoshNum < 18 || yoshNum > 100) {
    return 'yosh 18 dan 100 gacha bo\'lishi kerak';
  }
  return null;
}

// Qo'lda ro'yxatdan o'tish (username + parol)
router.post('/register', async (req, res) => {
  const { username, password, ism, familiya, yosh, shahar } = req.body || {};

  const profileError = validateProfile({ username, ism, familiya, yosh, shahar });
  if (profileError) return res.status(400).json({ error: profileError });

  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' });
  }

  const cleanUsername = String(username).trim().toLowerCase();

  const existing = await get('SELECT id FROM users WHERE username = ?', [cleanUsername]);
  if (existing) {
    return res.status(409).json({ error: 'Bu username band, boshqasini tanlang' });
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(String(password), 10);

  try {
    await run(
      'INSERT INTO users (id, username, password_hash, ism, familiya, yosh, shahar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, cleanUsername, passwordHash, String(ism).trim(), String(familiya).trim(), Number(yosh), String(shahar).trim()]
    );
    const user = await get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [id]);
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ro\'yxatdan o\'tishda xatolik' });
  }
});

// Qo'lda kirish (username + parol)
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username va parol majburiy' });
  }

  const cleanUsername = String(username).trim().toLowerCase();

  try {
    const user = await get(
      `SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE username = ?`,
      [cleanUsername]
    );

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Username yoki parol noto\'g\'ri' });
    }

    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Username yoki parol noto\'g\'ri' });
    }

    delete user.password_hash;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kirishda xatolik' });
  }
});

// Google tokenini tekshirish: mavjud akkaunt bo'lsa kirgizadi, bo'lmasa profilni to'ldirishni so'raydi
router.post('/google', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken majburiy' });
  if (!googleClient) return res.status(500).json({ error: 'Serverda GOOGLE_CLIENT_ID sozlanmagan' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Google tokeni yaroqsiz' });
  }

  const email = payload.email;

  try {
    const existing = await get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE email = ?`, [email]);
    if (existing) {
      return res.json({ needsProfile: false, user: existing });
    }

    return res.json({
      needsProfile: true,
      google: {
        email,
        ism: payload.given_name || '',
        familiya: payload.family_name || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Google orqali birinchi marta kirgan foydalanuvchi profilni to'ldiradi (parolsiz akkaunt)
router.post('/google/complete', async (req, res) => {
  const { idToken, username, ism, familiya, yosh, shahar } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken majburiy' });
  if (!googleClient) return res.status(500).json({ error: 'Serverda GOOGLE_CLIENT_ID sozlanmagan' });

  const profileError = validateProfile({ username, ism, familiya, yosh, shahar });
  if (profileError) return res.status(400).json({ error: profileError });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Google tokeni yaroqsiz' });
  }

  const email = payload.email;
  const cleanUsername = String(username).trim().toLowerCase();

  const existingUsername = await get('SELECT id FROM users WHERE username = ?', [cleanUsername]);
  if (existingUsername) {
    return res.status(409).json({ error: 'Bu username band, boshqasini tanlang' });
  }

  const existingEmail = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existingEmail) {
    return res.status(409).json({ error: 'Bu Google akkaunt allaqachon ro\'yxatdan o\'tgan' });
  }

  const id = uuidv4();
  try {
    await run(
      'INSERT INTO users (id, username, email, ism, familiya, yosh, shahar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, cleanUsername, email, String(ism).trim(), String(familiya).trim(), Number(yosh), String(shahar).trim()]
    );
    const user = await get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [id]);
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Foydalanuvchi yaratishda xatolik' });
  }
});

// Parolni o'zgartirish (eski parolni bilgan holda) — Google akkauntlarda parol yo'q
router.post('/change-password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body || {};
  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'userId, oldPassword, newPassword majburiy' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 belgidan iborat bo\'lishi kerak' });
  }

  try {
    const user = await get('SELECT id, password_hash FROM users WHERE id = ?', [userId]);
    if (!user || !user.password_hash) {
      return res.status(400).json({ error: 'Bu akkaunt uchun parol o\'rnatilmagan (Google orqali kirilgan)' });
    }

    const match = await bcrypt.compare(String(oldPassword), user.password_hash);
    if (!match) return res.status(401).json({ error: 'Eski parol noto\'g\'ri' });

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Parolni o\'zgartirishda xatolik' });
  }
});

module.exports = router;
