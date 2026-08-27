'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, UserCog } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import {
  getConversations,
  getMessages,
  searchUsers,
  uploadFile,
  getBlockStatus,
  getGroups,
  getGroupMessages,
  leaveGroup,
} from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import ChatPanel from '../../components/ChatPanel';
import ProfileModal from '../../components/ProfileModal';
import CreateGroupModal from '../../components/CreateGroupModal';
import { setupPushNotifications } from '../../lib/push';

export default function MessagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState(null); // { type: 'user'|'group', id, ... }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [typingIds, setTypingIds] = useState(new Set());
  const [groupTypingIds, setGroupTypingIds] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState(new Map());
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ iBlocked: false, blockedMe: false });

  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('tanishuv_user');
    if (!stored) {
      router.replace('/');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const conversationsQuery = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => getConversations(user.id),
    enabled: !!user,
  });

  const groupsQuery = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: () => getGroups(user.id),
    enabled: !!user,
  });

  const searchQuery = useQuery({
    queryKey: ['search', debouncedQuery, user?.id],
    queryFn: () => searchUsers(debouncedQuery, user.id),
    enabled: !!user && debouncedQuery.length > 0,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', user?.id, selected?.type, selected?.id],
    queryFn: () =>
      selected.type === 'group' ? getGroupMessages(selected.id, user.id) : getMessages(user.id, selected.id),
    enabled: !!user && !!selected,
  });

  useEffect(() => {
    setMessages(messagesQuery.data || []);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!user || !selected || selected.type === 'group') {
      setBlockStatus({ iBlocked: false, blockedMe: false });
      return;
    }
    getBlockStatus(selected.id, user.id).then(setBlockStatus).catch(() => {});
  }, [user, selected]);

  useEffect(() => {
    if (!user || typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      setupPushNotifications(user.id);
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') setupPushNotifications(user.id);
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => {
      socket.emit('register', { userId: user.id });
      socket.emit('get_online_ids', ({ ids }) => setOnlineIds(new Set(ids)));
    });

    socket.on('presence', ({ userId, online, lastSeen }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
      if (!online && lastSeen) {
        setLastSeenMap((prev) => new Map(prev).set(userId, lastSeen));
      }
    });

    socket.on('message', (payload) => {
      const current = selectedRef.current;
      const isActiveChat =
        current &&
        (current.type === 'group' ? payload.groupId === current.id : !payload.groupId && (payload.senderId === current.id || payload.receiverId === current.id));

      if (isActiveChat) {
        setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
        if (current.type !== 'group' && payload.senderId === current.id) {
          socket.emit('mark_read', { from: current.id });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });

      const fromOther = payload.senderId !== user.id;
      const shouldNotify = fromOther && (!isActiveChat || document.hidden);
      if (shouldNotify && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const preview = payload.type === 'sticker' ? 'Stiker yubordi' : payload.type === 'image' || payload.type === 'gif' ? 'Rasm yubordi' : payload.text;
        const title = payload.groupId ? (payload.senderName || 'Guruh') : 'Tanishuv Chat';
        const n = new Notification(title, { body: preview, tag: payload.groupId || payload.senderId });
        n.onclick = () => window.focus();
      }
    });

    socket.on('reaction_update', ({ id, reactions }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, reactions } : m)));
    });

    socket.on('block_status', ({ userId, iBlocked }) => {
      if (selectedRef.current?.type !== 'group' && selectedRef.current?.id === userId) {
        setBlockStatus((prev) => ({ ...prev, iBlocked }));
      }
    });

    socket.on('blocked_by_update', ({ by, blocked }) => {
      if (selectedRef.current?.type !== 'group' && selectedRef.current?.id === by) {
        setBlockStatus((prev) => ({ ...prev, blockedMe: blocked }));
      }
    });

    socket.on('status_update', ({ ids, status }) => {
      setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, status } : m)));
    });

    socket.on('message_edited', ({ id, text }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, edited: 1 } : m)));
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    });

    socket.on('message_deleted', ({ id }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: 1, text: '' } : m)));
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    });

    socket.on('typing', ({ from, groupId }) => {
      if (groupId) {
        setGroupTypingIds((prev) => new Set(prev).add(groupId));
      } else {
        setTypingIds((prev) => new Set(prev).add(from));
      }
    });

    socket.on('stop_typing', ({ from, groupId }) => {
      if (groupId) {
        setGroupTypingIds((prev) => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      } else {
        setTypingIds((prev) => {
          const next = new Set(prev);
          next.delete(from);
          return next;
        });
      }
    });

    socket.on('group_created', () => {
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    });

    return () => {
      socket.off('connect');
      socket.off('presence');
      socket.off('message');
      socket.off('reaction_update');
      socket.off('block_status');
      socket.off('blocked_by_update');
      socket.off('status_update');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('group_created');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelectUser = useCallback((partner) => {
    setSelected({ type: 'user', ...partner });
    setQuery('');
    getSocket().emit('mark_read', { from: partner.id });
  }, []);

  const handleSelectGroup = useCallback((group) => {
    setSelected({ type: 'group', ...group });
    setQuery('');
  }, []);

  useEffect(() => {
    if (selected && selected.type !== 'group') {
      getSocket().emit('mark_read', { from: selected.id });
    }
  }, [selected, messages.length]);

  function currentTarget() {
    return selected.type === 'group' ? { groupId: selected.id } : { to: selected.id };
  }

  function handleSend() {
    if (!input.trim() || !selected) return;
    getSocket().emit('send_message', { ...currentTarget(), text: input.trim(), type: 'text' });
    getSocket().emit('stop_typing', currentTarget());
    setInput('');
  }

  function handleSendSticker(sticker) {
    if (!selected) return;
    getSocket().emit('send_message', { ...currentTarget(), text: sticker, type: 'sticker' });
  }

  async function handleSendImage(file) {
    if (!selected || !file) return;
    const { url } = await uploadFile(file);
    getSocket().emit('send_message', { ...currentTarget(), text: url, type: 'image' });
  }

  function handleSendGif(url) {
    if (!selected) return;
    getSocket().emit('send_message', { ...currentTarget(), text: url, type: 'gif' });
  }

  function handleInputChange(value) {
    setInput(value);
    if (!selected) return;
    const socket = getSocket();
    socket.emit('typing', currentTarget());
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', currentTarget());
    }, 1500);
  }

  function handleEditMessage(id, text) {
    getSocket().emit('edit_message', { id, text });
  }

  function handleDeleteMessage(id) {
    getSocket().emit('delete_message', { id });
  }

  function handleReactMessage(id, emoji) {
    getSocket().emit('react_message', { id, emoji });
  }

  function handleBlock() {
    if (!selected) return;
    getSocket().emit('block_user', { userId: selected.id });
    setBlockStatus((prev) => ({ ...prev, iBlocked: true }));
  }

  function handleUnblock() {
    if (!selected) return;
    getSocket().emit('unblock_user', { userId: selected.id });
    setBlockStatus((prev) => ({ ...prev, iBlocked: false }));
  }

  async function handleLeaveGroup() {
    if (!selected || selected.type !== 'group') return;
    await leaveGroup(selected.id, user.id);
    setSelected(null);
    queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
  }

  function handleLogout() {
    getSocket().disconnect();
    localStorage.removeItem('tanishuv_user');
    queryClient.clear();
    router.push('/');
  }

  if (!user) return null;

  const partnerLastSeen = selected && selected.type !== 'group' ? lastSeenMap.get(selected.id) || selected.lastSeen : null;

  return (
    <main className="relative mx-auto flex h-screen max-w-6xl flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      <div className="pointer-events-none fixed -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-40 -right-32 h-96 w-96 rounded-full bg-brand-500/10 blur-[120px]" />

      <header className={`relative z-10 items-center justify-between gap-2 ${selected ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-md sm:h-10 sm:w-10">
            {user.ism?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">Tanishuv Chat</h1>
            <p className="hidden truncate text-sm text-slate-400 sm:block">
              Salom, {user.ism}! (@{user.username})
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowProfile(true)}
            title="Profil"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 p-2 text-sm font-medium text-slate-300 transition-colors hover:border-violet-400/60 hover:text-violet-400 sm:px-3 sm:py-1.5"
          >
            <UserCog size={16} />
            <span className="hidden sm:inline">Profil</span>
          </button>
          <button
            onClick={handleLogout}
            title="Chiqish"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 p-2 text-sm font-medium text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-400 sm:px-3 sm:py-1.5"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Chiqish</span>
          </button>
        </div>
      </header>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdated={(updated) => {
            const merged = { ...user, ...updated };
            setUser(merged);
            localStorage.setItem('tanishuv_user', JSON.stringify(merged));
          }}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          myId={user.id}
          onClose={() => setShowCreateGroup(false)}
          onCreated={(group) => {
            queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
            handleSelectGroup({ id: group.id, name: group.name, memberCount: group.memberCount });
          }}
        />
      )}

      <div className="relative z-10 grid flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-rows-[minmax(0,1fr)] md:grid-cols-3">
        <div className={`min-h-0 md:col-span-1 ${selected ? 'hidden md:block' : 'block'}`}>
          <Sidebar
            query={query}
            onQueryChange={setQuery}
            searchResults={searchQuery.data || []}
            isSearching={searchQuery.isFetching}
            conversations={conversationsQuery.data || []}
            groups={groupsQuery.data || []}
            onlineIds={onlineIds}
            selectedId={selected?.id}
            selectedType={selected?.type}
            onSelectUser={handleSelectUser}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={() => setShowCreateGroup(true)}
          />
        </div>
        <div className={`min-h-0 md:col-span-2 ${selected ? 'block' : 'hidden md:block'}`}>
          <ChatPanel
            onBack={() => setSelected(null)}
            partner={selected}
            online={selected && selected.type !== 'group' ? onlineIds.has(selected.id) : false}
            lastSeen={partnerLastSeen}
            typing={
              selected
                ? selected.type === 'group'
                  ? groupTypingIds.has(selected.id)
                  : typingIds.has(selected.id)
                : false
            }
            messages={messages}
            myId={user.id}
            input={input}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onSendSticker={handleSendSticker}
            onSendImage={handleSendImage}
            onSendGif={handleSendGif}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReactMessage={handleReactMessage}
            blockStatus={blockStatus}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
            onLeaveGroup={handleLeaveGroup}
          />
        </div>
      </div>
    </main>
  );
}
