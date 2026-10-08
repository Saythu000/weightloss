/**
 * Agent #0: Master Sales Supervisor Agent ("Kabir")
 * Orchestrator-Workers Architecture for Trekatour Sales Workforce.
 * Manages omnichannel routing, sub-agent delegation, shared state blackboard, and HITL overrides.
 */

import { prisma } from '@/lib/prisma';
import { itineraryPlanner } from '@/lib/agents/itinerary-planner';
import { pricingCalculator } from '@/lib/agents/pricing-calculator';
import { paymentAgentService } from '@/lib/agents/payment-agent';
import { summaryAgentService } from '@/lib/agents/summary-agent';
import { whatsAppProviderManager } from '@/lib/whatsapp/provider-manager';
import { googleSheetsService } from '@/lib/integrations/google-sheets';

export type StrategyMode = 'CONSULTATIVE_GUIDE' | 'HIGH_CONVERSION_CLOSER' | 'STRICT_MARGIN_PROTECTOR';

export interface RoutingRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  isActive: boolean;
}

export interface HitlApprovalItem {
  id: string;
  leadPhone: string;
  customerName: string;
  reason: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
  requestedAction: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  createdAt: string;
}

export interface SupervisorConfig {
  strategyMode: StrategyMode;
  agentToggles: Record<string, boolean>;
  routingRules: RoutingRule[];
  marginCapPercent: number;
}

// In-memory runtime configuration with sensible enterprise defaults
let globalConfig: SupervisorConfig = {
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
    {
      id: 'rule_1',
      name: 'Group Tier Auto-Discount',
      condition: 'groupSize >= 4',
      action: 'Apply 5% volume discount tier automatically',
      isActive: true,
    },
    {
      id: 'rule_2',
      name: 'Large Group Promo Trigger',
      condition: 'groupSize >= 8',
      action: 'Apply 10% volume discount tier + TREK1000 eligibility',
      isActive: true,
    },
    {
      id: 'rule_3',
      name: 'Automatic Brochure Dispatch',
      condition: 'intakeStatus == "COMPLETED"',
      action: 'Dispatch PDF brochure via WhatsApp',
      isActive: true,
    },
    {
      id: 'rule_4',
      name: 'Corporate VIP Human Escalation',
      condition: 'groupSize >= 20 || dealValue >= 100000',
      action: 'Trigger HITL escalation for Head of Sales assignment',
      isActive: true,
    },
  ],
  marginCapPercent: 20.0,
};

let hitlQueue: HitlApprovalItem[] = [];

export class MasterSupervisorService {
  getConfig(): SupervisorConfig {
    return { ...globalConfig };
  }

  updateConfig(updates: Partial<SupervisorConfig>): SupervisorConfig {
    globalConfig = {
      ...globalConfig,
      ...updates,
      agentToggles: {
        ...globalConfig.agentToggles,
        ...(updates.agentToggles || {}),
      },
    };
    return { ...globalConfig };
  }

  getHitlQueue(): HitlApprovalItem[] {
    return [...hitlQueue];
  }

  resolveHitlItem(id: string, decision: 'APPROVED' | 'REJECTED', adminNote?: string): HitlApprovalItem | null {
    const item = hitlQueue.find((i) => i.id === id);
    if (!item) return null;
    item.status = decision;
    item.adminNote = adminNote;
    return item;
  }

  /**
   * Orchestrates an incoming omnichannel traveler query across the 7 sub-agents.
   */
  async processOmnichannelMessage(params: {
    phoneNumber: string;
    message: string;
    channel?: 'voice' | 'whatsapp' | 'whatsapp_meta' | 'web';
    customerName?: string;
  }): Promise<{
    success: boolean;
    reply: string;
    invokedAgents: string[];
    actionsTaken: string[];
    hitlTriggered: boolean;
    leadState: any;
  }> {
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');
    const userMsg = params.message.trim();
    const lowerMsg = userMsg.toLowerCase();

    // 1. Fetch or initialize Lead in PostgreSQL Blackboard
    let lead = await prisma.lead.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phoneNumber: cleanPhone,
          name: params.customerName || 'Traveler',
          intakeStatus: 'IN_PROGRESS',
          paymentStatus: 'PENDING',
          partnershipDetails: {
            destination: 'Pondicherry',
            groupSize: 1,
            travelDates: 'Upcoming Weekend',
            departureCity: 'Hyderabad',
          } as any,
        },
      });
    }

    const details = (lead.partnershipDetails as Record<string, any>) || {};
    const invokedAgents: string[] = ['master_supervisor (Kabir)'];
    const actionsTaken: string[] = [];
    let hitlTriggered = false;

    // 2. Extract Lead Entities dynamically
    // Check group size
    const groupMatch = lowerMsg.match(/(\d+)\s*(people|friends|pax|members|person|persons|guys)?/);
    if (groupMatch && parseInt(groupMatch[1], 10) > 0) {
      const extractedPax = parseInt(groupMatch[1], 10);
      details.groupSize = extractedPax;
      actionsTaken.push(`Extracted group size: ${extractedPax} travelers`);
    }

    // Check destinations
    const destinations = ['pondicherry', 'gokarna', 'coorg', 'manali', 'dandeli'];
    for (const d of destinations) {
      if (lowerMsg.includes(d)) {
        details.destination = d.charAt(0).toUpperCase() + d.slice(1);
        actionsTaken.push(`Extracted destination: ${details.destination}`);
        break;
      }
    }

    const currentDest = details.destination || 'Pondicherry';
    const currentPax = Number(details.groupSize || 1);

    // 3. Circuit Breaker Check: Check for excessive discount or massive corporate groups
    const discountRequestMatch = lowerMsg.match(/(\d+)%\s*discount/);
    if (discountRequestMatch) {
      const requestedPct = parseFloat(discountRequestMatch[1]);
      if (requestedPct > globalConfig.marginCapPercent) {
        hitlTriggered = true;
        const hitlId = `hitl_${Date.now()}`;
        hitlQueue.unshift({
          id: hitlId,
          leadPhone: cleanPhone,
          customerName: lead.name || 'Traveler',
          reason: `Customer requested ${requestedPct}% discount (exceeds ${globalConfig.marginCapPercent}% margin cap)`,
          priority: 'HIGH',
          requestedAction: `Approve custom discount of ${requestedPct}% or enforce ${globalConfig.marginCapPercent}% limit`,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });
        actionsTaken.push(`🚨 Triggered HITL Approval Queue for ${requestedPct}% discount request`);
      }
    }

    if (currentPax >= 20) {
      hitlTriggered = true;
      const hitlId = `hitl_${Date.now()}`;
      hitlQueue.unshift({
        id: hitlId,
        leadPhone: cleanPhone,
        customerName: lead.name || 'Traveler',
        reason: `Large VIP Group (${currentPax} Pax) booking inquiry for ${currentDest}`,
        priority: 'URGENT',
        requestedAction: `Assign Senior Trip Captain for customized bus departure from Hyderabad`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      actionsTaken.push(`🚨 Triggered HITL Escalation for large group (${currentPax} pax)`);
    }

    // 4. Multi-Intent Routing & Delegation
    let itinerarySummary = '';
    let pricingSummary = '';
    let paymentLinkInfo = '';

    // Intent A: Itinerary & Inclusions
    if (
      globalConfig.agentToggles.itinerary_agent &&
      (lowerMsg.includes('itinerary') ||
        lowerMsg.includes('plan') ||
        lowerMsg.includes('include') ||
        lowerMsg.includes('visit') ||
        lowerMsg.includes('schedule') ||
        lowerMsg.includes('details') ||
        lowerMsg.includes('tell me about'))
    ) {
      invokedAgents.push('itinerary_agent (Rohan)');
      const itinResult = await itineraryPlanner.planItinerary({
        customerName: lead.name || 'Traveler',
        destination: currentDest,
        groupSize: currentPax,
        departureCity: details.departureCity || 'Hyderabad',
        travelDates: details.travelDates || 'Upcoming Weekend',
      });
      itinerarySummary = `🎒 *${currentDest} Itinerary Highlights:*\n` +
        itinResult.itineraryDays.map((d: any) => `• *Day ${d.dayNumber || d.day || 1}:* ${d.title}`).join('\n') +
        `\n• *Key Inclusions:* ${itinResult.inclusions.slice(0, 3).join(', ')}`;
      actionsTaken.push(`Consulted Rohan (Itinerary Agent) for ${currentDest}`);
    }

    // Intent B: Pricing & Discounts
    if (
      globalConfig.agentToggles.discount_agent &&
      (lowerMsg.includes('discount') ||
        lowerMsg.includes('price') ||
        lowerMsg.includes('cost') ||
        lowerMsg.includes('offer') ||
        lowerMsg.includes('quote') ||
        lowerMsg.includes('budget') ||
        lowerMsg.includes('how much'))
    ) {
      invokedAgents.push('discount_agent (Priya)');
      let promoToApply = undefined;
      if (lowerMsg.includes('trek1000')) promoToApply = 'TREK1000';
      else if (lowerMsg.includes('trek500')) promoToApply = 'TREK500';
      else if (lowerMsg.includes('earlybird')) promoToApply = 'EARLYBIRD';
      else if (currentPax >= 8) promoToApply = 'TREK1000';
      else if (currentPax >= 4) promoToApply = 'TREK500';

      const quote = pricingCalculator.computeQuote({
        destination: currentDest,
        groupSize: currentPax,
        promoCode: promoToApply,
        customerName: lead.name || 'Traveler',
      });

      details.pricingQuote = quote;
      pricingSummary = `💰 *Verified Commercial Quote (${currentPax} Pax):*\n` +
        `• Standard Rate: ₹${quote.basePricePerPerson.toLocaleString('en-IN')}/person\n` +
        (quote.tierDiscountPercent > 0 ? `• Group Tier Savings (${quote.tierDiscountPercent}%): -₹${quote.tierDiscountAmount.toLocaleString('en-IN')}\n` : '') +
        (quote.appliedPromoCode ? `• Promo Code (${quote.appliedPromoCode}): -₹${quote.promoDiscountAmount.toLocaleString('en-IN')}\n` : '') +
        `• *Final Group Total:* *₹${quote.finalTotal.toLocaleString('en-IN')}* (₹${quote.perPersonEffective.toLocaleString('en-IN')}/pax)\n` +
        `• Advance to Lock Seats: ₹${quote.totalAdvanceRequired.toLocaleString('en-IN')} (₹${quote.advancePerPerson.toLocaleString('en-IN')} x ${currentPax})`;
      actionsTaken.push(`Consulted Priya (Pricing Agent) for ${currentPax} pax quote`);
    }

    // Intent C: Booking & Payment Links
    if (
      globalConfig.agentToggles.payment_agent &&
      (lowerMsg.includes('pay') ||
        lowerMsg.includes('book') ||
        lowerMsg.includes('link') ||
        lowerMsg.includes('advance') ||
        lowerMsg.includes('reserve') ||
        lowerMsg.includes('ready to pay'))
    ) {
      invokedAgents.push('payment_agent (Arjun)');
      const payResult = await paymentAgentService.generatePaymentLinkForLead(cleanPhone);
      if (payResult.success) {
        paymentLinkInfo = `💳 *Instant Razorpay Booking Link:*\n${payResult.paymentUrl}\n🔒 Secure checkout (GPay, PhonePe, UPI, Cards). Lock your seats with ₹${payResult.amount.toLocaleString('en-IN')} advance!`;
        actionsTaken.push(`Invoked Arjun (Payment Agent) to issue link: ${payResult.paymentUrl}`);
      }
    }

    // 5. Synthesize Unified Master Response
    const strategy = globalConfig.strategyMode;
    let synthesizedReply = '';

    if (paymentLinkInfo) {
      synthesizedReply = `Hey *${lead.name || 'Traveler'}*! Kabir here from Trekatour sales desk. 🎒✨\n\n` +
        `Great news! Your booking details for *${currentDest}* (${currentPax} travelers) are ready:\n\n` +
        (pricingSummary ? `${pricingSummary}\n\n` : '') +
        `${paymentLinkInfo}\n\n` +
        `Once the advance is completed, our system will instantly issue your official Trekatour Booking Confirmation Voucher! 🎟️`;
    } else if (pricingSummary || itinerarySummary) {
      synthesizedReply = `Hey *${lead.name || 'Traveler'}*! Kabir here from Trekatour. 🎒🌴\n\n` +
        (itinerarySummary ? `${itinerarySummary}\n\n` : '') +
        (pricingSummary ? `${pricingSummary}\n\n` : '') +
        (strategy === 'HIGH_CONVERSION_CLOSER'
          ? `⚡ *Weekend Berths Filling Fast:* We only have limited seats left on our Hyderabad sleeper bus! Would you like me to generate your instant Razorpay booking link for the ₹2,000/seat advance?`
          : `Feel free to ask about campfire arrangements, pickup points in Hyderabad, or packing tips. When you're ready, let me know to lock your seats!`);
    } else {
      synthesizedReply = `Hey *${lead.name || 'Traveler'}*! Kabir here, Head of Sales at Trekatour. 🎒✨\n\n` +
        `We'd love to host you on our upcoming weekend adventures from Hyderabad! We have thrilling trips departing every Friday evening to *Pondicherry*, *Gokarna*, *Coorg*, *Manali*, and *Dandeli*.\n\n` +
        `How many travelers are in your group, and which destination are you excited to explore?`;
    }

    // 6. Persist Blackboard Updates to PostgreSQL
    try {
      await prisma.lead.update({
        where: { phoneNumber: cleanPhone },
        data: {
          partnershipDetails: details as any,
        },
      });
      actionsTaken.push(`Persisted updated state to PostgreSQL Blackboard`);
    } catch (e) {
      console.warn('[MasterSupervisorService] Error updating Blackboard:', e);
    }

    // 7. Update CRM Summary & Intent Score via Neha
    if (globalConfig.agentToggles.summary_agent) {
      invokedAgents.push('summary_agent (Neha)');
      await summaryAgentService.generateDossierForLead(cleanPhone);
      actionsTaken.push(`Updated Neha CRM Executive Dossier & Intent Score`);
    }

    // 8. If WhatsApp channel, dispatch message via unified provider manager (Baileys / Meta WABA / Hybrid)
    if (
      (params.channel === 'whatsapp' || params.channel === 'whatsapp_meta') &&
      globalConfig.agentToggles.whatsapp_agent
    ) {
      const category = paymentLinkInfo ? 'TRANSACTIONAL' : 'CHAT';
      const sendRes = await whatsAppProviderManager.sendTextMessage(cleanPhone, synthesizedReply, category);
      invokedAgents.push(`whatsapp_agent (Sameer via ${sendRes.providerUsed})`);
      actionsTaken.push(`Dispatched reply via ${sendRes.providerUsed} WhatsApp Engine`);
    }

    // 9. Asynchronously synchronize with Google Sheets if enabled
    try {
      googleSheetsService.syncToGoogleSheet().catch((e) => {
        console.warn('[MasterSupervisorService] Background Google Sheet sync notice:', e);
      });
      actionsTaken.push(`Triggered real-time Google Sheet sync`);
    } catch {}

    return {
      success: true,
      reply: synthesizedReply,
      invokedAgents,
      actionsTaken,
      hitlTriggered,
      leadState: {
        phoneNumber: cleanPhone,
        destination: currentDest,
        groupSize: currentPax,
        intakeStatus: lead.intakeStatus,
        paymentStatus: lead.paymentStatus,
      },
    };
  }
}

export const masterSupervisorService = new MasterSupervisorService();
