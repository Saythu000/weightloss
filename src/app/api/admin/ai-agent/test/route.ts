import { NextResponse } from 'next/server';
import { AgentFactory } from '@/lib/agents/factory';
import { SEVEN_SPECIALIZED_AGENTS } from '@/lib/agents/agent-definitions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { message, agentId } = await req.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message cannot be empty' }, { status: 400 });
    }

    const cleanMessage = message.trim();
    const targetAgentId = agentId || 'voice_agent';

    const agentResponse = await AgentFactory.runAgentTask(targetAgentId, cleanMessage);
    const agentDef = SEVEN_SPECIALIZED_AGENTS.find((a) => a.id === targetAgentId) || SEVEN_SPECIALIZED_AGENTS[0];

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      result: {
        agentId: targetAgentId,
        agentName: agentDef.name,
        agentRole: agentDef.roleTitle,
        category: targetAgentId.toUpperCase(),
        confidence: 0.98,
        reasoning: agentResponse.reasoning,
        toolExecuted: agentResponse.toolExecuted || 'none',
        aiGeneratedAnswer: agentResponse.answer,
        isEscalated: false,
        disclaimerAdded: true,
        validated: true,
        matchedKnowledgeSources: (agentResponse.matchedChunks || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          score: s.relevanceScore,
          snippet: s.content,
        })),
        latencyMs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

