-- CreateTable
CREATE TABLE "calls" (
    "id" UUID NOT NULL,
    "call_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "recording_url" TEXT NOT NULL,
    "is_spam" BOOLEAN NOT NULL DEFAULT false,
    "is_repeat_caller" BOOLEAN NOT NULL DEFAULT false,
    "previous_calls_count" INTEGER NOT NULL DEFAULT 0,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calls_call_id_key" ON "calls"("call_id");

-- CreateIndex
CREATE INDEX "calls_phone_number_received_at_idx" ON "calls"("phone_number", "received_at");

-- CreateIndex
CREATE INDEX "calls_agent_idx" ON "calls"("agent");

-- CreateIndex
CREATE INDEX "calls_received_at_idx" ON "calls"("received_at");
