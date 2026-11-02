import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { MessagingService } from '../../src/messaging/messaging.service';
import { createTestAccount } from '../harness/accounts';
import { useHarness } from '../harness/app';
import { reviewedMatch } from '../harness/reviews';

const harness = useHarness();

const prisma = (): PrismaService => harness.app.get(PrismaService);
const actor = (studentId: string) => ({ studentId, sessionHash: null });
const letters = (count: number): string => 'é'.repeat(count);
const emoji = (count: number): string => '😀'.repeat(count);

const between = (column: string, max: number): string =>
  `((char_length(${column}) >= 1) AND (char_length(${column}) <= ${max}))`;

const DEFINITIONS: Record<string, string> = {
  evidence_filename_length: `CHECK (${between('filename', 255)})`,
  post_body_length: `CHECK ((((review_id IS NULL) OR ${between('body', 280)}) AND ((prompt_id IS NULL) OR ${between('body', 1000)})))`,
  private_feedback_text_length: `CHECK ((${between('answer_usefulness', 2000)} AND ${between('answer_explanation', 2000)}))`,
  reflection_prompt_question_length: `CHECK (${between('question', 300)})`,
  report_text_length: `CHECK (((text IS NULL) OR ${between('text', 1000)}))`,
  review_text_length: `CHECK ((${between('learned', 2000)} AND ${between('can_now_do', 2000)}))`,
  student_text_length: `CHECK ((${between('email', 254)} AND ${between('display_name', 40)} AND ((learning_goal_text IS NULL) OR ${between('learning_goal_text', 200)})))`,
};

const CHECKS = Object.keys(DEFINITIONS).sort();

async function promptPost(authorId: string, body: string): Promise<{ promptId: string; postId: string }> {
  const [prompt] = await prisma().$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ReflectionPrompt" (id, question, publication_order)
    VALUES (gen_random_uuid(), 'What did you learn?', 1) RETURNING id::text`;
  const [post] = await prisma().$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Post" (id, author_id, body, prompt_id)
    VALUES (gen_random_uuid(), ${authorId}::uuid, ${body}, ${prompt.id}::uuid) RETURNING id::text`;
  return { promptId: prompt.id, postId: post.id };
}

function insertMessage(senderId: string, recipientId: string, body: string): Promise<number> {
  return prisma().$executeRaw`
    INSERT INTO "DirectMessage" (id, sender_id, recipient_id, body)
    VALUES (gen_random_uuid(), ${senderId}::uuid, ${recipientId}::uuid, ${body})`;
}

describe('text limits held by the database', () => {
  it('keeps each length CHECK by name and definition, and the Direct Message trigger', async () => {
    const checks = await prisma().$queryRaw<Array<{ name: string; definition: string }>>`
      SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE contype = 'c' AND conname = ANY(${CHECKS}::text[]) ORDER BY conname`;
    expect(checks).toEqual(CHECKS.map((name) => ({ name, definition: DEFINITIONS[name] })));
    const triggers = await prisma().$queryRaw<Array<{ definition: string }>>`
      SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger
      WHERE tgrelid = '"DirectMessage"'::regclass AND tgname = 'direct_message_body_length' AND NOT tgisinternal`;
    expect(triggers).toEqual([
      {
        definition:
          'CREATE TRIGGER direct_message_body_length BEFORE INSERT OR UPDATE OF body ON public."DirectMessage" FOR EACH ROW EXECUTE FUNCTION direct_message_body_length()',
      },
    ]);
  });

  it('limits a Student’s email, display name and Learning Goal sentence', async () => {
    const student = await createTestAccount(harness.app);
    const set = (column: 'email' | 'display_name' | 'learning_goal_text', value: string | null) =>
      prisma().$executeRawUnsafe(`UPDATE "Student" SET ${column} = $1 WHERE id = $2::uuid`, value, student.id);
    await expect(set('display_name', letters(40))).resolves.toBe(1);
    await expect(set('display_name', letters(41))).rejects.toThrow('student_text_length');
    await expect(set('display_name', '')).rejects.toThrow('student_text_length');
    await expect(set('email', `${'a'.repeat(242)}@example.com`)).resolves.toBe(1);
    await expect(set('email', `${'a'.repeat(243)}@example.com`)).rejects.toThrow('student_text_length');
    await expect(set('learning_goal_text', letters(200))).resolves.toBe(1);
    await expect(set('learning_goal_text', letters(201))).rejects.toThrow('student_text_length');
    await expect(set('learning_goal_text', '')).rejects.toThrow('student_text_length');
    await expect(set('learning_goal_text', null)).resolves.toBe(1);
  });

  it('limits a new Direct Message body to 1–500 characters, counted by code point', async () => {
    const sender = await createTestAccount(harness.app);
    const recipient = await createTestAccount(harness.app);
    await expect(insertMessage(sender.id, recipient.id, emoji(500))).resolves.toBe(1);
    await expect(insertMessage(sender.id, recipient.id, emoji(501))).rejects.toThrow('direct_message_body_length');
    await expect(insertMessage(sender.id, recipient.id, '')).rejects.toThrow('direct_message_body_length');
  });

  it('keeps an older, longer Direct Message readable and lets it be marked read', async () => {
    const sender = await createTestAccount(harness.app);
    const recipient = await createTestAccount(harness.app);
    const older = letters(2000);
    await prisma().$transaction(async (tx) => {
      await tx.$executeRawUnsafe('ALTER TABLE "DirectMessage" DISABLE TRIGGER direct_message_body_length');
      await tx.$executeRaw`
        INSERT INTO "DirectMessage" (id, sender_id, recipient_id, body)
        VALUES (gen_random_uuid(), ${sender.id}::uuid, ${recipient.id}::uuid, ${older})`;
      await tx.$executeRawUnsafe('ALTER TABLE "DirectMessage" ENABLE TRIGGER direct_message_body_length');
    });
    const messaging = harness.app.get(MessagingService);
    const thread = await messaging.readThread(actor(recipient.id), sender.id, null);
    expect(thread.items.map((item) => item.body)).toEqual([older]);
    await expect(messaging.markThreadRead(actor(recipient.id), sender.id)).resolves.toEqual({ updated: 1 });
    await expect(
      prisma().$executeRaw`UPDATE "DirectMessage" SET body = body WHERE sender_id = ${sender.id}::uuid`,
    ).resolves.toBe(1);
    await expect(
      prisma().$executeRaw`UPDATE "DirectMessage" SET body = ${letters(501)} WHERE sender_id = ${sender.id}::uuid`,
    ).rejects.toThrow('direct_message_body_length');
  });

  it('limits a Review, its Private Feedback and its Takeaway Post', async () => {
    const { reviewId } = await reviewedMatch(harness.app);
    const review = (value: string) =>
      prisma().$executeRaw`UPDATE "Review" SET learned = ${value}, can_now_do = ${value} WHERE id = ${reviewId}::uuid`;
    await expect(review(letters(2000))).resolves.toBe(1);
    await expect(review(letters(2001))).rejects.toThrow('review_text_length');
    await expect(review('')).rejects.toThrow('review_text_length');
    const feedback = (value: string) =>
      prisma().$executeRaw`UPDATE "PrivateFeedback" SET answer_usefulness = ${value}, answer_explanation = ${value} WHERE review_id = ${reviewId}::uuid`;
    await expect(feedback(letters(2000))).resolves.toBe(1);
    await expect(feedback(letters(2001))).rejects.toThrow('private_feedback_text_length');
    await expect(feedback('')).rejects.toThrow('private_feedback_text_length');
    const takeaway = (value: string) =>
      prisma().$executeRaw`UPDATE "Post" SET body = ${value} WHERE review_id = ${reviewId}::uuid`;
    await expect(takeaway(letters(280))).resolves.toBe(1);
    await expect(takeaway(letters(281))).rejects.toThrow('post_body_length');
    await expect(takeaway('')).rejects.toThrow('post_body_length');
  });

  it('limits a Prompt question, a Prompt answer and a Report’s text', async () => {
    const author = await createTestAccount(harness.app);
    const reporter = await createTestAccount(harness.app);
    const { promptId, postId } = await promptPost(author.id, letters(1000));
    const answer = (value: string) => prisma().$executeRaw`UPDATE "Post" SET body = ${value} WHERE id = ${postId}::uuid`;
    await expect(answer(letters(1001))).rejects.toThrow('post_body_length');
    await expect(answer('')).rejects.toThrow('post_body_length');
    const question = (value: string) =>
      prisma().$executeRaw`UPDATE "ReflectionPrompt" SET question = ${value} WHERE id = ${promptId}::uuid`;
    await expect(question(letters(300))).resolves.toBe(1);
    await expect(question(letters(301))).rejects.toThrow('reflection_prompt_question_length');
    await expect(question('')).rejects.toThrow('reflection_prompt_question_length');
    const report = (value: string | null) => prisma().$executeRaw`
      INSERT INTO "Report" (id, reporter_id, post_id, reason, text)
      VALUES (gen_random_uuid(), ${reporter.id}::uuid, ${postId}::uuid, 'OTHER', ${value})`;
    await expect(report(letters(1001))).rejects.toThrow('report_text_length');
    await expect(report('')).rejects.toThrow('report_text_length');
    await expect(report(letters(1000))).resolves.toBe(1);
  });

  it('limits an Evidence filename to 1–255 characters', async () => {
    const { reviewId } = await reviewedMatch(harness.app);
    const evidence = (filename: string) => prisma().$executeRaw`
      INSERT INTO "Evidence" (id, review_id, token, mime, size, filename, uploaded_at)
      VALUES (gen_random_uuid(), ${reviewId}::uuid, gen_random_uuid(), 'application/pdf', 1, ${filename}, now())`;
    await expect(evidence(`${letters(252)}.pdf`)).rejects.toThrow('evidence_filename_length');
    await expect(evidence('')).rejects.toThrow('evidence_filename_length');
    await expect(evidence(`${letters(251)}.pdf`)).resolves.toBe(1);
  });
});
