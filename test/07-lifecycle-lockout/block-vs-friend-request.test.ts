import { describe, expect, it } from 'vitest';
import type { Actor } from '../../src/core/actor';
import { PrismaService } from '../../src/core/prisma.service';
import { SocialService } from '../../src/social/social.service';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';

const harness = useHarness();

function actor(studentId: string): Actor {
  return { studentId, sessionHash: null };
}

// What a service call ended with: its value, or the code of the refusal it
// threw.
async function outcome(work: Promise<unknown>): Promise<'ok' | string> {
  try {
    await work;
    return 'ok';
  } catch (err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    throw err;
  }
}

// The pair's rows once both operations ended: a Block and a Friendship row
// must never both be there (§11.2, §3.6.3).
async function pairRows(a: string, b: string): Promise<{ blocks: number; friendships: number }> {
  const prisma = harness.app.get(PrismaService);
  const pair = [
    { a, b },
    { a: b, b: a },
  ];
  const blocks = await prisma.block.count({
    where: { OR: pair.map(({ a: x, b: y }) => ({ blockerId: x, blockedId: y })) },
  });
  const friendships = await prisma.friendship.count({
    where: { OR: pair.map(({ a: x, b: y }) => ({ requesterId: x, addresseeId: y })) },
  });
  return { blocks, friendships };
}

// Holds `requester`'s friend request to `target` and a Block between the same
// pair, set by `blocker`, after their reads and before their writes, then
// lets `first` through to its commit before the other (§3.6.4).
async function race(
  requester: string,
  target: string,
  blocker: 'requester' | 'target',
  first: 'block' | 'request',
): Promise<{ block: string; request: string }> {
  const social = harness.app.get(SocialService);
  const [blockerId, blockedId] = blocker === 'requester' ? [requester, target] : [target, requester];
  harness.barriers.arm('block-create');
  harness.barriers.arm('friend-request');
  const block = outcome(social.block(actor(blockerId), blockedId));
  const request = outcome(social.requestFriend(actor(requester), target));
  await harness.barriers.waitFor('block-create', 1);
  await harness.barriers.waitFor('friend-request', 1);
  harness.barriers.disarm('block-create');
  harness.barriers.disarm('friend-request');
  const [winner, loser] = first === 'block' ? [block, request] : [request, block];
  harness.barriers.release(first === 'block' ? 'block-create' : 'friend-request');
  await winner;
  harness.barriers.release(first === 'block' ? 'friend-request' : 'block-create');
  await loser;
  return { block: await block, request: await request };
}

// §16.3 row 7: a Block and a new friend request between the same pair have
// one serial order. Block first, the request is refused; request first, the
// Block deletes it. Either way no Block sits beside a Friendship row.
describe('Block vs friend request', () => {
  it('Block first: the request is refused friend_request_unavailable', async () => {
    const a = await createTestAccount(harness.app);
    const b = await createTestAccount(harness.app);
    const result = await race(a.id, b.id, 'target', 'block');
    expect(result).toEqual({ block: 'ok', request: 'friend_request_unavailable' });
    expect(await pairRows(a.id, b.id)).toEqual({ blocks: 1, friendships: 0 });
  });

  it('Block first, set by the requester: the request is refused the same way', async () => {
    const a = await createTestAccount(harness.app);
    const b = await createTestAccount(harness.app);
    const result = await race(a.id, b.id, 'requester', 'block');
    expect(result).toEqual({ block: 'ok', request: 'friend_request_unavailable' });
    expect(await pairRows(a.id, b.id)).toEqual({ blocks: 1, friendships: 0 });
  });

  it('request first: the Block deletes the pending request', async () => {
    const a = await createTestAccount(harness.app);
    const b = await createTestAccount(harness.app);
    const result = await race(a.id, b.id, 'target', 'request');
    expect(result).toEqual({ block: 'ok', request: 'ok' });
    expect(await pairRows(a.id, b.id)).toEqual({ blocks: 1, friendships: 0 });
  });

  it('request first, Block set by the requester: the Block deletes it too', async () => {
    const a = await createTestAccount(harness.app);
    const b = await createTestAccount(harness.app);
    const result = await race(a.id, b.id, 'requester', 'request');
    expect(result).toEqual({ block: 'ok', request: 'ok' });
    expect(await pairRows(a.id, b.id)).toEqual({ blocks: 1, friendships: 0 });
  });
});
