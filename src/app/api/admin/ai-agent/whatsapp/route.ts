import { NextResponse } from 'next/server';
import { whatsAppOutreach } from '@/lib/agents/whatsapp-outreach';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    agent: 'WhatsAppOutreachAgent (Sameer)',
    templates: {
      brochurePackage: 'Itinerary schedule + Group pricing quote + Downloadable PDF brochure link',
      followups: [
        {
          type: '2_HOUR_NUDGE',
          title: '2-Hour Seat Availability Reminder',
          description: 'Nudges traveler with limited remaining seat count on weekend bus/train.',
        },
        {
          type: '24_HOUR_WARNING',
          title: '24-Hour Cutoff Warning',
          description: 'Alerts traveler that departure cutoffs close tonight.',
        },
      ],
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadPhone, action, followupType } = body;

    if (!leadPhone) {
      return NextResponse.json(
        { success: false, error: 'leadPhone is required' },
        { status: 400 }
      );
    }

    if (action === 'SEND_FOLLOWUP') {
      const type = followupType === '24_HOUR_WARNING' ? '24_HOUR_WARNING' : '2_HOUR_NUDGE';
      const result = await whatsAppOutreach.dispatchFollowup(leadPhone, type);
      return NextResponse.json({
        success: true,
        action: 'SEND_FOLLOWUP',
        result,
      });
    }

    // Default action: SEND_BROCHURE
    const result = await whatsAppOutreach.dispatchBrochureToLead(leadPhone);
    return NextResponse.json({
      success: true,
      action: 'SEND_BROCHURE',
      result,
    });
  } catch (error: any) {
    console.error('[API:whatsapp] Error dispatching WhatsApp outreach:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
