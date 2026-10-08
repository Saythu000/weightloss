import { NextResponse } from 'next/server';
import { whatsAppProviderManager } from '@/lib/whatsapp/provider-manager';

export async function GET() {
  try {
    const config = whatsAppProviderManager.getConfig();
    const status = await whatsAppProviderManager.getStatus();

    return NextResponse.json({
      success: true,
      config,
      status,
    });
  } catch (error: any) {
    console.error('[API:whatsapp-provider] Error fetching status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updatedConfig = whatsAppProviderManager.updateConfig(body);
    const status = await whatsAppProviderManager.getStatus();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp connection settings updated successfully',
      config: updatedConfig,
      status,
    });
  } catch (error: any) {
    console.error('[API:whatsapp-provider] Error updating config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, message, category, templateName, variables } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Target phone number is required' },
        { status: 400 }
      );
    }

    if (templateName) {
      const res = await whatsAppProviderManager.sendTemplateMessage(
        phoneNumber,
        templateName,
        'en',
        variables || []
      );
      return NextResponse.json(res);
    }

    const res = await whatsAppProviderManager.sendTextMessage(
      phoneNumber,
      message || 'Test message from Trekatour WhatsApp Provider Manager 🚀',
      category || 'CHAT'
    );

    return NextResponse.json(res);
  } catch (error: any) {
    console.error('[API:whatsapp-provider] Error sending test message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
