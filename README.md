# Scheduler Services

A high-throughput job scheduling system built with **Node.js**, **PostgreSQL**, and **RabbitMQ**. It polls the database for pending scheduled tasks, publishes them to a message queue, and processes them via workers — ensuring reliable, at-least-once delivery with idempotent handling.

## Architecture Overview

The system is composed of two independently running processes:

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│  Scheduler   │──────▶│   RabbitMQ   │──────▶│  Queue Worker    │
│  (Poller)    │       │   (Broker)   │       │  (Consumer)      │
│              │       │              │       │                  │
│ Polls DB for │       │ "messages"   │       │ Processes tasks  │
│ pending jobs │       │   queue      │       │ & marks complete │
└──────┬───────┘       └──────────────┘       └────────┬─────────┘
       │                                               │
       │            ┌──────────────┐                   │
       └───────────▶│  PostgreSQL  │◀──────────────────┘
                    │              │
                    │ - Schedules  │
                    │ - Completed  │
                    └──────────────┘
```

### Scheduler (Poller)

**Entry point:** `src/apps/scheduler/main.ts`  
**Run:** `npm run dev:scheduler`

Runs an infinite loop that:

1. Opens a database transaction.
2. Queries up to **1,000 pending schedules** whose `runAt` is in the past and that are not currently locked, using `FOR UPDATE SKIP LOCKED` for safe concurrent access.
3. Publishes each schedule ID as a `create-schedule-post` message to RabbitMQ.
4. Sets a `lockedUntil` timestamp (now + 2 minutes) to prevent re-processing during the lock window.
5. Sleeps for **7.5 seconds** and repeats.

### Queue Worker (Consumer)

**Entry point:** `src/apps/queue/start-queue.ts`  
**Run:** `npm run dev:worker`

Connects to RabbitMQ and consumes messages from the `messages` queue with `prefetch(1)`. Each message is:

1. Parsed and validated using **Zod** schemas.
2. Routed to the appropriate handler based on message `type`.
3. Acknowledged (`ack`) on success, or negatively acknowledged and requeued (`nack`) on failure.

#### `create-schedule-post` Handler

Ensures **idempotent** processing via a two-step transaction:

1. Inserts into `CompletedSchedules` with `ON CONFLICT DO NOTHING` — if the row already exists, another worker already handled it.
2. If the insert succeeded, updates the schedule's status to `COMPLETED` and clears the `lockedUntil` field.

## Tech Stack

| Component      | Technology                           |
| -------------- | ------------------------------------ |
| Runtime        | Node.js (with `tsx` for TypeScript)  |
| Language       | TypeScript (strict mode)             |
| Database       | PostgreSQL                           |
| ORM            | Prisma 7 (with `@prisma/adapter-pg`) |
| Message Broker | RabbitMQ (via `amqplib`)             |
| Validation     | Zod                                  |
| Config         | `dotenv` + Zod env schema            |

## Database Schema

### `Schedules`

| Column        | Type            | Description                              |
| ------------- | --------------- | ---------------------------------------- |
| `id`          | UUID (PK)       | Unique schedule identifier               |
| `postName`    | String          | Name/label for the scheduled post        |
| `status`      | ScheduleStatus  | `PENDING` / `COMPLETED` / `FAILED`       |
| `runAt`       | DateTime        | When the schedule should be executed     |
| `lockedUntil` | DateTime (null) | Lock expiration to prevent double pickup |
| `createdAt`   | DateTime        | Record creation timestamp                |
| `updatedAt`   | DateTime        | Last update timestamp                    |

### `CompletedSchedules`

| Column       | Type        | Description                                         |
| ------------ | ----------- | --------------------------------------------------- |
| `id`         | UUID (PK)   | Unique record identifier                            |
| `scheduleId` | String (UQ) | References the processed schedule (idempotency key) |

## Concurrency & Reliability

- **`FOR UPDATE SKIP LOCKED`**: Multiple scheduler instances can run in parallel without picking up the same rows — locked rows are silently skipped.
- **`lockedUntil`**: Acts as a lease. If a worker crashes before completing, the lock expires and the scheduler will re-pick the schedule after the TTL (2 minutes).
- **Idempotent completion**: The `CompletedSchedules` table with a unique constraint on `scheduleId` ensures that even if the same message is delivered twice, the schedule is only completed once.
- **Message persistence**: Messages are published with `persistent: true`, so they survive RabbitMQ restarts.

## Getting Started

### Prerequisites

- Node.js 24+
- PostgreSQL
- RabbitMQ

### Environment Variables

Create a `.env` file in the project root:

```env
TZ=UTC
DATABASE_URL=postgresql://user:password@localhost:5432/scheduler
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
```

> **Note:** `TZ` must be set to `UTC`. The application validates this at startup and will exit if it's not.

### Setup

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed the database with 1,000,000 test schedules
npm run db:seed
```

### Running

```bash
# Terminal 1 — Start the scheduler (polls DB and publishes to RabbitMQ)
npm run dev:scheduler

# Terminal 2 — Start the queue worker (consumes and processes messages)
npm run dev:worker
```

## Project Structure

```
src/
├── apps/
│   ├── api/                        # (Placeholder — not yet implemented)
│   ├── queue/                      # Queue worker application
│   │   ├── start-queue.ts          # Worker entry point with graceful shutdown
│   │   ├── consumer.ts             # RabbitMQ consumer setup
│   │   └── handlers/
│   │       ├── _main.ts            # Message router (dispatches by type)
│   │       └── create-schedule-post.ts  # Idempotent schedule completion handler
│   └── scheduler/
│       └── main.ts                 # Scheduler entry point (polling loop)
├── core/
│   ├── env.ts                      # Environment variable validation (Zod)
│   ├── db/
│   │   ├── client.ts               # Prisma client instance
│   │   ├── schema.prisma           # Database schema definition
│   │   ├── seed.ts                 # Seeder (1M test records)
│   │   ├── types.ts                # Shared DB types
│   │   ├── generated/              # Prisma generated client
│   │   └── migrations/             # SQL migration files
│   ├── queue/
│   │   ├── message.ts              # Message schema (Zod)
│   │   ├── publisher.ts            # RabbitMQ publisher (single & batch)
│   │   └── queue-config.ts         # AMQP connection & channel management
│   ├── services/
│   │   └── queue.ts                # High-level queue service (business logic)
│   └── utils/
│       └── await.ts                # Sleep utility
```

## Next Steps

### Table Partitioning for Better Performance

As the number of scheduled jobs grows (millions+), the `Schedules` table becomes a bottleneck — both for the scheduler's polling query and for general write throughput. **PostgreSQL native table partitioning** is the natural evolution to maintain performance at scale.

#### Recommended Strategy: Range Partitioning by `runAt`

Partition the `Schedules` table by time ranges on the `runAt` column (e.g., monthly or weekly partitions):

```sql
CREATE TABLE "Schedules" (
    "id"          TEXT NOT NULL,
    "postName"    TEXT NOT NULL,
    "status"      "ScheduleStatus" NOT NULL,
    "runAt"       TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id", "runAt")
) PARTITION BY RANGE ("runAt");

-- Monthly partitions
CREATE TABLE "Schedules_2026_01" PARTITION OF "Schedules"
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE "Schedules_2026_02" PARTITION OF "Schedules"
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ...
```

#### Why This Works Well

- **Partition pruning**: The scheduler's query filters by `runAt <= NOW()`, so PostgreSQL will only scan the relevant partitions instead of the entire table.
- **Index locality**: Each partition has its own smaller indexes, making `FOR UPDATE SKIP LOCKED` faster.
- **Efficient archival**: Old partitions (fully completed months) can be detached, archived, or dropped without affecting the active dataset.
- **Write distribution**: Inserts are directed to the current partition, reducing contention on a single large table and its indexes.

#### Additional Considerations

- **Separate hot/cold data**: Move completed schedules to an archive table or detach old partitions entirely, keeping the active `Schedules` table lean.
- **Automated partition management**: Use `pg_partman` or a cron job to automatically create future partitions and detach expired ones.
- **Composite primary key**: Partitioning requires the partition key (`runAt`) to be part of the primary key, which changes the schema design.
- **Prisma compatibility**: As of Prisma 7, native partitioned tables require raw SQL migrations. The ORM queries remain unchanged since PostgreSQL handles partition routing transparently.
- **Index strategy**: Add partial indexes on each partition, e.g., `WHERE status = 'PENDING'`, to further speed up the scheduler's polling query.

#### Beyond Partitioning

- **Dedicated status indexes**: `CREATE INDEX idx_pending ON "Schedules" ("runAt") WHERE "status" = 'PENDING'` to avoid scanning completed rows entirely.
- **Horizontal scaling**: Run multiple scheduler and worker instances across nodes. The `FOR UPDATE SKIP LOCKED` pattern already supports this.
- **Batch size tuning**: Dynamically adjust the polling batch size (currently 1,000) based on queue depth and processing latency.
- **Dead-letter queue**: Configure a RabbitMQ DLQ to capture messages that exceed retry limits, preventing infinite requeue loops.
- **Observability**: Add metrics (processing latency, queue depth, lock contention) and alerting for production readiness.
