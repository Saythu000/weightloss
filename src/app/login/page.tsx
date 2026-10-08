'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/dashboard';
        return;
      } else {
        setErrorMsg(data.error || 'Invalid Admin email or password');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {/* Full-viewport cover video background */}
      <div className="bg">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* 1. Header Navigation */}
      <header className="header">
        <Link href="/" className="logo-btn" aria-label="Home">
          <img src="/assets/logo.webp" alt="Logo" className="logo-img" />
        </Link>

        <Link href="/" className="nav-pill text-xs font-semibold text-neutral-800 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <span>← Back to Home</span>
        </Link>

        <div className="w-[46px] h-[46px] hidden sm:block"></div>
      </header>

      {/* 2. Login Centerpiece Container */}
      <main className="hero max-w-md w-full my-auto z-10 px-4">
        <div className="w-full bg-neutral-900/80 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative text-left">
          
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/20 shadow-lg">
              <i className="fa-solid fa-brain text-white text-2xl"></i>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display uppercase tracking-tight text-white">
              Enterprise Portal
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              AI Sales Operations & LLM Fine-Tuning Gateway
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 text-xs font-semibold animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Enterprise Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#28282a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-500"
                placeholder="admin@motionai.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#28282a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-white text-black font-semibold text-sm rounded-full hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_22px_rgba(255,255,255,0.32)] disabled:opacity-50 mt-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In to AI Dashboard</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-mono">
              🔒 Encrypted Enterprise Security Gateway v3.8.0
            </span>
          </div>
        </div>
      </main>

      {/* Footer minimal spacing */}
      <footer className="w-full py-2 flex-shrink-0"></footer>
    </div>
  );
}
