/**
 * Agent 5: WhatsApp Outreach Agent (Sameer)
 * Dispatches customized travel brochures, dynamic pricing quotes,
 * downloadable PDF links, and timed follow-up re-engagement sequences.
 */

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { sendWaTextMessage } from '@/lib/wa-client';

export interface BrochureDispatchResult {
  success: boolean;
  phoneNumber: string;
  destination: string;
  sentToWhatsapp: boolean;
  messageText: string;
  pdfUrl: string;
  error?: string;
}

export class WhatsAppOutreach {
  /**
   * Dispatches the full customized itinerary & quote brochure package to a lead.
   */
  async dispatchBrochureToLead(phoneNumber: string): Promise<BrochureDispatchResult> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const lead = await prisma.lead.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!lead) {
      return {
        success: false,
        phoneNumber: cleanPhone,
        destination: 'Unknown',
        sentToWhatsapp: false,
        messageText: '',
        pdfUrl: '',
        error: `Lead with phone number ${cleanPhone} not found.`,
      };
    }

    const details = (lead.partnershipDetails as Record<string, any>) || {};
    const quote = details.pricingQuote || {};
    const name = lead.name || 'Traveler';
    const dest = details.destination || 'Weekend Destination';
    const groupSize = quote.groupSize || details.groupSize || 1;

    const slug = dest.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    const pdfUrl = `https://trekatour.in/brochures/${slug}-itinerary.pdf`;

    let msg =
      `Hey *${name}*! 🌴🎒\n\n` +
      `*Sameer* here from *Trekatour Hyderabad*! Here is your official package & verified group quote for *${dest}*:\n\n` +
      `📍 *Package:* ${details.packageName || dest}\n` +
      `⏱️ *Duration:* ${details.duration || '2N/3D'}\n` +
      `🚆 *Departure:* ${details.departureCity || 'Hyderabad'} (Friday Evening)\n\n`;

    if (quote.subtotal) {
      msg +=
        `💰 *Group Pricing Breakdown (${groupSize} Travelers):*\n` +
        `• Standard Price: ₹${(quote.basePricePerPerson || 7499).toLocaleString('en-IN')}/- per person\n` +
        `• Subtotal: ₹${quote.subtotal.toLocaleString('en-IN')}/-\n`;

      if (quote.tierDiscountAmount > 0) {
        msg += `✨ *Group Discount (${quote.tierDiscountPercent}% Tier):* -₹${quote.tierDiscountAmount.toLocaleString('en-IN')}\n`;
      }
      if (quote.promoDiscountAmount > 0) {
        msg += `🎟️ *Promo Code (${quote.appliedPromoCode}):* -₹${quote.promoDiscountAmount.toLocaleString('en-IN')}\n`;
      }

      msg +=
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔥 *FINAL PAYABLE TOTAL:* ₹${quote.finalTotal.toLocaleString('en-IN')} (Just *₹${quote.perPersonEffective.toLocaleString('en-IN')}* / person!)\n` +
        `🎉 *Total Group Savings:* ₹${quote.totalDiscountAmount.toLocaleString('en-IN')}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💳 *Advance to Lock Seats Today:* *₹${quote.totalAdvanceRequired.toLocaleString('en-IN')}* (₹${quote.advancePerPerson.toLocaleString('en-IN')} x ${groupSize})\n` +
        `🤝 *Balance Due on Departure Day:* ₹${quote.balanceDueAtBoarding.toLocaleString('en-IN')}\n\n`;
    }

    msg +=
      `📄 *Download Official PDF Brochure:* ${pdfUrl}\n\n` +
      `Weekend bus and homestay spots are filling up fast! Reply *LOCK SEATS* and Arjun will generate your instant Razorpay reservation link right away! 🚀`;

    const jid = `${cleanPhone}@s.whatsapp.net`;

    // 1. Dispatch via Baileys Engine
    const dispatchResult = await sendWaTextMessage(jid, msg);

    // 2. Persist to local session history thread for Inbox UI
    this.appendSessionMessage(jid, msg);

    // 3. Update lead status in PostgreSQL
    try {
      await prisma.lead.update({
        where: { phoneNumber: cleanPhone },
        data: {
          intakeStatus: 'BROCHURE_SENT',
        },
      });
    } catch (e) {
      console.warn('[WhatsAppOutreach] Could not update lead status:', e);
    }

    return {
      success: true,
      phoneNumber: cleanPhone,
      destination: dest,
      sentToWhatsapp: dispatchResult.success,
      messageText: msg,
      pdfUrl,
      error: dispatchResult.error,
    };
  }

  /**
   * Dispatches automated follow-up sequences (2-hour nudge or 24-hour warning).
   */
  async dispatchFollowup(
    phoneNumber: string,
    followupType: '2_HOUR_NUDGE' | '24_HOUR_WARNING'
  ): Promise<{ success: boolean; messageText: string; sentToWhatsapp: boolean }> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const lead = await prisma.lead.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    const name = lead?.name || 'Traveler';
    const dest = (lead?.partnershipDetails as any)?.destination || 'your weekend trip';
    const groupSize = (lead?.partnershipDetails as any)?.pricingQuote?.groupSize || 2;

    let followupMsg = '';
    if (followupType === '2_HOUR_NUDGE') {
      followupMsg =
        `Hey *${name}*! 👋 Just checking in — were you able to discuss the *${dest}* itinerary with your group of ${groupSize}?\n\n` +
        `We only have *6 seats remaining* on the Trekatour bus from Hyderabad for this weekend! Let me know if you have any questions or want to lock your seats with the advance booking deposit. 😊`;
    } else {
      followupMsg =
        `Hi *${name}*! ⏰ Final reminder regarding your *${dest}* booking!\n\n` +
        `Our train & homestay reservation cutoff closes tonight. Would you like to reserve your seats today so you don't miss out on this weekend's departure? Reply *YES* to get your Razorpay link! 🎒`;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const dispatchResult = await sendWaTextMessage(jid, followupMsg);
    this.appendSessionMessage(jid, followupMsg);

    return {
      success: true,
      messageText: followupMsg,
      sentToWhatsapp: dispatchResult.success,
    };
  }

  private appendSessionMessage(jid: string, text: string) {
    try {
      const sessionDir = path.join(process.cwd(), '.openclaw-local', 'sessions');
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      const safeJid = jid.replace(/[^a-zA-Z0-9._@-]/g, '_');
      const filePath = path.join(sessionDir, `${safeJid}.jsonl`);
      const replyObj = { role: 'assistant', content: text, ts: Date.now() };
      fs.appendFileSync(filePath, JSON.stringify(replyObj) + '\n', 'utf8');
    } catch (e) {
      console.warn('[WhatsAppOutreach] Could not write session history:', e);
    }
  }
}

export const whatsAppOutreach = new WhatsAppOutreach();
