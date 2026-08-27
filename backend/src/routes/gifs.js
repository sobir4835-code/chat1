const { Router } = require('express');

const router = Router();
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

function mapGif(g) {
  return {
    id: g.id,
    preview: g.images.fixed_width_small?.url || g.images.fixed_width?.url,
    url: g.images.fixed_width?.url || g.images.original?.url,
  };
}

router.get('/trending', async (req, res) => {
  if (!GIPHY_API_KEY) return res.status(500).json({ error: 'Serverda GIPHY_API_KEY sozlanmagan' });

  try {
    const params = new URLSearchParams({ api_key: GIPHY_API_KEY, limit: '24', rating: 'pg-13' });
    const r = await fetch(`${GIPHY_BASE}/trending?${params.toString()}`);
    const data = await r.json();
    res.json((data.data || []).map(mapGif));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GIF larni olishda xatolik' });
  }
});

router.get('/search', async (req, res) => {
  if (!GIPHY_API_KEY) return res.status(500).json({ error: 'Serverda GIPHY_API_KEY sozlanmagan' });
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const params = new URLSearchParams({ api_key: GIPHY_API_KEY, q, limit: '24', rating: 'pg-13' });
    const r = await fetch(`${GIPHY_BASE}/search?${params.toString()}`);
    const data = await r.json();
    res.json((data.data || []).map(mapGif));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GIF larni qidirishda xatolik' });
  }
});

module.exports = router;
