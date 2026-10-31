CREATE TABLE "PrivateFeedback" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "answer_usefulness" TEXT NOT NULL,
    "answer_explanation" TEXT NOT NULL,
    "rating" SMALLINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrivateFeedback_review_id_key" ON "PrivateFeedback"("review_id");

ALTER TABLE "PrivateFeedback" ADD CONSTRAINT "PrivateFeedback_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "PrivateFeedback" ADD CONSTRAINT "private_feedback_rating_range"
  CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
