CREATE TYPE "MatchStatus" AS ENUM ('MATCHED', 'ACCEPTED', 'COMPLETED', 'LAPSED', 'DECLINED', 'TERMINATED_BY_ADMIN');

CREATE TYPE "Mission" AS ENUM ('TECHNICAL_CONCEPT', 'PROJECT_PROBLEM', 'PAIR_PROGRAMMING', 'CODE_REVIEW', 'TECHNOLOGY_DISCUSSION', 'ADVICE');

CREATE TYPE "CoverageDirection" AS ENUM ('FORWARD', 'REVERSE');

CREATE TABLE "Round" (
    "id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "mentee_id" UUID NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'MATCHED',
    "mission" "Mission" NOT NULL,
    "compatibility_score" SMALLINT,
    "goal_bonus_applied" BOOLEAN NOT NULL,
    "mentor_accepted_at" TIMESTAMPTZ(3),
    "mentee_accepted_at" TIMESTAMPTZ(3),
    "declined_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchSkillCoverage" (
    "match_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "direction" "CoverageDirection" NOT NULL,

    CONSTRAINT "MatchSkillCoverage_pkey" PRIMARY KEY ("match_id","skill_id","direction")
);

CREATE INDEX "Match_round_id_status_idx" ON "Match"("round_id", "status");

CREATE INDEX "Match_mentor_id_idx" ON "Match"("mentor_id");

CREATE INDEX "Match_mentee_id_idx" ON "Match"("mentee_id");

CREATE INDEX "MatchSkillCoverage_skill_id_idx" ON "MatchSkillCoverage"("skill_id");

ALTER TABLE "Match" ADD CONSTRAINT "Match_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Match" ADD CONSTRAINT "Match_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Match" ADD CONSTRAINT "Match_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Match" ADD CONSTRAINT "Match_declined_by_id_fkey" FOREIGN KEY ("declined_by_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "MatchSkillCoverage" ADD CONSTRAINT "MatchSkillCoverage_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "MatchSkillCoverage" ADD CONSTRAINT "MatchSkillCoverage_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE UNIQUE INDEX round_single_open ON "Round" ((closed_at IS NULL)) WHERE closed_at IS NULL;

CREATE INDEX match_pair_history ON "Match" (LEAST(mentor_id, mentee_id), GREATEST(mentor_id, mentee_id));
