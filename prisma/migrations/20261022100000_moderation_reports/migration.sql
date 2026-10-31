CREATE TYPE "ReportReason" AS ENUM ('HARASSMENT', 'SPAM', 'INAPPROPRIATE_CONTENT', 'OTHER');

CREATE TYPE "ReportState" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "post_id" UUID,
    "reported_student_id" UUID,
    "reason" "ReportReason" NOT NULL,
    "text" TEXT,
    "state" "ReportState" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_post_id_state_idx" ON "Report"("post_id", "state");

CREATE INDEX "Report_reported_student_id_state_idx" ON "Report"("reported_student_id", "state");

CREATE INDEX "Report_state_resolved_at_idx" ON "Report"("state", "resolved_at");

CREATE UNIQUE INDEX "report_one_per_reporter_post" ON "Report"("reporter_id", "post_id") WHERE ("post_id" IS NOT NULL);

CREATE UNIQUE INDEX "report_one_per_reporter_student" ON "Report"("reporter_id", "reported_student_id") WHERE ("reported_student_id" IS NOT NULL);

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Report" ADD CONSTRAINT "Report_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Report" ADD CONSTRAINT "Report_reported_student_id_fkey" FOREIGN KEY ("reported_student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Report" ADD CONSTRAINT "Report_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Report" ADD CONSTRAINT report_exactly_one_target CHECK ((post_id IS NULL) <> (reported_student_id IS NULL));

ALTER TABLE "Report" ADD CONSTRAINT report_no_self_student CHECK (reported_student_id IS NULL OR reporter_id <> reported_student_id);

ALTER TABLE "Report" ADD CONSTRAINT report_state_attribution CHECK ((state = 'OPEN' AND resolved_by_id IS NULL AND resolved_at IS NULL) OR (state <> 'OPEN' AND resolved_by_id IS NOT NULL AND resolved_at IS NOT NULL));
