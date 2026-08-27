'use client';

import { useQuery } from '@tanstack/react-query';
import { X, AtSign, Calendar, MapPin } from 'lucide-react';
import { getUser } from '../lib/api';
import { formatLastSeen } from '../lib/format';

export default function ViewProfileModal({ userId, online, lastSeen, onClose }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm animate-fade-in-up rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Profil</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {isLoading || !user ? (
          <p className="py-6 text-center text-sm text-slate-500">Yuklanmoqda...</p>
        ) : (
          <>
            <div className="mb-5 flex flex-col items-center">
              <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-2xl font-bold text-white shadow-glow">
                {user.ism?.[0]?.toUpperCase()}
              </div>
              <h3 className="text-lg font-semibold text-white">
                {user.ism} {user.familiya}
              </h3>
              <p className="text-sm text-slate-400">@{user.username}</p>
              <p className={`mt-1 text-xs ${online ? 'text-emerald-400' : 'text-slate-500'}`}>
                {online ? 'online' : formatLastSeen(lastSeen)}
              </p>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2.5 text-sm">
                <AtSign size={15} className="shrink-0 text-slate-500" />
                <span className="text-slate-300">@{user.username}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar size={15} className="shrink-0 text-slate-500" />
                <span className="text-slate-300">{user.yosh} yosh</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin size={15} className="shrink-0 text-slate-500" />
                <span className="text-slate-300">{user.shahar}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
