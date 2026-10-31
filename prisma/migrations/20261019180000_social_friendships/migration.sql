CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

CREATE TABLE "Friendship" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "addressee_id" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Friendship_addressee_id_status_idx" ON "Friendship"("addressee_id", "status");

CREATE INDEX "Friendship_requester_id_status_idx" ON "Friendship"("requester_id", "status");

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE UNIQUE INDEX friendship_unordered_pair ON "Friendship" (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
