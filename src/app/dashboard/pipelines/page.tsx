'use client';

import React, { useState, useEffect, useCallback } from 'react';

/* --------------------------------- Types -------------------------------- */
interface StageConfig {
  id: string;
  name: string;
  probability: number;
  stageType: 'open' | 'won' | 'lost';
  color: string;
  position?: number;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault?: boolean;
  stages: StageConfig[];
}

interface DealCard {
  id: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: number;
  currency?: string;
  status?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  contactWaNumber?: string;
  contactNumber?: string;
  contactName?: string;
  expectedCloseDate?: string;
  notes?: string;
  shippingState?: string;
  bmi?: number;
  clinicalStatus?: string;
  orderCount?: number;
  createdAt?: string;
}

interface Metrics {
  totalDeals: number;
  pipelineValue: number;
  avgDealSize: number;
  weightedValue: number;
  wonThisMonth: number;
  lostThisMonth: number;
}

const fmtMoney = (n: number) => {
  return `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
};

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [deals, setDeals] = useState<DealCard[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown states
  const [pipeSelectOpen, setPipeSelectOpen] = useState(false);

  // Modals state
  const [dealModal, setDealModal] = useState<{ deal: DealCard | null; defaultStageId: string } | null>(null);
  const [pipelineModal, setPipelineModal] = useState<{ mode: 'create' | 'rename' } | null>(null);
  const [stagesModal, setStagesModal] = useState(false);

  // Lead detail drawer state
  const [selectedLead, setSelectedLead] = useState<DealCard | null>(null);

  // Drag and Drop State
  const [draggedDeal, setDraggedDeal] = useState<DealCard | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0] || null;

  // Fetch pipeline data
  const loadPipelineData = useCallback(async (targetId?: string) => {
    try {
      setUpdating(true);
      const url = targetId ? `/api/bot/pipelines?pipelineId=${targetId}` : '/api/bot/pipelines';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPipelines(data.pipelines || []);
        const activeId = targetId || data.selectedPipelineId || data.pipelines[0]?.id || null;
        setSelectedPipelineId(activeId);
        setStages(data.stages || []);
        setDeals(data.deals || []);
        setMetrics(data.metrics || null);
      }
    } catch (e) {
      console.error('Failed to load pipelines data:', e);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    loadPipelineData();
  }, [loadPipelineData]);

  // Handle Drag & Drop move
  const handleDropToStage = async (stageId: string) => {
    setDragOverStageId(null);
    const deal = draggedDeal;
    setDraggedDeal(null);
    if (!deal || deal.stageId === stageId) return;

    // Optimistic UI move
    setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stageId } : d)));

    try {
      const res = await fetch('/api/bot/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move-deal', dealId: deal.id, stageId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert('Failed to move stage');
        loadPipelineData(selectedPipelineId || undefined);
      } else {
        loadPipelineData(selectedPipelineId || undefined);
      }
    } catch (e) {
      console.error('Failed to move stage:', e);
      loadPipelineData(selectedPipelineId || undefined);
    }
  };

  const filteredDeals = deals.filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.title.toLowerCase().includes(term) ||
      (d.contactName && d.contactName.toLowerCase().includes(term)) ||
      (d.assignedUserName && d.assignedUserName.toLowerCase().includes(term)) ||
      (d.contactNumber && d.contactNumber.includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-zinc-500 font-sans">
        <span className="material-symbols-outlined animate-spin text-3xl text-zinc-900 mr-3">sync</span>
        <span className="font-semibold text-xs">Loading Sales Velocity Pipelines...</span>
      </div>
    );
  }

  return (
    <main id="section-pipelines" className="flex-1 overflow-hidden p-6 sm:p-8 flex flex-col relative h-full text-zinc-900 bg-transparent font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 shrink-0 pb-4 border-b border-zinc-200">
        <div>
          <div className="inline-flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
              KANBAN VELOCITY
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              AUTOMATED CLOSING
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
            Sales & Deal Velocity Pipelines
          </h1>
          <p className="text-xs text-zinc-500 font-normal mt-0.5">
            Multi-pipeline deal stages, drag-and-drop progression, and automated voice closing.
          </p>
        </div>

        {/* Pipeline Controls & Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedPipeline && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPipeSelectOpen((o) => !o)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-all cursor-pointer shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{selectedPipeline.name}</span>
                <span className="material-symbols-outlined text-sm text-zinc-400">expand_more</span>
              </button>

              {pipeSelectOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPipeSelectOpen(false)} />
                  <div className="absolute top-11 right-0 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 py-1.5 space-y-0.5 font-sans">
                    {pipelines.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPipelineId(p.id);
                          setPipeSelectOpen(false);
                          loadPipelineData(p.id);
                        }}
                        className={`px-4 py-2.5 text-xs cursor-pointer flex items-center justify-between hover:bg-zinc-50 transition-colors ${
                          p.id === selectedPipelineId ? 'font-bold text-zinc-900 bg-zinc-50' : 'text-zinc-600'
                        }`}
                      >
                        <span>{p.name}</span>
                        {p.isDefault && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                            DEFAULT
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStagesModal(true)}
            className="px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span className="material-symbols-outlined text-sm text-zinc-500">view_column</span>
            <span>Stages</span>
          </button>

          <button
            type="button"
            onClick={() => setPipelineModal({ mode: 'create' })}
            className="px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span className="material-symbols-outlined text-sm text-zinc-500">add</span>
            <span>New Pipeline</span>
          </button>

          <button
            type="button"
            onClick={() => setDealModal({ deal: null, defaultStageId: stages[0]?.id || '' })}
            className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {/* Compact 4-Metric Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5 shrink-0">
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Pipeline Value</span>
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight mt-0.5 block font-mono">
              {fmtMoney(metrics?.pipelineValue || 0)}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Revenue
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">payments</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Active Deals</span>
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight mt-0.5 block font-mono">
              {metrics?.totalDeals ?? deals.length}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> In Progress
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">view_kanban</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Avg Deal Size</span>
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight mt-0.5 block font-mono">
              {fmtMoney(metrics?.avgDealSize || 0)}
            </span>
            <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Per Opportunity
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">trending_up</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Won Deals</span>
            <span className="text-xl font-extrabold text-emerald-700 tracking-tight mt-0.5 block font-mono">
              {metrics?.wonThisMonth ?? 0}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Closed This Month
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">verified</span>
          </div>
        </div>
      </div>

      {/* Toolbar Search Input */}
      <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2 text-zinc-400 text-base">search</span>
          <input
            type="text"
            placeholder="Search deals, contacts, or reps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-900 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
          <span>{filteredDeals.length} deals shown</span>
        </div>
      </div>

      {/* Drag & Drop Kanban Grid */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-0 items-start">
        {stages.map((stage) => {
          const stageDeals = filteredDeals.filter((d) => d.stageId === stage.id);
          const totalVal = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
          const isOver = dragOverStageId === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStageId(stage.id);
              }}
              onDragLeave={() => setDragOverStageId((curr) => (curr === stage.id ? null : curr))}
              onDrop={() => handleDropToStage(stage.id)}
              className={`w-[300px] shrink-0 bg-white border rounded-2xl flex flex-col max-h-full transition-all shadow-2xs ${
                isOver ? 'border-zinc-900 ring-2 ring-zinc-900/10 scale-[1.01]' : 'border-zinc-200/80'
              }`}
              style={{ borderTop: `3px solid ${stage.color || '#18181b'}` }}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-zinc-100 bg-zinc-50/50 rounded-t-2xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-zinc-900 tracking-tight">{stage.name}</span>
                  <span className="text-[10px] font-bold bg-white border border-zinc-200 px-2 py-0.5 rounded-full text-zinc-600 shadow-2xs">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                  <span className="font-mono font-semibold text-zinc-800">{fmtMoney(totalVal)}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                    {stage.probability}% win
                  </span>
                </div>
              </div>

              {/* Deals List */}
              <div className="p-2.5 overflow-y-auto flex-1 min-h-[160px] space-y-2.5 custom-scrollbar">
                {stageDeals.length === 0 ? (
                  <div
                    className={`p-6 text-center text-xs text-zinc-400 italic border border-dashed rounded-xl transition-all ${
                      isOver ? 'border-zinc-900 bg-zinc-100/50 text-zinc-700' : 'border-zinc-200'
                    }`}
                  >
                    Drop deal card here
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => setDraggedDeal(deal)}
                      onClick={() => setSelectedLead(deal)}
                      className="bg-white border border-zinc-200/80 hover:border-zinc-400 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all space-y-2.5 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {deal.title}
                        </span>
                        <span className="material-symbols-outlined text-sm text-zinc-400 shrink-0 cursor-grab opacity-60 group-hover:opacity-100">
                          drag_indicator
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-900 font-mono">{fmtMoney(deal.value)}</span>
                        {deal.assignedUserName && (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-md">
                            {deal.assignedUserName}
                          </span>
                        )}
                      </div>

                      {deal.contactName && (
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium pt-1 border-t border-zinc-100">
                          <span className="material-symbols-outlined text-xs text-zinc-400">person</span>
                          <span className="truncate">{deal.contactName}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Column Footer */}
              <div className="p-2 border-t border-zinc-100 bg-zinc-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setDealModal({ deal: null, defaultStageId: stage.id })}
                  className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-white font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-zinc-400">add</span>
                  <span>Add Deal</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Lead Drawer Overlay */}
      <div
        id="lead-drawer"
        className={`fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white border-l border-zinc-200 shadow-2xl z-50 transform transition-all duration-300 ease-in-out flex flex-col ${
          selectedLead ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedLead && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {(selectedLead.contactName || selectedLead.title)[0]}
                </div>
                <div>
                  <h4 className="font-extrabold text-zinc-900 text-sm">{selectedLead.contactName || selectedLead.title}</h4>
                  <p className="text-xs text-zinc-500 font-mono">{selectedLead.contactNumber || '—'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
                title="Close details"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-zinc-900 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Deal Value</span>
                  <span className="text-base font-bold text-zinc-900 font-mono">{fmtMoney(selectedLead.value)}</span>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Current Stage</span>
                  <span className="text-xs font-bold text-zinc-900">
                    {stages.find((s) => s.id === selectedLead.stageId)?.name || selectedLead.stageId}
                  </span>
                </div>
              </div>

              {/* Lead Attributes */}
              <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Enterprise Deal Specs</h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Target Latency:</span>
                    <span className="font-semibold text-zinc-800">&lt;120ms Voice AI</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Location:</span>
                    <span className="font-semibold text-zinc-800">{selectedLead.shippingState || 'Telangana / Hyderabad'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Assigned Agent:</span>
                    <span className="font-semibold text-zinc-800">{selectedLead.assignedUserName || 'Voice AI Rep'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Expected Close:</span>
                    <span className="text-zinc-700">{selectedLead.expectedCloseDate || '—'}</span>
                  </div>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-1.5">
                  <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">AI Call Summary & Notes</h5>
                  <p className="text-xs text-zinc-600 leading-relaxed">{selectedLead.notes}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Verify Enterprise invoice payment for deal #${selectedLead.id}? This will auto-issue the API token.`)) return;
                    try {
                      const res = await fetch('/api/bot/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'verify-payment', orderId: selectedLead.id }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert(`✅ ${data.message}`);
                        setSelectedLead(null);
                        loadPipelineData(selectedPipelineId || undefined);
                      } else alert(data.error || 'Failed');
                    } catch (e) {
                      alert('Verification failed');
                    }
                  }}
                  className="w-full py-2.5 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Verify Payment ✅</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const agentModel = window.prompt('Enter Deployed Custom LLM Instance Name (e.g. Llama-3-Sales-FineTune, Gemini-1.5-Pro):', 'Llama-3-Sales-FineTune');
                    if (!agentModel) return;
                    const trackingId = window.prompt(`Enter Instance Deployment ID for deal #${selectedLead.id}:`, 'AGY-DEPLOY-9084');
                    if (!trackingId) return;

                    try {
                      const res = await fetch('/api/bot/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'mark-dispatched', orderId: selectedLead.id, courierName: agentModel, trackingAwb: trackingId }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert(`📦 ${data.message}`);
                        setSelectedLead(null);
                        loadPipelineData(selectedPipelineId || undefined);
                      } else alert(data.error || 'Failed');
                    } catch (e) {
                      alert('Deployment update failed');
                    }
                  }}
                  className="w-full py-2.5 bg-zinc-900 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  <span>Deploy Custom LLM Agent Instance 📦</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const editDeal = selectedLead;
                    setSelectedLead(null);
                    setDealModal({ deal: editDeal, defaultStageId: editDeal.stageId });
                  }}
                  className="w-full py-2.5 bg-white border border-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm text-zinc-500">edit</span>
                  <span>Edit Deal Details</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const targetStage = stages.find((s) => s.name.toLowerCase().includes('demo') || s.name.toLowerCase().includes('qualified'));
                    if (targetStage) {
                      await handleDropToStage(targetStage.id);
                      setSelectedLead(null);
                    }
                  }}
                  className="w-full py-2.5 bg-zinc-100 border border-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl hover:bg-zinc-200/70 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm text-zinc-600">graphic_eq</span>
                  <span>Dispatch AI Voice Call</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {dealModal && (
        <DealModal
          deal={dealModal.deal}
          defaultStageId={dealModal.defaultStageId}
          pipelineId={selectedPipelineId || ''}
          stages={stages}
          onClose={() => setDealModal(null)}
          onSaved={() => {
            setDealModal(null);
            loadPipelineData(selectedPipelineId || undefined);
          }}
        />
      )}

      {pipelineModal && (
        <PipelineModal
          mode={pipelineModal.mode}
          currentPipeline={pipelineModal.mode === 'rename' ? selectedPipeline : null}
          onClose={() => setPipelineModal(null)}
          onSaved={(newId) => {
            setPipelineModal(null);
            loadPipelineData(newId);
          }}
        />
      )}

      {stagesModal && selectedPipeline && (
        <StagesModal
          pipelineId={selectedPipeline.id}
          pipelineName={selectedPipeline.name}
          initialStages={stages}
          onClose={() => setStagesModal(false)}
          onChanged={() => loadPipelineData(selectedPipeline.id)}
        />
      )}
    </main>
  );
}

/* ------------------------------- DealModal -------------------------------- */
function DealModal({
  deal,
  defaultStageId,
  pipelineId,
  stages,
  onClose,
  onSaved,
}: {
  deal: DealCard | null;
  defaultStageId: string;
  pipelineId: string;
  stages: StageConfig[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!deal;
  const [form, setForm] = useState({
    title: deal?.title || '',
    value: deal?.value ?? 45000,
    stageId: deal?.stageId || defaultStageId || stages[0]?.id || '',
    assignedUserId: deal?.assignedUserId || 'agent-1',
    contactWaNumber: deal?.contactWaNumber || '',
    contactNumber: deal?.contactNumber || '',
    contactName: deal?.contactName || '',
    expectedCloseDate: deal?.expectedCloseDate ? String(deal.expectedCloseDate).slice(0, 10) : '',
    notes: deal?.notes || '',
  });

  const [saving, setSaving] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<any[]>([]);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!contactQuery.trim()) {
      setContactResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/bot/pipelines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'search-contacts', query: contactQuery }),
        });
        const data = await res.json();
        if (data.success) setContactResults(data.contacts || []);
      } catch (e) {
        setContactResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [contactQuery]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('Deal title is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/bot/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-deal',
          dealId: deal?.id,
          pipelineId,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        alert(data.error || 'Save failed');
      }
    } catch (e) {
      alert('Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deal) return;
    if (!window.confirm(`Delete deal "${deal.title}"?`)) return;
    try {
      const res = await fetch('/api/bot/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-deal', dealId: deal.id }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else alert(data.error || 'Delete failed');
    } catch (e) {
      alert('Delete failed');
    }
  };

  return (
    <ModalShell title={editing ? 'Edit Sales Deal' : 'New Enterprise Sales Deal'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Title</label>
          <input
            type="text"
            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Acme Corp - Custom Fine-Tuned Llama-3 Voice Agent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Value (₹)</label>
            <input
              type="number"
              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400 font-mono"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Stage</label>
            <select
              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400 cursor-pointer"
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value })}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linked Contact */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Linked Lead Contact (Optional)</label>
          {form.contactName || form.contactNumber ? (
            <div className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
              <span className="font-bold text-zinc-800">{form.contactName || form.contactNumber}</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, contactWaNumber: '', contactNumber: '', contactName: '' })}
                className="text-rose-500 font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400"
                placeholder="Search contacts by name or phone..."
                value={contactQuery}
                onFocus={() => setContactOpen(true)}
                onChange={(e) => {
                  setContactQuery(e.target.value);
                  setContactOpen(true);
                }}
              />
              {contactOpen && contactResults.length > 0 && (
                <div className="absolute top-11 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto py-1">
                  {contactResults.map((c, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setForm({
                          ...form,
                          contactWaNumber: c.waNumber,
                          contactNumber: c.contactNumber,
                          contactName: c.name,
                        });
                        setContactOpen(false);
                      }}
                      className="px-3.5 py-2 text-xs hover:bg-zinc-50 cursor-pointer flex justify-between"
                    >
                      <span className="font-semibold text-zinc-900">{c.name}</span>
                      <span className="text-zinc-500">{c.contactNumber}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Expected Close</label>
            <input
              type="date"
              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400"
              value={form.expectedCloseDate}
              onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Assigned Rep / Agent</label>
            <select
              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400 cursor-pointer"
              value={form.assignedUserId}
              onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}
            >
              <option value="agent-1">AI Voice Agent (Alpha)</option>
              <option value="agent-2">WhatsApp Automation Bot</option>
              <option value="exec-1">Enterprise Account Executive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Notes</label>
          <textarea
            rows={3}
            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400"
            placeholder="Enterprise technical requirements, RAG dataset scope, custom LLM fine-tuning details..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-200">
        {editing ? (
          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
          >
            Delete
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all shadow-xs"
          >
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Deal'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------- PipelineModal ------------------------------ */
function PipelineModal({
  mode,
  currentPipeline,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'rename';
  currentPipeline: Pipeline | null;
  onClose: () => void;
  onSaved: (newId?: string) => void;
}) {
  const [name, setName] = useState(currentPipeline?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const action = mode === 'rename' ? 'rename-pipeline' : 'create-pipeline';
      const res = await fetch('/api/bot/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pipelineId: currentPipeline?.id, name: name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.pipeline?.id);
      } else {
        alert(data.error || 'Failed to save pipeline');
      }
    } catch (e) {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={mode === 'rename' ? 'Rename Pipeline' : 'New Sales Pipeline'} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Pipeline Name</label>
        <input
          type="text"
          className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:border-zinc-400"
          placeholder="e.g. Enterprise AI Sales Pipeline"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {mode === 'create' && (
          <p className="text-xs text-zinc-500">
            Starts with standard AI sales stages (New Intake → AI Voice Qualified → Demo Scheduled → RAG Audit → Contract Sent → Closed Won).
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all shadow-xs"
        >
          {saving ? 'Saving...' : 'Save Pipeline'}
        </button>
      </div>
    </ModalShell>
  );
}

/* ------------------------------- StagesModal ------------------------------ */
function StagesModal({
  pipelineId,
  pipelineName,
  initialStages,
  onClose,
  onChanged,
}: {
  pipelineId: string;
  pipelineName: string;
  initialStages: StageConfig[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [stagesList, setStagesList] = useState<StageConfig[]>(initialStages);
  const [busy, setBusy] = useState(false);

  const saveStageRow = async (stg: StageConfig) => {
    setBusy(true);
    try {
      const res = await fetch('/api/bot/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-stage',
          pipelineId,
          stageId: stg.id,
          name: stg.name,
          probability: stg.probability,
          color: stg.color,
          stageType: stg.stageType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.stages) setStagesList(data.stages);
        onChanged();
      } else alert(data.error || 'Save failed');
    } catch (e) {
      alert('Save failed');
    } finally {
      setBusy(false);
    }
  };

  const addStageRow = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/bot/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-stage',
          pipelineId,
          name: 'New Stage',
          probability: 50,
          color: '#18181b',
          stageType: 'open',
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.stages) setStagesList(data.stages);
        onChanged();
      } else alert(data.error || 'Add failed');
    } catch (e) {
      alert('Add failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteStageRow = async (stgId: string) => {
    if (!window.confirm('Delete this stage?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/bot/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-stage', stageId: stgId }),
      });
      const data = await res.json();
      if (data.success) {
        setStagesList((prev) => prev.filter((s) => s.id !== stgId));
        onChanged();
      } else alert(data.error || 'Delete failed');
    } catch (e) {
      alert('Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={`Manage Stages · ${pipelineName}`} onClose={onClose}>
      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
        {stagesList.map((stg) => (
          <div key={stg.id} className="flex items-center gap-2 p-2 bg-zinc-50 border border-zinc-200 rounded-xl">
            <input
              type="color"
              className="w-7 h-7 rounded border-none bg-transparent cursor-pointer shrink-0"
              value={stg.color || '#18181b'}
              onChange={(e) =>
                setStagesList((prev) => prev.map((s) => (s.id === stg.id ? { ...s, color: e.target.value } : s)))
              }
            />
            <input
              type="text"
              className="flex-1 p-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900 outline-none"
              value={stg.name}
              onChange={(e) =>
                setStagesList((prev) => prev.map((s) => (s.id === stg.id ? { ...s, name: e.target.value } : s)))
              }
            />
            <input
              type="number"
              className="w-16 p-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-800 text-center outline-none font-mono"
              value={stg.probability}
              onChange={(e) =>
                setStagesList((prev) => prev.map((s) => (s.id === stg.id ? { ...s, probability: Number(e.target.value) } : s)))
              }
              title="Win Probability %"
            />
            <select
              className="w-20 p-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 font-semibold outline-none cursor-pointer"
              value={stg.stageType}
              onChange={(e) =>
                setStagesList((prev) =>
                  prev.map((s) => (s.id === stg.id ? { ...s, stageType: e.target.value as any } : s))
                )
              }
            >
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <button
              type="button"
              onClick={() => saveStageRow(stg)}
              disabled={busy}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
              title="Save Stage"
            >
              <span className="material-symbols-outlined text-base">check</span>
            </button>
            <button
              type="button"
              onClick={() => deleteStageRow(stg.id)}
              disabled={busy}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
              title="Delete Stage"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-200">
        <button
          type="button"
          onClick={addStageRow}
          disabled={busy}
          className="px-3.5 py-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Add Stage</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs cursor-pointer"
        >
          Done
        </button>
      </div>
    </ModalShell>
  );
}

/* ----------------------------- Shell Modal ------------------------------- */
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-xl p-6 relative font-sans text-zinc-900"
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-200">
          <h3 className="font-bold text-sm text-zinc-900">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-lg cursor-pointer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
