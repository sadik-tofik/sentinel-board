import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Clearing OrderEvent and Position tables...')
  await prisma.orderEvent.deleteMany({})
  await prisma.position.deleteMany({})
  console.log('Tables cleared.')
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
