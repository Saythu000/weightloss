import { NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/integrations/google-sheets';

export async function GET() {
  try {
    const config = googleSheetsService.getConfig();
    const dataPreview = googleSheetsService.getCachedMatrix();

    // If cache is empty, build sheet data once
    if (dataPreview.rows.length === 0) {
      await googleSheetsService.buildSheetData();
    }

    const updatedPreview = googleSheetsService.getCachedMatrix();

    return NextResponse.json({
      success: true,
      config,
      preview: updatedPreview,
    });
  } catch (error: any) {
    console.error('[API:google-sheets] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'SYNC_NOW';

    if (action === 'SYNC_NOW') {
      const result = await googleSheetsService.syncToGoogleSheet();
      return NextResponse.json(result);
    }

    if (action === 'PREVIEW') {
      const { headers, rows } = await googleSheetsService.buildSheetData();
      return NextResponse.json({ success: true, headers, rows, count: rows.length });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[API:google-sheets] Sync trigger error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updatedConfig = googleSheetsService.updateConfig(body);

    return NextResponse.json({
      success: true,
      message: 'Google Sheets sync settings updated successfully',
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error('[API:google-sheets] Settings update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
