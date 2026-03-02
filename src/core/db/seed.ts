import { prisma } from "./client";

async function main() {
    console.log("Seeding 1,000,000 schedules...");

    const startTime = Date.now();

    await prisma.$executeRaw`
    INSERT INTO "Schedules" ("id", "postName", "status", "runAt", "lockedUntil", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid(),
      'Post #' || s,
      'PENDING'::"ScheduleStatus",
      NOW() - (s || ' seconds')::interval,
      NULL,
      NOW(),
      NOW()
    FROM generate_series(1, 1000000) AS s
  `;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Seed completed in ${elapsed}s`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
