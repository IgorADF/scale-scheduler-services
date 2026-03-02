import type { MessageType } from "./message.js";
import { getChannel } from "./queue-config.js";

export class QueuePublisher {
	private readonly queueName = "messages";

	async publish(task: MessageType): Promise<void> {
		const channel = await getChannel();
		await channel.assertQueue(this.queueName);

		const message = JSON.stringify(task);
		channel.sendToQueue(this.queueName, Buffer.from(message), {
			persistent: true,
		});

		console.log("✓ Task published:", task);
	}

	async publishMany(tasks: MessageType[]): Promise<void> {
		if (tasks.length === 0) return;

		const channel = await getChannel();
		await channel.assertQueue(this.queueName);

		for (const task of tasks) {
			const message = JSON.stringify(task);
			channel.sendToQueue(this.queueName, Buffer.from(message), {
				persistent: true,
			});
		}

		console.log(`✓ ${tasks.length} tasks published`);
	}
}
