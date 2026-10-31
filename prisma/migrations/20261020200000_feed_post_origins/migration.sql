CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "learned" TEXT NOT NULL,
    "can_now_do" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReflectionPrompt" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publication_order" BIGINT NOT NULL,

    CONSTRAINT "ReflectionPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Post" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "prompt_id" UUID,
    "review_id" UUID,
    "answer_round_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_match_id_key" ON "Review"("match_id");

CREATE UNIQUE INDEX "ReflectionPrompt_publication_order_key" ON "ReflectionPrompt"("publication_order");

CREATE UNIQUE INDEX "Post_review_id_key" ON "Post"("review_id");

CREATE INDEX "Post_created_at_id_idx" ON "Post"("created_at" DESC, "id" DESC);

CREATE INDEX "Post_author_id_idx" ON "Post"("author_id");

CREATE INDEX "Post_answer_round_id_idx" ON "Post"("answer_round_id");

CREATE UNIQUE INDEX "Post_prompt_id_author_id_key" ON "Post"("prompt_id", "author_id");

ALTER TABLE "Review" ADD CONSTRAINT "Review_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Post" ADD CONSTRAINT "Post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Post" ADD CONSTRAINT "Post_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "ReflectionPrompt"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Post" ADD CONSTRAINT "Post_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Post" ADD CONSTRAINT "Post_answer_round_id_fkey" FOREIGN KEY ("answer_round_id") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Post" ADD CONSTRAINT post_exactly_one_origin CHECK ((prompt_id IS NULL) <> (review_id IS NULL));
