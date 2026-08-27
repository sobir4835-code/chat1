'use client';

import { useState } from 'react';
import { X, Search, Check, Users } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { searchUsers, createGroup } from '../lib/api';

export default function CreateGroupModal({ myId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedUsers, setSelectedUsers] = useState(new Map());
  const [error, setError] = useState('');

  const searchQuery = useQuery({
    queryKey: ['group-user-search', query, myId],
    queryFn: () => searchUsers(query, myId),
    enabled: query.trim().length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () => createGroup({ name: name.trim(), creatorId: myId, memberIds: Array.from(selectedIds) }),
    onSuccess: (group) => {
      onCreated({ ...group, memberCount: selectedIds.size + 1 });
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  function toggleUser(u) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.add(u.id);
      return next;
    });
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Guruh nomini kiriting');
      return;
    }
    if (selectedIds.size === 0) {
      setError('Kamida bitta a\'zo tanlang');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md animate-fade-in-up flex-col rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Users size={18} /> Yangi guruh
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Guruh nomi"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06]"
          />

          {selectedUsers.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selectedUsers.values()).map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-1 text-xs text-violet-200 ring-1 ring-violet-400/60"
                >
                  {u.ism}
                  <button type="button" onClick={() => toggleUser(u)} className="hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Username orqali a'zo qidirish..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-8 pr-3 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06]"
            />
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {searchQuery.isFetching && <p className="px-1 py-2 text-xs text-slate-500">Qidirilmoqda...</p>}
            {!searchQuery.isFetching && query.trim() && (searchQuery.data || []).length === 0 && (
              <p className="px-1 py-2 text-xs text-slate-500">Hech kim topilmadi</p>
            )}
            {(searchQuery.data || []).map((u) => {
              const isSelected = selectedIds.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    isSelected ? 'bg-violet-500/15 text-violet-200' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span>
                    {u.ism} {u.familiya} <span className="text-slate-500">@{u.username}</span>
                  </span>
                  {isSelected && <Check size={16} />}
                </button>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-md transition duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {createMutation.isPending ? 'Yaratilmoqda...' : `Guruh yaratish${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
