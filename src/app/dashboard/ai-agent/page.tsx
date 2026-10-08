'use client';

import React, { useState, useEffect } from 'react';
import { SEVEN_SPECIALIZED_AGENTS, AgentDefinition } from '@/lib/agents/agent-definitions';

export interface DynamicIntakeQuestionItem {
  id: string;
  stepOrder: number;
  fieldKey: string;
  questionPrompt: string;
  validationType: 'TEXT' | 'NUMBER' | 'CURRENCY' | 'ENUM' | 'DATE' | 'PHONE' | 'EMAIL';
  options: string[] | null;
  isMandatory: boolean;
  isSkippable: boolean;
  isActive: boolean;
}

interface KnowledgeItem {
  id: string;
  title: string;
  category: 'FAQ' | 'SALES_PLAYBOOK' | 'PRICING_POLICY' | 'PRODUCT_SPEC';
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeDocument {
  id: string;
  filename: string;
  fileType: string;
  fileSize: string;
  category: 'FAQ' | 'SALES_PLAYBOOK' | 'PRICING_POLICY' | 'PRODUCT_SPEC';
  chunkCount: number;
  status: 'INDEXED' | 'PROCESSING' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export default function AiAgentAdminPage() {
  // 5 Focused Tabs: Master Orchestrator, Workforce Agents, Intake Questions, Trip Knowledge, Connections Hub
  const [activeTab, setActiveTab] = useState<'orchestrator' | 'workforce' | 'intake' | 'knowledge' | 'connections'>('orchestrator');

  // Dual WhatsApp & Google Sheets State
  const [waConfig, setWaConfig] = useState<any>({
    activeProvider: 'SMART_HYBRID',
    metaConfig: {
      phoneNumberId: '',
      accessToken: '',
      wabaId: '',
      businessName: 'Trekatour Adventures',
      apiBaseUrl: 'https://graph.facebook.com/v19.0',
      webhookVerifyToken: 'trekatour_waba_verify_2026',
    },
    hybridPolicy: {
      inboundChatAndIntake: 'BAILEYS',
      bookingVouchersAndAlerts: 'META_WABA',
      marketingCampaigns: 'META_WABA',
    },
  });
  const [waStatus, setWaStatus] = useState<any>(null);
  const [savingWa, setSavingWa] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('919876543210');
  const [waTestMsg, setWaTestMsg] = useState('Hello! This is a test message from Trekatour Sales AI.');
  const [sendingWaTest, setSendingWaTest] = useState(false);
  const [waFeedback, setWaFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [sheetsConfig, setSheetsConfig] = useState<any>({
    spreadsheetId: '',
    sheetTabName: 'Leads 2026',
    syncEnabled: true,
    autoSyncOnLeadChange: true,
    twoWayWriteBackEnabled: true,
    apiKey: '',
    lastSyncedAt: null,
    lastSyncStatus: 'IDLE',
    syncedRowCount: 0,
  });
  const [sheetsPreview, setSheetsPreview] = useState<{ headers: string[]; rows: string[][]; total: number }>({ headers: [], rows: [], total: 0 });
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [savingSheets, setSavingSheets] = useState(false);
  const [sheetsFeedback, setSheetsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Master Supervisor (Agent #0 - Kabir) State
  const [supervisorConfig, setSupervisorConfig] = useState<any>({
    strategyMode: 'HIGH_CONVERSION_CLOSER',
    agentToggles: {
      voice_agent: true,
      intake_agent: true,
      itinerary_agent: true,
      discount_agent: true,
      whatsapp_agent: true,
      payment_agent: true,
      summary_agent: true,
    },
    routingRules: [
      { id: 'r1', name: 'Group Tier Auto-Discount', condition: 'groupSize >= 4', action: 'Apply 5% volume discount', isActive: true },
      { id: 'r2', name: 'Large Group Promo Trigger', condition: 'groupSize >= 8', action: 'Apply 10% volume discount + TREK1000', isActive: true },
      { id: 'r3', name: 'Automatic Brochure Dispatch', condition: 'intakeStatus == "COMPLETED"', action: 'Send PDF brochure via WhatsApp', isActive: true },
      { id: 'r4', name: 'Corporate VIP Human Escalation', condition: 'groupSize >= 20 || dealValue >= 100000', action: 'Trigger HITL notification', isActive: true },
    ],
    marginCapPercent: 20.0,
  });
  const [hitlQueue, setHitlQueue] = useState<any[]>([]);
  const [simQuery, setSimQuery] = useState('We are 6 friends going to Pondicherry next weekend, can you give a discount and booking link?');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [supervisorMsg, setSupervisorMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Agent State
  const [agentSearch, setAgentSearch] = useState('');
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    SEVEN_SPECIALIZED_AGENTS.forEach((a) => {
      map[a.id] = a.systemPrompt;
    });
    return map;
  });
  const [agentStatus, setAgentStatus] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    SEVEN_SPECIALIZED_AGENTS.forEach((a) => {
      map[a.id] = true;
    });
    return map;
  });

  // Dynamic Intake Flow State
  const [intakeQuestions, setIntakeQuestions] = useState<DynamicIntakeQuestionItem[]>([]);
  const [selectedIntakeId, setSelectedIntakeId] = useState<string>('');
  const [loadingIntake, setLoadingIntake] = useState(true);
  const [savingIntake, setSavingIntake] = useState(false);
  const [intakeMsg, setIntakeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Trip Knowledge State
  const [kbItems, setKbItems] = useState<KnowledgeItem[]>([]);
  const [loadingKb, setLoadingKb] = useState(true);
  const [showAddKbModal, setShowAddKbModal] = useState(false);
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbCategory, setNewKbCategory] = useState<KnowledgeItem['category']>('FAQ');
  const [newKbContent, setNewKbContent] = useState('');
  const [addingKb, setAddingKb] = useState(false);
  const [kbSearch, setKbSearch] = useState('');

  // Initial Data Fetch
  useEffect(() => {
    fetchSupervisorConfig();
    fetchIntakeQuestions();
    fetchKnowledge();
    fetchWhatsAppSettings();
    fetchGoogleSheetsSettings();
  }, []);

  const fetchWhatsAppSettings = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp-provider');
      const data = await res.json();
      if (data.success) {
        if (data.config) setWaConfig(data.config);
        if (data.status) setWaStatus(data.status);
      }
    } catch (e) {
      console.error('Failed to fetch WhatsApp provider settings', e);
    }
  };

  const handleSaveWhatsAppSettings = async (override?: any) => {
    setSavingWa(true);
    setWaFeedback(null);
    try {
      const payload = override || waConfig;
      const res = await fetch('/api/admin/whatsapp-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setWaConfig(data.config);
        setWaStatus(data.status);
        setWaFeedback({ type: 'success', text: 'WhatsApp connection settings saved successfully!' });
      } else {
        setWaFeedback({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (e: any) {
      setWaFeedback({ type: 'error', text: e.message || 'Network error' });
    } finally {
      setSavingWa(false);
    }
  };

  const handleSendTestWaMessage = async () => {
    if (!waTestPhone) return;
    setSendingWaTest(true);
    setWaFeedback(null);
    try {
      const res = await fetch('/api/admin/whatsapp-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: waTestPhone,
          message: waTestMsg,
          category: 'CHAT',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWaFeedback({
          type: 'success',
          text: `Test message dispatched successfully via ${data.providerUsed}!`,
        });
      } else {
        setWaFeedback({
          type: 'error',
          text: data.error || 'Failed to dispatch test message',
        });
      }
    } catch (e: any) {
      setWaFeedback({ type: 'error', text: e.message || 'Dispatch error' });
    } finally {
      setSendingWaTest(false);
    }
  };

  const fetchGoogleSheetsSettings = async () => {
    try {
      const res = await fetch('/api/admin/integrations/google-sheets');
      const data = await res.json();
      if (data.success) {
        if (data.config) setSheetsConfig(data.config);
        if (data.preview) setSheetsPreview(data.preview);
      }
    } catch (e) {
      console.error('Failed to fetch Google Sheets settings', e);
    }
  };

  const handleSaveGoogleSheetsSettings = async (override?: any) => {
    setSavingSheets(true);
    setSheetsFeedback(null);
    try {
      const payload = override || sheetsConfig;
      const res = await fetch('/api/admin/integrations/google-sheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSheetsConfig(data.config);
        setSheetsFeedback({ type: 'success', text: 'Google Sheets settings saved successfully!' });
      } else {
        setSheetsFeedback({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (e: any) {
      setSheetsFeedback({ type: 'error', text: e.message || 'Network error' });
    } finally {
      setSavingSheets(false);
    }
  };

  const handleSyncGoogleSheetsNow = async () => {
    setSyncingSheets(true);
    setSheetsFeedback(null);
    try {
      const res = await fetch('/api/admin/integrations/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_NOW' }),
      });
      const data = await res.json();
      if (data.success) {
        setSheetsFeedback({
          type: 'success',
          text: `Successfully synchronized ${data.syncedRows} leads with Google Sheets!`,
        });
        fetchGoogleSheetsSettings();
      } else {
        setSheetsFeedback({
          type: 'error',
          text: data.message || 'Sync failed',
        });
      }
    } catch (e: any) {
      setSheetsFeedback({ type: 'error', text: e.message || 'Network error' });
    } finally {
      setSyncingSheets(false);
    }
  };

  const fetchSupervisorConfig = async () => {
    try {
      const res = await fetch('/api/admin/ai-agent/supervisor');
      const data = await res.json();
      if (data.success) {
        if (data.config) setSupervisorConfig(data.config);
        if (Array.isArray(data.hitlQueue)) setHitlQueue(data.hitlQueue);
      }
    } catch (e) {
      console.error('Failed to fetch supervisor config', e);
    }
  };

  const handleSwitchStrategy = async (mode: string) => {
    try {
      const res = await fetch('/api/admin/ai-agent/supervisor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyMode: mode }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setSupervisorConfig(data.config);
        setSupervisorMsg({ type: 'success', text: `Sales strategy switched to ${mode.replace(/_/g, ' ')}!` });
        setTimeout(() => setSupervisorMsg(null), 3000);
      }
    } catch (e) {
      console.error('Failed to update strategy', e);
    }
  };

  const handleToggleSupervisorAgent = async (agentKey: string, currentVal: boolean) => {
    try {
      const updatedToggles = { ...supervisorConfig.agentToggles, [agentKey]: !currentVal };
      const res = await fetch('/api/admin/ai-agent/supervisor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentToggles: updatedToggles }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setSupervisorConfig(data.config);
        setSupervisorMsg({ type: 'success', text: `${agentKey} toggled ${!currentVal ? 'ON' : 'OFF'}` });
        setTimeout(() => setSupervisorMsg(null), 2500);
      }
    } catch (e) {
      console.error('Failed to toggle agent', e);
    }
  };

  const handleResolveHitl = async (hitlId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/admin/ai-agent/supervisor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESOLVE_HITL', hitlId, decision }),
      });
      const data = await res.json();
      if (data.success) {
        setHitlQueue((prev) => prev.map((item) => (item.id === hitlId ? { ...item, status: decision } : item)));
        setSupervisorMsg({ type: 'success', text: `Escalation #${hitlId.slice(-4)} ${decision}!` });
        setTimeout(() => setSupervisorMsg(null), 3000);
      }
    } catch (e) {
      console.error('Failed to resolve HITL', e);
    }
  };

  const handleRunSimulation = async () => {
    if (!simQuery.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/admin/ai-agent/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '919876543210',
          message: simQuery,
          channel: 'web',
          customerName: 'Sneha Rao',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
      }
    } catch (e) {
      console.error('Simulation failed', e);
    } finally {
      setSimLoading(false);
    }
  };

  const fetchIntakeQuestions = async () => {
    setLoadingIntake(true);
    try {
      const res = await fetch('/api/admin/intake-questions');
      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setIntakeQuestions(data.questions);
        if (data.questions.length > 0) {
          setSelectedIntakeId(data.questions[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch intake questions', e);
    } finally {
      setLoadingIntake(false);
    }
  };

  const fetchKnowledge = async () => {
    setLoadingKb(true);
    try {
      const res = await fetch('/api/admin/ai-agent/knowledge');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setKbItems(data.items);
      }
    } catch (e) {
      console.error('Failed to fetch knowledge base', e);
    } finally {
      setLoadingKb(false);
    }
  };

  // Intake Handlers
  const currentIntakeQ = intakeQuestions.find((q) => q.id === selectedIntakeId) || intakeQuestions[0] || null;

  const handleUpdateIntakeField = (field: keyof DynamicIntakeQuestionItem, value: any) => {
    setIntakeQuestions((prev) =>
      prev.map((q) => (q.id === selectedIntakeId ? { ...q, [field]: value } : q))
    );
  };

  const handleSaveIntakeQuestion = async () => {
    if (!currentIntakeQ) return;
    setSavingIntake(true);
    setIntakeMsg(null);
    try {
      const res = await fetch('/api/admin/intake-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentIntakeQ),
      });
      const data = await res.json();
      if (data.success) {
        setIntakeMsg({
          type: 'success',
          text: `Question #${currentIntakeQ.stepOrder} (${currentIntakeQ.fieldKey}) saved successfully!`,
        });
        setTimeout(() => setIntakeMsg(null), 3500);
      } else {
        setIntakeMsg({ type: 'error', text: data.error || 'Failed to save question' });
      }
    } catch (err: any) {
      setIntakeMsg({ type: 'error', text: err.message || 'Error saving question' });
    } finally {
      setSavingIntake(false);
    }
  };

  const handleAddIntakeQuestion = async () => {
    const nextOrder = intakeQuestions.length + 1;
    const defaultFieldKey = `custom_step_${nextOrder}`;
    try {
      const res = await fetch('/api/admin/intake-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepOrder: nextOrder,
          fieldKey: defaultFieldKey,
          questionPrompt: `Please tell us your preference for step ${nextOrder}:`,
          validationType: 'TEXT',
          isMandatory: true,
          isSkippable: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.question) {
        setIntakeQuestions([...intakeQuestions, data.question]);
        setSelectedIntakeId(data.question.id);
        setIntakeMsg({ type: 'success', text: `New Question Step #${nextOrder} added!` });
        setTimeout(() => setIntakeMsg(null), 3500);
      }
    } catch (err: any) {
      setIntakeMsg({ type: 'error', text: err.message || 'Error adding question' });
    }
  };

  const handleDeleteIntakeQuestion = async (id: string) => {
    if (intakeQuestions.length <= 1) {
      alert('You must keep at least one active intake question.');
      return;
    }
    if (!confirm('Are you sure you want to remove this intake question step?')) return;
    try {
      const res = await fetch(`/api/admin/intake-questions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const remaining = intakeQuestions.filter((q) => q.id !== id);
        setIntakeQuestions(remaining);
        if (selectedIntakeId === id) {
          setSelectedIntakeId(remaining[0]?.id || '');
        }
        setIntakeMsg({ type: 'success', text: 'Intake step deleted successfully.' });
        setTimeout(() => setIntakeMsg(null), 3500);
      }
    } catch (err: any) {
      setIntakeMsg({ type: 'error', text: err.message || 'Error deleting question' });
    }
  };

  const handleToggleIntakeActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/intake-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setIntakeQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, isActive: !currentActive } : q))
        );
      }
    } catch (e) {
      console.error('Failed to toggle active status', e);
    }
  };

  const handleReorderIntake = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === intakeQuestions.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...intakeQuestions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const reorderList = reordered.map((item, idx) => ({
      id: item.id,
      stepOrder: idx + 1,
    }));

    setIntakeQuestions(reordered.map((item, idx) => ({ ...item, stepOrder: idx + 1 })));

    try {
      await fetch('/api/admin/intake-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderList }),
      });
    } catch (e) {
      console.error('Failed to reorder', e);
      fetchIntakeQuestions();
    }
  };

  // Knowledge Handlers
  const handleAddKbItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbTitle.trim() || !newKbContent.trim()) return;
    setAddingKb(true);
    try {
      const res = await fetch('/api/admin/ai-agent/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newKbTitle,
          category: newKbCategory,
          content: newKbContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKbItems([data.item, ...kbItems]);
        setShowAddKbModal(false);
        setNewKbTitle('');
        setNewKbContent('');
      }
    } catch (e) {
      console.error('Failed to add knowledge item', e);
    } finally {
      setAddingKb(false);
    }
  };

  const handleDeleteKbItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip knowledge item?')) return;
    try {
      const res = await fetch(`/api/admin/ai-agent/knowledge?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setKbItems(kbItems.filter((k) => k.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete knowledge item', e);
    }
  };

  // Filtered lists
  const filteredAgents = SEVEN_SPECIALIZED_AGENTS.filter(
    (a) =>
      a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
      a.roleTitle.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const filteredKb = kbItems.filter(
    (k) =>
      k.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      k.content.toLowerCase().includes(kbSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left font-sans text-zinc-900 pb-12">
      {/* Sleek Minimalist Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-xl">travel_explore</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                Trekatour AI Sales Studio
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Autonomous 7-Agent Sales Workforce, Lead Qualification Flow, and Trip Knowledge
              </p>
            </div>
          </div>
        </div>

        {/* Global Status Badge */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>All 7 Agents Active</span>
          </span>
        </div>
      </div>

      {/* 4 Streamlined Main Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-100/90 border border-zinc-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('orchestrator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'orchestrator'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-base">military_tech</span>
          <span>0. Master Orchestrator (Kabir)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workforce')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'workforce'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-base">groups</span>
          <span>1. Workforce Agents ({SEVEN_SPECIALIZED_AGENTS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('intake')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'intake'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-base">assignment</span>
          <span>2. Intake Questions Flow ({intakeQuestions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'knowledge'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-base">library_books</span>
          <span>3. Trip Knowledge & FAQs ({kbItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('connections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'connections'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-base">hub</span>
          <span>4. WhatsApp &amp; Google Sheets Hub</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: MASTER ORCHESTRATOR (Agent #0 - Kabir)                             */}
      {/* ========================================================================= */}
      {activeTab === 'orchestrator' && (
        <div className="space-y-6">
          {/* Notification Toast */}
          {supervisorMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                supervisorMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{supervisorMsg.text}</span>
            </div>
          )}

          {/* Master Agent Hero Banner */}
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 text-white rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Agent #0 Active Orchestrator
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                    Strategy: {supervisorConfig.strategyMode?.replace(/_/g, ' ')}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Kabir — Head of Autonomous Travel Sales
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Directs and coordinates the 7 specialized sales agents across Voice Calls, WhatsApp, and Web.
                  Decomposes multi-intent traveler queries, checks factual packages, calculates dynamic volume pricing,
                  issues Razorpay deposit links, and strictly enforces the 20% margin guardrail.
                </p>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
                <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Active Workers</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {Object.values(supervisorConfig.agentToggles || {}).filter(Boolean).length} / 7
                  </span>
                </div>
                <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Margin Guardrail</span>
                  <span className="text-xl font-extrabold text-amber-400">≤ {supervisorConfig.marginCapPercent}% Max</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Dynamic Commercial Strategy Selector */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-lg">tune</span>
                  <span>1. Commercial Sales Strategy Modes</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Click any strategy mode below to hot-reload Kabir's negotiation style and customer guidance across all channels.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Strategy 1: High-Conversion Closer */}
              <div
                onClick={() => handleSwitchStrategy('HIGH_CONVERSION_CLOSER')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  supervisorConfig.strategyMode === 'HIGH_CONVERSION_CLOSER'
                    ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                    : 'bg-zinc-50/70 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">bolt</span>
                  </div>
                  {supervisorConfig.strategyMode === 'HIGH_CONVERSION_CLOSER' && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold uppercase">
                      Active Mode
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-zinc-900">High-Conversion Closer</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Focuses on limited bus berths, weekend urgency, verified group tier discounts, and immediate Razorpay advance deposit links.
                </p>
              </div>

              {/* Strategy 2: Consultative Guide */}
              <div
                onClick={() => handleSwitchStrategy('CONSULTATIVE_GUIDE')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  supervisorConfig.strategyMode === 'CONSULTATIVE_GUIDE'
                    ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                    : 'bg-zinc-50/70 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">sentiment_satisfied</span>
                  </div>
                  {supervisorConfig.strategyMode === 'CONSULTATIVE_GUIDE' && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold uppercase">
                      Active Mode
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-zinc-900">Consultative Guide</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Warm, advisory, story-driven approach. Focuses on campfire highlights, safety protocols, and traveler excitement before commercial closing.
                </p>
              </div>

              {/* Strategy 3: Strict Margin Protector */}
              <div
                onClick={() => handleSwitchStrategy('STRICT_MARGIN_PROTECTOR')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  supervisorConfig.strategyMode === 'STRICT_MARGIN_PROTECTOR'
                    ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                    : 'bg-zinc-50/70 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">shield</span>
                  </div>
                  {supervisorConfig.strategyMode === 'STRICT_MARGIN_PROTECTOR' && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold uppercase">
                      Active Mode
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-zinc-900">Strict Margin Protector</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Strictly protects profitability. Refuses manual discount requests, verifies group sizes before applying tiers, and guards profit margins.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Agent Swarm Control Matrix */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">hub</span>
                <span>2. Dynamic Agent Swarm Matrix</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Toggle individual agents on or off in real-time. If an agent is paused, Kabir automatically adapts and routes traffic around it.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'voice_agent', name: 'Aanya (Voice Calling)', desc: 'Speech-to-Speech Phone Calls', icon: 'record_voice_over' },
                { id: 'intake_agent', name: 'Vikram (Dynamic Intake)', desc: 'Question Qualification Flow', icon: 'how_to_reg' },
                { id: 'itinerary_agent', name: 'Rohan (Itinerary RAG)', desc: 'PostgreSQL Package Search', icon: 'find_in_page' },
                { id: 'discount_agent', name: 'Priya (Dynamic Pricing)', desc: 'Volume Tiers & Promos', icon: 'calculate' },
                { id: 'whatsapp_agent', name: 'Sameer (WhatsApp Desk)', desc: 'PDF Brochures & Follow-ups', icon: 'chat' },
                { id: 'payment_agent', name: 'Arjun (Payment Vouchers)', desc: 'Razorpay Advance Links', icon: 'payments' },
                { id: 'summary_agent', name: 'Neha (CRM Analytics)', desc: 'Intent Scoring & Dossiers', icon: 'analytics' },
              ].map((swAgent) => {
                const isEnabled = supervisorConfig.agentToggles?.[swAgent.id] ?? true;
                return (
                  <div
                    key={swAgent.id}
                    className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-base">{swAgent.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-zinc-900 truncate">{swAgent.name}</h5>
                        <p className="text-[10px] text-zinc-500 truncate">{swAgent.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSupervisorAgent(swAgent.id, isEnabled)}
                      className={`p-1 cursor-pointer transition-colors ${isEnabled ? 'text-emerald-600' : 'text-zinc-300'}`}
                      title={isEnabled ? 'Enabled (Click to Pause)' : 'Paused (Click to Enable)'}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {isEnabled ? 'toggle_on' : 'toggle_off'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Human-in-the-Loop (HITL) Alert Center */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-lg">crisis_alert</span>
                  <span>3. Human-in-the-Loop (HITL) Approval Queue</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Tripped circuit breakers when travelers ask for unapproved discounts (&gt; 20%) or large VIP corporate departures.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
                {hitlQueue.filter((i) => i.status === 'PENDING').length} Pending Review
              </span>
            </div>

            {hitlQueue.length === 0 ? (
              <div className="p-6 text-center bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="material-symbols-outlined text-2xl text-emerald-600">verified</span>
                <p className="text-xs text-zinc-600 font-bold mt-1">Zero Pending Escalations</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  All active traveler interactions comply with commercial guardrails and margin caps.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {hitlQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-extrabold uppercase">
                          {item.priority}
                        </span>
                        <span className="text-xs font-bold text-zinc-900">{item.customerName} (+{item.leadPhone})</span>
                      </div>
                      <p className="text-xs text-zinc-700">{item.reason}</p>
                      <p className="text-[10px] text-zinc-500">Action: {item.requestedAction}</p>
                    </div>

                    {item.status === 'PENDING' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResolveHitl(item.id, 'APPROVED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Approve Override
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveHitl(item.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition cursor-pointer"
                        >
                          Enforce Guardrail
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Live Master Orchestrator Simulator */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">science</span>
                <span>4. Interactive Master Multi-Intent Test Sandbox</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Type any complex omnichannel message below to observe how Kabir decomposes intents, delegates to specialists, and synthesizes a unified reply.
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                rows={2}
                value={simQuery}
                onChange={(e) => setSimQuery(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-800 leading-relaxed outline-none focus:bg-white focus:border-zinc-900 transition"
                placeholder="Type customer message..."
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  Target Lead: <strong>Sneha Rao (+919876543210)</strong>
                </span>

                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={simLoading}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {simLoading ? 'refresh' : 'play_arrow'}
                  </span>
                  <span>{simLoading ? 'Orchestrating...' : 'Run Master Simulation'}</span>
                </button>
              </div>

              {simResult && (
                <div className="mt-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <span className="text-xs font-extrabold text-zinc-900">Orchestration Trace & Execution Graph</span>
                    {simResult.hitlTriggered && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                        HITL Alert Triggered
                      </span>
                    )}
                  </div>

                  {/* Invoked Agents Chips */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Invoked Agents Swarm
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {simResult.invokedAgents?.map((ag: string) => (
                        <span
                          key={ag}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-mono font-bold"
                        >
                          {ag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step-by-Step Actions */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Actions Sequence Executed
                    </span>
                    <ul className="space-y-1">
                      {simResult.actionsTaken?.map((act: string, idx: number) => (
                        <li key={idx} className="text-xs text-zinc-700 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Synthesized Output Preview */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Synthesized Customer Response
                    </span>
                    <div className="p-3.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-800 whitespace-pre-line leading-relaxed font-sans shadow-2xs">
                      {simResult.reply}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: WORKFORCE AGENTS (Clean full-width grid of 7 Trekatour Agents)     */}
      {/* ========================================================================= */}
      {activeTab === 'workforce' && (
        <div className="space-y-6">
          {/* Quick Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-zinc-400 text-base">search</span>
              <input
                type="text"
                placeholder="Search sales agents..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-all"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Each specialized agent automates a specific phase of the Trekatour sales funnel.
            </p>
          </div>

          {/* Responsive 7-Agent Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {filteredAgents.map((agent, idx) => {
              const isActive = agentStatus[agent.id] ?? true;
              return (
                <div
                  key={agent.id}
                  className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header with Icon & Active Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
                          <span className="material-symbols-outlined text-xl">{agent.icon}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-400">Agent #{idx + 1}</span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 uppercase">
                              {agent.id === 'voice_agent' ? 'Phone Calls' : agent.id === 'whatsapp_agent' ? 'WhatsApp' : 'Workflow'}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-zinc-900">{agent.name}</h3>
                        </div>
                      </div>

                      {/* Active Status Switch */}
                      <button
                        type="button"
                        onClick={() => setAgentStatus({ ...agentStatus, [agent.id]: !isActive })}
                        className={`p-1 transition-colors cursor-pointer ${isActive ? 'text-emerald-600' : 'text-zinc-300'}`}
                        title={isActive ? 'Agent is Active' : 'Agent is Paused'}
                      >
                        <span className="material-symbols-outlined text-2xl">
                          {isActive ? 'toggle_on' : 'toggle_off'}
                        </span>
                      </button>
                    </div>

                    {/* Role Title & Description */}
                    <div>
                      <p className="text-xs font-bold text-indigo-600">{agent.roleTitle}</p>
                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{agent.description}</p>
                    </div>

                    {/* Allowed Tools Chips */}
                    <div className="pt-2 border-t border-zinc-100">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Authorized Capabilities
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {agent.allowedTools.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400">
                      {isActive ? '🟢 Live & Listening' : '⚪ Paused'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingAgent(agent)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">tune</span>
                      <span>Edit Instructions</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Agent Instructions Modal */}
          {editingAgent && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-2xl text-zinc-900">{editingAgent.icon}</span>
                    <div>
                      <h3 className="text-base font-extrabold text-zinc-900">{editingAgent.name}</h3>
                      <p className="text-xs text-zinc-500">{editingAgent.roleTitle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAgent(null)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    System Prompt & Sales Behavior Instructions
                  </label>
                  <textarea
                    rows={12}
                    value={agentPrompts[editingAgent.id] || editingAgent.systemPrompt}
                    onChange={(e) =>
                      setAgentPrompts({ ...agentPrompts, [editingAgent.id]: e.target.value })
                    }
                    className="w-full p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-800 leading-relaxed outline-none focus:bg-white focus:border-zinc-900 transition"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => {
                      setAgentPrompts({
                        ...agentPrompts,
                        [editingAgent.id]: editingAgent.systemPrompt,
                      });
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    Reset to Default
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingAgent(null);
                    }}
                    className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Save Instructions
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTAKE QUESTIONS FLOW (Omnichannel Customizer)                     */}
      {/* ========================================================================= */}
      {activeTab === 'intake' && (
        <div className="space-y-5">
          {/* Header & Control Bar */}
          <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">alt_route</span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">Omnichannel Lead Qualification Flow</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Questions asked sequentially by Aanya (Voice Calls) and WhatsApp Chat to qualify travelers and build customer profiles.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddIntakeQuestion}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Add Question Step</span>
              </button>
            </div>
          </div>

          {/* Status Message Notification */}
          {intakeMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                intakeMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {intakeMsg.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{intakeMsg.text}</span>
            </div>
          )}

          {/* Main 2-Column Builder Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Sequence of Questions (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Steps Sequence ({intakeQuestions.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Click card to edit</span>
              </div>

              {loadingIntake ? (
                <div className="p-8 text-center bg-white border border-zinc-200 rounded-2xl">
                  <p className="text-xs text-zinc-500">Loading intake questions...</p>
                </div>
              ) : (
                intakeQuestions.map((q, idx) => {
                  const isSelected = q.id === (currentIntakeQ?.id || '');
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedIntakeId(q.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-50/40 border-indigo-600 shadow-xs ring-1 ring-indigo-600/20'
                          : 'bg-white border-zinc-200/80 hover:border-zinc-300 shadow-2xs'
                      } ${!q.isActive ? 'opacity-60 bg-zinc-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-extrabold flex items-center justify-center">
                            {q.stepOrder || idx + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-zinc-900">{q.fieldKey}</span>
                          {q.isMandatory && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-600 border border-rose-200">
                              Required
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 uppercase">
                            {q.validationType}
                          </span>

                          {/* Reorder Buttons */}
                          <button
                            type="button"
                            title="Move Earlier"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderIntake(idx, 'up');
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-800 disabled:opacity-25"
                          >
                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            title="Move Later"
                            disabled={idx === intakeQuestions.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderIntake(idx, 'down');
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-800 disabled:opacity-25"
                          >
                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                          </button>

                          {/* Toggle Active Switch */}
                          <button
                            type="button"
                            title={q.isActive ? 'Active (Click to disable)' : 'Disabled (Click to enable)'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleIntakeActive(q.id, q.isActive);
                            }}
                            className={`p-1 ${q.isActive ? 'text-emerald-600' : 'text-zinc-400'}`}
                          >
                            <span className="material-symbols-outlined text-base">
                              {q.isActive ? 'toggle_on' : 'toggle_off'}
                            </span>
                          </button>

                          {/* Delete Button */}
                          {intakeQuestions.length > 1 && (
                            <button
                              type="button"
                              title="Delete question"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteIntakeQuestion(q.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-600"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-600 line-clamp-2 italic bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100">
                        "{q.questionPrompt}"
                      </p>

                      {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {q.options.slice(0, 4).map((opt) => (
                            <span
                              key={opt}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-600"
                            >
                              {opt}
                            </span>
                          ))}
                          {q.options.length > 4 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 text-zinc-400">
                              +{q.options.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Step Property Editor (7 cols) */}
            <div className="lg:col-span-7">
              {currentIntakeQ ? (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
                        #{currentIntakeQ.stepOrder}
                      </span>
                      <h4 className="text-sm font-extrabold text-zinc-900">
                        Configure Step: <span className="font-mono text-indigo-600">{currentIntakeQ.fieldKey}</span>
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveIntakeQuestion}
                      disabled={savingIntake}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base">
                        {savingIntake ? 'refresh' : 'save'}
                      </span>
                      <span>{savingIntake ? 'Saving...' : 'Save Step'}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Field Key & Validation Type Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Field Key (Database Identifier)
                        </label>
                        <input
                          type="text"
                          value={currentIntakeQ.fieldKey}
                          onChange={(e) => handleUpdateIntakeField('fieldKey', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-mono text-zinc-800 outline-none focus:bg-white focus:border-zinc-900 transition"
                          placeholder="e.g. destination, group_size"
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">Used to store value in Customer Profile</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">Validation Rule</label>
                        <select
                          value={currentIntakeQ.validationType}
                          onChange={(e) => handleUpdateIntakeField('validationType', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-900 transition"
                        >
                          <option value="TEXT">TEXT — Free Natural Text</option>
                          <option value="ENUM">ENUM — Multiple Choice / Quick Reply Buttons</option>
                          <option value="NUMBER">NUMBER — Positive Integer (Group Size, Age)</option>
                          <option value="CURRENCY">CURRENCY — Budget Amount (₹ INR)</option>
                          <option value="DATE">DATE — Date Range / Weekend Timing</option>
                          <option value="PHONE">PHONE — Contact Phone Number</option>
                          <option value="EMAIL">EMAIL — Email Address</option>
                        </select>
                        <p className="text-[10px] text-zinc-400 mt-1">Automated validation before saving answer</p>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Question Prompt (Spoken on Voice Calls & Sent in WhatsApp)
                      </label>
                      <textarea
                        rows={3}
                        value={currentIntakeQ.questionPrompt}
                        onChange={(e) => handleUpdateIntakeField('questionPrompt', e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-800 leading-relaxed outline-none focus:bg-white focus:border-zinc-900 transition"
                        placeholder="e.g. Which destination are you planning to explore with Trekatour?"
                      />
                    </div>

                    {/* Options Editor for ENUM */}
                    {currentIntakeQ.validationType === 'ENUM' && (
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                        <label className="block text-xs font-bold text-zinc-700">
                          Choice Options (Comma separated)
                        </label>
                        <input
                          type="text"
                          value={
                            Array.isArray(currentIntakeQ.options)
                              ? currentIntakeQ.options.join(', ')
                              : String(currentIntakeQ.options || '')
                          }
                          onChange={(e) => {
                            const list = e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean);
                            handleUpdateIntakeField('options', list);
                          }}
                          className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-zinc-900"
                          placeholder="e.g. Gokarna, Pondicherry, Coorg, Manali"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(Array.isArray(currentIntakeQ.options) ? currentIntakeQ.options : []).map((opt) => (
                            <span
                              key={opt}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 shadow-2xs"
                            >
                              • {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Checkboxes Row */}
                    <div className="flex items-center gap-6 pt-2 border-t border-zinc-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentIntakeQ.isMandatory}
                          onChange={(e) => handleUpdateIntakeField('isMandatory', e.target.checked)}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-700">Mandatory / Required</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentIntakeQ.isSkippable}
                          onChange={(e) => handleUpdateIntakeField('isSkippable', e.target.checked)}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-zinc-600">User Can Skip</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentIntakeQ.isActive}
                          onChange={(e) => handleUpdateIntakeField('isActive', e.target.checked)}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-emerald-700">Active in Workflow</span>
                      </label>
                    </div>

                    {/* Live Omnichannel Preview Box */}
                    <div className="p-4 rounded-xl bg-zinc-900 text-white space-y-2 mt-4">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-emerald-400">chat</span>
                          <span>WhatsApp Chat & Voice Preview</span>
                        </span>
                        <span className="text-emerald-400 font-mono">Channel-Ready</span>
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-200">
                        "{currentIntakeQ.questionPrompt}"
                      </p>
                      {currentIntakeQ.validationType === 'ENUM' &&
                        Array.isArray(currentIntakeQ.options) &&
                        currentIntakeQ.options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {currentIntakeQ.options.map((opt) => (
                              <span
                                key={opt}
                                className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-emerald-300 border border-zinc-700"
                              >
                                [{opt}]
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white border border-zinc-200 rounded-2xl">
                  <p className="text-xs text-zinc-500">Select a question step from the left to edit its properties.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRIP KNOWLEDGE & FAQS (Clean Trekatour Itineraries & Policies)     */}
      {/* ========================================================================= */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-zinc-400 text-base">search</span>
              <input
                type="text"
                placeholder="Search trip packages & FAQs..."
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddKbModal(true)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Add Trip Itinerary / FAQ</span>
            </button>
          </div>

          {/* Knowledge Cards Grid */}
          {loadingKb ? (
            <div className="p-12 text-center bg-white border border-zinc-200 rounded-2xl">
              <p className="text-xs text-zinc-500">Loading trip knowledge base...</p>
            </div>
          ) : filteredKb.length === 0 ? (
            <div className="p-12 text-center bg-white border border-zinc-200 rounded-2xl space-y-3">
              <span className="material-symbols-outlined text-3xl text-zinc-400">library_books</span>
              <p className="text-sm font-bold text-zinc-800">No Trip Knowledge Items Found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Add trip packages (Gokarna, Pondicherry, Coorg) and FAQs so Itinerary Agent and Aanya can answer travelers accurately.
              </p>
              <button
                type="button"
                onClick={() => setShowAddKbModal(true)}
                className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                Add First Trip Package
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredKb.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                        {item.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteKbItem(item.id)}
                        className="text-zinc-400 hover:text-rose-600 p-1"
                        title="Delete item"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>

                    <h4 className="text-sm font-extrabold text-zinc-900">{item.title}</h4>
                    <p className="text-xs text-zinc-600 line-clamp-4 leading-relaxed">{item.content}</p>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Verified Knowledge</span>
                    <span className="text-emerald-600 font-bold">● Active in RAG</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Knowledge Modal */}
          {showAddKbModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <form
                onSubmit={handleAddKbItem}
                className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-sm font-extrabold text-zinc-900">Add Trip Package / FAQ</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddKbModal(false)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gokarna 3-Day Beach Trek & Camping Itinerary"
                      value={newKbTitle}
                      onChange={(e) => setNewKbTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                    <select
                      value={newKbCategory}
                      onChange={(e) => setNewKbCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-900 outline-none focus:bg-white focus:border-zinc-900"
                    >
                      <option value="FAQ">FAQ — General Inquiries & Travel Advice</option>
                      <option value="PRODUCT_SPEC">TRIP ITINERARY — Destination Inclusions & Schedule</option>
                      <option value="PRICING_POLICY">PRICING POLICY — Group Rates & Inclusions</option>
                      <option value="SALES_PLAYBOOK">SALES PLAYBOOK — Objection Handling & Guidelines</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Content Details</label>
                    <textarea
                      rows={6}
                      required
                      placeholder="Paste day-by-day itinerary, inclusions (travel, stay, food, activities), and pricing breakdown..."
                      value={newKbContent}
                      onChange={(e) => setNewKbContent(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 leading-relaxed outline-none focus:bg-white focus:border-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowAddKbModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingKb}
                    className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {addingKb ? 'Adding...' : 'Save Knowledge'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WHATSAPP & GOOGLE SHEETS HUB                                       */}
      {/* ========================================================================= */}
      {activeTab === 'connections' && (
        <div className="space-y-6">
          {/* Feedback Toasts */}
          {waFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                waFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {waFeedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{waFeedback.text}</span>
            </div>
          )}

          {sheetsFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                sheetsFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {sheetsFeedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{sheetsFeedback.text}</span>
            </div>
          )}

          {/* Section 1: Dual WhatsApp Connection Modes */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">chat</span>
                  <span>1. Dual WhatsApp Connection Modes</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Select between free direct socket session, official Meta WABA / Wabafy Cloud API, or Smart Hybrid routing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold">
                  Active: <strong className="text-zinc-900">{waConfig.activeProvider}</strong>
                </span>
              </div>
            </div>

            {/* Provider Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Mode A: Smart Hybrid */}
              <div
                onClick={() => {
                  setWaConfig({ ...waConfig, activeProvider: 'SMART_HYBRID' });
                  handleSaveWhatsAppSettings({ activeProvider: 'SMART_HYBRID' });
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  waConfig.activeProvider === 'SMART_HYBRID'
                    ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">alt_route</span>
                  </div>
                  {waConfig.activeProvider === 'SMART_HYBRID' && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold uppercase">
                      Recommended
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900">Smart Hybrid Mode</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Baileys for sales conversations + Meta WABA for official booking confirmation vouchers &amp; bus departure alerts.
                  </p>
                </div>
              </div>

              {/* Mode B: Baileys Direct */}
              <div
                onClick={() => {
                  setWaConfig({ ...waConfig, activeProvider: 'BAILEYS' });
                  handleSaveWhatsAppSettings({ activeProvider: 'BAILEYS' });
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  waConfig.activeProvider === 'BAILEYS'
                    ? 'bg-emerald-50/60 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                  </div>
                  {waConfig.activeProvider === 'BAILEYS' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900">Baileys Direct Socket</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Zero per-message Meta fees. Unlimited conversational chat with human-like typing and personal touch.
                  </p>
                </div>
              </div>

              {/* Mode C: Meta WABA / Wabafy */}
              <div
                onClick={() => {
                  setWaConfig({ ...waConfig, activeProvider: 'META_WABA' });
                  handleSaveWhatsAppSettings({ activeProvider: 'META_WABA' });
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  waConfig.activeProvider === 'META_WABA'
                    ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">verified</span>
                  </div>
                  {waConfig.activeProvider === 'META_WABA' && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900">Meta WABA / Wabafy API</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Official Meta Cloud API or Wabafy Direct API. Verified Green Tick account, approved HSM broadcast templates, 100% ban immune.
                  </p>
                </div>
              </div>
            </div>

            {/* Meta WABA Credentials Drawer */}
            <div className="bg-zinc-50/80 border border-zinc-200/80 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-extrabold text-zinc-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-base">key</span>
                <span>Official Meta WABA &amp; Wabafy API Configuration</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 104829105829102"
                    value={waConfig.metaConfig?.phoneNumberId || ''}
                    onChange={(e) =>
                      setWaConfig({
                        ...waConfig,
                        metaConfig: { ...waConfig.metaConfig, phoneNumberId: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    Access Token / Wabafy Key
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer EAA... or X-Wabafy-Api-Key"
                    value={waConfig.metaConfig?.accessToken || ''}
                    onChange={(e) =>
                      setWaConfig({
                        ...waConfig,
                        metaConfig: { ...waConfig.metaConfig, accessToken: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    WABA Business Account ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 948291048102948"
                    value={waConfig.metaConfig?.wabaId || ''}
                    onChange={(e) =>
                      setWaConfig({
                        ...waConfig,
                        metaConfig: { ...waConfig.metaConfig, wabaId: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    Webhook Verification Token
                  </label>
                  <input
                    type="text"
                    placeholder="trekatour_waba_verify_2026"
                    value={waConfig.metaConfig?.webhookVerifyToken || ''}
                    onChange={(e) =>
                      setWaConfig({
                        ...waConfig,
                        metaConfig: { ...waConfig.metaConfig, webhookVerifyToken: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-zinc-500">
                  Webhook Callback URL: <code className="bg-zinc-200/60 px-1.5 py-0.5 rounded text-zinc-800 font-mono">/api/webhooks/whatsapp-meta</code>
                </p>
                <button
                  type="button"
                  onClick={() => handleSaveWhatsAppSettings()}
                  disabled={savingWa}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>{savingWa ? 'Saving...' : 'Save Meta Credentials'}</span>
                </button>
              </div>
            </div>

            {/* Test Message Dispatcher */}
            <div className="border-t border-zinc-100 pt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="text"
                placeholder="Test Phone (+91...)"
                value={waTestPhone}
                onChange={(e) => setWaTestPhone(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-900"
              />
              <input
                type="text"
                placeholder="Test message text..."
                value={waTestMsg}
                onChange={(e) => setWaTestMsg(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-900"
              />
              <button
                type="button"
                onClick={handleSendTestWaMessage}
                disabled={sendingWaTest}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>{sendingWaTest ? 'Sending...' : 'Send Live Test'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Google Sheets Bi-Directional Synchronization */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">table_chart</span>
                  <span>2. Google Sheets Bi-Directional Synchronization</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Mirrors all qualified leads, pricing quotes, payment statuses, and vouchers into Google Sheets in real-time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncGoogleSheetsNow}
                  disabled={syncingSheets}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">
                    {syncingSheets ? 'sync' : 'cloud_upload'}
                  </span>
                  <span>{syncingSheets ? 'Syncing...' : 'Sync Leads Now'}</span>
                </button>
              </div>
            </div>

            {/* Sheets Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Google Spreadsheet ID or URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgm..."
                  value={sheetsConfig.spreadsheetId || ''}
                  onChange={(e) =>
                    setSheetsConfig({ ...sheetsConfig, spreadsheetId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Active Sheet Tab Name
                </label>
                <input
                  type="text"
                  placeholder="Leads 2026"
                  value={sheetsConfig.sheetTabName || ''}
                  onChange={(e) =>
                    setSheetsConfig({ ...sheetsConfig, sheetTabName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Google Sheets API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={sheetsConfig.apiKey || ''}
                  onChange={(e) =>
                    setSheetsConfig({ ...sheetsConfig, apiKey: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-900"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleSaveGoogleSheetsSettings()}
                  disabled={savingSheets}
                  className="w-full px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>{savingSheets ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>

            {/* Sync Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsConfig.syncEnabled}
                  onChange={(e) =>
                    setSheetsConfig({ ...sheetsConfig, syncEnabled: e.target.checked })
                  }
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-zinc-800">Enable Google Sheets Sync</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsConfig.autoSyncOnLeadChange}
                  onChange={(e) =>
                    setSheetsConfig({ ...sheetsConfig, autoSyncOnLeadChange: e.target.checked })
                  }
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-zinc-800">Auto-Sync on Lead Update</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsConfig.twoWayWriteBackEnabled}
                  onChange={(e) =>
                    setSheetsConfig({ ...sheetsConfig, twoWayWriteBackEnabled: e.target.checked })
                  }
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-zinc-800">Two-Way Sheet Write-Back</span>
              </label>
            </div>

            {/* Synced Table Matrix Preview */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-zinc-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-zinc-500">visibility</span>
                  <span>Google Sheet Synced Leads Preview ({sheetsPreview.rows?.length || 0} rows)</span>
                </span>
                {sheetsConfig.lastSyncedAt && (
                  <span className="text-[10px] text-zinc-500">
                    Last Synced: {new Date(sheetsConfig.lastSyncedAt).toLocaleTimeString('en-IN')}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-72">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-zinc-100/90 text-zinc-700 font-bold border-b border-zinc-200 sticky top-0">
                    <tr>
                      {sheetsPreview.headers?.map((h: string, i: number) => (
                        <th key={i} className="px-3 py-2 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {sheetsPreview.rows?.length > 0 ? (
                      sheetsPreview.rows.slice(0, 15).map((row: string[], rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-zinc-50/80 transition">
                          {row.map((cell: string, cIdx: number) => (
                            <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-zinc-700">
                              {cIdx === 8 ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {cell}
                                </span>
                              ) : cIdx === 9 ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    cell === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {cell}
                                </span>
                              ) : (
                                cell
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={sheetsPreview.headers?.length || 10}
                          className="px-4 py-8 text-center text-zinc-400"
                        >
                          No synced rows yet. Click "Sync Leads Now" above to populate your Google Sheet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
