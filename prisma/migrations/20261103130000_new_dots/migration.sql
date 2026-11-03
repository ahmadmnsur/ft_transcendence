-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "feed_opened_at" TIMESTAMPTZ(3),
ADD COLUMN     "friends_opened_at" TIMESTAMPTZ(3),
ADD COLUMN     "match_opened_at" TIMESTAMPTZ(3),
ADD COLUMN     "messages_opened_at" TIMESTAMPTZ(3),
ADD COLUMN     "prompts_opened_at" TIMESTAMPTZ(3),
ADD COLUMN     "reports_opened_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "PrivateFeedback" ADD COLUMN     "read_at" TIMESTAMPTZ(3);
