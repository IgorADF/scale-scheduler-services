import z from "zod";

export const MessageSchema = z.object({
	messageId: z.uuid(),
	type: z.enum(["create-schedule-post"]).nullable(),
	data: z.unknown(),
});

export type MessageType = z.infer<typeof MessageSchema>;
