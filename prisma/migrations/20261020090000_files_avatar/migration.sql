-- CreateTable
CREATE TABLE "Avatar" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Avatar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Avatar_student_id_key" ON "Avatar"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "Avatar_token_key" ON "Avatar"("token");

-- AddForeignKey
ALTER TABLE "Avatar" ADD CONSTRAINT "Avatar_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
