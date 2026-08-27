'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AtSign, Lock, User, Calendar, MapPin, Eye, EyeOff, MessageCircleHeart } from 'lucide-react';
import { registerUser, loginUser, googleAuth, completeGoogleProfile } from '../lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function FieldInput({ label, icon: Icon, type, ...props }) {
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />}
        <input
          {...props}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          className={`w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-white outline-none transition-colors focus:border-violet-400/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20 ${
            Icon ? 'pl-9' : 'pl-3'
          } ${isPassword ? 'pr-10' : 'pr-3'}`}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    ism: '',
    familiya: '',
    yosh: '',
    shahar: '',
  });
  const [googlePending, setGooglePending] = useState(null); // { idToken, email }
  const [googleForm, setGoogleForm] = useState({ username: '', ism: '', familiya: '', yosh: '', shahar: '' });
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  function goToApp(user) {
    localStorage.setItem('tanishuv_user', JSON.stringify(user));
    router.push('/messages');
  }

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: goToApp,
    onError: (err) => setError(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: goToApp,
    onError: (err) => setError(err.message),
  });

  const googleMutation = useMutation({
    mutationFn: googleAuth,
    onSuccess: (data, idToken) => {
      if (!data.needsProfile) {
        goToApp(data.user);
        return;
      }
      setGooglePending({ idToken, email: data.google.email });
      setGoogleForm((f) => ({
        ...f,
        ism: data.google.ism || f.ism,
        familiya: data.google.familiya || f.familiya,
      }));
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: completeGoogleProfile,
    onSuccess: goToApp,
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function renderButton() {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => googleMutation.mutate(response.credential),
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
    }

    if (window.google) {
      renderButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googlePending]);

  function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    if (!loginForm.username.trim() || !loginForm.password) {
      setError('Username va parolni kiriting');
      return;
    }
    loginMutation.mutate({ username: loginForm.username.trim(), password: loginForm.password });
  }

  function handleRegisterSubmit(e) {
    e.preventDefault();
    setError('');
    const f = registerForm;
    if (!f.username.trim() || !f.password || !f.ism.trim() || !f.familiya.trim() || !f.shahar.trim() || !f.yosh) {
      setError('Barcha maydonlarni to\'ldiring');
      return;
    }
    if (f.password.length < 6) {
      setError('Parol kamida 6 belgidan iborat bo\'lishi kerak');
      return;
    }
    registerMutation.mutate({
      username: f.username.trim(),
      password: f.password,
      ism: f.ism.trim(),
      familiya: f.familiya.trim(),
      yosh: Number(f.yosh),
      shahar: f.shahar.trim(),
    });
  }

  function handleGoogleCompleteSubmit(e) {
    e.preventDefault();
    setError('');
    const f = googleForm;
    if (!f.username.trim() || !f.ism.trim() || !f.familiya.trim() || !f.shahar.trim() || !f.yosh) {
      setError('Barcha maydonlarni to\'ldiring');
      return;
    }
    completeMutation.mutate({
      idToken: googlePending.idToken,
      username: f.username.trim(),
      ism: f.ism.trim(),
      familiya: f.familiya.trim(),
      yosh: Number(f.yosh),
      shahar: f.shahar.trim(),
    });
  }

  const isPending = loginMutation.isPending || registerMutation.isPending || completeMutation.isPending;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/25 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-brand-500/20 blur-[100px]" />

      <div className="relative w-full max-w-md animate-fade-in-up rounded-3xl border border-white/10 bg-surface/90 p-8 shadow-2xl shadow-glow backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
            <MessageCircleHeart size={24} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">Tanishuv Chat</h1>
          <p className="mt-1 text-center text-xs text-slate-400">Yangi odamlar bilan tanishing va suhbatlashing</p>
        </div>

        {googlePending ? (
          <>
            <p className="mb-6 text-center text-sm text-slate-400">
              Google: <span className="text-emerald-400">{googlePending.email}</span> &mdash; profilni yakunlang
            </p>
            <form onSubmit={handleGoogleCompleteSubmit} className="space-y-4">
              <FieldInput
                label="Username"
                icon={AtSign}
                value={googleForm.username}
                onChange={(e) => setGoogleForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="masalan: javohir_25"
                autoCapitalize="off"
                autoCorrect="off"
              />
              <FieldInput
                label="Ism"
                icon={User}
                value={googleForm.ism}
                onChange={(e) => setGoogleForm((f) => ({ ...f, ism: e.target.value }))}
              />
              <FieldInput
                label="Familiya"
                icon={User}
                value={googleForm.familiya}
                onChange={(e) => setGoogleForm((f) => ({ ...f, familiya: e.target.value }))}
              />
              <FieldInput
                label="Yosh"
                icon={Calendar}
                type="number"
                min={18}
                max={100}
                value={googleForm.yosh}
                onChange={(e) => setGoogleForm((f) => ({ ...f, yosh: e.target.value }))}
              />
              <FieldInput
                label="Qayerdanligingiz"
                icon={MapPin}
                value={googleForm.shahar}
                onChange={(e) => setGoogleForm((f) => ({ ...f, shahar: e.target.value }))}
                placeholder="Shahar / viloyat"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 font-semibold text-white shadow-lg shadow-violet-950/40 transition duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100"
              >
                {isPending ? 'Yuborilmoqda...' : 'Yakunlash'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setGooglePending(null);
                  setError('');
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-300"
              >
                Bekor qilish
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-all duration-150 ${
                  mode === 'login' ? 'bg-brand-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kirish
              </button>
              <button
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-all duration-150 ${
                  mode === 'register' ? 'bg-brand-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ro&apos;yxatdan o&apos;tish
              </button>
            </div>

            {GOOGLE_CLIENT_ID && (
              <div className="mb-6">
                <div ref={googleBtnRef} className="flex justify-center" />
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-slate-500">yoki</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <FieldInput
                  label="Username"
                  icon={AtSign}
                  value={loginForm.username}
                  onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <FieldInput
                  label="Parol"
                  icon={Lock}
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Parolingiz"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 font-semibold text-white shadow-lg shadow-violet-950/40 transition duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100"
                >
                  {loginMutation.isPending ? 'Kirilmoqda...' : 'Kirish'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <FieldInput
                    label="Username"
                    icon={AtSign}
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="masalan: javohir_25"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Boshqalar sizni shu username orqali topib yozishadi
                  </p>
                </div>
                <FieldInput
                  label="Parol"
                  icon={Lock}
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Kamida 6 belgi"
                />
                <FieldInput
                  label="Ism"
                  icon={User}
                  value={registerForm.ism}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, ism: e.target.value }))}
                  placeholder="Ismingiz"
                />
                <FieldInput
                  label="Familiya"
                  icon={User}
                  value={registerForm.familiya}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, familiya: e.target.value }))}
                  placeholder="Familiyangiz"
                />
                <FieldInput
                  label="Yosh"
                  icon={Calendar}
                  type="number"
                  min={18}
                  max={100}
                  value={registerForm.yosh}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, yosh: e.target.value }))}
                  placeholder="Yoshingiz"
                />
                <FieldInput
                  label="Qayerdanligingiz"
                  icon={MapPin}
                  value={registerForm.shahar}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, shahar: e.target.value }))}
                  placeholder="Shahar / viloyat"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 font-semibold text-white shadow-lg shadow-violet-950/40 transition duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100"
                >
                  {registerMutation.isPending ? 'Yuborilmoqda...' : 'Ro\'yxatdan o\'tish'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
