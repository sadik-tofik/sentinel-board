import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'clv_rogue_agent_01';
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('--- Isolated Rate Limit Test ---');
  console.log('Cleaning database...');
  await prisma.orderEvent.deleteMany({});
  await prisma.position.deleteMany({});
  
  // Verify maxOrdersPerMinute is 10
  const agent = await prisma.agent.findUnique({
    where: { id: AGENT_ID },
    include: { ruleConfig: true }
  });
  const limit = agent?.ruleConfig?.maxOrdersPerMinute || 0;
  console.log(`Agent limit is: ${limit}`);

  const results: any[] = [];
  
  console.log('\nFiring 12 orders back-to-back...');
  for (let i = 1; i <= 12; i++) {
    const start = new Date();
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        symbol: 'TESTUSDT', // Uncorrelated
        side: 'LONG',
        quantity: 1,
        priceUsd: 10 // $10 total, well under $1000 limit
      })
    });
    const data = await res.json();
    results.push({
      index: i,
      sentAt: start.toISOString().split('T')[1],
      decision: data.decision,
      rule: data.ruleFired || '-'
    });
  }

  console.log('\nResults Table:');
  console.log('Order # | Sent At      | Decision | Rule');
  console.log('-------------------------------------------');
  results.forEach(r => {
    console.log(`${r.index.toString().padEnd(8)} | ${r.sentAt.padEnd(12)} | ${r.decision.padEnd(8)} | ${r.rule}`);
  });

  console.log('\nDatabase Verification (OrderEvent createdAt timestamps):');
  const events = await prisma.orderEvent.findMany({
    where: { agentId: AGENT_ID },
    orderBy: { createdAt: 'asc' }
  });
  events.forEach((e, idx) => {
    console.log(`${idx + 1}: ${e.createdAt.toISOString()}`);
  });
}

main().catch(console.error);
