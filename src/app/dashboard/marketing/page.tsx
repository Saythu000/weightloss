'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface MarketingJob {
  jobId: string;
  campaignName: string;
  campaignType?: string;
  platform: string;
  jobStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
  attempts: number;
  createdAt: string;
  externalUrl?: string;
  caption?: string;
  budget?: string;
  audience?: string;
}

const PLATFORM_OPTIONS = [
  { id: 'facebook', label: 'Meta (Facebook)', icon: 'thumb_up' },
  { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'business' },
  { id: 'youtube', label: 'YouTube', icon: 'smart_display' },
];

export default function DigitalMarketingPage() {
  const [jobs, setJobs] = useState<MarketingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [createModal, setCreateModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('LEAD_GEN');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [budget, setBudget] = useState('500');
  const [audience, setAudience] = useState('ENTERPRISE_ICP');
  const [caption, setCaption] = useState('');

  // Fetch marketing campaign history
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bot/marketing/history');
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error('Failed to fetch marketing jobs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle platform toggle
  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Handle Publish
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      alert('Please enter ad copy or caption content for the campaign.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one target social channel.');
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch('/api/bot/marketing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaignName.trim() || 'Multi-Channel AI Sales Lead Blast',
          campaignType,
          platforms: selectedPlatforms,
          caption,
          budget,
          audience,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Campaign published successfully across selected channels!');
        setCreateModal(false);
        setCampaignName('');
        setCaption('');
        fetchJobs();
      } else {
        alert(data.error || 'Failed to publish campaign');
      }
    } catch (err: any) {
      alert(`Publish failed: ${err?.message || 'Network error'}`);
    } finally {
      setPublishing(false);
    }
  };

  // Quick caption template filler
  const insertTemplateCopy = (type: 'DEMO' | 'OFFER' | 'AI_VOICE') => {
    if (type === 'DEMO') {
      setCaption(
        '🚀 Transform your enterprise inbound sales with autonomous AI Voice Agents (<120ms response time). Book a live interactive test call today with our sales team!'
      );
    } else if (type === 'OFFER') {
      setCaption(
        '⚡ Accelerate pipeline velocity: sync Meta Lead Ads directly with automated WhatsApp HSM follow-ups and CRM deal tracking. Limited onboarding slots available for Q3.'
      );
    } else {
      setCaption(
        '🎙️ Meet your next top sales closer: an AI Voice Representative that qualifies inbound buyers, answers objections in real-time, and schedules meetings 24/7.'
      );
    }
  };

  // Computed KPI Metrics
  const metrics = useMemo(() => {
    const total = jobs.length;
    const successJobs = jobs.filter((j) => j.jobStatus === 'SUCCESS').length;
    const successRate = total > 0 ? Math.round((successJobs / total) * 100) : 100;

    const allPlatforms = new Set<string>();
    jobs.forEach((j) => {
      j.platform.split(',').forEach((p) => {
        const trimmed = p.trim().toUpperCase();
        if (trimmed) allPlatforms.add(trimmed);
      });
    });

    return {
      total,
      successJobs,
      successRate,
      activeChannels: allPlatforms.size || 4,
    };
  }, [jobs]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesPlatform =
        platformFilter === 'ALL' ||
        j.platform.toUpperCase().includes(platformFilter);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        j.campaignName.toLowerCase().includes(q) ||
        j.jobId.toLowerCase().includes(q) ||
        j.platform.toLowerCase().includes(q);

      return matchesPlatform && matchesSearch;
    });
  }, [jobs, platformFilter, searchQuery]);

  return (
    <main id="section-marketing" className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[#fafafa] font-sans text-zinc-900 space-y-6">
      {/* ZONE 1: Executive Top Header & Telemetry */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
              Marketing &amp; AI Campaign Engine
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Multi-Channel Publisher • Active
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Dispatch cross-platform lead acquisition campaigns across Meta, Instagram, LinkedIn, and YouTube with instant AI Voice follow-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModal(true)}
          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base font-bold">add</span>
          <span>Create New Campaign</span>
        </button>
      </div>

      {/* ZONE 2: 4-Metric Executive Performance Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
            <span className="material-symbols-outlined text-xl">campaign</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Total Dispatches</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{metrics.total}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <span className="material-symbols-outlined text-xl">hub</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Active Channels</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{metrics.activeChannels} Networks</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Publish Success</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-0.5">{metrics.successRate}%</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <span className="material-symbols-outlined text-xl">speed</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">AI Call Latency</div>
            <div className="text-2xl font-extrabold text-purple-700 font-mono mt-0.5">&lt; 120ms</div>
          </div>
        </div>
      </div>

      {/* ZONE 3: Filter Chips & Real-Time Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { key: 'ALL', label: 'All Channels' },
            { key: 'FACEBOOK', label: 'Meta (FB)' },
            { key: 'INSTAGRAM', label: 'Instagram' },
            { key: 'YOUTUBE', label: 'YouTube' },
            { key: 'LINKEDIN', label: 'LinkedIn' },
          ].map((tab) => {
            const active = platformFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPlatformFilter(tab.key)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Real-time search */}
        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search campaigns by name or platform..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* ZONE 4: Live Campaigns Data Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/70 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
              Dispatched Campaigns History ({filteredJobs.length})
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Live Synced with Social Graph APIs</span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-200 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              <th className="p-4">Campaign Name</th>
              <th className="p-4">Target Channels</th>
              <th className="p-4">Dispatch Status</th>
              <th className="p-4">Attempts</th>
              <th className="p-4">Created Timestamp</th>
              <th className="p-4 text-right">Destination</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-zinc-400 italic">
                  Loading campaigns history...
                </td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-zinc-400">
                  <span className="material-symbols-outlined text-3xl text-zinc-300 block mb-2">campaign</span>
                  <p className="font-bold text-xs text-zinc-900">No campaigns found</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {searchQuery ? 'No dispatches match your search.' : 'Click "Create New Campaign" to launch your first social blast.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredJobs.map((j) => (
                <tr key={j.jobId} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="p-4 font-bold text-zinc-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
                        <span className="material-symbols-outlined text-base">rocket_launch</span>
                      </div>
                      <div>
                        <div className="text-zinc-900 text-sm font-semibold">{j.campaignName}</div>
                        <div className="text-[10px] font-mono text-zinc-400">#{j.jobId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {j.platform.split(',').map((p, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-100 border border-zinc-200 text-zinc-700"
                        >
                          {p.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${
                        j.jobStatus === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          j.jobStatus === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      {j.jobStatus}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-zinc-700 text-xs">{j.attempts} dispatch</td>
                  <td className="p-4 text-zinc-500 font-mono text-[11px]">{j.createdAt}</td>
                  <td className="p-4 text-right">
                    {j.externalUrl ? (
                      <a
                        href={j.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-bold rounded-lg transition-all shadow-xs"
                      >
                        <span>View Post</span>
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </a>
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ZONE 5: Growth & Next-Gen AI Lead Acquisition Modules */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <h2 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
              Autonomous AI Growth Engines &amp; Integrations
            </h2>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            ENTERPRISE SUITE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Meta Lead Ads */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs hover:border-zinc-300 transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">campaign</span>
              </div>
              <h3 className="font-extrabold text-sm text-zinc-900">Meta &amp; Instagram Lead Sync</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Connect Facebook Instant Forms directly to MotionSites CRM. Triggers an autonomous AI voice outbound dialer within 120ms of form submission.
              </p>
            </div>
            <div className="pt-3 border-t border-zinc-100 flex justify-between items-center text-[11px] font-mono text-zinc-500 font-bold">
              <span>Latency: &lt;120ms</span>
              <span className="text-emerald-700 font-bold">● Active Webhook</span>
            </div>
          </div>

          {/* Card 2: AI Copy Studio */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs hover:border-zinc-300 transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">psychology</span>
              </div>
              <h3 className="font-extrabold text-sm text-zinc-900">AI Sales Copy &amp; Prompt Studio</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Generate high-converting ad copy, video reel scripts, and WhatsApp HSM outbound templates fine-tuned on top B2B &amp; healthcare sales frameworks.
              </p>
            </div>
            <div className="pt-3 border-t border-zinc-100 flex justify-between items-center text-[11px] font-mono text-zinc-500 font-bold">
              <span>Model: Claude 3.5 &amp; GPT-4o</span>
              <span className="text-purple-700 font-bold">Built-in</span>
            </div>
          </div>

          {/* Card 3: Multi-Touch Attribution */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs hover:border-zinc-300 transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">analytics</span>
              </div>
              <h3 className="font-extrabold text-sm text-zinc-900">Multi-Channel ROAS Intelligence</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Track exact cost per qualified lead (CPL), conversation win rates, and closed-won pipeline revenue across organic and paid social acquisition.
              </p>
            </div>
            <div className="pt-3 border-t border-zinc-100 flex justify-between items-center text-[11px] font-mono text-zinc-500 font-bold">
              <span>Attribution: Multi-Touch</span>
              <span className="text-zinc-900 font-bold">Real-time</span>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setCreateModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-zinc-200 rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col font-sans text-zinc-900"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">Launch Multi-Channel Campaign</h3>
                  <p className="text-[11px] text-zinc-500">Publish social ad copy &amp; activate instant AI follow-up workflows</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePublish} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Campaign Identifier / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise AI Sales Demo Outreach - Q3"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-sans shadow-xs"
                />
              </div>

              {/* Target Social Channels */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-2">Target Social Channels *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLATFORM_OPTIONS.map((p) => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                            : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">{p.icon}</span>
                          <span className="text-xs font-bold">{p.label}</span>
                        </div>
                        <span className={`material-symbols-outlined text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Campaign Type & Audience Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Campaign Objective</label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-sans shadow-xs cursor-pointer"
                  >
                    <option value="LEAD_GEN">Lead Generation Ad (Instant Voice Sync)</option>
                    <option value="ORGANIC_BLAST">Multi-Channel Social Post</option>
                    <option value="RETARGETING">Re-engagement &amp; VIP Offer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Target ICP / Audience Tier</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-sans shadow-xs cursor-pointer"
                  >
                    <option value="ENTERPRISE_ICP">Enterprise Tech &amp; Healthcare ICP</option>
                    <option value="GLP1_INQUIRERS">High-Intent Weight Loss Inquirers</option>
                    <option value="REGIONAL_B2B">Hyderabad &amp; Regional B2B Buyers</option>
                  </select>
                </div>
              </div>

              {/* Budget Allocation */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Budget Allocation ($ / ₹)</label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-mono shadow-xs"
                />
              </div>

              {/* Master Caption & AI Generators */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-zinc-800">Ad Copy &amp; Caption *</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-400 font-mono">Quick AI Prompts:</span>
                    <button
                      type="button"
                      onClick={() => insertTemplateCopy('DEMO')}
                      className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                    >
                      Demo Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateCopy('OFFER')}
                      className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                    >
                      Special Offer
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateCopy('AI_VOICE')}
                      className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                    >
                      Voice Closer
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  required
                  placeholder="Write persuasive ad copy or choose an AI prompt above..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-3.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-sans leading-relaxed shadow-xs"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-zinc-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-600 hover:text-zinc-900 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={publishing}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  <span>{publishing ? 'Publishing...' : 'Dispatch Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
