export interface ProposedOrder {
  agentId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  priceUsd: number;
}

export interface AgentState {
  equityUsd: number;
  highWaterMarkUsd: number;
  openPositions: Array<{ symbol: string; side: "LONG" | "SHORT"; sizeUsd: number }>;
  recentOrderTimestamps: Date[]; // all order attempts in the last 60s, any decision
  mostRecentClosedPosition: { closedAt: Date; pnlUsd: number } | null;
}

export interface RuleConfig {
  maxPositionSizeUsd: number;
  maxDrawdownPct: number;
  maxCorrelatedPositions: number;
  cooldownAfterLossMin: number;
  maxOrdersPerMinute: number;
  correlationGroups: Record<string, string[]>;
}

export interface EvaluationResult {
  decision: "ALLOWED" | "BLOCKED";
  ruleFired: string | null;
  reason: string;
}

export function checkRateLimit(
  _order: ProposedOrder,
  state: AgentState,
  config: RuleConfig
): EvaluationResult | null {
  if (state.recentOrderTimestamps.length >= config.maxOrdersPerMinute) {
    return {
      decision: "BLOCKED",
      ruleFired: "RATE_LIMIT",
      reason: `Rate limit exceeded: ${state.recentOrderTimestamps.length} orders in the last minute (max: ${config.maxOrdersPerMinute}).`,
    };
  }
  return null;
}

export function checkMaxPositionSize(
  order: ProposedOrder,
  _state: AgentState,
  config: RuleConfig
): EvaluationResult | null {
  const orderSizeUsd = order.quantity * order.priceUsd;
  if (orderSizeUsd > config.maxPositionSizeUsd) {
    return {
      decision: "BLOCKED",
      ruleFired: "MAX_POSITION_SIZE",
      reason: `Order size $${orderSizeUsd.toFixed(2)} exceeds maximum allowed position size $${config.maxPositionSizeUsd.toFixed(2)}.`,
    };
  }
  return null;
}

export function checkCooldownAfterLoss(
  _order: ProposedOrder,
  state: AgentState,
  config: RuleConfig
): EvaluationResult | null {
  const lastClosed = state.mostRecentClosedPosition;
  if (lastClosed && lastClosed.pnlUsd < 0) {
    const now = new Date();
    const minutesSinceLoss = (now.getTime() - lastClosed.closedAt.getTime()) / (1000 * 60);
    if (minutesSinceLoss < config.cooldownAfterLossMin) {
      const remaining = Math.ceil(config.cooldownAfterLossMin - minutesSinceLoss);
      return {
        decision: "BLOCKED",
        ruleFired: "COOLDOWN_AFTER_LOSS",
        reason: `Loss cooldown active. ${remaining} minute(s) remaining.`,
      };
    }
  }
  return null;
}

export function checkCorrelationLimit(
  order: ProposedOrder,
  state: AgentState,
  config: RuleConfig
): EvaluationResult | null {
  let matchedGroup: string | null = null;
  let groupSymbols: string[] = [];

  for (const [groupName, symbols] of Object.entries(config.correlationGroups)) {
    if (symbols.includes(order.symbol)) {
      matchedGroup = groupName;
      groupSymbols = symbols;
      break;
    }
  }

  if (matchedGroup) {
    const correlatedCount = state.openPositions.filter((pos) =>
      groupSymbols.includes(pos.symbol)
    ).length;

    if (correlatedCount >= config.maxCorrelatedPositions) {
      return {
        decision: "BLOCKED",
        ruleFired: "CORRELATION_LIMIT",
        reason: `Maximum correlated positions for group ${matchedGroup} reached (${correlatedCount}/${config.maxCorrelatedPositions}).`,
      };
    }
  }

  return null;
}

export function checkDrawdown(
  _order: ProposedOrder,
  state: AgentState,
  config: RuleConfig
): EvaluationResult | null {
  const drawdownUsd = state.highWaterMarkUsd - state.equityUsd;
  const drawdownPct = state.highWaterMarkUsd > 0 ? (drawdownUsd / state.highWaterMarkUsd) * 100 : 0;

  if (drawdownPct > config.maxDrawdownPct) {
    return {
      decision: "BLOCKED",
      ruleFired: "MAX_DRAWDOWN",
      reason: `Maximum drawdown exceeded: ${drawdownPct.toFixed(2)}% (max: ${config.maxDrawdownPct}%). All trading blocked.`,
    };
  }
  return null;
}

export function evaluateOrder(
  order: ProposedOrder,
  state: AgentState,
  config: RuleConfig
): EvaluationResult {
  const rules = [
    checkRateLimit,
    checkMaxPositionSize,
    checkCooldownAfterLoss,
    checkCorrelationLimit,
    checkDrawdown,
  ];

  for (const rule of rules) {
    const result = rule(order, state, config);
    if (result) return result;
  }

  return {
    decision: "ALLOWED",
    ruleFired: null,
    reason: "Passed all checks.",
  };
}
