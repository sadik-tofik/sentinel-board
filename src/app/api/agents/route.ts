import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateAgentSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: { ruleConfig: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(agents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = CreateAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const agent = await prisma.agent.create({
      data: {
        name: validation.data.name,
        ruleConfig: {
          create: {
            maxPositionSizeUsd: 1000,
            maxDrawdownPct: 10,
            maxCorrelatedPositions: 3,
            cooldownAfterLossMin: 15,
            maxOrdersPerMinute: 5,
            correlationGroups: {
              "BTC_CORRELATED": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT"],
              "PAYMENTS_L1": ["XLMUSDT", "TRXUSDT", "XRPUSDT"]
            }
          },
        },
      },
      include: {
        ruleConfig: true,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
