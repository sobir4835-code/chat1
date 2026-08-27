'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Smile,
  Sticker,
  Send,
  MessagesSquare,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  X,
  Search,
  MoreVertical,
  Ban,
  ShieldOff,
  SmilePlus,
  Film,
  Users,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';
import GifPicker from './GifPicker';
import GroupMembersModal from './GroupMembersModal';
import ViewProfileModal from './ViewProfileModal';
import { fileUrl } from '../lib/api';
import { formatLastSeen } from '../lib/format';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function StatusTicks({ status }) {
  if (status === 'read') return <CheckCheck size={14} className="text-sky-300" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-slate-400" />;
  return <Check size={14} className="text-slate-400" />;
}

function ReactionBar({ reactions, myId, onReact }) {
  if (!reactions || reactions.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((r) => {
        const mine = r.userIds.includes(myId);
        return (
          <button
            key={r.emoji}
            onClick={() => onReact(r.emoji)}
            className={`flex animate-pop-in items-center gap-1 rounded-full px-1.5 py-0.5 text-xs ring-1 transition ${
              mine ? 'bg-violet-500/20 ring-violet-400/60' : 'bg-white/[0.05] ring-white/10 hover:ring-white/20'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="text-slate-300">{r.userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReactPicker({ onPick, onClose }) {
  return (
    <div className="absolute bottom-full z-10 mb-1 flex animate-pop-in gap-1 rounded-full border border-white/10 bg-surface px-2 py-1 shadow-xl">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onPick(emoji);
            onClose();
          }}
          className="rounded-full p-1 text-lg transition-transform hover:scale-125 hover:bg-white/10"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default function ChatPanel({
  partner,
  online,
  lastSeen,
  typing,
  messages,
  myId,
  input,
  onInputChange,
  onSend,
  onSendSticker,
  onSendImage,
  onSendGif,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  blockStatus,
  onBlock,
  onUnblock,
  onLeaveGroup,
  onBack,
}) {
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [reactPickerId, setReactPickerId] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const isGroup = partner?.type === 'group';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => {
    setShowSearch(false);
    setSearchQuery('');
    setShowMenu(false);
    setShowGifs(false);
    setShowMembers(false);
    setShowProfile(false);
  }, [partner?.id]);

  function handleSubmit(e) {
    e.preventDefault();
    onSend();
  }

  function handlePickEmoji(emoji) {
    onInputChange(input + emoji);
    setShowEmoji(false);
  }

  function handlePickSticker(sticker) {
    onSendSticker(sticker);
    setShowStickers(false);
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) onSendImage(file);
    e.target.value = '';
  }

  function handlePickGif(url) {
    onSendGif(url);
    setShowGifs(false);
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditText(m.text);
  }

  function submitEdit(e) {
    e.preventDefault();
    if (editText.trim()) onEditMessage(editingId, editText.trim());
    setEditingId(null);
  }

  if (!partner) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-surface text-center text-slate-500">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
          <MessagesSquare size={26} className="text-slate-500" />
        </div>
        <p className="text-sm">Yozishishni boshlash uchun chapdan foydalanuvchi tanlang</p>
        <p className="mt-1 text-xs">yoki username orqali qidiring</p>
      </div>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const visibleMessages = q
    ? messages.filter((m) => !m.deleted && m.type === 'text' && m.text.toLowerCase().includes(q))
    : messages;
  const blocked = blockStatus?.iBlocked || blockStatus?.blockedMe;

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-surface">
      <div className="flex items-center gap-1 border-b border-white/5 px-2 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => (isGroup ? setShowMembers(true) : setShowProfile(true))}
          className="min-w-0 flex-1 rounded-lg text-left transition-opacity hover:opacity-80"
        >
          <h2 className="truncate text-sm font-semibold text-white">
            {isGroup ? partner.name : `${partner.ism} ${partner.familiya}`}
          </h2>
          <p className="truncate text-xs text-slate-400">
            {isGroup ? (
              typing ? (
                <span className="text-violet-400">kimdir yozmoqda...</span>
              ) : (
                `${partner.memberCount ?? ''} a'zo`.trim()
              )
            ) : (
              <>
                @{partner.username} &middot;{' '}
                {typing ? (
                  <span className="text-violet-400">yozmoqda...</span>
                ) : online ? (
                  <span className="text-emerald-400">online</span>
                ) : (
                  <span>{formatLastSeen(lastSeen)}</span>
                )}
              </>
            )}
          </p>
        </button>
        <div className="relative flex shrink-0 items-center gap-1">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className={`rounded-lg p-2 hover:bg-white/5 ${showSearch ? 'text-violet-400' : 'text-slate-400 hover:text-white'}`}
            title="Xabarlarni qidirish"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            title="Ko'proq"
          >
            <MoreVertical size={18} />
          </button>
          {showMenu &&
            (isGroup ? (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 animate-pop-in rounded-xl border border-white/10 bg-surface py-1 shadow-xl">
                <button
                  onClick={() => {
                    setShowMembers(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                >
                  <Users size={15} /> Guruh a&apos;zolari
                </button>
                <button
                  onClick={() => {
                    onLeaveGroup();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-400 hover:bg-white/5"
                >
                  <LogOut size={15} /> Guruhdan chiqish
                </button>
              </div>
            ) : (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 animate-pop-in rounded-xl border border-white/10 bg-surface py-1 shadow-xl">
                {blockStatus?.iBlocked ? (
                  <button
                    onClick={() => {
                      onUnblock();
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                  >
                    <ShieldOff size={15} /> Blokdan chiqarish
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onBlock();
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-400 hover:bg-white/5"
                  >
                    <Ban size={15} /> Foydalanuvchini bloklash
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>

      {showMembers && isGroup && (
        <GroupMembersModal groupId={partner.id} myId={myId} onClose={() => setShowMembers(false)} />
      )}

      {showProfile && !isGroup && (
        <ViewProfileModal
          userId={partner.id}
          online={online}
          lastSeen={lastSeen}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showSearch && (
        <div className="border-b border-white/5 px-4 py-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ushbu suhbatdan qidirish..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-3 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06]"
            />
          </div>
          {q && <p className="mt-1 text-xs text-slate-500">{visibleMessages.length} ta natija topildi</p>}
        </div>
      )}

      {blockStatus?.blockedMe && (
        <div className="border-b border-white/5 bg-rose-950/40 px-4 py-2 text-xs text-rose-300">
          Bu foydalanuvchi sizni bloklagan.
        </div>
      )}
      {blockStatus?.iBlocked && (
        <div className="border-b border-white/5 bg-rose-950/40 px-4 py-2 text-xs text-rose-300">
          Siz bu foydalanuvchini bloklagansiz. Xabar yuborish uchun blokdan chiqaring.
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
        {visibleMessages.length === 0 && (
          <p className="text-sm text-slate-500">
            {q ? 'Hech narsa topilmadi.' : 'Hali xabar yo\'q. Salom bering!'}
          </p>
        )}
        {visibleMessages.map((m) => {
          const mine = m.senderId === myId;

          if (m.deleted) {
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <span className="rounded-lg px-3 py-2 text-xs italic text-slate-500 ring-1 ring-white/5">
                  Xabar o&apos;chirildi
                </span>
              </div>
            );
          }

          if (editingId === m.id) {
            return (
              <form key={m.id} onSubmit={submitEdit} className="flex justify-end gap-2">
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="max-w-[85%] flex-1 rounded-xl border border-violet-400/60 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none"
                />
                <button type="submit" className="rounded-lg bg-brand-gradient px-2 text-xs font-medium text-white">
                  OK
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </form>
            );
          }

          const toolbar = (
            <div className="relative flex shrink-0 items-center gap-1 pb-1 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                onClick={() => setReactPickerId(reactPickerId === m.id ? null : m.id)}
                className="hover:text-amber-400"
                title="Reaksiya"
              >
                <SmilePlus size={14} />
              </button>
              {mine && m.type === 'text' && (
                <button onClick={() => startEdit(m)} className="hover:text-violet-400" title="Tahrirlash">
                  <Pencil size={13} />
                </button>
              )}
              {mine && (
                <button onClick={() => onDeleteMessage(m.id)} className="hover:text-rose-400" title="O'chirish">
                  <Trash2 size={13} />
                </button>
              )}
              {reactPickerId === m.id && (
                <ReactPicker
                  onPick={(emoji) => onReactMessage(m.id, emoji)}
                  onClose={() => setReactPickerId(null)}
                />
              )}
            </div>
          );

          return (
            <div key={m.id} className={`flex animate-fade-in-up flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {isGroup && !mine && m.senderName && (
                <span className="mb-0.5 ml-1 text-[11px] font-medium text-violet-400">{m.senderName}</span>
              )}
              <div className={`group flex items-end gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                {mine && toolbar}

                {m.type === 'sticker' ? (
                  <span className="text-5xl leading-none">{m.text}</span>
                ) : m.type === 'image' ? (
                  <img src={fileUrl(m.text)} alt="rasm" className="max-w-[70%] rounded-2xl object-cover shadow-bubble" />
                ) : m.type === 'gif' ? (
                  <img src={m.text} alt="gif" className="max-w-[70%] rounded-2xl object-cover shadow-bubble" />
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-bubble ${
                      mine
                        ? 'rounded-br-md bg-brand-gradient text-white'
                        : 'rounded-bl-md border border-white/5 bg-white/[0.06] text-slate-100'
                    }`}
                  >
                    {m.text}
                    {m.edited === 1 && <span className="ml-1.5 text-[10px] italic opacity-70">tahrirlangan</span>}
                  </div>
                )}

                {mine && !isGroup && m.type !== 'sticker' && (
                  <div className="pb-1">
                    <StatusTicks status={m.status} />
                  </div>
                )}

                {!mine && toolbar}
              </div>
              <ReactionBar reactions={m.reactions} myId={myId} onReact={(emoji) => onReactMessage(m.id, emoji)} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <div className="border-t border-white/5 p-3 text-center text-sm text-slate-500">
          Xabar yozish mumkin emas
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative flex items-center gap-1 border-t border-white/5 p-2 sm:gap-2 sm:p-3">
          {showEmoji && (
            <EmojiPicker onPick={handlePickEmoji} onClose={() => setShowEmoji(false)} />
          )}
          {showStickers && (
            <StickerPicker onPick={handlePickSticker} onClose={() => setShowStickers(false)} />
          )}
          {showGifs && <GifPicker onPick={handlePickGif} onClose={() => setShowGifs(false)} />}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white sm:p-2"
            title="Rasm"
          >
            <ImageIcon size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGifs((v) => !v);
              setShowEmoji(false);
              setShowStickers(false);
            }}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white sm:p-2"
            title="GIF"
          >
            <Film size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowStickers(false);
              setShowGifs(false);
            }}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white sm:p-2"
            title="Emoji"
          >
            <Smile size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowStickers((v) => !v);
              setShowEmoji(false);
              setShowGifs(false);
            }}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white sm:p-2"
            title="Stiker"
          >
            <Sticker size={20} />
          </button>

          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Xabar yozing..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06]"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-sm font-semibold text-white shadow-md transition duration-150 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:hover:brightness-100 sm:px-4"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Yuborish</span>
          </button>
        </form>
      )}
    </div>
  );
}
