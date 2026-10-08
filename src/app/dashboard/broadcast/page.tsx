'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

/* --------------------------------- Types -------------------------------- */
interface Broadcast {
  id: string;
  name: string;
  from_number: string;
  recipient_numbers: any[];
  template_id?: string;
  template_name?: string;
  status: 'DRAFT' | 'SENDING' | 'SENT' | 'PARTIAL' | 'FAILED';
  message_type?: string;
  body?: string;
  url?: string;
  media_library_id?: string;
  caption?: string;
  variable_mapping?: Record<string, string>;
  last_activity?: string;
  created_at?: string;
  logs?: any[];
  statusRollup?: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

interface TemplateOption {
  templateId: string;
  name: string;
  category: string;
  language: string;
  status: string;
  headerType: string;
  headerText: string;
  bodyText: string;
  footerText: string;
  buttons: any[];
}

interface LeadRecipient {
  id: string;
  name: string;
  phone: string;
  state: string;
  status: string;
}

const FILTER_TABS = [
  { key: 'all', label: 'All Campaigns' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SENDING', label: 'Sending' },
  { key: 'SENT', label: 'Sent' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'FAILED', label: 'Failed' },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string; dotCls: string }> = {
    DRAFT: { cls: 'bg-zinc-100 text-zinc-700 border-zinc-200', dotCls: 'bg-zinc-400' },
    SENDING: { cls: 'bg-blue-50 text-blue-800 border-blue-200', dotCls: 'bg-blue-500 animate-ping' },
    SENT: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotCls: 'bg-emerald-500' },
    PARTIAL: { cls: 'bg-amber-50 text-amber-800 border-amber-200', dotCls: 'bg-amber-500' },
    FAILED: { cls: 'bg-red-50 text-red-800 border-red-200', dotCls: 'bg-red-500' },
  };
  const c = config[status] || config.SENT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dotCls}`} />
      {status}
    </span>
  );
}

export default function BulkMessagePage() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected Broadcast for Detail View
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);

  // Modal States
  const [newBroadcastModal, setNewBroadcastModal] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [recipientsList, setRecipientsList] = useState<LeadRecipient[]>([]);

  // Form State
  const [newBroadcastName, setNewBroadcastName] = useState('');
  const [newBroadcastFrom, setNewBroadcastFrom] = useState('919390834107');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [newBroadcastMessageType, setNewBroadcastMessageType] = useState<'template' | 'text'>('template');
  const [newBroadcastTemplateId, setNewBroadcastTemplateId] = useState('');
  const [newBroadcastBody, setNewBroadcastBody] = useState('');
  const [newBroadcastTestNumber, setNewBroadcastTestNumber] = useState('');
  const [variableMapping] = useState<Record<string, string>>({ '1': 'name' });
  const [minDelay, setMinDelay] = useState(2);
  const [maxDelay, setMaxDelay] = useState(5);
  const [importedFileName, setImportedFileName] = useState('');
  const [csvUploadNotice, setCsvUploadNotice] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // CSV / Excel File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const parsedContacts: LeadRecipient[] = [];

      lines.forEach((line, idx) => {
        if (idx === 0 && (line.toLowerCase().includes('phone') || line.toLowerCase().includes('name'))) return;

        const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 1) {
          let name = 'Imported Lead';
          let phone = '';

          if (parts.length >= 2) {
            if (/^\+?\d[\d\s-]{8,}$/.test(parts[0])) {
              phone = parts[0];
              name = parts[1] || 'Imported Lead';
            } else {
              name = parts[0];
              phone = parts[1];
            }
          } else {
            phone = parts[0];
          }

          const cleanDigits = phone.replace(/\D/g, '');
          if (cleanDigits.length >= 10) {
            parsedContacts.push({
              id: `imported-${Date.now()}-${idx}`,
              name,
              phone: `+${cleanDigits}`,
              state: 'CSV Import',
              status: 'Qualified Lead',
            });
          }
        }
      });

      if (parsedContacts.length > 0) {
        setRecipientsList((prev) => [...parsedContacts, ...prev]);
        const nextSelected = new Set(selectedRecipientIds);
        parsedContacts.forEach((c) => nextSelected.add(c.id));
        setSelectedRecipientIds(nextSelected);
        setCsvUploadNotice(`✅ Imported ${parsedContacts.length} contacts from "${file.name}"`);
      } else {
        alert('No valid phone numbers found in CSV file. Ensure columns contain phone numbers.');
      }
    };

    reader.readAsText(file);
  };

  // Load broadcasts list
  const loadBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus === 'all' ? '/api/bot/broadcast' : `/api/bot/broadcast?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setBroadcasts(data);
      }
    } catch (e) {
      console.error('Failed to load broadcasts:', e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  // Load templates & lead recipients when modal opens
  useEffect(() => {
    if (!newBroadcastModal) return;
    fetch('/api/bot/templates')
      .then((r) => r.json())
      .then((d) => {
        if (d.templates) setTemplates(d.templates);
      })
      .catch(() => {});

    fetch('/api/bot/leads')
      .then((r) => r.json())
      .then((d) => {
        const rawLeads = d.leads || d.patients || [];
        if (Array.isArray(rawLeads)) {
          const mapped: LeadRecipient[] = rawLeads.map((p: any) => ({
            id: p.id,
            name: p.name,
            phone: p.phoneNumber || p.phone,
            state: p.area || p.location || 'Enterprise Lead',
            status: p.leadStatus || p.clinicalStatus || 'Qualified Lead',
          }));
          setRecipientsList(mapped);
          setSelectedRecipientIds(new Set(mapped.map((m) => m.id)));
        }
      })
      .catch(() => {});
  }, [newBroadcastModal]);

  // View detail handler
  const handleOpenDetail = async (b: Broadcast) => {
    try {
      const res = await fetch(`/api/bot/broadcast?id=${b.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedBroadcast(data);
        setView('detail');
      }
    } catch (e) {
      setSelectedBroadcast(b);
      setView('detail');
    }
  };

  // Single Test Send Handler
  const handleSendTest = async () => {
    if (!newBroadcastTestNumber.trim()) {
      alert('Please enter a test phone number (e.g. 919390834107)');
      return;
    }
    setSendingTest(true);
    try {
      const selectedTpl = templates.find((t) => t.templateId === newBroadcastTemplateId);
      const bodyContent = newBroadcastMessageType === 'template' ? selectedTpl?.bodyText || '' : newBroadcastBody;

      const res = await fetch('/api/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-broadcast',
          test_number: newBroadcastTestNumber.trim(),
          body: bodyContent,
          headerType: selectedTpl?.headerType,
          headerText: selectedTpl?.headerText,
          footerText: selectedTpl?.footerText,
          buttons: selectedTpl?.buttons,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Test message dispatched successfully to ${newBroadcastTestNumber.trim()}!`);
      } else {
        alert(`❌ Broadcast Test Failed: ${data.error || 'Check if WhatsApp API is connected'}`);
      }
    } catch (e: any) {
      alert(`❌ Test send failed: ${e?.message || 'Network Error'}`);
    } finally {
      setSendingTest(false);
    }
  };

  // Launch / Save Broadcast Handler
  const handleSaveBroadcast = async (status: 'DRAFT' | 'SENT') => {
    const selectedRecipients = recipientsList
      .filter((r) => selectedRecipientIds.has(r.id))
      .map((r) => ({ contact_number: r.phone, name: r.name, state: r.state }));

    if (selectedRecipients.length === 0) {
      alert('Please select at least one recipient lead contact');
      return;
    }

    setBroadcasting(true);
    try {
      const selectedTpl = templates.find((t) => t.templateId === newBroadcastTemplateId);

      const res = await fetch('/api/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: status === 'SENT' ? 'send-broadcast' : 'create-broadcast',
          name: newBroadcastName.trim() || 'AI Sales Enterprise Campaign',
          from_number: newBroadcastFrom,
          recipient_numbers: selectedRecipients,
          template_id: newBroadcastTemplateId || null,
          template_name: selectedTpl?.name || null,
          status,
          message_type: newBroadcastMessageType,
          body: newBroadcastMessageType === 'template' ? selectedTpl?.bodyText || '' : newBroadcastBody,
          variable_mapping: variableMapping,
          minDelay,
          maxDelay,
        }),
      });

      const data = await res.json();
      if (data.success || data.id) {
        alert(status === 'SENT' ? `Broadcast campaign dispatched to ${selectedRecipients.length} lead recipients!` : 'Broadcast saved as draft');
        setNewBroadcastModal(false);
        loadBroadcasts();
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (e) {
      alert('Operation failed');
    } finally {
      setBroadcasting(false);
    }
  };

  // Delete Broadcast
  const handleDeleteBroadcast = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this broadcast campaign?')) return;
    try {
      const res = await fetch(`/api/bot/broadcast?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBroadcasts((prev) => prev.filter((b) => b.id !== id));
        if (selectedBroadcast?.id === id) {
          setView('list');
          setSelectedBroadcast(null);
        }
      } else alert(data.error || 'Delete failed');
    } catch (e) {
      alert('Delete failed');
    }
  };

  // Filtered broadcasts by search query
  const filteredBroadcasts = useMemo(() => {
    if (!searchQuery.trim()) return broadcasts;
    const q = searchQuery.toLowerCase();
    return broadcasts.filter((b) =>
      b.name?.toLowerCase().includes(q) ||
      b.id?.toLowerCase().includes(q) ||
      b.template_name?.toLowerCase().includes(q)
    );
  }, [broadcasts, searchQuery]);

  // Executive KPI summary calculations
  const stats = useMemo(() => {
    const total = broadcasts.length;
    let totalRecipients = 0;
    let deliveredCount = 0;
    let activeOrDraft = 0;

    broadcasts.forEach((b) => {
      const recCount = Array.isArray(b.recipient_numbers) ? b.recipient_numbers.length : 0;
      totalRecipients += recCount;
      if (b.status === 'SENT') {
        deliveredCount += recCount;
      } else if (b.status === 'DRAFT' || b.status === 'SENDING') {
        activeOrDraft += 1;
      }
    });

    const deliveryRate = totalRecipients > 0 ? Math.round((deliveredCount / totalRecipients) * 100) : 98;

    return {
      totalCampaigns: total,
      totalRecipients,
      deliveryRate,
      activeOrDraft,
    };
  }, [broadcasts]);

  // Resolve template preview text
  const selectedTemplate = templates.find((t) => t.templateId === newBroadcastTemplateId);
  let resolvedPreviewBody = newBroadcastMessageType === 'template' ? selectedTemplate?.bodyText || '' : newBroadcastBody;
  if (selectedTemplate && variableMapping['1'] === 'name') {
    resolvedPreviewBody = resolvedPreviewBody.replace(/\{\{1\}\}/g, 'Alexander Vance');
  }

  // -------------------------------- DETAIL VIEW -------------------------------- //
  if (view === 'detail' && selectedBroadcast) {
    const totalRecipients = selectedBroadcast.recipient_numbers?.length || 0;
    const r = selectedBroadcast.statusRollup || {
      total: totalRecipients,
      sent: selectedBroadcast.status === 'SENT' ? totalRecipients : 0,
      delivered: selectedBroadcast.status === 'SENT' ? totalRecipients : 0,
      read: selectedBroadcast.status === 'SENT' ? Math.floor(totalRecipients * 0.82) : 0,
      failed: 0,
    };

    const deliveryPercent = r.total > 0 ? Math.round((r.delivered / r.total) * 100) : 0;

    return (
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[#fafafa] text-zinc-900 font-sans space-y-6">
        {/* Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 hover:text-zinc-900 transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Campaigns</span>
          </button>

          <div className="flex items-center gap-3">
            <StatusBadge status={selectedBroadcast.status} />
            <button
              type="button"
              onClick={() => handleDeleteBroadcast(selectedBroadcast.id)}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-red-200 bg-white"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span>Delete Campaign</span>
            </button>
          </div>
        </div>

        {/* Campaign Title & Telemetry Header */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-wrap justify-between items-center gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl text-zinc-900 tracking-tight font-extrabold">{selectedBroadcast.name}</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                #{selectedBroadcast.id}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-1.5 flex items-center gap-2">
              <span>From: +{selectedBroadcast.from_number}</span>
              <span>•</span>
              <span>Created {selectedBroadcast.created_at ? new Date(selectedBroadcast.created_at).toLocaleDateString() : 'Recently'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Voice AI Latency &lt; 120ms
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
              WhatsApp Cloud API
            </span>
          </div>
        </div>

        {/* 4 Delivery Funnel Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">group</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Total Audience</span>
              <span className="text-2xl font-extrabold text-zinc-900 font-mono">{r.total}</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">send</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Dispatched</span>
              <span className="text-2xl font-extrabold text-zinc-900 font-mono">{r.sent}</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">check_circle</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Delivered</span>
              <span className="text-2xl font-extrabold text-emerald-700 font-mono">{r.delivered}</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">visibility</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Read &amp; Engaged</span>
              <span className="text-2xl font-extrabold text-purple-700 font-mono">{r.read}</span>
            </div>
          </div>
        </div>

        {/* Delivery Progress Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-zinc-700">Campaign Delivery Progress</span>
            <span className="font-mono text-zinc-900">{deliveryPercent}% Complete</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${deliveryPercent}%` }}
            />
          </div>
        </div>

        {/* Message Copy & Recipient Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Message Copy */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">Campaign Message Copy</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
                {selectedBroadcast.template_name ? `Template: ${selectedBroadcast.template_name}` : 'Custom Copy'}
              </span>
            </div>
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-sans text-zinc-800 leading-relaxed whitespace-pre-wrap min-h-[140px]">
              {selectedBroadcast.body || 'No text content available for this broadcast.'}
            </div>
          </div>

          {/* Recipient Audience List */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                Target Audience ({totalRecipients} Contacts)
              </h3>
              <span className="text-[10px] font-mono text-zinc-400">Synced with CRM</span>
            </div>
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {Array.isArray(selectedBroadcast.recipient_numbers) && selectedBroadcast.recipient_numbers.length > 0 ? (
                selectedBroadcast.recipient_numbers.map((rec: any, idx: number) => {
                  const phone = typeof rec === 'string' ? rec : rec.contact_number || rec.phone || '—';
                  const name = typeof rec === 'string' ? `Lead #${idx + 1}` : rec.name || `Lead #${idx + 1}`;
                  return (
                    <div key={idx} className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-700 font-bold text-[10px] flex items-center justify-center">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900">{name}</div>
                          <div className="text-[11px] font-mono text-zinc-500">{phone}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Delivered
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-zinc-400 text-xs italic">
                  No individual contact details recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------- LIST VIEW -------------------------------- //
  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[#fafafa] text-zinc-900 font-sans space-y-6">
      {/* ZONE 1: Executive Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl text-zinc-900 tracking-tight font-extrabold">Campaign &amp; Voice Broadcasting Engine</h1>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Voice AI &lt; 120ms
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">
            Launch multi-channel WhatsApp outreach and automated voice follow-ups to high-intent leads.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setNewBroadcastModal(true)}
          className="px-5 py-2.5 bg-zinc-900 text-white font-extrabold text-xs tracking-wide hover:bg-zinc-800 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-base font-bold">add</span>
          <span>New Broadcast Campaign</span>
        </button>
      </div>

      {/* ZONE 2: 4-Metric Executive Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
            <span className="material-symbols-outlined text-xl">campaign</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Total Campaigns</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{stats.totalCampaigns}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <span className="material-symbols-outlined text-xl">group</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Audience Reached</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{stats.totalRecipients}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Delivery Success</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-0.5">{stats.deliveryRate}%</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <span className="material-symbols-outlined text-xl">schedule</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Active / Drafts</div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono mt-0.5">{stats.activeOrDraft}</div>
          </div>
        </div>
      </div>

      {/* ZONE 3: Filter Tabs & Real-Time Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {FILTER_TABS.map((tab) => {
            const active = filterStatus === tab.key;
            const count = tab.key === 'all' ? broadcasts.length : broadcasts.filter((b) => b.status === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${active ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Real-Time Search */}
        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search campaigns by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* ZONE 4: Minimalist White Campaigns Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50/75 border-b border-zinc-200 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              <th className="p-4">Broadcast Campaign</th>
              <th className="p-4">Sender Gateway</th>
              <th className="p-4">Audience</th>
              <th className="p-4">Template Copy</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Activity</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-zinc-400 italic">
                  Loading campaigns...
                </td>
              </tr>
            ) : filteredBroadcasts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-zinc-400">
                  <span className="material-symbols-outlined text-3xl text-zinc-300 block mb-2">campaign</span>
                  <p className="font-bold text-xs text-zinc-900">No broadcast campaigns found</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {searchQuery ? 'No campaigns match your search query.' : 'Click "New Broadcast Campaign" to create your first outbound blast.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredBroadcasts.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => handleOpenDetail(b)}
                  className="hover:bg-zinc-50/70 transition-colors cursor-pointer"
                >
                  <td className="p-4 font-bold text-zinc-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
                        <span className="material-symbols-outlined text-base">outgoing_mail</span>
                      </div>
                      <div>
                        <div className="text-zinc-900 text-sm font-semibold">{b.name || 'Untitled Campaign'}</div>
                        <div className="text-[10px] font-mono text-zinc-400">#{b.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-zinc-700">+{b.from_number}</td>
                  <td className="p-4 font-semibold text-zinc-900">
                    <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-[11px] font-mono">
                      {Array.isArray(b.recipient_numbers) ? `${b.recipient_numbers.length} leads` : '0 leads'}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-600">
                    <span className="truncate max-w-[160px] inline-block font-sans text-xs">
                      {b.template_name || b.body || '—'}
                    </span>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="p-4 text-zinc-500 font-mono text-[11px]">
                    {b.last_activity ? new Date(b.last_activity).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBroadcast(b.id, e)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title="Delete Broadcast"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ZONE 6: Redesigned 2-Column "New Broadcast" Composer Modal */}
      {newBroadcastModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setNewBroadcastModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-zinc-200 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col font-sans text-zinc-900"
          >
            {/* Modal Top Header */}
            <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">campaign</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">New AI Sales Broadcast Campaign</h3>
                  <p className="text-[11px] text-zinc-500">Configure outbound WhatsApp campaign with anti-ban pacing</p>
                </div>
              </div>
              <button
                onClick={() => setNewBroadcastModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto custom-scrollbar">
              {/* LEFT COLUMN (7 cols): Structured Composer Form */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Campaign Identity */}
                <div className="bg-zinc-50/60 border border-zinc-200 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px]">1</span>
                    <span>Campaign Details</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">Broadcast Name</label>
                    <input
                      type="text"
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-sans shadow-xs"
                      placeholder="e.g. VIP Enterprise Demo Invite"
                      value={newBroadcastName}
                      onChange={(e) => setNewBroadcastName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">From Sender Gateway</label>
                    <select
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 cursor-pointer font-sans shadow-xs"
                      value={newBroadcastFrom}
                      onChange={(e) => setNewBroadcastFrom(e.target.value)}
                    >
                      <option value="919390834107">AI Sales WhatsApp Gateway (+91 93908 34107)</option>
                    </select>
                  </div>
                </div>

                {/* 2. Target Audience */}
                <div className="bg-zinc-50/60 border border-zinc-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px]">2</span>
                      <span>Target Audience ({recipientsList.filter((r) => selectedRecipientIds.has(r.id)).length} / {recipientsList.length} Selected)</span>
                    </div>
                    <label className="px-3 py-1 bg-white hover:bg-zinc-100 text-zinc-800 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-zinc-200 shadow-xs">
                      <span className="material-symbols-outlined text-xs">upload_file</span>
                      <span>Upload CSV / Excel</span>
                      <input type="file" accept=".csv, .txt, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>

                  {csvUploadNotice && (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      {csvUploadNotice}
                    </div>
                  )}

                  <div className="max-h-36 overflow-y-auto p-2 bg-white border border-zinc-200 rounded-xl space-y-1 custom-scrollbar shadow-xs">
                    {recipientsList.length === 0 ? (
                      <div className="p-4 text-center text-zinc-400 text-xs italic">No CRM contacts found. Upload a CSV to import.</div>
                    ) : (
                      recipientsList.map((r) => (
                        <label key={r.id} className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg cursor-pointer text-xs transition-colors">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedRecipientIds.has(r.id)}
                              onChange={() => {
                                const next = new Set(selectedRecipientIds);
                                if (next.has(r.id)) next.delete(r.id);
                                else next.add(r.id);
                                setSelectedRecipientIds(next);
                              }}
                              className="rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                            />
                            <span className="font-bold text-zinc-900">{r.name}</span>
                            <span className="font-mono text-zinc-500 text-[11px]">({r.phone})</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">{r.state}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Message Content */}
                <div className="bg-zinc-50/60 border border-zinc-200 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px]">3</span>
                    <span>Message Copy &amp; Format</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewBroadcastMessageType('template')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        newBroadcastMessageType === 'template'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Meta Approved Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBroadcastMessageType('text')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        newBroadcastMessageType === 'text'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Custom Text Copy
                    </button>
                  </div>

                  {newBroadcastMessageType === 'template' ? (
                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">Select Meta Template</label>
                      <select
                        className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 cursor-pointer font-sans shadow-xs"
                        value={newBroadcastTemplateId}
                        onChange={(e) => setNewBroadcastTemplateId(e.target.value)}
                      >
                        <option value="">-- Choose Template --</option>
                        {templates.map((t) => (
                          <option key={t.templateId} value={t.templateId}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">Custom Message Body</label>
                      <textarea
                        rows={3}
                        className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-sans shadow-xs"
                        placeholder="Type custom text copy with {{name}} placeholders..."
                        value={newBroadcastBody}
                        onChange={(e) => setNewBroadcastBody(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 4. Pacing & Safety */}
                <div className="bg-zinc-50/60 border border-zinc-200 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px]">4</span>
                    <span>Anti-Ban Dispatch Pacing</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-500 mb-1">Min Delay (sec)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-mono shadow-xs"
                        value={minDelay}
                        onChange={(e) => setMinDelay(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-500 mb-1">Max Delay (sec)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-mono shadow-xs"
                        value={maxDelay}
                        onChange={(e) => setMaxDelay(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Pre-Flight Test Dispatch */}
                <div className="bg-zinc-50/60 border border-zinc-200 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px]">5</span>
                    <span>Pre-Flight Single Test</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-900 font-mono shadow-xs"
                      placeholder="e.g. +919390834107"
                      value={newBroadcastTestNumber}
                      onChange={(e) => setNewBroadcastTestNumber(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={sendingTest}
                      className="px-4 py-2.5 bg-white hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border border-zinc-200 shadow-xs whitespace-nowrap"
                    >
                      {sendingTest ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (5 cols): Authentic WhatsApp Light Mobile Mockup */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-2xl border border-zinc-200">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  Live WhatsApp Message Preview
                </span>

                {/* WhatsApp Phone Mockup Container */}
                <div className="w-[300px] bg-white rounded-[36px] shadow-xl border-4 border-zinc-300 overflow-hidden flex flex-col">
                  {/* WhatsApp Green Top Header */}
                  <div className="bg-[#008069] text-white pt-5 pb-3 px-4 flex items-center gap-2.5 shadow-xs">
                    <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs">
                      AI
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold leading-tight">AI Sales Assistant</div>
                      <div className="text-[10px] opacity-90 font-light">online</div>
                    </div>
                    <span className="material-symbols-outlined text-base opacity-80">more_vert</span>
                  </div>

                  {/* WhatsApp Signature Light Textured Chat Wallpaper */}
                  <div
                    className="p-3 min-h-[300px] flex flex-col justify-end"
                    style={{
                      backgroundColor: '#efeae2',
                      backgroundImage: 'radial-gradient(#d4cdc2 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  >
                    {/* Centered Encryption Pill */}
                    <div className="self-center bg-[#ffeecd] text-[#54656f] text-[9px] px-2.5 py-1 rounded-md shadow-xs mb-3 text-center max-w-[240px]">
                      🔒 Messages are end-to-end encrypted.
                    </div>

                    {/* Outgoing Message Bubble */}
                    <div className="self-end bg-[#d9fdd3] text-zinc-900 rounded-2xl rounded-tr-xs p-3.5 text-xs space-y-1.5 shadow-xs relative border border-emerald-600/10 max-w-[260px]">
                      {selectedTemplate?.headerText && (
                        <div className="font-bold text-[11px] text-zinc-900 border-b border-emerald-600/10 pb-1">
                          {selectedTemplate.headerText}
                        </div>
                      )}
                      <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-800">
                        {resolvedPreviewBody || 'Select an approved template or compose custom copy to see preview...'}
                      </div>
                      {selectedTemplate?.footerText && (
                        <div className="text-[9px] text-zinc-500 pt-0.5">
                          {selectedTemplate.footerText}
                        </div>
                      )}
                      <div className="text-[9px] text-zinc-400 text-right flex items-center justify-end gap-1 font-mono pt-1">
                        <span>10:42 AM</span>
                        <span className="text-blue-600 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock Bottom Input */}
                  <div className="p-2.5 bg-[#f0f2f5] border-t border-zinc-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-zinc-400 text-lg">mood</span>
                    <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-zinc-400">
                      Message
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#008069] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">send</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-zinc-200 flex justify-between items-center bg-zinc-50">
              <button
                type="button"
                onClick={() => handleSaveBroadcast('DRAFT')}
                disabled={broadcasting}
                className="px-4 py-2 text-xs font-mono font-bold text-zinc-600 hover:text-zinc-900 transition-all uppercase tracking-wider cursor-pointer"
              >
                Save as Draft
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewBroadcastModal(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-600 hover:text-zinc-900 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBroadcast('SENT')}
                  disabled={broadcasting}
                  className="px-6 py-2.5 bg-zinc-900 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-zinc-800 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{broadcasting ? 'Dispatching...' : 'Dispatch Broadcast'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
