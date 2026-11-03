import type { PrismaTx } from '../core/uow';
import type { ReflectionPrompt } from '../generated/prisma/client';

export type LivePrompt = { prompt: ReflectionPrompt | null; answeredByMe: boolean };

export async function readLivePrompt(tx: PrismaTx, studentId: string): Promise<LivePrompt> {
  const prompt = await tx.reflectionPrompt.findFirst({ orderBy: { publicationOrder: 'desc' } });
  const answer = prompt === null ? null : await tx.post.findUnique({
    where: { promptId_authorId: { promptId: prompt.id, authorId: studentId } }, select: { id: true },
  });
  return { prompt, answeredByMe: answer !== null };
}
