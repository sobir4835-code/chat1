'use client';

import { useEffect, useRef } from 'react';
import { STICKERS } from '../lib/emoji';

export default function StickerPicker({ onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-10 mb-2 grid w-72 animate-pop-in grid-cols-6 gap-1 rounded-2xl border border-white/10 bg-surface p-3 shadow-2xl"
    >
      {STICKERS.map((sticker) => (
        <button
          key={sticker}
          type="button"
          onClick={() => onPick(sticker)}
          className="rounded-lg p-1.5 text-3xl transition-transform hover:scale-125 hover:bg-white/5"
        >
          {sticker}
        </button>
      ))}
    </div>
  );
}
