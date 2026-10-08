import { NextResponse } from 'next/server';
import { pricingCalculator, VALID_PROMO_CODES, MAX_MARGIN_DISCOUNT_PERCENT } from '@/lib/agents/pricing-calculator';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    rules: {
      maxMarginDiscountPercent: MAX_MARGIN_DISCOUNT_PERCENT,
      groupTiers: [
        { minPax: 1, maxPax: 3, discountPercent: 0, label: 'Standard Rate' },
        { minPax: 4, maxPax: 7, discountPercent: 5, label: 'Friends & Group Discount' },
        { minPax: 8, maxPax: 15, discountPercent: 10, label: 'Squad Discount' },
        { minPax: 16, maxPax: 999, discountPercent: 15, label: 'VIP Enterprise Discount' },
      ],
      promoCodes: VALID_PROMO_CODES,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      leadPhone,
      customerName,
      destination,
      groupSize,
      basePrice,
      advancePerPerson,
      promoCode,
    } = body;

    let quote;

    if (leadPhone) {
      quote = await pricingCalculator.generateForLeadPhone(leadPhone, promoCode);
    } else {
      quote = pricingCalculator.computeQuote({
        customerName: customerName || 'Traveler',
        destination: destination || 'Weekend Getaway',
        groupSize: groupSize ? Number(groupSize) : 1,
        basePricePerPerson: basePrice ? Number(basePrice) : 7499,
        advancePerPerson: advancePerPerson ? Number(advancePerPerson) : undefined,
        promoCode,
      });
    }

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error: any) {
    console.error('[API:pricing] Error calculating quote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
