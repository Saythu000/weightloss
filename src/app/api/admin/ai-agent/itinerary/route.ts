import { NextResponse } from 'next/server';
import { itineraryPlanner } from '@/lib/agents/itinerary-planner';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const packages = await prisma.knowledgeBase.findMany({
      where: {
        isActive: true,
        category: 'PRODUCT_SPEC',
      },
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
      },
      orderBy: { title: 'asc' },
    });

    return NextResponse.json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error: any) {
    console.error('[API:itinerary] Error listing packages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      leadPhone,
      customerName,
      destination,
      groupSize,
      departureCity,
      travelDates,
      tripStyle,
      budgetPerPerson,
    } = body;

    let result;

    if (leadPhone) {
      result = await itineraryPlanner.generateForLeadPhone(leadPhone);
    } else {
      if (!destination) {
        return NextResponse.json(
          { success: false, error: 'Destination is required' },
          { status: 400 }
        );
      }
      result = await itineraryPlanner.planItinerary({
        customerName: customerName || 'Traveler',
        destination,
        groupSize: groupSize ? Number(groupSize) : 1,
        departureCity: departureCity || 'Hyderabad',
        travelDates: travelDates || 'Upcoming Weekend',
        tripStyle: tripStyle || 'Adventure',
        budgetPerPerson: budgetPerPerson || 'Flexible',
      });
    }

    return NextResponse.json({
      success: true,
      itinerary: result,
    });
  } catch (error: any) {
    console.error('[API:itinerary] Error planning itinerary:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
