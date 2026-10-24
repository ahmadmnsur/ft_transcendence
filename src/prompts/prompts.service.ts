import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import { awardPromptXp } from '../gamification/awards';
import type { EarnResult } from '../gamification/views';
import { isValidText, LIMITS } from '../shared/limits';
import { ApiError, Refusal, type RefusalSpec } from '../core/errors';
import { readPostPage } from '../feed/post-page';
import { readActiveAdmin } from '../students/profile-writes';
import { STUDENT_REF_SELECT } from '../students/student-ref';
import { toAnswerView, toPromptView, type AnswerPage, type PromptPage, type PromptView } from './views';

const ALREADY_ANSWERED = { code: 'already_answered', message: 'You have already answered this Reflection Prompt.' } as const satisfies RefusalSpec;

@Injectable()
export class PromptsService {
  constructor(private readonly uow: UnitOfWork, private readonly publisher: RealtimePublisher) {}

  answer(actor: Actor, promptId: string, body: string): Promise<EarnResult> {
    if (!isValidText(body, LIMITS.promptAnswer, true)) throw new ApiError('validation_failed');
    return this.uow.run({ name: 'prompt.answer', uniqueRefusals: { Post_prompt_id_author_id_key: ALREADY_ANSWERED } }, async (tx, ctx) => {
      const author = await tx.student.findUnique({
        where: { id: actor.studentId },
        select: { ...STUDENT_REF_SELECT, suspendedAt: true },
      });
      if (author === null || author.suspendedAt !== null || author.removedAt !== null) throw new ApiError('unauthenticated');
      if (author.role === 'ADMIN') throw new Refusal('admins_cannot_answer', 'Admins cannot answer Reflection Prompts.');
      const prompt = await tx.reflectionPrompt.findUnique({ where: { id: promptId } });
      if (prompt === null) throw new ApiError('not_found');
      const maximum = await tx.reflectionPrompt.aggregate({ _max: { publicationOrder: true } });
      if (prompt.publicationOrder !== maximum._max.publicationOrder) throw new Refusal('prompt_not_live', 'This Reflection Prompt is no longer live.');
      const existing = await tx.post.findUnique({
        where: { promptId_authorId: { promptId: prompt.id, authorId: author.id } }, select: { id: true },
      });
      if (existing !== null) throw new Refusal(ALREADY_ANSWERED.code, ALREADY_ANSWERED.message);
      const round = await tx.round.findFirst({ where: { closedAt: null }, select: { id: true } });
      const promptPostCount = await tx.post.count({ where: { authorId: author.id, promptId: { not: null } } });
      await ctx.checkpoint('prompt.answer');
      const post = await tx.post.create({ data: {
        authorId: author.id, promptId: prompt.id, body: body.trim(), answerRoundId: round?.id ?? null, createdAt: ctx.now,
      } });
      const item = toAnswerView({ ...post, author }, prompt);
      const earned = await awardPromptXp(tx, author.id, promptPostCount + 1, ctx.now);
      ctx.afterCommit(() => this.publisher.postCreated(item));
      return earned;
    });
  }

  answers(actor: Actor, promptId: string, page: number, pageSize: number): Promise<AnswerPage> {
    return this.uow.readOnly(async (tx) => {
      const prompt = await tx.reflectionPrompt.findUnique({ where: { id: promptId } });
      if (prompt === null) throw new ApiError('not_found');
      const maximum = await tx.reflectionPrompt.aggregate({ _max: { publicationOrder: true } });
      const existing = await tx.post.findUnique({ where: { promptId_authorId: { promptId: prompt.id, authorId: actor.studentId } }, select: { id: true } });
      return {
        prompt: toPromptView(prompt), live: prompt.publicationOrder === maximum._max.publicationOrder, answeredByMe: existing !== null,
        ...await readPostPage(tx, actor.studentId, { promptId: prompt.id }, page, pageSize),
      };
    });
  }

  publish(actor: Actor, question: string): Promise<PromptView> {
    if (!isValidText(question, LIMITS.promptQuestion, true)) throw new ApiError('validation_failed');
    return this.uow.run({ name: 'prompt.publish', retryUniqueOn: ['ReflectionPrompt_publication_order_key'] }, async (tx, ctx) => {
      await readActiveAdmin(tx, actor.studentId);
      const maximum = await tx.reflectionPrompt.aggregate({ _max: { publicationOrder: true } });
      await ctx.checkpoint('prompt.publish');
      return toPromptView(await tx.reflectionPrompt.create({
        data: { question: question.trim(), publishedAt: ctx.now, publicationOrder: (maximum._max.publicationOrder ?? 0n) + 1n },
      }));
    });
  }

  live(actor: Actor): Promise<{ prompt: PromptView | null; answeredByMe: boolean }> {
    return this.uow.readOnly(async (tx) => {
      const prompt = await tx.reflectionPrompt.findFirst({ orderBy: { publicationOrder: 'desc' } });
      const answer = prompt === null ? null : await tx.post.findUnique({
        where: { promptId_authorId: { promptId: prompt.id, authorId: actor.studentId } }, select: { id: true },
      });
      return { prompt: prompt === null ? null : toPromptView(prompt), answeredByMe: answer !== null };
    });
  }

  history(_actor: Actor, page: number, pageSize: number): Promise<PromptPage> {
    return this.uow.readOnly(async (tx) => {
      const maximum = await tx.reflectionPrompt.aggregate({ _max: { publicationOrder: true } });
      const total = await tx.reflectionPrompt.count();
      const rows = await tx.reflectionPrompt.findMany({
        orderBy: { publicationOrder: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { _count: { select: { answers: { where: { removedAt: null } } } } },
      });
      return { items: rows.map((row) => ({ ...toPromptView(row), live: row.publicationOrder === maximum._max.publicationOrder, answerCount: row._count.answers })), total, page, pageSize };
    });
  }
}
