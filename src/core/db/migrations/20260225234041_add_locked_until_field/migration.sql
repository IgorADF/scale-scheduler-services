-- AlterTable
ALTER TABLE "Schedules" ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CompletedSchedules" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "CompletedSchedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompletedSchedules_scheduleId_key" ON "CompletedSchedules"("scheduleId");
