import { prisma } from './prisma';
import { itineraryPlanner } from '@/lib/agents/itinerary-planner';

export interface DynamicQuestion {
  id: string;
  stepOrder: number;
  fieldKey: string;
  questionPrompt: string;
  validationType: string;
  options: string[] | null;
  isMandatory: boolean;
  isSkippable: boolean;
  isActive: boolean;
}

const FALLBACK_QUESTIONS: DynamicQuestion[] = [
  {
    id: 'def-1',
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
    id: 'def-2',
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
    id: 'def-3',
    stepOrder: 3,
    fieldKey: 'travel_dates',
    questionPrompt: 'When are you planning this trip? (e.g., Upcoming weekend, or specific dates)',
    validationType: 'TEXT',
    options: ['Upcoming Weekend', 'Next Weekend', 'Next Month', 'Flexible'],
    isMandatory: true,
    isSkippable: false,
    isActive: true,
  },
  {
    id: 'def-4',
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
    id: 'def-5',
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
    id: 'def-6',
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
    id: 'def-7',
    stepOrder: 7,
    fieldKey: 'customer_name',
    questionPrompt: 'May I know your name please?',
    validationType: 'TEXT',
    options: null,
    isMandatory: true,
    isSkippable: false,
    isActive: true,
  },
];

const activeSessionsCache = new Set<string>();

export function hasActiveSession(phoneOrJid: string): boolean {
  const cleanPhone = phoneOrJid.replace(/\D/g, '');
  return activeSessionsCache.has(cleanPhone);
}

export class IntakeWizard {
  /**
   * Loads active intake questions from PostgreSQL (dynamic schema) with fallback.
   */
  async getActiveQuestions(): Promise<DynamicQuestion[]> {
    try {
      const dbQuestions = await prisma.dynamicIntakeQuestion.findMany({
        where: { isActive: true },
        orderBy: { stepOrder: 'asc' },
      });
      if (dbQuestions && dbQuestions.length > 0) {
        return dbQuestions.map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? (q.options as string[]) : null,
        }));
      }
    } catch (e) {
      console.warn('[IntakeWizard] Error reading dynamic questions, using fallback:', e);
    }
    return FALLBACK_QUESTIONS;
  }

  /**
   * Main entry point for inbound messages on WhatsApp / Chat.
   */
  async handleInbound(phoneOrJid: string, text: string, category?: string): Promise<string | null> {
    const cleanPhone = phoneOrJid.replace(/\D/g, '');
    const cleanText = (text || '').trim();
    if (!cleanText) return null;

    const questions = await this.getActiveQuestions();
    if (questions.length === 0) return null;

    // Fetch or create IntakeSession for this phone
    let session = await prisma.intakeSession.findUnique({
      where: { phoneNumber: cleanPhone },
    }).catch(() => null);

    if (session && !session.isComplete) {
      activeSessionsCache.add(cleanPhone);
    } else {
      activeSessionsCache.delete(cleanPhone);
    }

    // If starting intake or greeting
    const isReset = ['restart', 'reset', 'start over'].includes(cleanText.toLowerCase());
    const isGreeting = ['hi', 'hello', 'namaste', 'hey', 'start', 'trip', 'trek', 'intake'].includes(cleanText.toLowerCase());

    if (!session || isReset || (session.isComplete && isGreeting)) {
      activeSessionsCache.add(cleanPhone);
      const firstQ = questions[0];
      session = await prisma.intakeSession.upsert({
        where: { phoneNumber: cleanPhone },
        update: {
          currentFieldKey: firstQ.fieldKey,
          collectedFields: {},
          status: 'IN_PROGRESS',
          isComplete: false,
          interruptionCount: 0,
        },
        create: {
          phoneNumber: cleanPhone,
          currentFieldKey: firstQ.fieldKey,
          collectedFields: {},
          status: 'IN_PROGRESS',
          isComplete: false,
          interruptionCount: 0,
        },
      });

      return this.formatQuestionMessage(firstQ, 1, questions.length, true);
    }

    if (session.isComplete) {
      return null;
    }

    // Determine current active question
    const currentFieldKey = session.currentFieldKey || questions[0].fieldKey;
    const currentIndex = questions.findIndex((q) => q.fieldKey === currentFieldKey);
    const currentQ = currentIndex >= 0 ? questions[currentIndex] : questions[0];

    const collectedFields = (session.collectedFields as Record<string, any>) || {};

    // Validate the answer
    const validatedValue = this.validateAnswer(currentQ, cleanText);

    if (validatedValue !== null) {
      collectedFields[currentQ.fieldKey] = validatedValue;

      // Find next question
      const nextIndex = currentIndex + 1;
      if (nextIndex < questions.length) {
        const nextQ = questions[nextIndex];
        await prisma.intakeSession.update({
          where: { id: session.id },
          data: {
            currentFieldKey: nextQ.fieldKey,
            collectedFields,
            interruptionCount: 0,
          },
        });

        return this.formatQuestionMessage(nextQ, nextIndex + 1, questions.length, false);
      } else {
        // All intake questions completed!
        activeSessionsCache.delete(cleanPhone);
        await prisma.intakeSession.update({
          where: { id: session.id },
          data: {
            currentFieldKey: null,
            collectedFields,
            status: 'COMPLETED',
            isComplete: true,
          },
        });

        // Generate customized itinerary via Agent 3 (Rohan)
        let generatedItinerary: any = null;
        try {
          generatedItinerary = await itineraryPlanner.planItinerary({
            customerName: collectedFields.customer_name || 'Traveler',
            destination: collectedFields.destination || 'Pondicherry',
            groupSize: collectedFields.group_size ? Number(collectedFields.group_size) : 1,
            departureCity: collectedFields.departure_city || 'Hyderabad',
            travelDates: collectedFields.travel_dates || 'Upcoming Weekend',
            tripStyle: collectedFields.trip_style || 'Adventure & Sightseeing',
            budgetPerPerson: collectedFields.budget_per_person || 'Flexible',
          });
        } catch (planErr) {
          console.error('[IntakeWizard] Error generating itinerary with Rohan:', planErr);
        }

        // Update or create Lead record with Customer Knowledge Profile & Itinerary
        try {
          await prisma.lead.upsert({
            where: { phoneNumber: cleanPhone },
            update: {
              name: collectedFields.customer_name || 'Traveler',
              intakeStatus: 'COMPLETED',
              healthFlags: collectedFields,
              partnershipDetails: generatedItinerary || undefined,
            },
            create: {
              phoneNumber: cleanPhone,
              name: collectedFields.customer_name || 'Traveler',
              category: 'CUSTOMER',
              intakeStatus: 'COMPLETED',
              healthFlags: collectedFields,
              partnershipDetails: generatedItinerary || undefined,
            },
          });
        } catch (e) {
          console.error('[IntakeWizard] Error syncing to Lead table:', e);
        }

        if (generatedItinerary?.whatsappMessage) {
          return `${this.formatCompletionMessage(collectedFields)}\n\n${generatedItinerary.whatsappMessage}`;
        }

        return this.formatCompletionMessage(collectedFields);
      }
    } else {
      // Reprompt with options
      let reprompt = `I didn't quite catch that. ${currentQ.questionPrompt}`;
      if (currentQ.validationType === 'NUMBER') {
        reprompt += `\n*(Please reply with a valid number)*`;
      } else if (currentQ.validationType === 'ENUM' && currentQ.options) {
        reprompt += `\n\n*Please choose one:* \n${currentQ.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
      }
      return reprompt;
    }
  }

  private validateAnswer(question: DynamicQuestion, text: string): any {
    const raw = text.trim();
    if (!raw) return null;

    if (question.isSkippable && ['skip', 'later', 'any', 'none'].includes(raw.toLowerCase())) {
      return 'Not specified';
    }

    switch (question.validationType) {
      case 'NUMBER': {
        const match = raw.match(/\d+/);
        if (match) return parseInt(match[0], 10);
        if (raw.toLowerCase().includes('solo') || raw.toLowerCase().includes('one')) return 1;
        if (raw.toLowerCase().includes('two') || raw.toLowerCase().includes('couple')) return 2;
        return null;
      }

      case 'CURRENCY': {
        const numMatch = raw.replace(/,/g, '').match(/\d+/);
        if (numMatch) return `₹${parseInt(numMatch[0], 10).toLocaleString('en-IN')}`;
        return raw;
      }

      case 'ENUM': {
        if (!question.options || question.options.length === 0) return raw;
        // Check numeric choice e.g. "1" or "2"
        const num = parseInt(raw, 10);
        if (!isNaN(num) && num >= 1 && num <= question.options.length) {
          return question.options[num - 1];
        }
        // Substring match
        const lower = raw.toLowerCase();
        const found = question.options.find((opt) => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase()));
        return found || raw;
      }

      default:
        return raw;
    }
  }

  private formatQuestionMessage(
    question: DynamicQuestion,
    stepNum: number,
    totalSteps: number,
    isFirst: boolean
  ): string {
    const parts: string[] = [];

    if (isFirst) {
      parts.push('🏔️ *Welcome to Trekatour Adventure Sales Assistant!*');
      parts.push("Let's plan your perfect getaway. Answer a few quick questions:\n");
    }

    parts.push(`*Step ${stepNum} of ${totalSteps}:*`);
    parts.push(question.questionPrompt);

    if (question.validationType === 'ENUM' && question.options && question.options.length > 0) {
      parts.push('');
      parts.push('*Reply with a number or name:*');
      question.options.forEach((opt, idx) => {
        parts.push(`  ${idx + 1}️⃣ ${opt}`);
      });
    }

    if (question.isSkippable) {
      parts.push('\n_(You can reply "skip" to skip this step)_');
    }

    return parts.join('\n');
  }

  private formatCompletionMessage(data: Record<string, any>): string {
    const dest = data.destination || 'Weekend Destination';
    const travelers = data.group_size || 2;
    const dates = data.travel_dates || 'Upcoming weekend';
    const city = data.departure_city || 'Hyderabad';
    const budget = data.budget_per_person || 'Standard';

    return [
      `🎉 *TREKATOUR TRIP INTAKE COMPLETE!*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📍 *Destination:* ${dest}`,
      `🏙️ *Departing From:* ${city}`,
      `👥 *Travelers:* ${travelers} Persons`,
      `📅 *Dates:* ${dates}`,
      `💰 *Target Budget:* ${budget}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *What happens next:*`,
      `1. Our AI Itinerary Agent is matching the best weekend packages for you.`,
      `2. You will receive an official PDF brochure & pricing breakdown shortly!`,
      ``,
      `_Feel free to ask any questions about stay, transport, or activities!_`,
    ].join('\n');
  }
}
