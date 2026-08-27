'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { getTrendingGifs, searchGifs } from '../lib/api';

export default function GifPicker({ onPick, onClose }) {
  const ref = useRef(null);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    setLoading(true);
    setError('');
    const t = setTimeout(() => {
      const fetcher = q ? searchGifs(q) : getTrendingGifs();
      fetcher
        .then(setGifs)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-10 mb-2 w-80 animate-pop-in rounded-2xl border border-white/10 bg-surface p-3 shadow-2xl"
    >
      <div className="relative mb-2">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="GIF qidirish..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-3 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06]"
        />
      </div>

      <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
        {loading && <p className="col-span-3 py-4 text-center text-xs text-slate-500">Yuklanmoqda...</p>}
        {!loading && error && <p className="col-span-3 py-4 text-center text-xs text-rose-400">{error}</p>}
        {!loading && !error && gifs.length === 0 && (
          <p className="col-span-3 py-4 text-center text-xs text-slate-500">Hech narsa topilmadi</p>
        )}
        {!loading &&
          !error &&
          gifs.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick(g.url)}
              className="overflow-hidden rounded-lg bg-white/5 transition-transform hover:scale-105 hover:ring-2 hover:ring-violet-400/70"
            >
              <img src={g.preview} alt="gif" className="h-16 w-full object-cover" />
            </button>
          ))}
      </div>
    </div>
  );
}
