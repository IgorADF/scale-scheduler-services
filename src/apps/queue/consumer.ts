import { MessageSchema } from "@/core/queue/message.js";
import { MainHandler } from "./handlers/_main.js";
import { getChannel } from "@/core/queue/queue-config.js";
import { CreateSchedulePostHandler } from "./handlers/create-schedule-post.js";

export class QueueConsumer {
	private readonly queueName = "messages";
	private handler: MainHandler;

	constructor() {
		const createSchedulePostHandler = new CreateSchedulePostHandler();
		this.handler = new MainHandler(createSchedulePostHandler);
	}

	async start(): Promise<void> {
		const channel = await getChannel();
		await channel.assertQueue(this.queueName);
		await channel.prefetch(1);

		console.log(`✓ Consuming messages from queue: ${this.queueName}`);

		channel.consume(this.queueName, async (msg) => {
			if (msg !== null) {
				try {
					const stringMessage = JSON.parse(msg.content.toString());
					const message = MessageSchema.parse(stringMessage);
					await this.handler.handle(message);
					channel.ack(msg);
				} catch (error) {
					console.error("Error processing message:", error);
					// Reject and requeue the message on error
					channel.nack(msg, false, true);
				}
			} else {
				console.log("Consumer cancelled by server");
			}
		});
	}
}
