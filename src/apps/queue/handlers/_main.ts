import { MessageType } from "@/core/queue/message.js";
import { CreateSchedulePostHandler, CreateSchedulePostHandlerSchema } from "./create-schedule-post.js";

export class MainHandler {
	constructor(private readonly createSchedulePostHandler: CreateSchedulePostHandler) { }

	async handle(message: MessageType): Promise<void> {
		console.log("Processing task:", {
			id: message.messageId,
			type: message.type,
		});

		switch (message.type) {
			case "create-schedule-post": {
				const data = CreateSchedulePostHandlerSchema.parse(message.data);
				await this.createSchedulePostHandler.handle(data);
				break;
			}
			default:
				console.warn(`Unknown message type: ${message.type}`);
		}

		console.log("✓ Task processed successfully");
	}
}
