import { Injectable } from '@nestjs/common';
import type { Actor } from '../core/actor';
import { ApiError } from '../core/errors';
import { UnitOfWork } from '../core/uow';
import { readActiveActor } from '../students/profile-writes';
import { STUDENT_REF_SELECT, toStudentRef, type StudentRef } from '../students/student-ref';
import { readPostPage } from './post-page';
import { postUnavailable } from './refusals';
import { postViewSelect, toPostView, type LikeState, type PostPage, type PostView } from './views';

// §3.4's `feed` module: `Post` reads and the `Like` rows. A write method takes
// an Actor and runs in exactly one `uow.run`; a read runs in `uow.readOnly`,
// so a page's Posts, counts and the viewer's own Likes agree.

// §6.9: an unknown Post is 404; a removed one is `post_unavailable` on every
// route, the Like writes included, which then write nothing.
function visiblePost<T extends { removedAt: Date | null }>(post: T | null): T {
  if (post === null) throw new ApiError('not_found');
  if (post.removedAt !== null) throw postUnavailable();
  return post;
}

@Injectable()
export class FeedService {
  constructor(private readonly uow: UnitOfWork) {}

  // `GET /api/feed` (§6.9).
  feed(actor: Actor, page: number, pageSize: number): Promise<PostPage> {
    return this.uow.readOnly((tx) => readPostPage(tx, actor.studentId, {}, page, pageSize));
  }

  // `GET /api/students/:id/posts` (§6.2): the Posts on a profile. A Removed
  // Student has no profile (§4.6), as `GET /api/students/:id` answers with
  // `profile: null`, so the page is empty; the feed keeps their Posts under
  // the tombstone. An unknown Student is 404.
  postsBy(actor: Actor, studentId: string, page: number, pageSize: number): Promise<PostPage> {
    return this.uow.readOnly(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId }, select: { removedAt: true } });
      if (student === null) throw new ApiError('not_found');
      if (student.removedAt !== null) return { items: [], total: 0 };
      return readPostPage(tx, actor.studentId, { authorId: studentId }, page, pageSize);
    });
  }

  // `GET /api/posts/:id` (§6.9).
  getPost(actor: Actor, postId: string): Promise<PostView> {
    return this.uow.readOnly(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { ...postViewSelect(actor.studentId), removedAt: true },
      });
      return toPostView(visiblePost(post));
    });
  }

  // `GET /api/posts/:id/likes` (§6.9): every liker, the newest Like first. Who
  // liked a Post is read by every signed-in Student (ADR-0018 d4).
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

  // `POST /api/posts/:id/like` (§6.9, §11.5): `ON CONFLICT DO NOTHING`, so a
  // second Like of the same Post changes nothing. A self-Like is allowed. No
  // XP and no event.
  like(actor: Actor, postId: string): Promise<LikeState> {
    return this.uow.run({ name: 'post.like' }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      visiblePost(await tx.post.findUnique({ where: { id: postId }, select: { removedAt: true } }));
      await ctx.checkpoint('post.like');
      // Prisma writes `skipDuplicates` as `ON CONFLICT DO NOTHING`.
      await tx.like.createMany({
        data: [{ postId, studentId: actor.studentId, createdAt: ctx.now }],
        skipDuplicates: true,
      });
      return { likeCount: await tx.like.count({ where: { postId } }), likedByMe: true };
    });
  }

  // `DELETE /api/posts/:id/like` (§6.9): deletes the actor's Like if there is
  // one. No event.
  unlike(actor: Actor, postId: string): Promise<LikeState> {
    return this.uow.run({ name: 'post.unlike' }, async (tx, ctx) => {
      await readActiveActor(tx, actor.studentId);
      visiblePost(await tx.post.findUnique({ where: { id: postId }, select: { removedAt: true } }));
      await ctx.checkpoint('post.unlike');
      await tx.like.deleteMany({ where: { postId, studentId: actor.studentId } });
      return { likeCount: await tx.like.count({ where: { postId } }), likedByMe: false };
    });
  }
}
