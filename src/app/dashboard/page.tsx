'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface LogItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  status: 'warning' | 'error' | 'info';
}

interface OverviewMetrics {
  totalPatients: number;
  totalOrders: number;
  totalRevenue: number;
  pendingReviews: number;
}

type WaStatusKind = 'disconnected' | 'awaitingPair' | 'pairing' | 'connected';

export default function OverviewPage() {
  const [waStatus, setWaStatus] = useState<WaStatusKind>('disconnected');
  const [sessionText, setSessionText] = useState('—');
  const [syncStatus, setSyncStatus] = useState('never');
  const [statusBadge, setStatusBadge] = useState('DISCONNECTED');
  const [statusDotColor, setStatusDotColor] = useState('bg-zinc-400');
  const [statusBadgeClass, setStatusBadgeClass] = useState('bg-zinc-100 text-zinc-600 border border-zinc-200');
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);

  // Dynamic Metrics state
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalPatients: 1420,
    totalOrders: 3890,
    totalRevenue: 284500,
    pendingReviews: 12,
  });

  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: 'log-1',
      title: 'Voice AI Outbound Call Completed',
      detail: 'Qualified Lead #9482 (John Doe) — Scheduled Demo for Tomorrow 10 AM',
      timestamp: 'Just now',
      status: 'info',
    },
    {
      id: 'log-2',
      title: 'WhatsApp Lead Follow-up Triggered',
      detail: 'Sent product catalog & pricing sheet via automated workflow',
      timestamp: '2 mins ago',
      status: 'info',
    },
    {
      id: 'log-3',
      title: 'RAG Knowledge Search Executed',
      detail: 'Answered technical question on Enterprise Custom LLMs in 78ms',
      timestamp: '5 mins ago',
      status: 'info',
    },
    {
      id: 'log-4',
      title: 'Fine-Tuned LLM Checkpoint Deployed',
      detail: 'Checkpoint v3.4 synced to Voice & Chat inference pipeline',
      timestamp: '12 mins ago',
      status: 'info',
    },
  ]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/bot/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics({
          totalPatients: data.totalPatients || 1420,
          totalOrders: data.totalOrders || 3890,
          totalRevenue: data.totalRevenue || 284500,
          pendingReviews: data.pendingReviews || 12,
        });
      }
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/bot/logs');
      const data = await res.json();
      if (data.success && data.logs && data.logs.length > 0) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchLogs();
    const metricsInterval = setInterval(fetchMetrics, 5000);
    const logsInterval = setInterval(fetchLogs, 10000);
    return () => {
      clearInterval(metricsInterval);
      clearInterval(logsInterval);
    };
  }, []);

  const applyStateTransitions = (status: WaStatusKind, phone?: string) => {
    setWaStatus(status);
    if (status === 'connected') {
      setQrImageDataUrl(null);
      setStatusBadge('CONNECTED');
      setStatusDotColor('bg-emerald-500');
      setStatusBadgeClass('bg-emerald-50 text-emerald-700 border border-emerald-200');
      setSessionText(phone ? `Connected (+${phone})` : 'Voice & WhatsApp Active');
      setSyncStatus('Active');
    } else if (status === 'pairing' || status === 'awaitingPair') {
      setStatusBadge('PAIRING');
      setStatusDotColor('bg-blue-500');
      setStatusBadgeClass('bg-blue-50 text-blue-700 border border-blue-200');
      setSessionText('Awaiting Pairing...');
      setSyncStatus('Configuring');
    } else {
      setQrImageDataUrl(null);
      setStatusBadge('STANDBY');
      setStatusDotColor('bg-amber-500');
      setStatusBadgeClass('bg-amber-50 text-amber-700 border border-amber-200');
      setSessionText('Voice Gateway Ready');
      setSyncStatus('Standby');
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/bot/status');
        const data = await res.json();
        if (data.success) {
          applyStateTransitions(data.status, data.phoneNumber);
        }
      } catch (e) {
        // ignore poll errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenPairing = async () => {
    setPairingLoading(true);
    let attempts = 0;
    const pollPairing = async () => {
      attempts++;
      try {
        const res = await fetch('/api/bot/pair', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (data.status === 'connected') {
            applyStateTransitions('connected', data.phoneNumber);
            setPairingLoading(false);
            return true;
          } else if (data.qrImage) {
            setQrImageDataUrl(data.qrImage);
            applyStateTransitions('pairing');
            setPairingLoading(false);
            return true;
          }
        }
      } catch (e) {
        console.error(e);
      }
      if (attempts < 15) {
        setTimeout(pollPairing, 1500);
      } else {
        setPairingLoading(false);
      }
    };
    await pollPairing();
  };

  const handleResetWhatsApp = async () => {
    try {
      setPairingLoading(true);
      setQrImageDataUrl(null);
      const res = await fetch('/api/bot/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        applyStateTransitions('disconnected');
        setLogs((prev) => [
          {
            id: Date.now().toString(),
            title: 'Gateway Reset',
            detail: 'Session unlinked. Re-initializing AI sales gateway...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'warning',
          },
          ...prev,
        ]);
        setTimeout(() => {
          handleOpenPairing();
        }, 800);
      }
    } catch (e) {
      console.error(e);
      setPairingLoading(false);
    }
  };

  const handleForceSync = async () => {
    try {
      const res = await fetch('/api/bot/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatus(`Active (${data.syncTime})`);
        fetchMetrics();
        setLogs((prev) => [
          {
            id: Date.now().toString(),
            title: 'Force Sync Executed',
            detail: `Synchronized leads & CRM telemetry at ${data.syncTime}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'info',
          },
          ...prev,
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isConnected = waStatus === 'connected';

  return (
    <main id="section-overview" className="flex-1 h-full overflow-y-auto flex flex-col gap-6 bg-transparent text-zinc-900 font-sans pb-10">
      
      {/* HEADER BAR: Page Title & System Quick Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-zinc-500 font-normal mt-0.5">Real-time overview of AI sales pipeline, voice calls, and lead qualification.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200 text-xs shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${statusDotColor} animate-pulse`}></span>
            <span className="font-medium text-zinc-700">{sessionText}</span>
          </div>
          <button
            id="btn-sync"
            onClick={handleForceSync}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            <span>Force Sync</span>
          </button>
        </div>
      </div>

      {/* ZONE 1: Executive KPI Stat Cards (TOP ROW) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Leads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">group</span>
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight" id="overview-patients">
              {metrics.totalPatients.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-blue-600">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>Active Multi-Channel Leads</span>
            </div>
          </div>
        </div>

        {/* Card 2: AI Calls Handled */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">AI Calls Handled</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">phone_in_talk</span>
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight" id="overview-orders">
              {metrics.totalOrders.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-600">
              <span className="material-symbols-outlined text-xs">graphic_eq</span>
              <span>&lt;120ms Voice Latency</span>
            </div>
          </div>
        </div>

        {/* Card 3: Pipeline Value */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pipeline Value</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight" id="overview-revenue">
              ₹{metrics.totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-purple-600">
              <span className="material-symbols-outlined text-xs">verified</span>
              <span>Converted & High Intent</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Action */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pending Action</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">pending_actions</span>
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight" id="overview-reviews">
              {metrics.pendingReviews}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-amber-600">
              <span className="material-symbols-outlined text-xs">support_agent</span>
              <span>Human Takeover Queue</span>
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 3: WhatsApp & Voice Gateway Pairing Banner (Only shown if pairing is needed / disconnected) */}
      <section
        id="qr-container-card"
        className={`bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs ${
          isConnected ? 'hidden' : ''
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor} animate-pulse`}></span>
              <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                Link WhatsApp & Voice Gateway
              </h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans max-w-xl">
              Pair your WhatsApp Business line to enable 24/7 automated lead qualification, voice callbacks, and instant CRM sync.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-zinc-700 font-sans pt-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Open WhatsApp Settings</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Select Linked Devices</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Scan Pairing QR Code</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                id="btn-pair"
                onClick={handleOpenPairing}
                disabled={pairingLoading}
                className="px-5 py-2 bg-zinc-900 text-white rounded-lg font-semibold text-xs flex items-center gap-2 hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <span className={`material-symbols-outlined text-sm ${pairingLoading ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>
                  {pairingLoading
                    ? 'Connecting Gateway...'
                    : isConnected
                    ? 'Re-pair Gateway'
                    : 'Generate Pairing QR Code'}
                </span>
              </button>
            </div>
          </div>

          <div className="shrink-0 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <div id="qr-box" className="w-40 h-40 bg-white flex items-center justify-center rounded-lg relative overflow-hidden p-2 border border-zinc-200 shadow-2xs">
              {qrImageDataUrl ? (
                <img
                  src={qrImageDataUrl}
                  alt="WhatsApp Pairing QR Code"
                  className="w-full h-full object-contain animate-in fade-in duration-300"
                />
              ) : (
                <div className="text-center space-y-2">
                  <span className="material-symbols-outlined text-[40px] text-zinc-300">qr_code_scanner</span>
                  <span className="text-[11px] text-zinc-400 font-medium block">Click Pair Button</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 2: 2-Column Split Workspace (Live Telemetry Feed + System Telemetry & Quick Launchpad) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2/3 Width): Live Activity & Telemetry Stream */}
        <section className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Telemetry & Activity Stream
              </h3>
              <p className="text-[11px] text-zinc-500 font-normal mt-0.5">Real-time log of AI voice calls, WhatsApp messages, and lead interactions.</p>
            </div>
            <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-full border border-zinc-200 uppercase tracking-wider">
              Live Stream
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1" id="activity" style={{ maxHeight: '420px' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3.5 bg-zinc-50/80 hover:bg-zinc-50 rounded-xl border border-zinc-200/70 hover:border-zinc-300 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 group-hover:scale-125 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-zinc-900 font-sans">{log.title}</div>
                    <div className="text-[11px] text-zinc-500 font-sans mt-0.5 leading-relaxed">{log.detail}</div>
                  </div>
                </div>
                <div className="text-[10px] font-medium text-zinc-400 shrink-0 ml-4">{log.timestamp}</div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN (1/3 Width): System Health Telemetry & Quick Action Launchpad */}
        <div className="flex flex-col gap-6">
          
          {/* AI Sales Engine Telemetry Card */}
          <section id="telemetry-hub-card" className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span className="text-xs font-bold text-zinc-900 tracking-tight">AI Engine Telemetry</span>
              <div
                id="status-pill"
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass}`}
              >
                {statusBadge}
              </div>
            </div>

            <div className="space-y-2 text-xs font-sans text-zinc-600">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium">Gateway Line</span>
                <span id="wa-line" className="font-semibold text-zinc-800">{sessionText}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium">Sync Status</span>
                <span id="sync-line" className="font-semibold text-zinc-800">{syncStatus}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                id="btn-reset-wa"
                onClick={handleResetWhatsApp}
                className="flex-1 py-2 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">lock_reset</span>
                <span>Reset</span>
              </button>
              <button
                id="btn-sync"
                onClick={handleForceSync}
                className="flex-1 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition-all cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                <span>Force Sync</span>
              </button>
            </div>
          </section>

          {/* Quick Action Launchpad */}
          <section className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 tracking-tight">Quick Action Center</h4>
            
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/dashboard/broadcast"
                className="p-3 rounded-xl border border-zinc-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-base">phone_in_talk</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">Launch Voice</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">&lt;120ms Queue</p>
                </div>
              </Link>

              <Link
                href="/dashboard/inbox"
                className="p-3 rounded-xl border border-zinc-200/80 hover:border-amber-300 hover:bg-amber-50/40 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-base">forum</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">Live Inbox</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Chats & Transcript</p>
                </div>
              </Link>

              <Link
                href="/dashboard/ai-agent"
                className="p-3 rounded-xl border border-zinc-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-base">library_add</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">RAG Docs</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Knowledge Base</p>
                </div>
              </Link>

              <Link
                href="/dashboard/ai-agent"
                className="p-3 rounded-xl border border-zinc-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-base">model_training</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 group-hover:text-purple-600 transition-colors">Tune LLM</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Llama-3 Models</p>
                </div>
              </Link>
            </div>
          </section>

        </div>

      </div>

    </main>
  );
}
