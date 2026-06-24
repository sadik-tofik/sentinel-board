import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const events = await prisma.orderEvent.findMany({
      where: { agentId },
    });

    const totalAttempted = events.length;
    const totalAllowed = events.filter((e) => e.decision === 'ALLOWED').length;
    const totalBlocked = events.filter((e) => e.decision === 'BLOCKED').length;

    const blockRateByRule: Record<string, number> = {};
    events.forEach((e) => {
      if (e.decision === 'BLOCKED' && e.ruleFired) {
        blockRateByRule[e.ruleFired] = (blockRateByRule[e.ruleFired] || 0) + 1;
      }
    });

    // Convert counts to rates (counts for now as per "blockRateByRule: Record<string, number>" usually implies count or percentage)
    // The user said "blockRateByRule" so I'll provide counts for now.

    return NextResponse.json({
      totalAttempted,
      totalAllowed,
      totalBlocked,
      blockRateByRule,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
