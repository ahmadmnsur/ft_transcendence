import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { encodeCursor, type Cursor } from '../core/cursor';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import { isValidText, LIMITS, PAGING } from '../shared/limits';
import { ApiError, Refusal, type RefusalSpec } from '../core/errors';
import { readActiveAdmin } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef } from '../students/student-ref';
import { toPromptView, type AnswerPage, type AnswerView, type PromptPage, type PromptView } from './views';

const ALREADY_ANSWERED = { code: 'already_answered', message: 'You have already answered this Reflection Prompt.' } as const satisfies RefusalSpec;

@Injectable()
export class PromptsService {
  constructor(private readonly uow: UnitOfWork, private readonly publisher: RealtimePublisher) {}

  answer(actor: Actor, promptId: string, body: string): Promise<AnswerView> {
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
      await ctx.checkpoint('prompt.answer');
      const post = await tx.post.create({ data: {
        authorId: author.id, promptId: prompt.id, body: body.trim(), answerRoundId: round?.id ?? null, createdAt: ctx.now,
      } });
      const item: AnswerView = {
        id: post.id, origin: 'PROMPT_ANSWER', prompt: { id: prompt.id, question: prompt.question },
        author: toStudentRef(author), body: post.body, createdAt: post.createdAt.toISOString(), likeCount: 0, likedByMe: false,
      };
      ctx.afterCommit(() => this.publisher.postCreated(item));
      return item;
    });
  }

  answers(actor: Actor, promptId: string, cursor: Cursor | null): Promise<AnswerPage> {
    return this.uow.readOnly(async (tx) => {
      const prompt = await tx.reflectionPrompt.findUnique({ where: { id: promptId } });
      if (prompt === null) throw new ApiError('not_found');
      const maximum = await tx.reflectionPrompt.aggregate({ _max: { publicationOrder: true } });
      const existing = await tx.post.findUnique({ where: { promptId_authorId: { promptId: prompt.id, authorId: actor.studentId } }, select: { id: true } });
      const rows = await tx.post.findMany({
        where: { promptId: prompt.id, removedAt: null, ...(cursor === null ? {} : { OR: [
          { createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ] }) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: PAGING.maxPageSize + 1,
        include: { author: { select: STUDENT_REF_SELECT } },
      });
      const visible = rows.slice(0, PAGING.maxPageSize);
      const last = visible.at(-1);
      return {
        prompt: toPromptView(prompt), live: prompt.publicationOrder === maximum._max.publicationOrder, answeredByMe: existing !== null,
        items: visible.map((post) => ({
          id: post.id, origin: 'PROMPT_ANSWER', prompt: { id: prompt.id, question: prompt.question }, author: toStudentRef(post.author),
          body: post.body, createdAt: post.createdAt.toISOString(), likeCount: 0, likedByMe: false,
        })),
        nextCursor: rows.length > PAGING.maxPageSize && last !== undefined ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
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

  history(page: number, pageSize: number): Promise<PromptPage> {
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
