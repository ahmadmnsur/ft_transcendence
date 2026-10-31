CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Evidence_review_id_key" ON "Evidence"("review_id");

CREATE UNIQUE INDEX "Evidence_token_key" ON "Evidence"("token");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
