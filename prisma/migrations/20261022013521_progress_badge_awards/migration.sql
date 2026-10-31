CREATE TYPE "Badge" AS ENUM ('FIRST_MENTOR', 'KNOWLEDGE_SHARER', 'CONSISTENT_LEARNER');

CREATE TABLE "BadgeAward" (
    "student_id" UUID NOT NULL,
    "badge" "Badge" NOT NULL,
    "awarded_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BadgeAward_pkey" PRIMARY KEY ("student_id","badge")
);

ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
