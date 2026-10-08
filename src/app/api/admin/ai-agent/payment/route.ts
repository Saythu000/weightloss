import { NextResponse } from 'next/server';
import { paymentAgentService } from '@/lib/agents/payment-agent';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const paidLeadsCount = await prisma.lead.count({
      where: { paymentStatus: 'PAID' },
    });

    return NextResponse.json({
      success: true,
      agent: 'PaymentVoucherAgent (Arjun)',
      gateway: 'Razorpay (256-bit SSL Encrypted)',
      stats: {
        totalPaidBookings: paidLeadsCount,
      },
    });
  } catch (error: any) {
    console.error('[API:payment] Error reading payment stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadPhone, action, customAmount, paymentId } = body;

    if (!leadPhone) {
      return NextResponse.json(
        { success: false, error: 'leadPhone is required' },
        { status: 400 }
      );
    }

    if (action === 'CONFIRM_PAYMENT') {
      const voucherResult = await paymentAgentService.confirmPaymentAndIssueVoucher(
        leadPhone,
        paymentId
      );
      return NextResponse.json({
        success: true,
        action: 'CONFIRM_PAYMENT',
        result: voucherResult,
      });
    }

    // Default action: GENERATE_LINK
    const linkResult = await paymentAgentService.generatePaymentLinkForLead(
      leadPhone,
      customAmount
    );

    return NextResponse.json({
      success: true,
      action: 'GENERATE_LINK',
      result: linkResult,
    });
  } catch (error: any) {
    console.error('[API:payment] Error processing payment action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
