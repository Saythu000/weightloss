import { NextResponse } from 'next/server';
import { whatsAppProviderManager } from '@/lib/whatsapp/provider-manager';
import { masterSupervisorService } from '@/lib/agents/master-supervisor';

/**
 * Meta Cloud API / Wabafy Webhook Verification Endpoint
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const config = whatsAppProviderManager.getRawConfig();
    const expectedToken = config.metaConfig.webhookVerifyToken || 'trekatour_waba_verify_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[Meta WABA Webhook] Webhook verified successfully!');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  } catch (err: any) {
    console.error('[Meta WABA Webhook] Verification error:', err);
    return new Response('Error', { status: 500 });
  }
}

/**
 * Meta Cloud API / Wabafy Incoming Message Handler
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify it's a WhatsApp webhook event
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages?.length > 0) {
        const messageObj = value.messages[0];
        const fromNumber = messageObj.from;
        const customerName = value.contacts?.[0]?.profile?.name || 'Traveler';

        let incomingText = '';
        if (messageObj.type === 'text') {
          incomingText = messageObj.text?.body || '';
        } else if (messageObj.type === 'button') {
          incomingText = messageObj.button?.text || messageObj.button?.payload || '';
        } else if (messageObj.type === 'interactive') {
          incomingText =
            messageObj.interactive?.button_reply?.title ||
            messageObj.interactive?.list_reply?.title ||
            '';
        }

        if (incomingText && fromNumber) {
          console.log(`[Meta WABA Inbound] Received from ${fromNumber} (${customerName}): "${incomingText}"`);

          // Delegate to Master Supervisor (Kabir)
          const result = await masterSupervisorService.processOmnichannelMessage({
            phoneNumber: fromNumber,
            message: incomingText,
            channel: 'whatsapp_meta',
            customerName,
          });

          // Dispatch Kabir's synthesized response back via Meta WABA
          if (result.reply) {
            await whatsAppProviderManager.sendTextMessage(fromNumber, result.reply, 'CHAT');
          }
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    return NextResponse.json({ status: 'IGNORED' }, { status: 200 });
  } catch (err: any) {
    console.error('[Meta WABA Inbound] Error handling webhook:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
