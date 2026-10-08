/**
 * Agent 7: Summary & CRM Analytics Agent (Neha)
 * Analyzes multi-agent sales interactions, calculates traveler purchase intent scores (0-100),
 * generates executive sales dossiers for human managers, and tracks agency pipeline metrics.
 */

import { prisma } from '@/lib/prisma';

export interface LeadDossier {
  leadPhone: string;
  customerName: string;
  destination: string;
  groupSize: number;
  travelDates: string;
  departureCity: string;
  intentScore: number;
  readinessTier: 'HOT / BOOKED' | 'HOT / READY TO PAY' | 'WARM / EVALUATING' | 'WARM / QUALIFIED' | 'COLD / INCOMPLETE';
  primaryReason: string;
  dealValuationInr: number;
  advanceRequiredInr: number;
  balanceDueInr: number;
  recommendedAction: string;
  executiveSummaryBullets: string[];
  bookingReference: string | null;
  generatedAt: string;
}

export interface PipelineSummary {
  totalLeadsTracked: number;
  confirmedBookings: number;
  totalBookedRevenueInr: number;
  activePipelineValueInr: number;
  conversionRatePercent: number;
  hotLeadsEvaluating: number;
  topDestinations: Record<string, number>;
  statusBreakdown: Record<string, number>;
  generatedAt: string;
}

export class SummaryAgentService {
  /**
   * Calculates purchase readiness intent score (0-100).
   */
  calculateIntentScore(lead: any): { score: number; tier: LeadDossier['readinessTier']; reason: string } {
    const paymentStatus = (lead.paymentStatus || '').toUpperCase();
    const intakeStatus = (lead.intakeStatus || '').toUpperCase();
    const details = (lead.partnershipDetails as Record<string, any>) || {};
    const groupSize = Number(details.groupSize || 1);
    const dates = String(details.travelDates || '');

    let score = 30;
    let tier: LeadDossier['readinessTier'] = 'COLD / INCOMPLETE';
    let reason = 'Lead is currently in initial qualification';

    if (paymentStatus === 'PAID' || intakeStatus === 'BOOKED') {
      score = 100;
      tier = 'HOT / BOOKED';
      reason = 'Seat reservation deposit paid and official booking voucher issued';
    } else if (intakeStatus === 'PAYMENT_LINK_SENT') {
      score = 90;
      tier = 'HOT / READY TO PAY';
      reason = 'Razorpay payment link active; traveler awaiting checkout';
    } else if (intakeStatus === 'BROCHURE_SENT') {
      score = 75;
      tier = 'WARM / EVALUATING';
      reason = 'Customized PDF brochure & group discount quote delivered via WhatsApp';
    } else if (intakeStatus === 'COMPLETED') {
      score = 65;
      tier = 'WARM / QUALIFIED';
      reason = 'Intake qualification completed; destination & dates matched';
    }

    if (groupSize >= 4 && score < 100) {
      score += 5;
    }
    if (dates && !['flexible', 'any', 'not specified'].includes(dates.toLowerCase()) && score < 100) {
      score += 5;
    }

    score = Math.min(100, Math.max(0, score));

    return { score, tier, reason };
  }

  /**
   * Generates a CRM executive dossier for a specific lead.
   */
  async generateDossierForLead(phoneNumber: string): Promise<LeadDossier | null> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const lead = await prisma.lead.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!lead) return null;

    const details = (lead.partnershipDetails as Record<string, any>) || {};
    const quote = details.pricingQuote || {};
    const voucher = details.bookingVoucher || {};
    const name = lead.name || 'Traveler';
    const dest = details.destination || 'Weekend Trip';
    const groupSize = Number(quote.groupSize || details.groupSize || 1);
    const travelDates = details.travelDates || 'Upcoming Weekend';
    const departure = details.departureCity || 'Hyderabad';

    const { score, tier, reason } = this.calculateIntentScore(lead);
    const dealValuation = Number(quote.finalTotal || (dest.toLowerCase().includes('manali') ? 11999 : 7499) * groupSize);
    const advanceRequired = Number(quote.totalAdvanceRequired || (details.paymentLink?.amount) || 2000);
    const balanceDue = Number(quote.balanceDueAtBoarding || Math.max(0, dealValuation - advanceRequired));

    let action = '';
    if (tier === 'HOT / BOOKED') {
      action = `✅ Deal Closed! Assign Trip Captain and dispatch Hyderabad bus pickup point coordinates 24h prior to travel.`;
    } else if (tier === 'HOT / READY TO PAY') {
      action = `⚡ High-Priority Follow-up: Call ${name} at +${cleanPhone} to assist with any payment gateway queries for ₹${advanceRequired.toLocaleString('en-IN')} advance.`;
    } else if (tier === 'WARM / EVALUATING') {
      action = `📲 WhatsApp Re-engagement: Follow up on group travel dates and seat availability for ${groupSize} pax to ${dest}.`;
    } else {
      action = `📞 Outbound Call: Re-engage traveler to finish destination intake preferences.`;
    }

    const bullets = [
      `Traveler: ${name} (+${cleanPhone}) planning ${groupSize} pax adventure to ${dest} from ${departure}.`,
      `Commercial Readiness: ${tier} (Intent Score: ${score}/100) — ${reason}.`,
      `Deal Financials: Total Value ₹${dealValuation.toLocaleString('en-IN')} | Advance Deposit ₹${advanceRequired.toLocaleString('en-IN')} | Balance Due ₹${balanceDue.toLocaleString('en-IN')}.`,
    ];

    const dossier: LeadDossier = {
      leadPhone: cleanPhone,
      customerName: name,
      destination: dest,
      groupSize,
      travelDates,
      departureCity: departure,
      intentScore: score,
      readinessTier: tier,
      primaryReason: reason,
      dealValuationInr: dealValuation,
      advanceRequiredInr: advanceRequired,
      balanceDueInr: balanceDue,
      recommendedAction: action,
      executiveSummaryBullets: bullets,
      bookingReference: voucher.bookingReference || null,
      generatedAt: new Date().toISOString(),
    };

    // Store dossier back to Lead for real-time CRM viewing
    try {
      await prisma.lead.update({
        where: { phoneNumber: cleanPhone },
        data: {
          partnershipDetails: {
            ...details,
            dossier,
          } as any,
        },
      });
    } catch (e) {
      console.warn('[SummaryAgentService] Could not persist dossier to Lead:', e);
    }

    return dossier;
  }

  /**
   * Aggregates agency-wide sales workforce metrics across all leads.
   */
  async getWorkforcePipelineSummary(): Promise<PipelineSummary> {
    const leads = await prisma.lead.findMany();
    const totalLeads = leads.length;

    let bookedCount = 0;
    let bookedRevenue = 0;
    let pipelineValue = 0;
    let hotCount = 0;
    const destCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const lead of leads) {
      const pStatus = (lead.paymentStatus || '').toUpperCase();
      const iStatus = (lead.intakeStatus || 'NEW').toUpperCase();
      statusCounts[iStatus] = (statusCounts[iStatus] || 0) + 1;

      const details = (lead.partnershipDetails as Record<string, any>) || {};
      const dest = details.destination || 'General Inquiry';
      destCounts[dest] = (destCounts[dest] || 0) + 1;

      const quote = details.pricingQuote || {};
      const dealVal = Number(quote.finalTotal || 7499);

      if (pStatus === 'PAID' || iStatus === 'BOOKED') {
        bookedCount += 1;
        bookedRevenue += dealVal;
      } else {
        pipelineValue += dealVal;
        if (['PAYMENT_LINK_SENT', 'BROCHURE_SENT'].includes(iStatus)) {
          hotCount += 1;
        }
      }
    }

    const conversionRate = totalLeads > 0 ? Number(((bookedCount / totalLeads) * 100).toFixed(1)) : 0.0;

    return {
      totalLeadsTracked: totalLeads,
      confirmedBookings: bookedCount,
      totalBookedRevenueInr: bookedRevenue,
      activePipelineValueInr: pipelineValue,
      conversionRatePercent: conversionRate,
      hotLeadsEvaluating: hotCount,
      topDestinations: destCounts,
      statusBreakdown: statusCounts,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const summaryAgentService = new SummaryAgentService();
