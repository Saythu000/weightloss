'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phoneNumber?: string;
  code?: string;
}

interface TemplateItem {
  templateId: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: string;
  headerType: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons: TemplateButton[];
  samples?: Record<string, string>;
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeMode, setActiveMode] = useState<'library' | 'builder'>('library');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('+919390834107');
  const [testSending, setTestSending] = useState(false);
  const [testTemplateContext, setTestTemplateContext] = useState<Partial<TemplateItem> | null>(null);

  // Builder Form State matching Meta exact fields
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [allowCategoryChange, setAllowCategoryChange] = useState(true);
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [samples, setSamples] = useState<Record<string, string>>({});

  // Load existing templates from /api/bot/templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/bot/templates');
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
      }
    } catch (e) {
      console.error('Failed to fetch templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Format Text Helpers (Bold, Italic, Strikethrough)
  const formatBodyText = (prefix: string, suffix: string) => {
    setBodyText((prev) => `${prev}${prefix}text${suffix}`);
  };

  const insertVariable = () => {
    const varCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;
    const nextVar = varCount + 1;
    setBodyText((prev) => `${prev} {{${nextVar}}}`);
    setSamples((prev) => ({ ...prev, [nextVar.toString()]: `Sample_${nextVar}` }));
  };

  const addButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE') => {
    if (buttons.length >= 3) {
      alert('Maximum 3 interactive buttons allowed per template.');
      return;
    }
    if (type === 'QUICK_REPLY') {
      setButtons((prev) => [...prev, { type: 'QUICK_REPLY', text: 'Book Demo Call' }]);
    } else if (type === 'URL') {
      setButtons((prev) => [...prev, { type: 'URL', text: 'Explore Platform', url: 'https://intelligence-designed-to-evolve.com' }]);
    } else if (type === 'PHONE_NUMBER') {
      setButtons((prev) => [...prev, { type: 'PHONE_NUMBER', text: 'Call Enterprise Sales', phoneNumber: '+919390834107' }]);
    } else {
      setButtons((prev) => [...prev, { type: 'COPY_CODE', text: 'Copy Access Code', code: 'AISALES2026' }]);
    }
  };

  const removeButton = (index: number) => {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation Checks
  const issues: string[] = [];
  if (!name.trim()) issues.push('Valid template name required');
  else if (!/^[a-z0-9_]+$/.test(name)) issues.push('Template name must be lowercase letters & underscores');
  if (!bodyText.trim()) issues.push('Body text filled');
  if (headerType === 'TEXT' && !headerText.trim()) issues.push('Header text filled');

  const isValid = issues.length === 0;

  // Resolve body preview with sample variables
  let resolvedBody = bodyText;
  Object.keys(samples).forEach((v) => {
    resolvedBody = resolvedBody.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), samples[v] || `{{${v}}}`);
  });

  // Generated Meta API JSON Payload
  const apiPayload = {
    name: name || 'example_template_name',
    category,
    language,
    allow_category_change: allowCategoryChange,
    components: [
      ...(headerType !== 'NONE'
        ? [
            {
              type: 'HEADER',
              format: headerType,
              ...(headerType === 'TEXT' ? { text: headerText } : {}),
            },
          ]
        : []),
      {
        type: 'BODY',
        text: bodyText,
        ...(Object.keys(samples).length > 0
          ? { example: { body_text: [Object.values(samples)] } }
          : {}),
      },
      ...(footerText ? [{ type: 'FOOTER', text: footerText }] : []),
      ...(buttons.length > 0
        ? [
            {
              type: 'BUTTONS',
              buttons: buttons.map((b) => {
                if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url };
                if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phoneNumber };
                if (b.type === 'COPY_CODE') return { type: 'COPY_CODE', example: [b.code] };
                return { type: 'QUICK_REPLY', text: b.text };
              }),
            },
          ]
        : []),
    ],
  };

  // Create & Submit Template
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/bot/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          language,
          allowCategoryChange,
          headerType,
          headerText,
          bodyText,
          footerText,
          buttons,
          samples,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Template created and submitted to Meta!');
        setName('');
        setBodyText('');
        setFooterText('');
        setHeaderText('');
        setButtons([]);
        fetchTemplates();
        setActiveMode('library');
      } else {
        alert(data.error || 'Failed to submit template');
      }
    } catch (err) {
      console.error('Failed to submit template:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Duplicate Template
  const handleDuplicate = async (templateId: string) => {
    try {
      const res = await fetch('/api/bot/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', templateId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      }
    } catch (e) {
      console.error('Failed to duplicate template:', e);
    }
  };

  // Delete Template
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch('/api/bot/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', templateId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      }
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  };

  // Open Test Send Modal for specific template or builder
  const openTestSendModal = (tpl?: TemplateItem) => {
    if (tpl) {
      setTestTemplateContext(tpl);
    } else {
      setTestTemplateContext({
        headerType,
        headerText,
        bodyText,
        footerText,
        buttons,
        samples,
      });
    }
    setShowTestModal(true);
  };

  // Test-send Live Template to Phone
  const handleTestSend = async () => {
    const target = testTemplateContext || {
      headerType,
      headerText,
      bodyText,
      footerText,
      buttons,
      samples,
    };

    if (!testPhone.trim() || !target.bodyText?.trim()) {
      alert('Please fill body text and recipient phone number');
      return;
    }
    setTestSending(true);
    try {
      const res = await fetch('/api/bot/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-send',
          to: testPhone,
          headerType: target.headerType,
          headerText: target.headerText,
          bodyText: target.bodyText,
          footerText: target.footerText,
          buttons: target.buttons,
          samples: target.samples,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Test template message dispatched to ${testPhone}!`);
        setShowTestModal(false);
      } else {
        alert(data.error || 'Failed to send test template');
      }
    } catch (e) {
      console.error('Failed to send test template:', e);
    } finally {
      setTestSending(false);
    }
  };

  // Load template into builder for editing/cloning
  const loadIntoBuilder = (t: TemplateItem) => {
    setName(`${t.name}_copy`);
    setCategory(t.category);
    setLanguage(t.language || 'en_US');
    setHeaderType(t.headerType || 'NONE');
    setHeaderText(t.headerText || '');
    setBodyText(t.bodyText || '');
    setFooterText(t.footerText || '');
    setButtons(t.buttons || []);
    setSamples(t.samples || {});
    setActiveMode('builder');
  };

  // Computed Stats
  const stats = useMemo(() => {
    const total = templates.length;
    const marketing = templates.filter((t) => t.category === 'MARKETING').length;
    const utility = templates.filter((t) => t.category === 'UTILITY').length;
    const auth = templates.filter((t) => t.category === 'AUTHENTICATION').length;
    return { total, marketing, utility, auth };
  }, [templates]);

  // Filtered Templates for Library
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.bodyText.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [templates, categoryFilter, searchQuery]);

  return (
    <main id="section-templates" className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[#fafafa] text-zinc-900 font-sans space-y-6">
      {/* ZONE 1: Top Header & View Switcher */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
              Meta Message Template Studio
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              WhatsApp Cloud API Sync
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Build, test, and synchronize official HSM message templates for Meta verification and outreach.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white border border-zinc-200 rounded-xl shadow-xs flex items-center">
            <button
              type="button"
              onClick={() => setActiveMode('library')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'library'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_list</span>
              <span>Template Library</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeMode === 'library' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}>
                {templates.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('builder')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'builder'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>Template Studio</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setName('');
              setBodyText('');
              setFooterText('');
              setHeaderText('');
              setButtons([]);
              setSamples({});
              setActiveMode('builder');
            }}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* ZONE 2: 4-Metric Executive Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
            <span className="material-symbols-outlined text-xl">dataset</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Total Approved</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <span className="material-symbols-outlined text-xl">campaign</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Marketing</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{stats.marketing}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Utility / Follow-up</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{stats.utility}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <span className="material-symbols-outlined text-xl">verified_user</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Authentication / OTP</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{stats.auth}</div>
          </div>
        </div>
      </div>

      {/* MODE A: TEMPLATE LIBRARY */}
      {activeMode === 'library' && (
        <div className="space-y-6">
          {/* Filter Chips & Real-time Search */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {(
                [
                  { id: 'ALL', label: 'All Templates', count: stats.total },
                  { id: 'MARKETING', label: 'Marketing', count: stats.marketing },
                  { id: 'UTILITY', label: 'Utility', count: stats.utility },
                  { id: 'AUTHENTICATION', label: 'Authentication', count: stats.auth },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    categoryFilter === f.id
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${categoryFilter === f.id ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Real-time search */}
            <div className="relative min-w-[260px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Search templates by name or copy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Minimalist White Template Library Table */}
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  Registered Meta Templates ({filteredTemplates.length})
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Synced via Graph API v19.0</span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-200 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="p-4">Template Identifier</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Message Preview</th>
                  <th className="p-4">Interactive Elements</th>
                  <th className="p-4">Meta Status</th>
                  <th className="p-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-zinc-400 italic">
                      Loading registered templates...
                    </td>
                  </tr>
                ) : filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-zinc-400">
                      <span className="material-symbols-outlined text-3xl text-zinc-300 block mb-2">drafts</span>
                      <p className="font-bold text-xs text-zinc-900">No message templates found</p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {searchQuery ? 'No templates match your search criteria.' : 'Create your first approved WhatsApp message template in the Studio.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((t) => (
                    <tr key={t.templateId} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="p-4 font-bold text-zinc-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
                            <span className="material-symbols-outlined text-base">chat_bubble</span>
                          </div>
                          <div>
                            <div className="font-mono text-xs text-zinc-900 font-bold">{t.name}</div>
                            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mt-0.5">
                              <span>ID: {t.templateId}</span>
                              <span>•</span>
                              <span>{t.language}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${
                            t.category === 'MARKETING'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : t.category === 'UTILITY'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-700 max-w-xs">
                        <div className="truncate text-xs leading-relaxed font-sans">{t.bodyText}</div>
                        {t.headerText && (
                          <div className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                            Header: {t.headerText}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.buttons && t.buttons.length > 0 ? (
                            t.buttons.map((b, bi) => (
                              <span
                                key={bi}
                                className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded-md text-[10px] font-semibold text-zinc-700"
                              >
                                {b.text}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-400 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t.status || 'APPROVED'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openTestSendModal(t)}
                            className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                            title="Test Send to WhatsApp"
                          >
                            <span className="material-symbols-outlined text-xs text-emerald-600">send</span>
                            <span>Test</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => loadIntoBuilder(t)}
                            className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                            title="Clone in Studio"
                          >
                            <span className="material-symbols-outlined text-xs">edit_note</span>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(t.templateId)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
                            title="Duplicate"
                          >
                            <span className="material-symbols-outlined text-base">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.templateId)}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE B: TEMPLATE STUDIO / BUILDER */}
      {activeMode === 'builder' && (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column (60% Form) */}
          <div className="flex-[0.6] space-y-6 pb-12 w-full">
            {/* 1. BASIC INFORMATION */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                  Basic Information
                </h3>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Template Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. ai_sales_demo_invite"
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-xs font-mono text-zinc-900 placeholder-zinc-400 transition-all shadow-xs"
                    />
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Lowercase, underscores only · Max 512 chars
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Language *</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-xs text-zinc-900 font-medium cursor-pointer transition-all shadow-xs"
                    >
                      <option value="en_US">English (en_US)</option>
                      <option value="hi">Hindi (hi)</option>
                      <option value="es">Spanish (es)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CATEGORY */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                  Category
                </h3>
              </div>

              {/* 3 Interactive Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div
                  onClick={() => setCategory('MARKETING')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    category === 'MARKETING'
                      ? 'border-zinc-900 bg-zinc-50 shadow-xs ring-1 ring-zinc-900'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl text-blue-600 mb-2 block">
                    campaign
                  </span>
                  <h4 className="font-bold text-xs text-zinc-900">Marketing</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    AI demo invites, outbound sales offers, product launches
                  </p>
                </div>

                <div
                  onClick={() => setCategory('UTILITY')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    category === 'UTILITY'
                      ? 'border-purple-600 bg-purple-50 shadow-xs ring-1 ring-purple-600'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl text-purple-600 mb-2 block">
                    notifications
                  </span>
                  <h4 className="font-bold text-xs text-zinc-900">Utility</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Post-call follow-ups, meeting confirmations, order status
                  </p>
                </div>

                <div
                  onClick={() => setCategory('AUTHENTICATION')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    category === 'AUTHENTICATION'
                      ? 'border-amber-600 bg-amber-50 shadow-xs ring-1 ring-amber-600'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl text-amber-600 mb-2 block">
                    verified_user
                  </span>
                  <h4 className="font-bold text-xs text-zinc-900">Authentication</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    API security keys, access passcodes, login OTPs
                  </p>
                </div>
              </div>

              {/* Auto-correct Toggle Switch */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-bold text-emerald-950 block">
                    Allow Meta to auto-correct category
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Prevents rejection if Meta classifies differently — will auto-adjust during review.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowCategoryChange}
                  onChange={(e) => setAllowCategoryChange(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            {/* 3. HEADER */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                  Header <span className="text-zinc-400 font-normal text-xs">(optional)</span>
                </h3>
              </div>

              {/* Header Type Pill Selectors */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(
                  [
                    { id: 'NONE', label: '✕ None' },
                    { id: 'TEXT', label: 'T Text' },
                    { id: 'IMAGE', label: '🖼️ Image' },
                    { id: 'VIDEO', label: '🎥 Video' },
                    { id: 'DOCUMENT', label: '📄 Document' },
                  ] as const
                ).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHeaderType(h.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      headerType === h.id
                        ? 'border-zinc-900 text-white bg-zinc-900 shadow-xs'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>

              {headerType === 'TEXT' && (
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g. Enterprise AI Sales Automation"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-xs text-zinc-900 placeholder-zinc-400 transition-all shadow-xs"
                />
              )}
            </div>

            {/* 4. BODY */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                    Body (Message Content)
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={insertVariable}
                  className="px-3 py-1.5 bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>{`{ }`} Add Variable</span>
                </button>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200 w-fit">
                <button
                  type="button"
                  onClick={() => formatBodyText('*', '*')}
                  className="w-7 h-7 font-bold text-xs hover:bg-zinc-200 rounded-lg text-zinc-800 transition-colors"
                  title="Bold (*text*)"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => formatBodyText('_', '_')}
                  className="w-7 h-7 italic text-xs hover:bg-zinc-200 rounded-lg text-zinc-800 transition-colors"
                  title="Italic (_text_)"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => formatBodyText('~', '~')}
                  className="w-7 h-7 line-through text-xs hover:bg-zinc-200 rounded-lg text-zinc-800 transition-colors"
                  title="Strikethrough (~text~)"
                >
                  S
                </button>
              </div>

              <textarea
                rows={5}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Hello {{1}}, thank you for requesting an Enterprise AI Sales Voice Assistant demo for {{2}}. Our low-latency voice model (<120ms response) is ready for your team."
                className="w-full p-4 bg-white border border-zinc-200 rounded-xl focus:border-zinc-900 transition-all outline-none text-xs text-zinc-900 leading-relaxed resize-none placeholder-zinc-400 font-sans shadow-xs"
              />

              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span>Use *bold*, _italic_, ~strikethrough~, and {`{{1}}`} variables</span>
                <span className="font-mono">{bodyText.length}/1024</span>
              </div>

              {/* Sample Variable Inputs */}
              {Object.keys(samples).length > 0 && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase block tracking-wider">
                    Sample Replacement Values (for Meta Review & Preview):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {Object.keys(samples).map((v) => (
                      <div key={v} className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-zinc-900">{`{{${v}}}`}:</span>
                        <input
                          type="text"
                          value={samples[v]}
                          onChange={(e) => setSamples({ ...samples, [v]: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none text-zinc-900 focus:border-zinc-900 transition-all shadow-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5. FOOTER */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                  5
                </span>
                <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                  Footer <span className="text-zinc-400 font-normal text-xs">(optional)</span>
                </h3>
              </div>

              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. Reply STOP to opt-out · Powered by MotionSites AI"
                className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-xs text-zinc-900 placeholder-zinc-400 transition-all shadow-xs"
              />
              <div className="text-[10px] text-zinc-400 font-mono">
                Small grey text · No variables allowed · {footerText.length}/60
              </div>
            </div>

            {/* 6. BUTTONS */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                    6
                  </span>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                    Buttons <span className="text-zinc-400 font-normal text-xs">(optional)</span>
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addButton('QUICK_REPLY')}
                    className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold rounded-xl hover:bg-zinc-200 transition-all cursor-pointer shadow-xs"
                  >
                    + Quick Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => addButton('URL')}
                    className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold rounded-xl hover:bg-zinc-200 transition-all cursor-pointer shadow-xs"
                  >
                    + Visit URL
                  </button>
                  <button
                    type="button"
                    onClick={() => addButton('PHONE_NUMBER')}
                    className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold rounded-xl hover:bg-zinc-200 transition-all cursor-pointer shadow-xs"
                  >
                    + Call Phone
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {buttons.map((btn, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <span className="text-[10px] font-mono font-bold text-zinc-700 bg-white border border-zinc-300 px-2 py-1 rounded-lg">
                      {btn.type}
                    </span>
                    <input
                      type="text"
                      value={btn.text}
                      onChange={(e) =>
                        setButtons((prev) =>
                          prev.map((b, i) => (i === index ? { ...b, text: e.target.value } : b))
                        )
                      }
                      placeholder="Button label..."
                      className="flex-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeButton(index)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div className="flex flex-wrap gap-3 items-center pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-base">send</span>
                <span>{submitting ? 'Submitting to Meta...' : 'Submit to Meta for Approval'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPayloadModal(true)}
                className="px-4 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-50 transition-all shadow-xs cursor-pointer"
              >
                View API Payload
              </button>

              <button
                type="button"
                onClick={() => openTestSendModal()}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">phonelink_ring</span>
                <span>Test Send</span>
              </button>
            </div>
          </div>

          {/* Right Column (40% WhatsApp Mobile Preview & Spec Summary) */}
          <div className="flex-[0.4] space-y-6 sticky top-6 w-full">
            {/* Authentic WhatsApp Light Phone Mockup */}
            <div className="w-[320px] mx-auto bg-white rounded-[36px] shadow-xl border-4 border-zinc-300 overflow-hidden flex flex-col">
              {/* WhatsApp Green Top Header */}
              <div className="bg-[#008069] text-white pt-5 pb-3 px-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-tight">AI Sales Assistant</h4>
                    <span className="text-[9px] opacity-90 block">online</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-90">
                  <span className="material-symbols-outlined text-sm">videocam</span>
                  <span className="material-symbols-outlined text-sm">call</span>
                </div>
              </div>

              {/* Chat Canvas with Signature WhatsApp Wallpaper */}
              <div
                className="p-3.5 min-h-[380px] flex flex-col justify-end"
                style={{
                  backgroundColor: '#efeae2',
                  backgroundImage: 'radial-gradient(#d4cdc2 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <div className="text-center mb-3">
                  <span className="bg-[#ffeecd] text-[#54656f] text-[9px] px-2.5 py-0.5 rounded-full font-medium shadow-xs">
                    TODAY
                  </span>
                </div>

                {/* WhatsApp Outgoing Message Bubble */}
                <div className="ml-auto max-w-[95%] min-w-[70%]">
                  <div
                    className={`bg-[#d9fdd3] text-zinc-900 p-3.5 text-xs leading-relaxed space-y-1.5 shadow-xs border border-emerald-600/10 ${
                      buttons.length > 0 ? 'rounded-t-2xl rounded-bl-2xl' : 'rounded-2xl rounded-tr-xs'
                    }`}
                  >
                    {headerType === 'TEXT' && headerText && (
                      <div className="font-bold text-zinc-900 text-[12px] border-b border-emerald-600/10 pb-1">
                        {headerText}
                      </div>
                    )}
                    {headerType === 'IMAGE' && (
                      <div className="h-28 bg-emerald-900/10 rounded-lg flex items-center justify-center border border-emerald-600/20 text-emerald-800 mb-1">
                        <span className="material-symbols-outlined text-3xl">image</span>
                      </div>
                    )}

                    <div className="text-zinc-800 whitespace-pre-wrap text-[11px] leading-snug">
                      {resolvedBody || 'Compose your message text on the left to see live preview...'}
                    </div>

                    {footerText && (
                      <div className="text-[9px] text-zinc-500 italic border-t border-emerald-600/10 pt-1">
                        {footerText}
                      </div>
                    )}

                    <div className="text-[9px] text-right font-mono flex items-center justify-end gap-1 pt-1 text-zinc-400">
                      <span>10:48 AM</span>
                      <span className="text-blue-600 font-bold">✓✓</span>
                    </div>
                  </div>

                  {/* Interactive Buttons Below Bubble */}
                  {buttons.length > 0 && (
                    <div className="bg-white rounded-b-2xl overflow-hidden shadow-xs border-x border-b border-zinc-200">
                      {buttons.map((b, i) => (
                        <div
                          key={i}
                          className="py-2.5 px-3 text-center text-xs font-bold text-[#008069] flex items-center justify-center gap-1.5 border-t border-zinc-100 hover:bg-zinc-50 transition-all cursor-pointer"
                        >
                          {b.type === 'URL' && <span className="material-symbols-outlined text-sm">open_in_new</span>}
                          {b.type === 'PHONE_NUMBER' && <span className="material-symbols-outlined text-sm">call</span>}
                          {b.type === 'COPY_CODE' && <span className="material-symbols-outlined text-sm">content_copy</span>}
                          {b.type === 'QUICK_REPLY' && <span className="material-symbols-outlined text-sm">reply</span>}
                          <span>{b.text || 'Button'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Message Input Bar */}
              <div className="p-2.5 bg-[#f0f2f5] border-t border-zinc-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-zinc-400 text-base">sentiment_satisfied</span>
                <div className="flex-1 bg-white rounded-full px-3 py-1 text-[10px] text-zinc-400 shadow-xs">
                  Type a message
                </div>
                <div className="w-6 h-6 rounded-full bg-[#008069] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  ➔
                </div>
              </div>
            </div>

            {/* SUBMISSION CHECKLIST */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs text-zinc-900 tracking-tight">
                  Submission Checklist
                </h4>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {isValid ? 'Ready for Meta' : `${issues.length} Items Required`}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${name.trim() && /^[a-z0-9_]+$/.test(name) ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {name.trim() && /^[a-z0-9_]+$/.test(name) ? 'check_circle' : 'cancel'}
                  </span>
                  <span className={name.trim() ? 'text-zinc-800' : 'text-rose-600'}>Valid lowercase identifier</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${bodyText.trim() ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {bodyText.trim() ? 'check_circle' : 'cancel'}
                  </span>
                  <span className={bodyText.trim() ? 'text-zinc-800' : 'text-rose-600'}>Message body defined</span>
                </div>
              </div>
            </div>

            {/* TEMPLATE SPEC SUMMARY */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
              <h4 className="font-extrabold text-xs text-zinc-900 tracking-tight">
                Template Configuration
              </h4>
              <div className="space-y-2 divide-y divide-zinc-100">
                <div className="flex justify-between pt-1">
                  <span className="text-zinc-400 font-medium font-mono text-[11px]">NAME</span>
                  <span className="font-mono font-bold text-zinc-900">{name || '—'}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-400 font-medium font-mono text-[11px]">CATEGORY</span>
                  <span className="font-semibold text-zinc-900">{category}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-400 font-medium font-mono text-[11px]">LANGUAGE</span>
                  <span className="font-semibold text-zinc-900">{language}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-400 font-medium font-mono text-[11px]">HEADER</span>
                  <span className="font-semibold text-zinc-900">{headerType}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-400 font-medium font-mono text-[11px]">BUTTONS</span>
                  <span className="font-semibold text-zinc-900">{buttons.length > 0 ? `${buttons.length} Buttons` : 'NONE'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View API Payload Modal */}
      {showPayloadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowPayloadModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <h3 className="font-extrabold text-sm text-zinc-900">Meta Graph API JSON Payload</h3>
              <button onClick={() => setShowPayloadModal(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                ✕
              </button>
            </div>
            <pre className="p-4 bg-zinc-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-96 border border-zinc-800">
              {JSON.stringify(apiPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPayloadModal(false)}
                className="px-4 py-2 bg-zinc-900 text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-zinc-800 shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Send Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowTestModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-base">phonelink_ring</span>
                <h3 className="font-extrabold text-sm text-zinc-900">Test-Send Live Template</h3>
              </div>
              <button onClick={() => setShowTestModal(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="font-bold text-zinc-700 block">Recipient Phone Number</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+919390834107"
                className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl outline-none font-mono text-zinc-900 focus:border-zinc-900 transition-all shadow-xs"
              />
              <p className="text-[11px] text-zinc-500">
                A live WhatsApp template message will be dispatched through Meta WhatsApp Cloud API.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 bg-white border border-zinc-200 text-xs text-zinc-700 font-bold rounded-xl cursor-pointer hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTestSend}
                disabled={testSending}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>{testSending ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
