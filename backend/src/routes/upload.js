const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = Router();

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_MIME.has(file.mimetype));
  },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl talab qilinadi (png/jpeg/gif/webp, 5MB gacha)' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
