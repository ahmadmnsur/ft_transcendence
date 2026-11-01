-- CreateTable
CREATE TABLE "Like" (
    "post_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("post_id","student_id")
);

-- CreateIndex
CREATE INDEX "Like_student_id_idx" ON "Like"("student_id");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
