import { describe, it, expect } from 'vitest'
import {
  ProposedOrder,
  AgentState,
  RuleConfig,
  evaluateOrder,
  checkRateLimit,
  checkMaxPositionSize,
  checkCooldownAfterLoss,
  checkCorrelationLimit,
  checkDrawdown
} from './rules-engine'

const defaultConfig: RuleConfig = {
  maxPositionSizeUsd: 1000,
  maxDrawdownPct: 10,
  maxCorrelatedPositions: 3,
  cooldownAfterLossMin: 15,
  maxOrdersPerMinute: 5,
  correlationGroups: {
    "BTC_CORRELATED": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  }
}

const defaultState: AgentState = {
  equityUsd: 10000,
  highWaterMarkUsd: 10000,
  openPositions: [],
  recentOrderTimestamps: [],
  mostRecentClosedPosition: null
}

const sampleOrder: ProposedOrder = {
  agentId: 'agent-1',
  symbol: 'BTCUSDT',
  side: 'LONG',
  quantity: 0.1,
  priceUsd: 30000 // Total size: $3000 (exceeds default max)
}

describe('Rules Engine', () => {
  describe('checkRateLimit', () => {
    it('should block if rate limit is reached', () => {
      const state = { ...defaultState, recentOrderTimestamps: Array(5).fill(new Date()) }
      const res = checkRateLimit(sampleOrder, state, defaultConfig)
      expect(res?.decision).toBe('BLOCKED')
      expect(res?.ruleFired).toBe('RATE_LIMIT')
    })

    it('should pass if under rate limit', () => {
      const state = { ...defaultState, recentOrderTimestamps: Array(4).fill(new Date()) }
      const res = checkRateLimit(sampleOrder, state, defaultConfig)
      expect(res).toBeNull()
    })
  })

  describe('checkMaxPositionSize', () => {
    it('should block if order size is too large', () => {
      const order = { ...sampleOrder, quantity: 1 } // $30,000
      const res = checkMaxPositionSize(order, defaultState, defaultConfig)
      expect(res?.decision).toBe('BLOCKED')
      expect(res?.ruleFired).toBe('MAX_POSITION_SIZE')
    })

    it('should pass if order size is within limit', () => {
      const order = { ...sampleOrder, quantity: 0.01 } // $300
      const res = checkMaxPositionSize(order, defaultState, defaultConfig)
      expect(res).toBeNull()
    })
  })

  describe('checkCooldownAfterLoss', () => {
    it('should block if recently closed a loss', () => {
      const lossTime = new Date(Date.now() - 5 * 60 * 1000) // 5 mins ago
      const state = { ...defaultState, mostRecentClosedPosition: { closedAt: lossTime, pnlUsd: -100 } }
      const res = checkCooldownAfterLoss(sampleOrder, state, defaultConfig)
      expect(res?.decision).toBe('BLOCKED')
      expect(res?.ruleFired).toBe('COOLDOWN_AFTER_LOSS')
    })

    it('should pass if loss was long ago', () => {
      const lossTime = new Date(Date.now() - 20 * 60 * 1000) // 20 mins ago
      const state = { ...defaultState, mostRecentClosedPosition: { closedAt: lossTime, pnlUsd: -100 } }
      const res = checkCooldownAfterLoss(sampleOrder, state, defaultConfig)
      expect(res).toBeNull()
    })

    it('should pass if last trade was a profit', () => {
      const profitTime = new Date(Date.now() - 5 * 60 * 1000)
      const state = { ...defaultState, mostRecentClosedPosition: { closedAt: profitTime, pnlUsd: 100 } }
      const res = checkCooldownAfterLoss(sampleOrder, state, defaultConfig)
      expect(res).toBeNull()
    })
  })

  describe('checkCorrelationLimit', () => {
    it('should block if group correlation limit reached', () => {
      const state = { 
        ...defaultState, 
        openPositions: [
          { symbol: 'BTCUSDT', side: 'LONG', sizeUsd: 500 },
          { symbol: 'ETHUSDT', side: 'LONG', sizeUsd: 500 },
          { symbol: 'SOLUSDT', side: 'LONG', sizeUsd: 500 },
        ] as any
      }
      const res = checkCorrelationLimit(sampleOrder, state, defaultConfig)
      expect(res?.decision).toBe('BLOCKED')
      expect(res?.ruleFired).toBe('CORRELATION_LIMIT')
    })

    it('should pass if symbol is not in a group', () => {
      const order = { ...sampleOrder, symbol: 'DOGEUSDT' }
      const res = checkCorrelationLimit(order, defaultState, defaultConfig)
      expect(res).toBeNull()
    })
  })

  describe('checkDrawdown', () => {
    it('should block if drawdown is too high', () => {
      const state = { ...defaultState, equityUsd: 8000, highWaterMarkUsd: 10000 } // 20% drawdown
      const res = checkDrawdown(sampleOrder, state, defaultConfig)
      expect(res?.decision).toBe('BLOCKED')
      expect(res?.ruleFired).toBe('MAX_DRAWDOWN')
    })

    it('should pass if drawdown is low', () => {
      const state = { ...defaultState, equityUsd: 9500, highWaterMarkUsd: 10000 } // 5% drawdown
      const res = checkDrawdown(sampleOrder, state, defaultConfig)
      expect(res).toBeNull()
    })
  })

  describe('evaluateOrder orchestration', () => {
    it('should return ALLOWED if all rules pass', () => {
      const order = { ...sampleOrder, quantity: 0.01 }
      const res = evaluateOrder(order, defaultState, defaultConfig)
      expect(res.decision).toBe('ALLOWED')
    })

    it('should short-circuit on first failing rule', () => {
      // Both Rate Limit and Max Size should fail, but Rate Limit is checked first
      const state = { ...defaultState, recentOrderTimestamps: Array(5).fill(new Date()) }
      const order = { ...sampleOrder, quantity: 1 } // Large size
      const res = evaluateOrder(order, state, defaultConfig)
      expect(res.decision).toBe('BLOCKED')
      expect(res.ruleFired).toBe('RATE_LIMIT') // Rate Limit comes before Max Size
    })
  })
})
