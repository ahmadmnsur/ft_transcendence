import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { RealtimePublisher } from '../core/realtime-publisher';
import { UnitOfWork } from '../core/uow';
import { readActiveActor } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import { readPostPage } from './post-page';
import { postUnavailable } from './refusals';
import { postViewSelect, toPostView, type LikeState, type PostPage, type PostView } from './views';


function visiblePost<T extends { removedAt: Date | null }>(post: T | null): T {
  if (post === null) throw new ApiError('not_found');
  if (post.removedAt !== null) throw postUnavailable();
  return post;
}

@Injectable()
export class FeedService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly publisher: RealtimePublisher,
  ) {}

  feed(actor: Actor, page: number, pageSize: number): Promise<PostPage> {
    return this.uow.readOnly((tx) => readPostPage(tx, actor.studentId, {}, page, pageSize));
  }

  postsBy(actor: Actor, studentId: string, page: number, pageSize: number): Promise<PostPage> {
    return this.uow.readOnly(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId }, select: { removedAt: true } });
      if (student === null) throw new ApiError('not_found');
      if (student.removedAt !== null) return { items: [], total: 0 };
      return readPostPage(tx, actor.studentId, { authorId: studentId }, page, pageSize);
    });
  }

  getPost(actor: Actor, postId: string): Promise<PostView> {
    return this.uow.readOnly(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { ...postViewSelect(actor.studentId), removedAt: true },
      });
      return toPostView(visiblePost(post));
    });
  }

  likers(_actor: Actor, postId: string): Promise<{ items: StudentRef[] }> {
    return this.uow.readOnly(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: {
          removedAt: true,
          likes: {
            orderBy: [{ createdAt: 'desc' }, { studentId: 'asc' }],
            select: { student: { select: STUDENT_REF_SELECT } },
          },
        },
      });
      return { items: visiblePost(post).likes.map((like) => toStudentRef(like.student)) };
    });
  }

  like(actor: Actor, postId: string): Promise<LikeState> {
    return this.uow.run({ name: 'post.like' }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const post = visiblePost(await tx.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true, removedAt: true },
      }));
      await ctx.checkpoint('post.like');
      const { count } = await tx.like.createMany({
        data: [{ postId, studentId: actor.studentId, createdAt: ctx.now }],
        skipDuplicates: true,
      });
      const likeCount = await tx.like.count({ where: { postId } });
      if (count > 0) ctx.afterCommit(() => this.publisher.postLikes(post.authorId, post.id, likeCount));
      return { likeCount, likedByMe: true };
    });
  }

  unlike(actor: Actor, postId: string): Promise<LikeState> {
    return this.uow.run({ name: 'post.unlike' }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      const post = visiblePost(await tx.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true, removedAt: true },
      }));
      await ctx.checkpoint('post.unlike');
      const { count } = await tx.like.deleteMany({ where: { postId, studentId: actor.studentId } });
      const likeCount = await tx.like.count({ where: { postId } });
      if (count > 0) ctx.afterCommit(() => this.publisher.postLikes(post.authorId, post.id, likeCount));
      return { likeCount, likedByMe: false };
    });
  }
}
