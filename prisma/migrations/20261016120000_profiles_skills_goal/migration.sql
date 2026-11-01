-- CreateEnum
CREATE TYPE "SkillKind" AS ENUM ('TEACH', 'LEARN');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "learning_goal_student_skill_id" UUID,
ADD COLUMN     "learning_goal_text" TEXT;

-- CreateTable
CREATE TABLE "StudentSkill" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "kind" "SkillKind" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentSkill_skill_id_kind_idx" ON "StudentSkill"("skill_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSkill_student_id_skill_id_kind_key" ON "StudentSkill"("student_id", "skill_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSkill_student_id_id_key" ON "StudentSkill"("student_id", "id");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_id_learning_goal_student_skill_id_fkey" FOREIGN KEY ("id", "learning_goal_student_skill_id") REFERENCES "StudentSkill"("student_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

