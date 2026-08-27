'use client';

import { useState } from 'react';
import { X, User, Calendar, MapPin, Lock, Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { updateProfile, changePassword } from '../lib/api';

export default function ProfileModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({
    ism: user.ism || '',
    familiya: user.familiya || '',
    yosh: user.yosh || '',
    shahar: user.shahar || '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const profileMutation = useMutation({
    mutationFn: () =>
      updateProfile(user.id, {
        ism: form.ism.trim(),
        familiya: form.familiya.trim(),
        yosh: Number(form.yosh),
        shahar: form.shahar.trim(),
      }),
    onSuccess: (updated) => {
      setProfileError('');
      setProfileSaved(true);
      onUpdated(updated);
      setTimeout(() => setProfileSaved(false), 2000);
    },
    onError: (err) => setProfileError(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ userId: user.id, ...pwForm }),
    onSuccess: () => {
      setPwError('');
      setPwSaved(true);
      setPwForm({ oldPassword: '', newPassword: '' });
      setTimeout(() => setPwSaved(false), 2000);
    },
    onError: (err) => setPwError(err.message),
  });

  function handleProfileSubmit(e) {
    e.preventDefault();
    if (!form.ism.trim() || !form.familiya.trim() || !form.shahar.trim() || !form.yosh) {
      setProfileError('Barcha maydonlarni to\'ldiring');
      return;
    }
    profileMutation.mutate();
  }

  function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!pwForm.oldPassword || !pwForm.newPassword) {
      setPwError('Eski va yangi parolni kiriting');
      return;
    }
    passwordMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-md animate-fade-in-up overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Profil</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleProfileSubmit} className="mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Ism"
              icon={User}
              value={form.ism}
              onChange={(e) => setForm((f) => ({ ...f, ism: e.target.value }))}
            />
            <FieldInput
              label="Familiya"
              icon={User}
              value={form.familiya}
              onChange={(e) => setForm((f) => ({ ...f, familiya: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Yosh"
              icon={Calendar}
              type="number"
              min={18}
              max={100}
              value={form.yosh}
              onChange={(e) => setForm((f) => ({ ...f, yosh: e.target.value }))}
            />
            <FieldInput
              label="Shahar"
              icon={MapPin}
              value={form.shahar}
              onChange={(e) => setForm((f) => ({ ...f, shahar: e.target.value }))}
            />
          </div>
          {profileError && <p className="text-sm text-red-400">{profileError}</p>}
          {profileSaved && <p className="text-sm text-emerald-400">Saqlandi ✓</p>}
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-md transition duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {profileMutation.isPending ? 'Saqlanmoqda...' : 'Profilni saqlash'}
          </button>
        </form>

        {user.email ? (
          <p className="text-xs text-slate-500">Google akkaunt uchun parol o&apos;rnatilmagan.</p>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-3 border-t border-white/5 pt-4">
            <p className="text-sm font-medium text-slate-300">Parolni o&apos;zgartirish</p>
            <FieldInput
              label="Eski parol"
              icon={Lock}
              type="password"
              value={pwForm.oldPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
            />
            <FieldInput
              label="Yangi parol"
              icon={Lock}
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="Kamida 6 belgi"
            />
            {pwError && <p className="text-sm text-red-400">{pwError}</p>}
            {pwSaved && <p className="text-sm text-emerald-400">Parol yangilandi ✓</p>}
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-violet-400/60 disabled:opacity-60"
            >
              {passwordMutation.isPending ? 'Yangilanmoqda...' : 'Parolni yangilash'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FieldInput({ label, icon: Icon, type, ...props }) {
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />}
        <input
          {...props}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          className={`w-full rounded-xl border border-white/10 bg-white/[0.04] py-1.5 text-sm text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06] ${
            Icon ? 'pl-8' : 'pl-3'
          } ${isPassword ? 'pr-9' : 'pr-3'}`}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
