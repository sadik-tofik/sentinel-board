import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        ruleConfig: true,
        positions: {
          where: { status: 'OPEN' },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Compute equityUsd
    // Formula: Starting balance ($10,000) + Net Realized PnL + Unrealized PnL
    const allPositions = await prisma.position.findMany({
      where: { agentId: id },
    });

    const realizedPnL = allPositions
      .filter((p) => p.status === 'CLOSED')
      .reduce((sum, p) => sum + (p.pnlUsd || 0), 0);

    // For unrealized PnL, we'd need current market prices. 
    // Since we don't have a price feed yet, we'll assume unrealized PnL is 0 for now.
    // In a real app, we'd fetch prices and compare with entryPrice.
    const unrealizedPnL = 0; 

    const startingBalance = 10000;
    const equityUsd = startingBalance + realizedPnL + unrealizedPnL;

    return NextResponse.json({
      ...agent,
      equityUsd,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
