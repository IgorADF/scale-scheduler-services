import "dotenv/config";
import z from "zod";

const envSchema = z.object({
    TZ: z.string().refine((tz) => tz === "UTC", {
        message: "TZ must be set to 'UTC'",
    }),

    DATABASE_URL: z.string(),

    RABBITMQ_PORT: z.string().transform((port) => parseInt(port)),
    RABBITMQ_HOST: z.string(),
    RABBITMQ_USER: z.string(),
    RABBITMQ_PASSWORD: z.string(),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
    console.error("Invalid environment variables:", env.error.format());
    process.exit(1);
}

export const envs = env.data;