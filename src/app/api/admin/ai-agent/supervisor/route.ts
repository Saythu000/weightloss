import { NextResponse } from 'next/server';
import { masterSupervisorService } from '@/lib/agents/master-supervisor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = masterSupervisorService.getConfig();
    const hitlQueue = masterSupervisorService.getHitlQueue();

    return NextResponse.json({
      success: true,
      agent: 'MasterSupervisorAgent (Kabir)',
      role: 'Head of Autonomous Travel Sales & Supervisor',
      config,
      hitlQueue,
    });
  } catch (error: any) {
    console.error('[API:supervisor] Error fetching config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, message, channel, customerName } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber and message are required' },
        { status: 400 }
      );
    }

    const result = await masterSupervisorService.processOmnichannelMessage({
      phoneNumber,
      message,
      channel: channel || 'web',
      customerName,
    });

    return NextResponse.json({
      agent: 'MasterSupervisorAgent (Kabir)',
      ...result,
    });
  } catch (error: any) {
    console.error('[API:supervisor] Error processing message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // 1. If resolving an HITL item
    if (body.action === 'RESOLVE_HITL') {
      const { hitlId, decision, adminNote } = body;
      if (!hitlId || !decision) {
        return NextResponse.json(
          { success: false, error: 'hitlId and decision (APPROVED/REJECTED) are required' },
          { status: 400 }
        );
      }
      const resolved = masterSupervisorService.resolveHitlItem(hitlId, decision, adminNote);
      return NextResponse.json({
        success: true,
        action: 'RESOLVE_HITL',
        resolved,
      });
    }

    // 2. Update supervisor configuration (strategy mode, agent toggles, routing rules)
    const updated = masterSupervisorService.updateConfig(body);

    return NextResponse.json({
      success: true,
      action: 'UPDATE_CONFIG',
      config: updated,
    });
  } catch (error: any) {
    console.error('[API:supervisor] Error updating config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
