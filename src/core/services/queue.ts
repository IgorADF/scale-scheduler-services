import { randomUUID } from "node:crypto";
import { QueuePublisher } from "../queue/publisher";

export class QueueService {
	constructor(private readonly queuePublisher: QueuePublisher) { }

	static create() {
		const publisher = new QueuePublisher();
		return new QueueService(publisher);
	}

	async createSchedulePost(scheduleId: string) {
		await this.queuePublisher.publish({
			messageId: randomUUID(),
			type: "create-schedule-post",
			data: {
				scheduleId,
			},
		});
	}

	async createSchedulePostMany(scheduleIds: string[]) {
		const tasks = scheduleIds.map((scheduleId) => ({
			messageId: randomUUID(),
			type: "create-schedule-post" as const,
			data: {
				scheduleId,
			},
		}));

		await this.queuePublisher.publishMany(tasks);
	}
}
