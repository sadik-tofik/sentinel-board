import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const agentName = 'rogue-agent-01'
  
  console.log(`Seeding demo agent: ${agentName}...`)

  const agent = await prisma.agent.upsert({
    where: { id: 'clv_rogue_agent_01' }, // Hardcoding ID for consistency in demo
    update: {
      ruleConfig: {
        update: {
          maxPositionSizeUsd: 1000,
          maxDrawdownPct: 10,
          maxCorrelatedPositions: 3,
          cooldownAfterLossMin: 1,
          maxOrdersPerMinute: 10,
          correlationGroups: {
            "BTC_CORRELATED": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT"],
            "PAYMENTS_L1": ["XLMUSDT", "TRXUSDT", "XRPUSDT"]
          }
        }
      }
    },
    create: {
      id: 'clv_rogue_agent_01',
      name: agentName,
      ruleConfig: {
        create: {
          maxPositionSizeUsd: 1000,
          maxDrawdownPct: 10,
          maxCorrelatedPositions: 3,
          cooldownAfterLossMin: 1,
          maxOrdersPerMinute: 10,
          correlationGroups: {
            "BTC_CORRELATED": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT"],
            "PAYMENTS_L1": ["XLMUSDT", "TRXUSDT", "XRPUSDT"]
          }
        }
      }
    }
  })

  console.log({ agent })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
