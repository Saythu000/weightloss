/**
 * Agent 4: Discount & Pricing Agent (Priya)
 * Dynamic tier discounting, promo code verification, margin guardrails,
 * and transparent payment schedule calculations for Trekatour.
 */

import { prisma } from '@/lib/prisma';

export const MAX_MARGIN_DISCOUNT_PERCENT = 20.0;

export const VALID_PROMO_CODES: Record<
  string,
  { discountPerPerson?: number; percentDiscount?: number; minGroupSize: number; description: string }
> = {
  TREK500: { discountPerPerson: 500, minGroupSize: 1, description: 'Flat ₹500 off per person' },
  TREK1000: { discountPerPerson: 1000, minGroupSize: 4, description: 'Flat ₹1000 off per person for 4+ travelers' },
  EARLYBIRD: { percentDiscount: 5.0, minGroupSize: 1, description: '5% Early Bird discount' },
};

export interface PricingQuoteParams {
  customerName?: string;
  destination?: string;
  groupSize?: number;
  basePricePerPerson?: number;
  advancePerPerson?: number;
  promoCode?: string;
}

export interface StructuredPricingQuote {
  destination: string;
  customerName: string;
  groupSize: number;
  basePricePerPerson: number;
  subtotal: number;
  tierDiscountPercent: number;
  tierDiscountAmount: number;
  appliedPromoCode: string | null;
  promoDiscountAmount: number;
  totalDiscountAmount: number;
  effectiveDiscountPercent: number;
  isMarginCapped: boolean;
  finalTotal: number;
  perPersonEffective: number;
  advancePerPerson: number;
  totalAdvanceRequired: number;
  balanceDueAtBoarding: number;
  whatsappMessage: string;
}

export class PricingCalculator {
  /**
   * Returns group volume tier discount percentage:
   * - 1–3 Pax: 0%
   * - 4–7 Pax: 5%
   * - 8–15 Pax: 10%
   * - 16+ Pax: 15%
   */
  getGroupDiscountTier(groupSize: number): number {
    if (groupSize >= 16) return 15.0;
    if (groupSize >= 8) return 10.0;
    if (groupSize >= 4) return 5.0;
    return 0.0;
  }

  /**
   * Computes exact quote with tier discounts, coupons, and margin guardrails.
   */
  computeQuote(params: PricingQuoteParams): StructuredPricingQuote {
    const groupSize = Math.max(1, Number(params.groupSize) || 1);
    const basePrice = Math.max(0, Number(params.basePricePerPerson) || 7499);
    const destination = params.destination || 'Weekend Destination';
    const customerName = params.customerName || 'Traveler';

    const subtotal = basePrice * groupSize;

    // 1. Group Volume Discount
    const tierPercent = this.getGroupDiscountTier(groupSize);
    const tierDiscountAmount = Math.round((tierPercent / 100.0) * subtotal);

    // 2. Promo Code
    let promoDiscountAmount = 0;
    let appliedPromo: { code: string; description: string } | null = null;
    if (params.promoCode) {
      const codeUpper = params.promoCode.trim().toUpperCase();
      const rule = VALID_PROMO_CODES[codeUpper];
      if (rule && groupSize >= rule.minGroupSize) {
        if (rule.discountPerPerson) {
          promoDiscountAmount = rule.discountPerPerson * groupSize;
        } else if (rule.percentDiscount) {
          promoDiscountAmount = Math.round((rule.percentDiscount / 100.0) * subtotal);
        }
        appliedPromo = { code: codeUpper, description: rule.description };
      }
    }

    // 3. Margin Guardrail (Cap at max 20%)
    const rawTotalDiscount = tierDiscountAmount + promoDiscountAmount;
    const maxAllowedDiscount = Math.round((MAX_MARGIN_DISCOUNT_PERCENT / 100.0) * subtotal);
    const effectiveDiscount = Math.min(rawTotalDiscount, maxAllowedDiscount);
    const isMarginCapped = rawTotalDiscount > maxAllowedDiscount;

    const effectiveDiscountPercent =
      subtotal > 0 ? Number(((effectiveDiscount / subtotal) * 100).toFixed(1)) : 0;

    // Final Totals
    const finalTotal = Math.max(0, subtotal - effectiveDiscount);
    const perPersonEffective = Math.round(finalTotal / groupSize);

    // Advance Calculation
    const advancePerPerson =
      params.advancePerPerson && params.advancePerPerson > 0
        ? params.advancePerPerson
        : basePrice >= 6000
        ? 2000
        : 1500;

    const totalAdvanceRequired = advancePerPerson * groupSize;
    const balanceDueAtBoarding = Math.max(0, finalTotal - totalAdvanceRequired);

    // WhatsApp Formatted Message
    let whatsappMsg =
      `Hey *${customerName}*! 💰🎉\n\n` +
      `*Priya* here from the *Trekatour Dynamic Pricing Desk*! Here is your verified group pricing quote for *${destination}*:\n\n` +
      `👥 *Travelers:* ${groupSize} pax\n` +
      `🏷️ *Standard Price:* ₹${basePrice.toLocaleString('en-IN')}/- per person\n` +
      `💵 *Subtotal:* ₹${subtotal.toLocaleString('en-IN')}/-\n`;

    if (tierPercent > 0) {
      whatsappMsg += `✨ *Group Discount (${tierPercent}% Tier):* -₹${tierDiscountAmount.toLocaleString('en-IN')}\n`;
    }

    if (appliedPromo) {
      whatsappMsg += `🎟️ *Promo Code (${appliedPromo.code}):* -₹${promoDiscountAmount.toLocaleString('en-IN')}\n`;
    }

    whatsappMsg +=
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🔥 *FINAL PAYABLE TOTAL:* ₹${finalTotal.toLocaleString('en-IN')} (Just *₹${perPersonEffective.toLocaleString('en-IN')}* / person!)\n` +
      `🎉 *Total Group Savings:* ₹${effectiveDiscount.toLocaleString('en-IN')}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 *Advance to Lock Seats Today:* ₹${totalAdvanceRequired.toLocaleString('en-IN')} (₹${advancePerPerson.toLocaleString('en-IN')} x ${groupSize})\n` +
      `🤝 *Balance Due on Departure Day:* ₹${balanceDueAtBoarding.toLocaleString('en-IN')}\n\n` +
      `Would you like our Payment Specialist (*Arjun*) to generate your instant Razorpay booking link for the advance amount?`;

    return {
      destination,
      customerName,
      groupSize,
      basePricePerPerson: basePrice,
      subtotal,
      tierDiscountPercent: tierPercent,
      tierDiscountAmount,
      appliedPromoCode: appliedPromo ? appliedPromo.code : null,
      promoDiscountAmount,
      totalDiscountAmount: effectiveDiscount,
      effectiveDiscountPercent,
      isMarginCapped,
      finalTotal,
      perPersonEffective,
      advancePerPerson,
      totalAdvanceRequired,
      balanceDueAtBoarding,
      whatsappMessage: whatsappMsg,
    };
  }

  /**
   * Generates pricing quote for an existing Lead and saves it in database.
   */
  async generateForLeadPhone(phoneNumber: string, promoCode?: string): Promise<StructuredPricingQuote | null> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const lead = await prisma.lead.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    const itineraryDetails = (lead?.partnershipDetails as Record<string, any>) || {};
    const basePrice = itineraryDetails.basePricePerPerson || 7499;
    const advancePerPerson = itineraryDetails.advanceBookingAmount || 2000;
    const destination = itineraryDetails.destination || 'Pondicherry';
    const groupSize = itineraryDetails.groupSize || (lead?.healthFlags as any)?.group_size || 1;
    const customerName = lead?.name || 'Traveler';

    const quote = this.computeQuote({
      customerName,
      destination,
      groupSize: Number(groupSize),
      basePricePerPerson: Number(basePrice),
      advancePerPerson: Number(advancePerPerson),
      promoCode,
    });

    // Update Lead record with pricing quote
    try {
      await prisma.lead.update({
        where: { phoneNumber: cleanPhone },
        data: {
          partnershipDetails: {
            ...itineraryDetails,
            pricingQuote: quote,
          } as any,
        },
      });
    } catch (e) {
      console.warn('[PricingCalculator] Could not attach pricing quote to Lead:', e);
    }

    return quote;
  }
}

export const pricingCalculator = new PricingCalculator();
