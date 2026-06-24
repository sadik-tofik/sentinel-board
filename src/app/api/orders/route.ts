import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { evaluateOrder, ProposedOrder, AgentState } from '@/lib/rules-engine';

const ProposedOrderSchema = z.object({
  agentId: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(['LONG', 'SHORT']),
  quantity: z.number().positive(),
  priceUsd: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ProposedOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const order: ProposedOrder = validation.data;

    // 1. Fetch Agent, RuleConfig, and data for AgentState
    const [agent, recentOrderCount, lastClosed, pnlAggregate] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: order.agentId },
        include: {
          ruleConfig: true,
          positions: { where: { status: 'OPEN' } },
        },
      }),
      prisma.orderEvent.count({
        where: {
          agentId: order.agentId,
          createdAt: { gte: new Date(Date.now() - 60000) },
        },
      }),
      prisma.position.findFirst({
        where: { agentId: order.agentId, status: 'CLOSED' },
        orderBy: { closedAt: 'desc' },
      }),
      prisma.position.aggregate({
        where: { agentId: order.agentId, status: 'CLOSED' },
        _sum: { pnlUsd: true },
      }),
    ]);

    if (!agent || !agent.ruleConfig) {
      return NextResponse.json({ error: 'Agent or RuleConfig not found' }, { status: 404 });
    }

    const realizedPnL = pnlAggregate._sum.pnlUsd || 0;
    const startingBalance = 10000;
    const equityUsd = startingBalance + realizedPnL;

    const state: AgentState = {
      equityUsd,
      highWaterMarkUsd: startingBalance > equityUsd ? startingBalance : equityUsd,
      openPositions: agent.positions.map(p => ({
        symbol: p.symbol,
        side: p.side,
        sizeUsd: p.sizeUsd
      })),
      recentOrderTimestamps: Array(recentOrderCount).fill(new Date()), // We only need the count for the rule motor
      mostRecentClosedPosition: lastClosed && lastClosed.closedAt ? {
        closedAt: lastClosed.closedAt,
        pnlUsd: lastClosed.pnlUsd || 0
      } : null
    };

    // 2. Evaluate Order
    const evaluation = evaluateOrder(order, state, agent.ruleConfig as any);

    // 3. Log OrderEvent regardless of outcome
    const orderEvent = await prisma.orderEvent.create({
      data: {
        agentId: order.agentId,
        symbol: order.symbol,
        side: order.side,
        requestedQty: order.quantity,
        requestedUsd: order.quantity * order.priceUsd,
        decision: evaluation.decision,
        ruleFired: evaluation.ruleFired,
        reason: evaluation.reason,
        rawPayload: body,
      },
    });

    // 4. If ALLOWED, create Position
    if (evaluation.decision === 'ALLOWED') {
      await prisma.position.create({
        data: {
          agentId: order.agentId,
          symbol: order.symbol,
          side: order.side,
          entryPrice: order.priceUsd,
          quantity: order.quantity,
          sizeUsd: order.quantity * order.priceUsd,
          status: 'OPEN',
        },
      });
    }

    // 5. Return result
    return NextResponse.json({
      decision: evaluation.decision,
      ruleFired: evaluation.ruleFired,
      reason: evaluation.reason,
      orderEventId: orderEvent.id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const orders = await prisma.orderEvent.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

