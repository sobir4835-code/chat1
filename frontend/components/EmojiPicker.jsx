'use client';

import { useEffect, useRef } from 'react';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';

export default function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full left-0 z-10 mb-2">
      <EmojiPickerReact
        theme={Theme.DARK}
        onEmojiClick={(emojiData) => onPick(emojiData.emoji)}
        width={320}
        height={360}
        previewConfig={{ showPreview: false }}
        searchDisabled={false}
      />
    </div>
  );
}
