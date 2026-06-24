/**
 * SentinelBoard — Rogue Agent Simulator
 * ======================================
 * Simulates a misbehaving trading agent calling the SentinelBoard /api/orders
 * interceptor. Demonstrates all 5 risk rules firing with real HTTP calls and
 * real database writes. Nothing here fabricates outcomes; the rules engine
 * determines every ALLOWED/BLOCKED decision in real time.
 *
 * Usage:
 *   pnpm dev         (in one terminal)
 *   pnpm demo        (in another terminal)
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const AGENT_NAME = 'rogue-agent-01';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRequest {
  agentId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  priceUsd: number;
}

interface OrderResponse {
  decision: 'ALLOWED' | 'BLOCKED';
  ruleFired: string | null;
  reason: string;
  orderEventId: string;
}

interface LogEntry {
  step: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  timestamp: string;
}

// ─── Utilities ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const log = (step: string, symbol: string, side: string, sizeUsd: number, res: OrderResponse) => {
  const timestamp = new Date().toISOString();
  const ruleTag = res.ruleFired ? `[${res.ruleFired}]` : '[PASS]';
  const icon = res.decision === 'ALLOWED' ? '✅' : '🚫';
  console.log(
    `[${timestamp}] ${icon} ${step.padEnd(30)} | ${side} ${symbol.padEnd(10)} $${sizeUsd.toFixed(2).padStart(9)} | ${res.decision.padEnd(7)} ${ruleTag.padEnd(22)} | ${res.reason}`
  );
};

async function postOrder(payload: OrderRequest): Promise<OrderResponse> {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json() as Promise<OrderResponse>;
}

async function closePosition(positionId: string, exitPriceUsd: number) {
  const res = await fetch(`${BASE_URL}/api/positions/${positionId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exitPriceUsd }),
  });
  if (!res.ok) throw new Error(`Close position failed: ${await res.text()}`);
  return res.json();
}

async function getAgentState(agentId: string) {
  const res = await fetch(`${BASE_URL}/api/agents/${agentId}`);
  if (!res.ok) throw new Error(`Get agent failed: ${await res.text()}`);
  return res.json();
}

async function getStats(agentId: string) {
  const res = await fetch(`${BASE_URL}/api/stats?agentId=${agentId}`);
  if (!res.ok) throw new Error(`Get stats failed: ${await res.text()}`);
  return res.json();
}

// ─── Main Simulator ────────────────────────────────────────────────────────

async function main() {
  const runLog: LogEntry[] = [];
  const logTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(process.cwd(), 'logs', `demo-run-${logTimestamp}.json`);
  fs.mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true });

  // ── Get the seeded agent ──────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  🛡️  SentinelBoard — Rogue Agent Simulator');
  console.log('════════════════════════════════════════════════════════════════\n');

  const agentsRes = await fetch(`${BASE_URL}/api/agents`);
  const agents = await agentsRes.json() as Array<{ id: string; name: string; ruleConfig: Record<string, unknown> }>;
  const agent = agents.find((a) => a.name === AGENT_NAME);

  if (!agent) {
    throw new Error(`Agent "${AGENT_NAME}" not found. Run: pnpm prisma db seed`);
  }

  const AGENT_ID = agent.id;
  const ruleConfig = agent.ruleConfig as {
    maxPositionSizeUsd: number;
    correlationGroups: Record<string, string[]>;
    maxCorrelatedPositions: number;
    maxOrdersPerMinute: number;
    cooldownAfterLossMin: number;
  };

  console.log(`Agent: ${AGENT_NAME} (id: ${AGENT_ID})`);
  const drawdown = (agent.ruleConfig as any).maxDrawdownPct;
  console.log(`Rules: maxSize=$${ruleConfig.maxPositionSizeUsd} | maxDrawdown=${drawdown}% | maxCorrelated=${ruleConfig.maxCorrelatedPositions} | cooldown=${ruleConfig.cooldownAfterLossMin}min | rateLimit=${ruleConfig.maxOrdersPerMinute}/min`);
  console.log('');
  console.log('  step                           | side symbol      notional | decision rule                   | reason');
  console.log('─'.repeat(120));

  // ── STEP 1: Normal orders (expect ALLOWED) ────────────────────────────────
  console.log('\n— STEP 1: Normal orders on uncorrelated symbols (expect ALLOWED) —');

  const normalOrders: OrderRequest[] = [
    { agentId: AGENT_ID, symbol: 'XRPUSDT',  side: 'LONG',  quantity: 400,   priceUsd: 0.55 },  // $220
    { agentId: AGENT_ID, symbol: 'LINKUSDT', side: 'SHORT', quantity: 20,    priceUsd: 14.00 }, // $280
    { agentId: AGENT_ID, symbol: 'ADAUSDT',  side: 'LONG',  quantity: 800,   priceUsd: 0.45 },  // $360
  ];

  const allowedPositionIds: string[] = [];

  for (const order of normalOrders) {
    const res = await postOrder(order);
    const sizeUsd = order.quantity * order.priceUsd;
    log('STEP 1 – Normal', order.symbol, order.side, sizeUsd, res);
    runLog.push({ step: 'STEP 1 – Normal', request: order as unknown as Record<string, unknown>, response: res as unknown as Record<string, unknown>, timestamp: new Date().toISOString() });

    if (res.decision === 'ALLOWED' && res.orderEventId) {
      // Fetch the position id for later use
      const state = await getAgentState(AGENT_ID);
      const openPos = state.positions?.find((p: { symbol: string; id: string }) => p.symbol === order.symbol);
      if (openPos) allowedPositionIds.push(openPos.id);
    }
    await sleep(1500);
  }

  // ── STEP 2: Oversized order (expect BLOCKED by MAX_POSITION_SIZE) ──────────
  console.log('\n— STEP 2: Oversized order (expect BLOCKED — MAX_POSITION_SIZE) —');
  await sleep(1000);

  const bigOrder: OrderRequest = { agentId: AGENT_ID, symbol: 'SOLUSDT', side: 'LONG', quantity: 50, priceUsd: 150 }; // $7,500
  const bigRes = await postOrder(bigOrder);
  log('STEP 2 – Oversized', bigOrder.symbol, bigOrder.side, bigOrder.quantity * bigOrder.priceUsd, bigRes);
  runLog.push({ step: 'STEP 2 – Oversized', request: bigOrder as unknown as Record<string, unknown>, response: bigRes as unknown as Record<string, unknown>, timestamp: new Date().toISOString() });
  await sleep(1500);

  // ── STEP 3: Loss + cooldown (expect BLOCKED by COOLDOWN_AFTER_LOSS) ────────
  console.log('\n— STEP 3: Close position at a loss, then immediately re-enter (expect BLOCKED — COOLDOWN_AFTER_LOSS) —');
  await sleep(1000);

  if (allowedPositionIds.length > 0) {
    const posId = allowedPositionIds[0];

    // Close at a loss — fetch current entry first for context
    const state = await getAgentState(AGENT_ID);
    const pos = state.positions?.find((p: { id: string; entryPrice: number; symbol: string }) => p.id === posId);
    const lossExit = pos ? pos.entryPrice * 0.85 : 0.40; // 15% below entry = definite loss

    console.log(`   Closing position ${posId} (symbol=${pos?.symbol}) at exit=$${lossExit.toFixed(4)} (entry=$${pos?.entryPrice})`);
    const closeRes = await closePosition(posId, lossExit);
    console.log(`   ↳ Position closed | pnlUsd=${closeRes.pnlUsd?.toFixed(4)} | status=${closeRes.status}`);
    runLog.push({ step: 'STEP 3 – Close at loss', request: { positionId: posId, exitPriceUsd: lossExit }, response: closeRes, timestamp: new Date().toISOString() });
    
    await sleep(1000);

    const cooldownOrder: OrderRequest = { agentId: AGENT_ID, symbol: 'BNBUSDT', side: 'LONG', quantity: 1, priceUsd: 400 }; // $400
    const cooldownRes = await postOrder(cooldownOrder);
    log('STEP 3 – Post-loss', cooldownOrder.symbol, cooldownOrder.side, cooldownOrder.quantity * cooldownOrder.priceUsd, cooldownRes);
    runLog.push({ step: 'STEP 3 – Post-loss order', request: cooldownOrder as unknown as Record<string, unknown>, response: cooldownRes as unknown as Record<string, unknown>, timestamp: new Date().toISOString() });
    
    // Genuinely wait out the cooldown (e.g. 1 min + buffer)
    const waitSec = (ruleConfig.cooldownAfterLossMin * 60) + 5;
    console.log(`\n   ⏳ Genuinely waiting ${waitSec}s for loss cooldown to expire...`);
    await sleep(waitSec * 1000);
  }
  await sleep(1500);

  // ── STEP 4: Correlation breach ────────────────────────────────────────────
  console.log('\n— STEP 4: Fill correlation group then try one more (expect BLOCKED — CORRELATION_LIMIT) —');
  await sleep(1000);

  // Use BTC_CORRELATED group: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT"]
  // Already have some open from step 1 — fill remaining slots then attempt one more
  const corrGroup = ruleConfig.correlationGroups['BTC_CORRELATED'] ?? ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  const stateBeforeCorr = await getAgentState(AGENT_ID);
  const openCorrSymbols: string[] = (stateBeforeCorr.positions ?? [])
    .filter((p: { status: string; symbol: string }) => p.status === 'OPEN' && corrGroup.includes(p.symbol))
    .map((p: { symbol: string }) => p.symbol);

  const max = ruleConfig.maxCorrelatedPositions;
  const needed = max - openCorrSymbols.length;

  console.log(`   Currently open in BTC_CORRELATED: ${openCorrSymbols.join(', ') || 'none'} (${openCorrSymbols.length}/${max})`);
  console.log(`   Need to open ${needed} more to reach limit, then attempt a ${max + 1}st`);

  const availableForCorr = corrGroup.filter((s) => !openCorrSymbols.includes(s));
  for (let i = 0; i < Math.min(needed, availableForCorr.length); i++) {
    const fillOrder: OrderRequest = { agentId: AGENT_ID, symbol: availableForCorr[i], side: 'LONG', quantity: 0.001, priceUsd: 30000 };
    const fillRes = await postOrder(fillOrder);
    log(`STEP 4 – Fill corr[${i + 1}/${needed}]`, fillOrder.symbol, fillOrder.side, fillOrder.quantity * fillOrder.priceUsd, fillRes);
    runLog.push({ step: `STEP 4 – Fill correlation group`, request: fillOrder as unknown as Record<string, unknown>, response: fillRes as unknown as Record<string, unknown>, timestamp: new Date().toISOString() });
    await sleep(1500);
  }

  // Now trigger the block
  const breachOrder: OrderRequest = { agentId: AGENT_ID, symbol: corrGroup[0], side: 'LONG', quantity: 0.001, priceUsd: 30000 };
  const breachRes = await postOrder(breachOrder);
  log('STEP 4 – Corr breach', breachOrder.symbol, breachOrder.side, breachOrder.quantity * breachOrder.priceUsd, breachRes);
  runLog.push({ step: 'STEP 4 – Correlation breach', request: breachOrder as unknown as Record<string, unknown>, response: breachRes as unknown as Record<string, unknown>, timestamp: new Date().toISOString() });
  await sleep(1500);

  // ── STEP 5: Rate limit burst ──────────────────────────────────────────────
  console.log(`\n— STEP 5: 15 rapid-fire orders — limit is ${ruleConfig.maxOrdersPerMinute}/min (expect later ones BLOCKED — RATE_LIMIT) —`);
  await sleep(1000);

  for (let i = 1; i <= 15; i++) {
    const burstOrder: OrderRequest = { agentId: AGENT_ID, symbol: 'DOGEUSDT', side: 'LONG', quantity: 1000, priceUsd: 0.15 }; // $150 — under size limit
    const burstRes = await postOrder(burstOrder);
    log(`STEP 5 – Burst[${i}/15]`, burstOrder.symbol, burstOrder.side, burstOrder.quantity * burstOrder.priceUsd, burstRes);
    runLog.push({ step: `STEP 5 – Rate limit burst ${i}`, request: { ...burstOrder, burstIndex: i } as unknown as Record<string, unknown>, response: burstRes as unknown as Record<string, unknown>, timestamp: new Date().toISOString() });
    // No delay — intentional burst to trigger rate limit
  }

  // ── Final stats ────────────────────────────────────────────────────────────
  await sleep(1000);
  console.log('\n' + '═'.repeat(120));
  const stats = await getStats(AGENT_ID);
  console.log('\n  📊  Final Stats (from GET /api/stats)');
  console.log('─'.repeat(50));
  console.log(`  Total attempted : ${stats.totalAttempted}`);
  console.log(`  ✅ Allowed      : ${stats.totalAllowed}`);
  console.log(`  🚫 Blocked      : ${stats.totalBlocked}`);
  console.log(`  Math check      : ${stats.totalAllowed} + ${stats.totalBlocked} = ${stats.totalAllowed + stats.totalBlocked} (== ${stats.totalAttempted}? ${stats.totalAllowed + stats.totalBlocked === stats.totalAttempted ? '✅' : '❌'})`);
  console.log('\n  Blocks by rule:');
  for (const [rule, count] of Object.entries(stats.blockRateByRule)) {
    console.log(`    ${rule.padEnd(25)} ${count}`);
  }
  const ruleSum = Object.values(stats.blockRateByRule as Record<string, number>).reduce((a, b) => a + b, 0);
  console.log(`\n  Rule sum check  : ${ruleSum} == totalBlocked ${stats.totalBlocked}? ${ruleSum === stats.totalBlocked ? '✅' : '❌'}`);

  runLog.push({ step: 'FINAL STATS', request: { agentId: AGENT_ID }, response: stats, timestamp: new Date().toISOString() });

  // ── Write log file ─────────────────────────────────────────────────────────
  fs.writeFileSync(logPath, JSON.stringify(runLog, null, 2));
  console.log(`\n  📁  Log written → ${logPath}`);
  console.log('═'.repeat(120) + '\n');
}

main().catch((err) => {
  console.error('\n[SIMULATOR ERROR]', err.message);
  process.exit(1);
});
