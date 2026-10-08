import { NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/integrations/google-sheets';

/**
 * Incoming Google Sheets Webhook for Two-Way Write-Backs
 * e.g. Triggered by Google Apps Script onChange / onEdit
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [body];

    const result = await googleSheetsService.processSheetWriteBack(rows);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Webhook:google-sheets] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
