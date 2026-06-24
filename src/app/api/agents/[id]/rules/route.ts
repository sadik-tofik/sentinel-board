import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateRulesSchema = z.object({
  maxPositionSizeUsd: z.number().optional(),
  maxDrawdownPct: z.number().optional(),
  maxCorrelatedPositions: z.number().optional(),
  cooldownAfterLossMin: z.number().optional(),
  maxOrdersPerMinute: z.number().optional(),
  correlationGroups: z.record(z.string(), z.array(z.string())).optional(),

}).strict(); // Reject unknown fields

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = UpdateRulesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const updatedConfig = await prisma.ruleConfig.update({
      where: { agentId: id },
      data: validation.data as any,
    });


    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
