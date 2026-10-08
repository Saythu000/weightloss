'use client';

import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [syncInterval, setSyncInterval] = useState('30');
  const [concurrency, setConcurrency] = useState('4');
  const [launchOnBoot, setLaunchOnBoot] = useState(true);
  const [checkUpdates, setCheckUpdates] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an autonomous AI Sales Representative and Enterprise LLM Advisor powered by MotionSites. You qualify enterprise leads, explain custom LLM fine-tuning solutions, answer technical questions, and schedule live sales demos.'
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Key Visibility Toggles
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<'credentials' | 'persona' | 'gateway' | 'license'>('credentials');

  // Fetch settings from /api/bot/settings
  useEffect(() => {
    fetch('/api/bot/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setOpenaiKey(data.settings.openaiKey || '');
          setGeminiKey(data.settings.geminiKey || '');
          setSyncInterval(data.settings.syncInterval || '30');
          setConcurrency(data.settings.concurrency || '4');
          setLaunchOnBoot(data.settings.launchOnBoot ?? true);
          setCheckUpdates(data.settings.checkUpdates ?? true);
          setSystemPrompt(data.settings.systemPrompt || '');
        }
      })
      .catch((e) => console.error('Failed to load settings:', e));
  }, []);

  // Save Settings POST /api/bot/settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bot/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openaiKey,
          geminiKey,
          syncInterval,
          concurrency,
          launchOnBoot,
          checkUpdates,
          systemPrompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert(data.error || 'Failed to save preferences');
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset Session POST /api/bot/reset
  const handleResetSession = async () => {
    if (!confirm('Are you sure you want to unpair and reset your WhatsApp session?')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/bot/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('WhatsApp session cleared successfully! Please scan the QR code to re-pair.');
      } else {
        alert(data.error || 'Failed to reset session');
      }
    } catch (e) {
      console.error('Failed to reset session:', e);
      alert('Failed to reset session');
    } finally {
      setResetting(false);
    }
  };

  // Preset prompt handler
  const setPresetPrompt = (type: 'ENTERPRISE' | 'QUALIFIER' | 'HEALTHCARE') => {
    if (type === 'ENTERPRISE') {
      setSystemPrompt(
        'You are an Executive AI Sales Closer for Enterprise LLMs. Your mission is to qualify high-budget inbound enterprise buyers, articulate proprietary RAG fine-tuning ROI, answer security/SOC2 compliance inquiries, and schedule discovery calls with Account Executives.'
      );
    } else if (type === 'QUALIFIER') {
      setSystemPrompt(
        'You are a high-speed inbound lead qualification assistant. Ask structured questions regarding team size, timeline, and current sales stack. Automatically assign lead scores from 1-100 and offer instant WhatsApp demo bookings.'
      );
    } else {
      setSystemPrompt(
        'You are an AI Clinical Consultation Advisor. You provide supportive, educational information regarding GLP-1 weight loss programs, verify eligibility criteria, and schedule initial virtual doctor consultations.'
      );
    }
  };

  return (
    <main id="section-preferences" className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[#fafafa] font-sans text-zinc-900 space-y-6">
      {/* ZONE 1: Top Header & Global Save Action */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
              System &amp; Organization Settings
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              SOC2 Type II Encrypted Vault
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Configure enterprise LLM provider keys, AI sales persona system prompts, and WhatsApp telephony parameters.
          </p>
        </div>

        <button
          id="btn-save-settings"
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">
            {saved ? 'check_circle' : 'save'}
          </span>
          <span>{saved ? 'Preferences Saved!' : saving ? 'Saving...' : 'Save Preferences'}</span>
        </button>
      </div>

      {/* ZONE 2: 4-Metric System Status Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
            <span className="material-symbols-outlined text-xl">key</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">AI Gateways</div>
            <div className="text-sm font-extrabold text-zinc-900 font-mono mt-0.5">
              {openaiKey ? 'OpenAI' : 'None'} • {geminiKey ? 'Gemini' : 'Pending'}
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <span className="material-symbols-outlined text-xl">sync</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Sync Interval</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{syncInterval}m</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <span className="material-symbols-outlined text-xl">call</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Voice Lines</div>
            <div className="text-2xl font-extrabold text-purple-700 font-mono mt-0.5">{concurrency} Parallel</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">License Status</div>
            <div className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">ENTERPRISE (Unlimited)</div>
          </div>
        </div>
      </div>

      {/* ZONE 3: Segmented Section Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: 'credentials', label: 'AI Model Credentials', icon: 'vpn_key' },
          { key: 'persona', label: 'Agent Persona & Prompting', icon: 'psychology' },
          { key: 'gateway', label: 'WhatsApp & Telephony Sync', icon: 'dialer_sip' },
          { key: 'license', label: 'License & Danger Zone', icon: 'admin_panel_settings' },
        ].map((tab) => {
          const active = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key as any)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                active
                  ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ZONE 4: Tabbed Content Panels */}
      <form id="settings-form" onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* TAB 1: AI MODEL CREDENTIALS */}
        {activeCategory === 'credentials' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 lg:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                  LLM Provider Credentials
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Keys are stored encrypted on-device and decrypted only during inference pipelines.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 font-mono text-[10px] font-bold">
                AES-256 GCM
              </span>
            </div>

            <div className="space-y-5">
              {/* OpenAI Key */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-zinc-800 font-bold uppercase tracking-wider block" htmlFor="pref-openai-key">
                    OpenAI API Key
                  </label>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Voice AI Latency &lt; 120ms
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-400 text-lg">key</span>
                  <input
                    id="pref-openai-key"
                    type={showOpenaiKey ? 'text' : 'password'}
                    placeholder="sk-proj-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-zinc-200 rounded-xl focus:border-zinc-900 transition-all outline-none text-xs font-mono text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showOpenaiKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Used for real-time voice streaming models, OpenAI Realtime WebSockets, and text embeddings.
                </p>
              </div>

              {/* Google Gemini Key */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-zinc-800 font-bold uppercase tracking-wider block" htmlFor="pref-gemini-key">
                    Google Gemini API Key
                  </label>
                  <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    Multimodal &amp; RAG Engine
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-400 text-lg">token</span>
                  <input
                    id="pref-gemini-key"
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-zinc-200 rounded-xl focus:border-zinc-900 transition-all outline-none text-xs font-mono text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showGeminiKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Powers high-volume WhatsApp conversation classification and secondary fallback grounding.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AGENT PERSONA & PROMPT */}
        {activeCategory === 'persona' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 lg:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                  Global System Prompt &amp; Persona Protocol
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Sets the foundational behavior, tone of voice, and boundary guardrails for all AI sales interactions.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-zinc-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => setPresetPrompt('ENTERPRISE')}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Enterprise Closer
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPrompt('QUALIFIER')}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Inbound Qualifier
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPrompt('HEALTHCARE')}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Healthcare Advisor
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-zinc-800 font-bold uppercase tracking-wider block" htmlFor="pref-system-prompt">
                System Prompt Instructions
              </label>
              <textarea
                id="pref-system-prompt"
                rows={6}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter instructions for AI sales representative and lead qualifier..."
                className="w-full p-4 bg-white border border-zinc-200 rounded-xl focus:border-zinc-900 transition-all outline-none text-xs font-mono text-zinc-900 leading-relaxed resize-none placeholder:text-zinc-400 shadow-xs"
              />
              <div className="flex justify-between items-center text-[11px] text-zinc-500">
                <span>Defines objections handling, meeting scheduling thresholds, and qualification criteria.</span>
                <span className="font-mono">{systemPrompt.length} characters</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WHATSAPP & TELEPHONY GATEWAY */}
        {activeCategory === 'gateway' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 lg:p-8 shadow-xs space-y-6">
            <div className="border-b border-zinc-100 pb-4">
              <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                Telephony Concurrency &amp; Gateway Pacing
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tune inbound polling cycles, outbound voice channel bandwidth, and background startup services.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-zinc-800 font-bold uppercase tracking-wider block" htmlFor="pref-interval">
                  WhatsApp CRM Sync Interval
                </label>
                <select
                  id="pref-interval"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-white border border-zinc-200 rounded-xl focus:border-zinc-900 transition-all outline-none text-xs text-zinc-900 cursor-pointer font-medium shadow-xs"
                >
                  <option value="5">Every 5 minutes</option>
                  <option value="10">Every 10 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every hour</option>
                  <option value="120">Every 2 hours</option>
                </select>
                <p className="text-[11px] text-zinc-500">
                  Background polling frequency to pull unread inbound customer chats into CRM.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-800 font-bold uppercase tracking-wider block" htmlFor="pref-concurrency">
                  Concurrent Voice Line Capacity
                </label>
                <select
                  id="pref-concurrency"
                  value={concurrency}
                  onChange={(e) => setConcurrency(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-white border border-zinc-200 rounded-xl focus:border-zinc-900 transition-all outline-none text-xs text-zinc-900 cursor-pointer font-medium shadow-xs"
                >
                  <option value="1">1 simultaneous call</option>
                  <option value="2">2 simultaneous calls</option>
                  <option value="4">4 simultaneous calls (Recommended)</option>
                  <option value="8">8 simultaneous calls</option>
                </select>
                <p className="text-[11px] text-zinc-500">
                  Maximum simultaneous voice agent phone calls permitted across your Twilio/Plivo trunks.
                </p>
              </div>
            </div>

            {/* Boot & Update Toggles */}
            <div className="pt-4 border-t border-zinc-100 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-zinc-50/70 border border-zinc-200 rounded-xl hover:bg-zinc-100/60 transition-colors">
                <input
                  id="pref-login"
                  type="checkbox"
                  checked={launchOnBoot}
                  onChange={(e) => setLaunchOnBoot(e.target.checked)}
                  className="rounded text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Launch Voice &amp; WhatsApp AI Agents on system boot</span>
                  <span className="text-[11px] text-zinc-500">Keeps WebSocket servers and speech pipelines warm automatically.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-zinc-50/70 border border-zinc-200 rounded-xl hover:bg-zinc-100/60 transition-colors">
                <input
                  id="pref-updates"
                  type="checkbox"
                  checked={checkUpdates}
                  onChange={(e) => setCheckUpdates(e.target.checked)}
                  className="rounded text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Automatic model weights &amp; platform update checks</span>
                  <span className="text-[11px] text-zinc-500">Verifies new RAG index versions and low-latency voice model releases daily.</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: LICENSE & DANGER ZONE */}
        {activeCategory === 'license' && (
          <div className="space-y-6">
            {/* License Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 lg:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
                <span className="material-symbols-outlined text-zinc-900 text-xl">workspace_premium</span>
                <h4 className="font-extrabold text-sm text-zinc-900 tracking-tight">Organization &amp; License Tier</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold font-mono">License Key</span>
                  <span className="font-mono font-bold text-zinc-900 mt-1 block">LIC-MOTIONSITES-2026-ENTERPRISE</span>
                </div>
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold font-mono">Tier &amp; Seats</span>
                  <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Active (Unlimited Seats)
                  </span>
                </div>
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold font-mono">API Endpoint</span>
                  <span className="font-mono text-zinc-600 text-[11px] mt-1 block truncate">
                    https://api.intelligence-designed-to-evolve.com
                  </span>
                </div>
              </div>
            </div>

            {/* Session Reset Danger Zone */}
            <div className="bg-white border border-red-200 rounded-2xl p-6 lg:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-red-100 pb-3">
                <span className="material-symbols-outlined text-red-600 text-xl">lock_reset</span>
                <h4 className="font-extrabold text-sm text-red-700 tracking-tight">WhatsApp Session Security Controls</h4>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                Unpair active WhatsApp Web sockets and clear cached authentication tokens from local storage. If you reset the session, you will need to scan the QR code on the Overview page to re-establish connection.
              </p>

              <button
                id="btn-reset-session"
                type="button"
                onClick={handleResetSession}
                disabled={resetting}
                className="py-2.5 px-5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>{resetting ? 'Resetting Session...' : 'Unpair & Reset WhatsApp Session'}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
