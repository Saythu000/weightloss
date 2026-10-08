'use client';

import React, { useState, useEffect } from 'react';

interface HeroMotionVideoProps {
  onOpenLogin: () => void;
}

export default function HeroMotionVideo({ onOpenLogin }: HeroMotionVideoProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Home');

  // Animated Stat Counters
  const [inferenceTime, setInferenceTime] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [runtime, setRuntime] = useState(0);
  const [contextWindows, setContextWindows] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const startTime = performance.now();

    const animateStats = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setInferenceTime(Math.round(120 * easeProgress));
      setUptime(Number((99.99 * easeProgress).toFixed(2)));
      setRuntime(Math.round(24 * easeProgress));
      setContextWindows(Number((2.4 * easeProgress).toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(animateStats);
      }
    };

    requestAnimationFrame(animateStats);
  }, []);

  const navItems = ['Home', 'Product', 'Case Studies', 'Contact'];

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-black text-white font-sans select-none">
      {/* Background Video */}
      <div className="absolute inset-0 bg-black overflow-hidden pointer-events-none z-0">
        <video
          className="bg-video absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          autoPlay
          muted
          loop
          playsInline
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Main Page Layout Container (3 Vertical Regions) */}
      <div className="page relative z-10 flex flex-col items-center justify-between h-full w-full px-[clamp(14px,3vw,32px)] py-[clamp(16px,2.4vh,28px)]">
        
        {/* 1) HEADER (Desktop & Mobile) */}
        <header className="w-full max-w-[720px] flex-shrink-0 animate-slide-down z-20">
          {/* Desktop Nav Row */}
          <div className="hidden md:flex items-center justify-between gap-[clamp(18px,2.8vw,28px)]">
            
            {/* Circular Logo Button */}
            <button
              onClick={() => setActiveNav('Home')}
              className="w-[clamp(40px,4.4vw,46px)] h-[clamp(40px,4.4vw,46px)] rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)] flex items-center justify-center transition-transform hover:scale-[1.04] cursor-pointer flex-shrink-0"
            >
              <div className="w-[72%] h-[72%] rounded-full bg-black flex items-center justify-center text-white font-mono text-xs font-bold">
                AI
              </div>
            </button>

            {/* Floating White Nav Pill */}
            <nav className="flex-1 max-w-[430px] h-[clamp(44px,5.2vw,48px)] bg-white rounded-full px-2 shadow-[0_4px_14px_rgba(0,0,0,0.16)] flex items-center justify-around">
              {navItems.map((item) => {
                const isActive = activeNav === item;
                return (
                  <button
                    key={item}
                    onClick={() => setActiveNav(item)}
                    className={`relative text-[clamp(13px,1.4vw,15px)] font-medium text-[#2e2e2e] tracking-[-0.01em] transition-opacity cursor-pointer px-3 py-1 ${
                      isActive
                        ? 'opacity-100 font-semibold nav-active-dots'
                        : 'opacity-50 hover:opacity-[0.75]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </nav>

            {/* Dark Sign In Pill */}
            <button
              onClick={onOpenLogin}
              className="h-[clamp(44px,5.2vw,48px)] px-[clamp(18px,2vw,24px)] rounded-full bg-[#28282a] text-[#c8c8c8] text-[clamp(13px,1.4vw,14.5px)] font-medium shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-all hover:bg-[#323234] hover:text-white hover:-translate-y-[1px] cursor-pointer flex items-center justify-center"
            >
              Sign in
            </button>
          </div>

          {/* Mobile Header Row (<=720px) */}
          <div className="flex md:hidden items-center justify-between w-full">
            <button
              onClick={() => setActiveNav('Home')}
              className="w-12 h-12 rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)] flex items-center justify-center"
            >
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-mono text-xs font-bold">
                AI
              </div>
            </button>

            {/* Circular Mobile Burger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-12 h-12 rounded-full bg-[#28282a] flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              aria-expanded={mobileMenuOpen}
            >
              <span
                className={`w-4.5 h-[1.5px] bg-white transition-transform ${
                  mobileMenuOpen ? 'rotate-45 translate-y-[4.5px]' : ''
                }`}
              />
              <span
                className={`w-4.5 h-[1.5px] bg-white transition-opacity ${
                  mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`w-4.5 h-[1.5px] bg-white transition-transform ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-[4.5px]' : ''
                }`}
              />
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay Sheet */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-md flex items-start justify-center pt-24 px-4 md:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] text-[#2e2e2e] flex flex-col gap-4 animate-menu-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setActiveNav(item);
                      setMobileMenuOpen(false);
                    }}
                    className={`text-left text-base font-semibold py-2.5 px-4 rounded-xl ${
                      activeNav === item
                        ? 'bg-black/5 text-black font-bold'
                        : 'text-[#2e2e2e]/70 hover:bg-black/5'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-black/10">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-3 rounded-full bg-[#28282a] text-white font-medium text-sm hover:bg-black transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2) HERO SECTION (Center Flex) */}
        <main className="flex-1 flex flex-col items-center justify-center text-center max-w-[900px] w-full my-auto py-2 z-10">
          
          {/* Trust Row ("Trusted by 2000+ Enterprises") */}
          <div className="inline-flex items-center mb-[clamp(16px,2.5vh,26px)] animate-reveal">
            {/* Overlapping Enterprise Avatar Rings */}
            <div className="flex items-center">
              {/* Microsoft Avatar */}
              <div className="w-[clamp(36px,4.5vw,42px)] h-[clamp(36px,4.5vw,42px)] rounded-full bg-[#28282a] border border-white/40 p-[5px] z-3 transition-transform hover:-translate-y-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#111111] text-[calc(clamp(36px,4.5vw,42px)*0.34)]">
                  <i className="fa-brands fa-microsoft" />
                </div>
              </div>

              {/* Amazon Avatar */}
              <div className="w-[clamp(36px,4.5vw,42px)] h-[clamp(36px,4.5vw,42px)] rounded-full bg-[#28282a] border border-white/40 p-[5px] -ml-[calc(clamp(36px,4.5vw,42px)*0.42)] z-2 transition-transform hover:-translate-y-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#111111] text-[calc(clamp(36px,4.5vw,42px)*0.34)]">
                  <i className="fa-brands fa-amazon" />
                </div>
              </div>

              {/* Google Avatar */}
              <div className="w-[clamp(36px,4.5vw,42px)] h-[clamp(36px,4.5vw,42px)] rounded-full bg-[#28282a] border border-white/40 p-[5px] -ml-[calc(clamp(36px,4.5vw,42px)*0.42)] z-1 transition-transform hover:-translate-y-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#111111] text-[calc(clamp(36px,4.5vw,42px)*0.34)]">
                  <i className="fa-brands fa-google" />
                </div>
              </div>
            </div>

            {/* Trust Pill */}
            <div className="h-[clamp(36px,4.5vw,42px)] bg-[#28282a] border border-white/40 rounded-full -ml-[calc(clamp(36px,4.5vw,42px)*0.42)] pl-[calc(clamp(36px,4.5vw,42px)*0.58)] pr-[clamp(14px,1.8vw,20px)] flex items-center">
              <span className="text-[#c4c2c3] font-medium text-[clamp(12px,1.4vw,13.5px)] tracking-tight">
                Trusted by 2000+ Enterprises
              </span>
            </div>
          </div>

          {/* Solid White Retro Dot-Matrix Headline */}
          <h1 className="headline font-display font-normal text-white uppercase tracking-[-0.04em] leading-[1.12] text-[clamp(28px,6.2vw,80px)] whitespace-nowrap overflow-hidden mb-3">
            <span className="block animate-headline-1">Intelligence</span>
            <span className="block animate-headline-2">Designed To Evolve</span>
          </h1>

          {/* Subhead */}
          <p className="max-w-[min(500px,92%)] text-[clamp(15.5px,1.8vw,18.5px)] text-[#d0d0d0] opacity-80 leading-[1.55] font-normal mb-[clamp(20px,3vh,32px)] animate-reveal">
            Build applications that reason, adapt and collaborate using a modular AI platform designed for production.
          </p>

          {/* CTA "Get Started" White Pill */}
          <div className="animate-cta">
            <button
              onClick={onOpenLogin}
              className="cta-glow-pill h-[clamp(44px,5.2vw,48px)] px-[clamp(24px,3vw,32px)] rounded-full bg-white text-black font-semibold text-[clamp(13.5px,1.5vw,14.5px)] tracking-tight cursor-pointer inline-flex items-center justify-center"
            >
              Get Started
            </button>
          </div>
        </main>

        {/* 3) STATS FOOTER (4 Metrics Grid) */}
        <footer className="w-full max-w-[920px] flex-shrink-0 z-10 pt-2 border-t border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center py-2">
            
            {/* Metric 1 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-white text-[clamp(20px,2.8vw,30px)]">&lt;</span>
                <span className="font-sans font-bold text-white text-[clamp(18px,2.2vw,26px)] tracking-tight tabular-nums">
                  {inferenceTime} <span className="text-sm font-normal">ms</span>
                </span>
              </div>
              <span className="text-[#8e8e8e] text-[clamp(11px,1.2vw,12.5px)] mt-0.5 font-medium">
                Inference Time
              </span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-white text-[clamp(20px,2.8vw,30px)]">%</span>
                <span className="font-sans font-bold text-white text-[clamp(18px,2.2vw,26px)] tracking-tight tabular-nums">
                  {uptime} <span className="text-sm font-normal">%</span>
                </span>
              </div>
              <span className="text-[#8e8e8e] text-[clamp(11px,1.2vw,12.5px)] mt-0.5 font-medium">
                Platform Uptime
              </span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-white text-[clamp(20px,2.8vw,30px)]">*</span>
                <span className="font-sans font-bold text-white text-[clamp(18px,2.2vw,26px)] tracking-tight tabular-nums">
                  {runtime} <span className="text-sm font-normal">/7</span>
                </span>
              </div>
              <span className="text-[#8e8e8e] text-[clamp(11px,1.2vw,12.5px)] mt-0.5 font-medium">
                Autonomous Runtime
              </span>
            </div>

            {/* Metric 4 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-white text-[clamp(20px,2.8vw,30px)]">#</span>
                <span className="font-sans font-bold text-white text-[clamp(18px,2.2vw,26px)] tracking-tight tabular-nums">
                  {contextWindows} <span className="text-sm font-normal">M</span>
                </span>
              </div>
              <span className="text-[#8e8e8e] text-[clamp(11px,1.2vw,12.5px)] mt-0.5 font-medium">
                Context Windows
              </span>
            </div>

          </div>
        </footer>

      </div>
    </div>
  );
}
