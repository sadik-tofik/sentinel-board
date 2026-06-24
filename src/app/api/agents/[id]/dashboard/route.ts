import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    // 1. Fetch Agent (which includes RuleConfig and Open Positions)
    // 2. Fetch Stats
    // 3. Fetch Recent Orders
    // 4. Fetch Realized PnL summary
    const [agent, statsEvents, orders, realizedPnLData] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          ruleConfig: true,
          positions: {
            where: { status: 'OPEN' },
          },
        },
      }),
      prisma.orderEvent.findMany({
        where: { agentId },
        select: { decision: true, ruleFired: true },
      }),
      prisma.orderEvent.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.position.aggregate({
        where: { agentId, status: 'CLOSED' },
        _sum: { pnlUsd: true },
      })
    ]);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Compute stats from events
    const totalAttempted = statsEvents.length;
    const totalAllowed = statsEvents.filter((e) => e.decision === 'ALLOWED').length;
    const totalBlocked = statsEvents.filter((e) => e.decision === 'BLOCKED').length;
    const blockRateByRule: Record<string, number> = {};
    statsEvents.forEach((e) => {
      if (e.decision === 'BLOCKED' && e.ruleFired) {
        blockRateByRule[e.ruleFired] = (blockRateByRule[e.ruleFired] || 0) + 1;
      }
    });

    // Compute equityUsd (faithful to backend logic)
    const realizedPnL = realizedPnLData._sum.pnlUsd || 0;
    const startingBalance = 10000;
    const equityUsd = startingBalance + realizedPnL;

    return NextResponse.json({
      agent: {
        ...agent,
        equityUsd,
      },
      stats: {
        totalAttempted,
        totalAllowed,
        totalBlocked,
        blockRateByRule,
      },
      orders,
    }, {
      headers: {
        'Cache-Control': 's-maxage=1, stale-while-revalidate=2',
      }
    });
  } catch (error: any) {
    console.error('Consolidated Dashboard API Error:', error);
    // If it's a prisma/db connection error, still return a 500 but with clarity
    return NextResponse.json(
      { error: 'Database connection failed', message: error.message },
      { status: 500 }
    );
  }
}
