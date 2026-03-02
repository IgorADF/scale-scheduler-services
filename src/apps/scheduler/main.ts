import { prisma } from "@/core/db/client"
import { Prisma } from "@/core/db/generated/client"
import { QueueService } from "@/core/services/queue"
import { awaitMS } from "@/core/utils/await"

// Criar index

async function run() {
    const queueService = QueueService.create()

    while (true) {
        await prisma.$transaction(async (tx) => {
            const schedules: { id: string }[] = await tx.$queryRaw(Prisma.sql`
                SELECT id FROM "Schedules" 
                WHERE "status" = 'PENDING' 
                AND "runAt" <= NOW() 
                AND ("lockedUntil" IS NULL OR "lockedUntil" < NOW()) 
                ORDER BY "runAt" 
                LIMIT 1000 
                FOR UPDATE SKIP LOCKED
            `)

            if (schedules.length === 0) return

            const scheduleIds = schedules.map(s => s.id)

            await queueService.createSchedulePostMany(scheduleIds)

            await tx.$queryRaw(Prisma.sql`
                UPDATE "Schedules" 
                SET "lockedUntil" = NOW() + INTERVAL '2 minutes' 
                WHERE id = ANY(${scheduleIds})
            `)
        })

        await awaitMS(7500)
    }
}

run()