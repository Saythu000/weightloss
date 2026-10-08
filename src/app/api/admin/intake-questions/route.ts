import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_TREKATOUR_QUESTIONS = [
  {
    stepOrder: 1,
    fieldKey: 'destination',
    questionPrompt: 'Which destination are you planning to explore with Trekatour? (e.g., Gokarna, Pondicherry, Coorg, Manali, Dandeli)',
    validationType: 'ENUM',
    options: ['Gokarna', 'Pondicherry', 'Coorg', 'Manali', 'Dandeli', 'Chikmagalur'],
    isMandatory: true,
    isSkippable: false,
    isActive: true,
  },
  {
    stepOrder: 2,
    fieldKey: 'departure_city',
    questionPrompt: 'Which city will you be traveling from? (e.g., Hyderabad, Bangalore, Chennai)',
    validationType: 'TEXT',
    options: ['Hyderabad', 'Bangalore', 'Chennai'],
    isMandatory: true,
    isSkippable: false,
    isActive: true,
  },
  {
    stepOrder: 3,
    fieldKey: 'travel_dates',
    questionPrompt: 'When are you planning this trip? (e.g., Upcoming weekend, specific dates)',
    validationType: 'TEXT',
    options: ['Upcoming Weekend', 'Next Weekend', 'Next Month', 'Flexible'],
    isMandatory: true,
    isSkippable: false,
    isActive: true,
  },
  {
    stepOrder: 4,
    fieldKey: 'group_size',
    questionPrompt: 'How many people are traveling in your group (including yourself)?',
    validationType: 'NUMBER',
    options: ['Solo (1)', 'Couple (2)', '3-4 Friends', '5+ Group'],
    isMandatory: true,
    isSkippable: false,
    isActive: true,
  },
  {
    stepOrder: 5,
    fieldKey: 'budget_per_person',
    questionPrompt: 'What is your approximate budget per person for this trip?',
    validationType: 'CURRENCY',
    options: ['Under ₹4,000', '₹4,000 - ₹6,000', '₹6,000 - ₹10,000', '₹10,000+'],
    isMandatory: false,
    isSkippable: true,
    isActive: true,
  },
  {
    stepOrder: 6,
    fieldKey: 'trip_style',
    questionPrompt: 'What kind of experience are you looking for?',
    validationType: 'ENUM',
    options: ['Beach Camping & Watersports', 'Trekking & Adventure', 'Sightseeing & Leisure', 'Party & Nightlife'],
    isMandatory: false,
    isSkippable: true,
    isActive: true,
  },
  {
    stepOrder: 7,
    fieldKey: 'customer_name',
    questionPrompt: 'May I know your name please?',
    validationType: 'TEXT',
    options: Prisma.JsonNull,
    isMandatory: true,
    isSkippable: false,
    isActive: true,
  },
];

/**
 * GET /api/admin/intake-questions
 * Returns all configured intake questions. Automatically seeds defaults if empty.
 */
export async function GET(req: NextRequest) {
  try {
    let questions = await prisma.dynamicIntakeQuestion.findMany({
      orderBy: { stepOrder: 'asc' },
    });

    // Auto-seed Trekatour defaults on first load
    if (questions.length === 0) {
      for (const q of DEFAULT_TREKATOUR_QUESTIONS) {
        await prisma.dynamicIntakeQuestion.create({ data: q });
      }
      questions = await prisma.dynamicIntakeQuestion.findMany({
        orderBy: { stepOrder: 'asc' },
      });
    }

    return NextResponse.json({ success: true, questions });
  } catch (err: any) {
    console.error('[API Intake Questions GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/intake-questions
 * Creates a new intake question or bulk reorders existing questions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk reordering
    if (Array.isArray(body.reorderList)) {
      const updates = body.reorderList.map((item: { id: string; stepOrder: number }) =>
        prisma.dynamicIntakeQuestion.update({
          where: { id: item.id },
          data: { stepOrder: item.stepOrder },
        })
      );
      await Promise.all(updates);
      const questions = await prisma.dynamicIntakeQuestion.findMany({
        orderBy: { stepOrder: 'asc' },
      });
      return NextResponse.json({ success: true, questions });
    }

    // Create single question
    const { fieldKey, questionPrompt, validationType, options, isMandatory, isSkippable, stepOrder } = body;
    if (!fieldKey || !questionPrompt) {
      return NextResponse.json({ success: false, error: 'fieldKey and questionPrompt are required' }, { status: 400 });
    }

    const currentMax = await prisma.dynamicIntakeQuestion.aggregate({
      _max: { stepOrder: true },
    });
    const calculatedStepOrder = stepOrder || (currentMax._max.stepOrder || 0) + 1;

    const question = await prisma.dynamicIntakeQuestion.create({
      data: {
        stepOrder: calculatedStepOrder,
        fieldKey: fieldKey.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'),
        questionPrompt,
        validationType: validationType || 'TEXT',
        options: options || null,
        isMandatory: isMandatory !== undefined ? isMandatory : true,
        isSkippable: !!isSkippable,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, question });
  } catch (err: any) {
    console.error('[API Intake Questions POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/intake-questions
 * Updates an existing intake question.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, fieldKey, questionPrompt, validationType, options, isMandatory, isSkippable, isActive, stepOrder } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });
    }

    const updated = await prisma.dynamicIntakeQuestion.update({
      where: { id },
      data: {
        fieldKey: fieldKey ? fieldKey.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_') : undefined,
        questionPrompt,
        validationType,
        options: options !== undefined ? options : undefined,
        isMandatory,
        isSkippable,
        isActive,
        stepOrder,
      },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (err: any) {
    console.error('[API Intake Questions PUT] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/intake-questions
 * Deletes an intake question by ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });
    }

    await prisma.dynamicIntakeQuestion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('[API Intake Questions DELETE] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
