CREATE TABLE "DirectMessage" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(3),

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirectMessage_sender_id_recipient_id_created_at_idx" ON "DirectMessage"("sender_id", "recipient_id", "created_at");

CREATE INDEX "DirectMessage_recipient_id_read_at_idx" ON "DirectMessage"("recipient_id", "read_at");

ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
