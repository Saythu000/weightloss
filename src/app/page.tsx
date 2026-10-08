'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Product');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Stats count-up animation state
  const [stat1, setStat1] = useState(0); // target 120 (latency ms)
  const [stat2, setStat2] = useState(0); // target 99.4 (% qualification rate)
  const [stat4, setStat4] = useState(0); // target 10 (x sales velocity)

  useEffect(() => {
    if (isMenuOpen || activeModal) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }, [isMenuOpen, activeModal]);

  useEffect(() => {
    const duration = 2200;
    const startTime = performance.now();

    const easeOutCubic = (x: number): number => {
      return 1 - Math.pow(1 - x, 3);
    };

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      setStat1(Math.round(easedProgress * 120));
      setStat2(parseFloat((easedProgress * 99.4).toFixed(1)));
      setStat4(Math.round(easedProgress * 10));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const openNavModal = (tab: string) => {
    setActiveTab(tab);
    setActiveModal(tab);
    closeMenu();
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

        <nav className="nav-pill" aria-label="Main Navigation">
          {['Product', 'Solutions', 'Pricing', 'Company'].map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-link ${activeTab === item ? 'active' : ''}`}
              onClick={() => openNavModal(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <Link href="/login" className="sign-in-btn">
          Sign in
        </Link>

        {/* Mobile Hamburger Button */}
        <button
          className="burger-btn"
          aria-label="Toggle menu"
          onClick={toggleMenu}
        >
          <span className="burger-bar"></span>
          <span className="burger-bar"></span>
          <span className="burger-bar"></span>
        </button>
      </header>

      {/* Mobile Drawer Sheet & Overlay */}
      <div
        className={`mobile-menu-overlay ${isMenuOpen || activeModal ? 'open' : ''}`}
        onClick={() => {
          closeMenu();
          setActiveModal(null);
        }}
      />

      <div className={`mobile-menu-sheet ${isMenuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          {['Product', 'Solutions', 'Pricing', 'Company'].map((item) => (
            <button
              key={item}
              type="button"
              className={`mobile-link ${activeTab === item ? 'active' : ''}`}
              onClick={() => openNavModal(item)}
            >
              {item}
            </button>
          ))}
          <Link href="/login" className="mobile-sign-in" onClick={closeMenu}>
            Sign in
          </Link>
        </nav>
      </div>

      {/* Feature Detail Modal Sheet */}
      {activeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-neutral-900/95 border border-white/20 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative text-white animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>

            {activeModal === 'Product' && (
              <div>
                <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono mb-2">Autonomous AI Sales Stack</div>
                <h2 className="text-2xl font-bold mb-4 font-display uppercase tracking-tight">AI Voice, WhatsApp &amp; RAG Agents</h2>
                <div className="space-y-4 text-sm text-neutral-300">
                  <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="font-semibold text-white mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-phone text-xs text-emerald-400"></i> Voice AI Calling Agents
                    </div>
                    <p className="text-xs text-neutral-400">Low-latency (&lt;120ms) outbound cold calls, lead qualification, objection handling, and real-time live transfer.</p>
                  </div>

                  <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="font-semibold text-white mb-1 flex items-center gap-2">
                      <i className="fa-brands fa-whatsapp text-xs text-emerald-400"></i> WhatsApp Conversational AI
                    </div>
                    <p className="text-xs text-neutral-400">24/7 automated WhatsApp chats, instant quote generation, broadcast campaigns, and automated follow-ups.</p>
                  </div>

                  <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="font-semibold text-white mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-brain text-xs text-purple-400"></i> RAG Knowledge Base
                    </div>
                    <p className="text-xs text-neutral-400">Ground AI responses on company documents, product catalogs, and sales playbooks for zero hallucinations.</p>
                  </div>

                  <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="font-semibold text-white mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-chart-line text-xs text-blue-400"></i> Sales CRM &amp; Pipeline Sync
                    </div>
                    <p className="text-xs text-neutral-400">Real-time lead scoring, stage updates, chat transcripts, and instant manual agent takeover.</p>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'Solutions' && (
              <div>
                <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono mb-2">Custom AI Engineering</div>
                <h2 className="text-2xl font-bold mb-4 font-display uppercase tracking-tight">Enterprise LLM Fine-Tuning</h2>
                <div className="space-y-3 text-sm text-neutral-300">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    We fine-tune open-source and proprietary LLMs (Llama 3, Mistral, GPT-4, Gemini) directly on your organization&apos;s proprietary datasets, sales calls, and domain documentation.
                  </p>
                  <ul className="space-y-2 text-xs text-neutral-400">
                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Private Cloud &amp; On-Premise Model Deployments</li>
                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Industry-Specific Tone &amp; Scripting Alignment</li>
                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> High-Throughput API Endpoints with Zero Data Leaks</li>
                  </ul>
                </div>
              </div>
            )}

            {activeModal === 'Pricing' && (
              <div>
                <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono mb-2">Flexible Scalability</div>
                <h2 className="text-2xl font-bold mb-4 font-display uppercase tracking-tight">Enterprise Plans</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-xs text-neutral-400 font-mono">STARTER AGENT</div>
                    <div className="text-xl font-bold text-white my-1">$299<span className="text-xs text-neutral-400">/mo</span></div>
                    <ul className="text-[11px] text-neutral-400 space-y-1 mt-2">
                      <li>• Voice AI Calling (1,000 Mins)</li>
                      <li>• 24/7 WhatsApp AI Agent</li>
                      <li>• Basic RAG Vector Store</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-white/10 border border-white/20 rounded-2xl relative">
                    <div className="text-xs text-emerald-400 font-mono">ENTERPRISE FINE-TUNE</div>
                    <div className="text-xl font-bold text-white my-1">Custom</div>
                    <ul className="text-[11px] text-neutral-300 space-y-1 mt-2">
                      <li>• Unlimited Voice &amp; WhatsApp</li>
                      <li>• Dedicated LLM Fine-Tuning</li>
                      <li>• Full Sales CRM &amp; API Access</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'Company' && (
              <div>
                <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono mb-2">Security &amp; Infrastructure</div>
                <h2 className="text-2xl font-bold mb-4 font-display uppercase tracking-tight">Enterprise Grade Security</h2>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Built from the ground up for high-compliance enterprise sales operations. All lead communications and fine-tuned model weights are encrypted in transit and at rest.
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 border-t border-white/10 pt-3">
                  <span><i className="fa-solid fa-shield-halved text-emerald-400 mr-1"></i> SOC2 Ready</span>
                  <span><i className="fa-solid fa-lock text-purple-400 mr-1"></i> End-to-End Encrypted</span>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <Link href="/login" className="cta-btn text-xs" onClick={() => setActiveModal(null)}>
                Launch AI Sales Platform →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero Centerpiece */}
      <main className="hero">
        <div className="trust-row anim" style={{ '--d': '0.1s' } as React.CSSProperties}>
          <div className="avatar-stack">
            <div className="avatar-ring avatar-1" title="WhatsApp Business API">
              <div className="avatar-inner">
                <i className="fa-brands fa-whatsapp"></i>
              </div>
            </div>
            <div className="avatar-ring avatar-2" title="Twilio Voice AI">
              <div className="avatar-inner">
                <i className="fa-solid fa-phone"></i>
              </div>
            </div>
            <div className="avatar-ring avatar-3" title="Fine-Tuned LLMs">
              <div className="avatar-inner">
                <i className="fa-solid fa-brain"></i>
              </div>
            </div>
          </div>
          <div className="trust-pill">Powering 2.4M+ Autonomous Sales Interactions</div>
        </div>

        <h1 className="headline">
          <span className="headline-line line-1">Intelligence</span>
          <span className="headline-line line-2">Designed To Evolve</span>
        </h1>

        <p className="subhead anim" style={{ '--d': '0.45s' } as React.CSSProperties}>
          Deploy autonomous Voice, WhatsApp, and RAG AI sales agents that call leads, automate follow-ups, update CRMs, and run on custom fine-tuned enterprise LLMs.
        </p>

        <div className="cta-wrapper anim-pulse" style={{ '--d': '0.6s' } as React.CSSProperties}>
          <Link href="/login" className="cta-btn">
            Get Started
          </Link>
        </div>
      </main>

      {/* 3. Stats Footer */}
      <footer className="stats-footer">
        <div className="stat-item anim" style={{ '--d': '0.7s' } as React.CSSProperties}>
          <div className="stat-icon">&lt;</div>
          <div className="stat-value">{stat1}ms</div>
          <div className="stat-label">Voice AI Latency</div>
        </div>

        <div className="stat-item anim" style={{ '--d': '0.8s' } as React.CSSProperties}>
          <div className="stat-icon">%</div>
          <div className="stat-value">{stat2.toFixed(1)}%</div>
          <div className="stat-label">Lead Qualification Rate</div>
        </div>

        <div className="stat-item anim" style={{ '--d': '0.9s' } as React.CSSProperties}>
          <div className="stat-icon">*</div>
          <div className="stat-value">24/7</div>
          <div className="stat-label">WhatsApp &amp; Voice Sync</div>
        </div>

        <div className="stat-item anim" style={{ '--d': '1.0s' } as React.CSSProperties}>
          <div className="stat-icon">x</div>
          <div className="stat-value">{stat4}x</div>
          <div className="stat-label">Sales Pipeline Velocity</div>
        </div>
      </footer>
    </div>
  );
}
