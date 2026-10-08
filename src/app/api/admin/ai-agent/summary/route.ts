import { NextResponse } from 'next/server';
import { summaryAgentService } from '@/lib/agents/summary-agent';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pipelineSummary = await summaryAgentService.getWorkforcePipelineSummary();

    return NextResponse.json({
      success: true,
      agent: 'SummaryReportAgent (Neha)',
      role: 'Executive CRM Analytics & Intent Scoring Specialist',
      pipeline: pipelineSummary,
    });
  } catch (error: any) {
    console.error('[API:summary] Error generating pipeline report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadPhone } = body;

    if (!leadPhone) {
      return NextResponse.json(
        { success: false, error: 'leadPhone is required' },
        { status: 400 }
      );
    }

    const dossier = await summaryAgentService.generateDossierForLead(leadPhone);

    if (!dossier) {
      return NextResponse.json(
        { success: false, error: `Lead with phone ${leadPhone} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: 'SummaryReportAgent (Neha)',
      dossier,
    });
  } catch (error: any) {
    console.error('[API:summary] Error generating lead dossier:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
