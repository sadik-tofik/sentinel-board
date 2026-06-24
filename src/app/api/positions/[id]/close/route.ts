import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ClosePositionSchema = z.object({
  exitPriceUsd: z.number().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = ClosePositionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const position = await prisma.position.findUnique({
      where: { id },
    });

    if (!position || position.status === 'CLOSED') {
      return NextResponse.json({ error: 'Open position not found' }, { status: 404 });
    }

    const { exitPriceUsd } = validation.data;
    
    // Compute PnL
    // Long: (Exit - Entry) * Qty
    // Short: (Entry - Exit) * Qty
    const pnlUsd = position.side === 'LONG' 
      ? (exitPriceUsd - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPriceUsd) * position.quantity;

    const closedPosition = await prisma.position.update({
      where: { id },
      data: {
        pnlUsd,
        closedAt: new Date(),
        status: 'CLOSED',
      },
    });


    return NextResponse.json(closedPosition);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
