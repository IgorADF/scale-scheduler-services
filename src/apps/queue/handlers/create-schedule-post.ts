import { prisma } from "@/core/db/client";
import z from "zod";

export const CreateSchedulePostHandlerSchema = z.object({
	scheduleId: z.uuid(),
});

type CreateSchedulePostTaskType = z.infer<typeof CreateSchedulePostHandlerSchema>;

export class CreateSchedulePostHandler {

	async handle(data: CreateSchedulePostTaskType): Promise<void> {
		try {

			await prisma.$transaction(async (tx) => {
				const insertedRows = await tx.$executeRawUnsafe(`insert into "CompletedSchedules" ("id", "scheduleId") values (gen_random_uuid(), '${data.scheduleId}') on conflict ("scheduleId") do nothing`)

				if (insertedRows === 0) {
					console.log(`Schedule ${data.scheduleId} has already been processed by another worker.`);
					return;
				}

				await tx.schedules.update({
					where: { id: data.scheduleId },
					data: { lockedUntil: null, status: 'COMPLETED' }
				});
			});

		} catch (error) {
			console.error("Error in CreateSchedulePostHandler:", error);
			throw error;
		}
	}
}
