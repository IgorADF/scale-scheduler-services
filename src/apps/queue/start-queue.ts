import { closeConnection } from "@/core/queue/queue-config.js";
import { QueueConsumer } from "./consumer.js";

async function startQueue() {
	try {
		console.log("Starting message queue...");

		const consumer = new QueueConsumer();
		await consumer.start();

		console.log("✓ Message queue started successfully");
	} catch (error) {
		console.error("Failed to start message queue:", error);
		await closeConnection();
		process.exit(1);
	}
}

// Graceful shutdown
process.on("SIGINT", async () => {
	console.log("\nShutting down message queue...");
	await closeConnection();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	console.log("\nShutting down message queue...");
	await closeConnection();
	process.exit(0);
});

startQueue();
