'use client';

import { Search, MessageCircleOff, UserSearch, Users, UsersRound, Plus } from 'lucide-react';

function UserRow({ user, subtitle, online, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-150 ${
        active ? 'bg-brand-gradient shadow-md' : 'hover:bg-white/5'
      }`}
    >
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
          active ? 'bg-white/20' : 'bg-white/10'
        }`}
      >
        {user.ism?.[0]?.toUpperCase()}
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {user.ism} {user.familiya}
        </p>
        <p className={`truncate text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{subtitle}</p>
      </div>
    </button>
  );
}

function GroupRow({ group, subtitle, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-150 ${
        active ? 'bg-brand-gradient shadow-md' : 'hover:bg-white/5'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
          active ? 'bg-white/20' : 'bg-gradient-to-br from-violet-500/30 to-brand-500/30'
        }`}
      >
        <UsersRound size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{group.name}</p>
        <p className={`truncate text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{subtitle}</p>
      </div>
    </button>
  );
}

function groupSubtitle(g) {
  if (g.lastDeleted) return 'Xabar o\'chirildi';
  if (g.lastType === 'sticker') return `${g.lastText} Stiker`;
  if (g.lastType === 'image') return '📷 Rasm';
  if (g.lastType === 'gif') return '🎬 GIF';
  if (g.lastText) return g.lastText;
  return `${g.memberCount} a'zo`;
}

export default function Sidebar({
  query,
  onQueryChange,
  searchResults,
  isSearching,
  conversations,
  groups,
  onlineIds,
  selectedId,
  selectedType,
  onSelectUser,
  onSelectGroup,
  onCreateGroup,
}) {
  const showingSearch = query.trim().length > 0;

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-surface">
      <div className="flex items-center gap-2 border-b border-white/5 p-3">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Username orqali qidirish..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06]"
          />
        </div>
        <button
          onClick={onCreateGroup}
          title="Yangi guruh"
          className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 p-2 text-slate-300 transition-colors hover:border-violet-400/60 hover:text-violet-400"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {showingSearch ? (
          <>
            {isSearching && <p className="px-3 py-2 text-xs text-slate-500">Qidirilmoqda...</p>}
            {!isSearching && searchResults.length === 0 && (
              <p className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
                <UserSearch size={14} /> Hech kim topilmadi
              </p>
            )}
            {searchResults.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                subtitle={`@${u.username}`}
                online={onlineIds.has(u.id)}
                active={selectedType === 'user' && selectedId === u.id}
                onClick={() => onSelectUser(u)}
              />
            ))}
          </>
        ) : (
          <>
            {groups.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-xs font-medium text-slate-500">
                  <Users size={12} /> Guruhlar
                </p>
                {groups.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    subtitle={groupSubtitle(g)}
                    active={selectedType === 'group' && selectedId === g.id}
                    onClick={() => onSelectGroup(g)}
                  />
                ))}
              </>
            )}

            {conversations.length === 0 && groups.length === 0 && (
              <p className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
                <MessageCircleOff size={14} /> Hali suhbatlar yo&apos;q. Username orqali odam qidiring.
              </p>
            )}
            {conversations.length > 0 && (
              <>
                {groups.length > 0 && (
                  <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-xs font-medium text-slate-500">
                    <UserSearch size={12} /> Suhbatlar
                  </p>
                )}
                {conversations.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    subtitle={
                      u.lastDeleted
                        ? 'Xabar o\'chirildi'
                        : u.lastType === 'sticker'
                        ? `${u.lastText} Stiker`
                        : u.lastType === 'image'
                        ? '📷 Rasm'
                        : u.lastType === 'gif'
                        ? '🎬 GIF'
                        : u.lastText
                    }
                    online={onlineIds.has(u.id)}
                    active={selectedType === 'user' && selectedId === u.id}
                    onClick={() => onSelectUser(u)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
