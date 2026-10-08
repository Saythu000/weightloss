import { NextResponse } from 'next/server';
import { getActiveDomainProfile, resetDomainProfile } from '@/lib/domain-analyzer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = getActiveDomainProfile();
    return NextResponse.json({ success: true, domainProfile: profile });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const resetProfile = resetDomainProfile();
    return NextResponse.json({
      success: true,
      message: 'Domain profile reset to default MotionSites AI Sales Workforce baseline',
      domainProfile: resetProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
