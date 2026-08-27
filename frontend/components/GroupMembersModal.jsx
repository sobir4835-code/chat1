'use client';

import { useState } from 'react';
import { X, Search, UserPlus, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroupMembers, searchUsers, addGroupMember } from '../lib/api';

export default function GroupMembersModal({ groupId, myId, onClose }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const membersQuery = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => getGroupMembers(groupId, myId),
  });

  const searchQuery = useQuery({
    queryKey: ['group-add-search', query, groupId],
    queryFn: () => searchUsers(query, myId),
    enabled: query.trim().length > 0,
  });

  const addMutation = useMutation({
    mutationFn: (newMemberId) => addGroupMember(groupId, myId, newMemberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', myId] });
      setQuery('');
    },
  });

  const memberIds = new Set((membersQuery.data || []).map((m) => m.id));
  const addableResults = (searchQuery.data || []).filter((u) => !memberIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md animate-fade-in-up flex-col rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Users size={18} /> Guruh a&apos;zolari
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {membersQuery.isLoading && <p className="px-1 py-2 text-xs text-slate-500">Yuklanmoqda...</p>}
          {(membersQuery.data || []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                {m.ism?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {m.ism} {m.familiya}
                </p>
                <p className="truncate text-xs text-slate-400">@{m.username}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <UserPlus size={14} /> A&apos;zo qo&apos;shish
          </p>
          <div className="relative mb-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Username orqali qidirish..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-3 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06]"
            />
          </div>
          {query.trim() && (
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {addableResults.length === 0 && !searchQuery.isFetching && (
                <p className="px-1 text-xs text-slate-500">Hech kim topilmadi</p>
              )}
              {addableResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => addMutation.mutate(u.id)}
                  disabled={addMutation.isPending}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
                >
                  <span>
                    {u.ism} {u.familiya} <span className="text-slate-500">@{u.username}</span>
                  </span>
                  <UserPlus size={14} className="text-violet-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
