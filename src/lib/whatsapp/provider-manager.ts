/**
 * Unified WhatsApp Provider Manager
 * Supports:
 * 1. Baileys Direct Socket (Zero cost, interactive human-like conversations)
 * 2. Official Meta Cloud API / Wabafy API (Meta-approved HSM templates, green-tick verified, 100% ban immune)
 * 3. Smart Hybrid Mode (Baileys for sales discussions + Meta WABA for official vouchers and alerts)
 */

import { sendWaTextMessage, sendWaMediaMessage, getWaClientState } from '@/lib/wa-client';

export type WhatsAppProviderType = 'BAILEYS' | 'META_WABA' | 'SMART_HYBRID';

export interface MetaWabaConfig {
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string;
  businessName?: string;
  apiBaseUrl?: string; // Default: 'https://graph.facebook.com/v19.0' or 'https://wabafy.com/api/v1'
  webhookVerifyToken?: string;
}

export interface HybridRoutingPolicy {
  inboundChatAndIntake: 'BAILEYS' | 'META_WABA';
  bookingVouchersAndAlerts: 'BAILEYS' | 'META_WABA';
  marketingCampaigns: 'META_WABA';
}

export interface WhatsAppProviderConfig {
  activeProvider: WhatsAppProviderType;
  metaConfig: MetaWabaConfig;
  hybridPolicy: HybridRoutingPolicy;
}

export interface SendMessageResult {
  success: boolean;
  providerUsed: WhatsAppProviderType;
  messageId?: string;
  error?: string;
}

// In-memory runtime configuration with sensible enterprise defaults
let globalProviderConfig: WhatsAppProviderConfig = {
  activeProvider: 'SMART_HYBRID',
  metaConfig: {
    phoneNumberId: process.env.META_WABA_PHONE_NUMBER_ID || '',
    accessToken: process.env.META_WABA_ACCESS_TOKEN || '',
    wabaId: process.env.META_WABA_ACCOUNT_ID || '',
    businessName: 'Trekatour Adventures',
    apiBaseUrl: 'https://graph.facebook.com/v19.0',
    webhookVerifyToken: process.env.META_WABA_VERIFY_TOKEN || 'trekatour_waba_verify_2026',
  },
  hybridPolicy: {
    inboundChatAndIntake: 'BAILEYS',
    bookingVouchersAndAlerts: 'META_WABA',
    marketingCampaigns: 'META_WABA',
  },
};

export class WhatsAppProviderManager {
  getConfig(): WhatsAppProviderConfig {
    return {
      ...globalProviderConfig,
      metaConfig: {
        ...globalProviderConfig.metaConfig,
        // Mask access token when reading config
        accessToken: globalProviderConfig.metaConfig.accessToken
          ? `${globalProviderConfig.metaConfig.accessToken.slice(0, 6)}...${globalProviderConfig.metaConfig.accessToken.slice(-4)}`
          : '',
      },
    };
  }

  getRawConfig(): WhatsAppProviderConfig {
    return { ...globalProviderConfig };
  }

  updateConfig(updates: {
    activeProvider?: WhatsAppProviderType;
    metaConfig?: Partial<MetaWabaConfig>;
    hybridPolicy?: Partial<HybridRoutingPolicy>;
  }): WhatsAppProviderConfig {
    if (updates.activeProvider) {
      globalProviderConfig.activeProvider = updates.activeProvider;
    }

    if (updates.metaConfig) {
      // Don't overwrite if masked token is passed back
      let tokenToSave = updates.metaConfig.accessToken;
      if (tokenToSave && tokenToSave.includes('...')) {
        tokenToSave = globalProviderConfig.metaConfig.accessToken;
      }

      globalProviderConfig.metaConfig = {
        ...globalProviderConfig.metaConfig,
        ...updates.metaConfig,
        accessToken: tokenToSave !== undefined ? tokenToSave : globalProviderConfig.metaConfig.accessToken,
      };
    }

    if (updates.hybridPolicy) {
      globalProviderConfig.hybridPolicy = {
        ...globalProviderConfig.hybridPolicy,
        ...updates.hybridPolicy,
      };
    }

    return this.getConfig();
  }

  /**
   * Dispatches text message through the selected provider or hybrid router
   */
  async sendTextMessage(
    to: string,
    text: string,
    category: 'CHAT' | 'TRANSACTIONAL' | 'MARKETING' = 'CHAT'
  ): Promise<SendMessageResult> {
    const cleanPhone = to.replace(/[^0-9]/g, '');
    const providerToUse = this.determineProviderForCategory(category);

    if (providerToUse === 'META_WABA') {
      return this.sendViaMetaWaba(cleanPhone, text);
    }

    // Default to Baileys
    return this.sendViaBaileys(cleanPhone, text);
  }

  /**
   * Dispatches a PDF document (e.g. Brochure or Booking Confirmation Voucher)
   */
  async sendDocument(
    to: string,
    pdfUrl: string,
    fileName: string,
    caption: string,
    category: 'CHAT' | 'TRANSACTIONAL' | 'MARKETING' = 'TRANSACTIONAL'
  ): Promise<SendMessageResult> {
    const cleanPhone = to.replace(/[^0-9]/g, '');
    const providerToUse = this.determineProviderForCategory(category);

    if (providerToUse === 'META_WABA') {
      return this.sendDocumentViaMetaWaba(cleanPhone, pdfUrl, fileName, caption);
    }

    // Baileys fallback
    try {
      const response = await fetch(pdfUrl);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        await sendWaMediaMessage(cleanPhone, buffer, 'application/pdf', fileName, caption);
        return { success: true, providerUsed: 'BAILEYS' };
      }
    } catch (e: any) {
      console.warn('[WhatsAppProviderManager] Baileys PDF dispatch error:', e);
    }

    // If fetching media fails, send caption with download link
    const fallbackText = `${caption}\n\n📄 Download Link: ${pdfUrl}`;
    return this.sendViaBaileys(cleanPhone, fallbackText);
  }

  /**
   * Sends an approved Meta HSM Template message via Meta WABA
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    bodyVariables: string[] = []
  ): Promise<SendMessageResult> {
    const cleanPhone = to.replace(/[^0-9]/g, '');
    const { phoneNumberId, accessToken, apiBaseUrl } = globalProviderConfig.metaConfig;

    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        providerUsed: 'META_WABA',
        error: 'Meta WABA credentials not configured (Missing Phone Number ID or Access Token)',
      };
    }

    try {
      const url = `${apiBaseUrl || 'https://graph.facebook.com/v19.0'}/${phoneNumberId}/messages`;
      const components = bodyVariables.length > 0
        ? [
            {
              type: 'body',
              parameters: bodyVariables.map((text) => ({ type: 'text', text })),
            },
          ]
        : [];

      const payload = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          providerUsed: 'META_WABA',
          error: data.error?.message || 'Meta API error',
        };
      }

      return {
        success: true,
        providerUsed: 'META_WABA',
        messageId: data.messages?.[0]?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        providerUsed: 'META_WABA',
        error: err.message || 'Network error communicating with Meta Cloud API',
      };
    }
  }

  /**
   * Health and connectivity status of both connection engines
   */
  async getStatus(): Promise<{
    activeProvider: WhatsAppProviderType;
    baileys: { status: string; phoneNumber: string | null; qrReady: boolean };
    metaWaba: { configured: boolean; phoneNumberId: string; businessName: string; healthy: boolean };
  }> {
    const bState = await getWaClientState();
    const hasMeta = !!(
      globalProviderConfig.metaConfig.phoneNumberId &&
      globalProviderConfig.metaConfig.accessToken
    );

    let metaHealthy = false;
    if (hasMeta) {
      try {
        const url = `${globalProviderConfig.metaConfig.apiBaseUrl || 'https://graph.facebook.com/v19.0'}/${globalProviderConfig.metaConfig.phoneNumberId}`;
        const check = await fetch(url, {
          headers: { Authorization: `Bearer ${globalProviderConfig.metaConfig.accessToken}` },
        });
        metaHealthy = check.ok;
      } catch {
        metaHealthy = false;
      }
    }

    return {
      activeProvider: globalProviderConfig.activeProvider,
      baileys: {
        status: bState.status,
        phoneNumber: bState.phoneNumber,
        qrReady: !!bState.qr,
      },
      metaWaba: {
        configured: hasMeta,
        phoneNumberId: globalProviderConfig.metaConfig.phoneNumberId,
        businessName: globalProviderConfig.metaConfig.businessName || 'Trekatour',
        healthy: metaHealthy,
      },
    };
  }

  // --- Private Helpers ---

  private determineProviderForCategory(
    category: 'CHAT' | 'TRANSACTIONAL' | 'MARKETING'
  ): 'BAILEYS' | 'META_WABA' {
    if (globalProviderConfig.activeProvider === 'BAILEYS') return 'BAILEYS';
    if (globalProviderConfig.activeProvider === 'META_WABA') return 'META_WABA';

    // SMART_HYBRID logic
    const { metaConfig, hybridPolicy } = globalProviderConfig;
    const isMetaConfigured = !!(metaConfig.phoneNumberId && metaConfig.accessToken);

    if (!isMetaConfigured) {
      return 'BAILEYS'; // Fallback to Baileys if Meta credentials are not yet supplied
    }

    if (category === 'TRANSACTIONAL') {
      return hybridPolicy.bookingVouchersAndAlerts;
    }
    if (category === 'MARKETING') {
      return hybridPolicy.marketingCampaigns;
    }
    return hybridPolicy.inboundChatAndIntake;
  }

  private async sendViaBaileys(cleanPhone: string, text: string): Promise<SendMessageResult> {
    try {
      await sendWaTextMessage(cleanPhone, text);
      return { success: true, providerUsed: 'BAILEYS' };
    } catch (err: any) {
      console.error('[WhatsAppProviderManager] Baileys send error:', err);
      return {
        success: false,
        providerUsed: 'BAILEYS',
        error: err.message || 'Baileys client socket error',
      };
    }
  }

  private async sendViaMetaWaba(cleanPhone: string, text: string): Promise<SendMessageResult> {
    const { phoneNumberId, accessToken, apiBaseUrl } = globalProviderConfig.metaConfig;
    if (!phoneNumberId || !accessToken) {
      console.warn('[WhatsAppProviderManager] Meta WABA not configured, falling back to Baileys');
      return this.sendViaBaileys(cleanPhone, text);
    }

    try {
      const url = `${apiBaseUrl || 'https://graph.facebook.com/v19.0'}/${phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: text },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[WhatsAppProviderManager] Meta API error:', data);
        return {
          success: false,
          providerUsed: 'META_WABA',
          error: data.error?.message || 'Meta Cloud API error',
        };
      }

      return {
        success: true,
        providerUsed: 'META_WABA',
        messageId: data.messages?.[0]?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        providerUsed: 'META_WABA',
        error: err.message || 'Network error calling Meta API',
      };
    }
  }

  private async sendDocumentViaMetaWaba(
    cleanPhone: string,
    pdfUrl: string,
    fileName: string,
    caption: string
  ): Promise<SendMessageResult> {
    const { phoneNumberId, accessToken, apiBaseUrl } = globalProviderConfig.metaConfig;
    if (!phoneNumberId || !accessToken) {
      return this.sendViaBaileys(cleanPhone, `${caption}\n\n📄 Document: ${pdfUrl}`);
    }

    try {
      const url = `${apiBaseUrl || 'https://graph.facebook.com/v19.0'}/${phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'document',
          document: {
            link: pdfUrl,
            caption,
            filename: fileName,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          providerUsed: 'META_WABA',
          error: data.error?.message || 'Meta document send error',
        };
      }

      return {
        success: true,
        providerUsed: 'META_WABA',
        messageId: data.messages?.[0]?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        providerUsed: 'META_WABA',
        error: err.message || 'Network error calling Meta API',
      };
    }
  }
}

export const whatsAppProviderManager = new WhatsAppProviderManager();
