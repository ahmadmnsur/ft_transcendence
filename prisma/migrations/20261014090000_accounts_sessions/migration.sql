-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'PEER_MODERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_version" INTEGER NOT NULL DEFAULT 0,
    "display_name" TEXT NOT NULL,
    "display_name_search" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "suspended_at" TIMESTAMPTZ(3),
    "removed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Session_student_id_idx" ON "Session"("student_id");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- §4.4 step 9: display names sort with the same collation on every stack.
ALTER TABLE "Student" ALTER COLUMN display_name TYPE text COLLATE "und-x-icu";
