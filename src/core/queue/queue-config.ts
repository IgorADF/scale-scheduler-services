import amqplib from "amqplib";
import { envs } from "../env";

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;

export async function getConnection(): Promise<amqplib.ChannelModel> {
	if (!connection) {
		try {
			connection = await amqplib.connect({
				protocol: "amqp",
				port: envs.RABBITMQ_PORT,
				hostname: envs.RABBITMQ_HOST,
				username: envs.RABBITMQ_USER,
				password: envs.RABBITMQ_PASSWORD,
			});

			console.log("✓ AMQP connection established");
		} catch (error) {
			throw error
		}

	}
	return connection;
}

export async function getChannel(): Promise<amqplib.Channel> {
	if (!channel) {
		const conn = await getConnection();
		channel = await conn.createChannel();
		console.log("✓ AMQP channel created");
	}
	return channel;
}

export async function closeConnection(): Promise<void> {
	if (channel) {
		await channel.close();
		channel = null;
	}
	if (connection) {
		await connection.close();
		connection = null;
		console.log("✓ AMQP connection closed");
	}
}
