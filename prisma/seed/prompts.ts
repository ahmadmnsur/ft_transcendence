import type { Actor } from '../../src/core/actor';
import type { PrismaService } from '../../src/core/prisma.service';
import type { PromptsService } from '../../src/prompts/prompts.service';
import { SeedFailure } from './failure';

export const PROMPT_QUESTIONS = [
  'Describe how you handled a conflict at work or in a team project.',
  'What is a mistake that taught you something important?',
  "What is one piece of advice you'd give a first-year student?",
  'What technology are you currently learning, and why?',
] as const;

const STUDENT_ANSWERS = [
  [
    'Two of us wanted different libraries for the same feature. We each built a small spike, ' +
      'compared them against the subject, and kept the simpler one.',
    'Our team argued about splitting the work by layer or by feature. We tried feature slices for one week, ' +
      'the merge conflicts dropped, and nobody wanted to go back.',
    'A teammate kept pushing straight to the main branch. Instead of arguing in the group chat, ' +
      'I asked to pair for an afternoon, and we set up branch rules together.',
    'We missed a deadline because nobody owned the integration. I suggested a short daily check-in ' +
      'and one person to merge each evening, and the next deadline held.',
  ],
  [
    'I freed the same pointer twice and spent a day chasing a crash somewhere else. ' +
      'Now I run a memory checker before every push.',
    'I rewrote a whole module without tests and broke three things I only noticed during the evaluation. ' +
      'Now I write the test first for anything I touch.',
    'I committed a password to a public repository. Rotating it took minutes; ' +
      'the habit of keeping secrets out of git has stuck ever since.',
    "I assumed every input would be valid. A peer's first test sent an empty line and my program crashed, " +
      'so now I start from the edge cases.',
  ],
  [
    'Ask for an evaluation early, even when you think you are not ready. ' +
      'The feedback saves more time than it costs.',
    'Read the subject twice before you write any code, and keep a list of every requirement you find.',
    'Find a peer who knows what you want to learn and offer to teach them something back. You both move faster.',
    'Commit small and often. A history you can read is the best debugger you will ever have.',
  ],
] as const;

const PEER_MODERATOR_ANSWERS = [
  'Two peers once argued over who had built what in a shared project. I asked each to list their own commits, ' +
    'and the list settled it faster than any discussion.',
  'I once closed a discussion too quickly without reading the whole thread. ' +
    'Since then I read every message before I decide anything.',
  'Be kind in your evaluations. The person in front of you is learning the same way you are.',
] as const;

const ROUND_PROMPTS = [
  { prompt: 1, publish: false, excludedRemainder: 0, parity: null, peerModerator: true },
  { prompt: 2, publish: true, excludedRemainder: 1, parity: null, peerModerator: true },
  { prompt: 3, publish: true, excludedRemainder: 2, parity: 0, peerModerator: true },
  { prompt: 3, publish: false, excludedRemainder: 2, parity: 1, peerModerator: false },
] as const;

export type PromptStepResult = { prompt: number; published: boolean; answered: number; skipped: number };
export type PromptScript = {
  publish(prompt: number): Promise<void>;
  afterOpen(round: number): Promise<PromptStepResult>;
};

export function promptScript(
  prompts: PromptsService,
  prisma: PrismaService,
  admin: Actor,
  cohortIds: readonly string[],
  peerModeratorId: string,
): PromptScript {
  const promptIds: string[] = [];

  async function publish(prompt: number): Promise<void> {
    if (prompt !== promptIds.length + 1 || prompt > PROMPT_QUESTIONS.length) {
      throw new SeedFailure('the Prompts must be published in order 1, 2, 3, 4');
    }
    const published = await prompts.publish(admin, PROMPT_QUESTIONS[prompt - 1]);
    promptIds.push(published.id);
  }

  return {
    publish,
    async afterOpen(round): Promise<PromptStepResult> {
      const plan = ROUND_PROMPTS[round - 1];
      if (plan === undefined) throw new SeedFailure('the Prompt script only covers Rounds 1–4');
      if (plan.publish) await publish(plan.prompt);
      const promptId = promptIds[plan.prompt - 1];
      if (promptId === undefined) throw new SeedFailure(`Round ${round}'s Prompt has not been published`);

      const planned: { studentId: string; sentence: string }[] = cohortIds.flatMap((studentId, position) => {
        if (position % 5 === plan.excludedRemainder ||
            (plan.parity !== null && position % 2 !== plan.parity)) return [];
        return [{ studentId, sentence: STUDENT_ANSWERS[plan.prompt - 1][position % 4] }];
      });
      if (plan.peerModerator) {
        planned.push({ studentId: peerModeratorId, sentence: PEER_MODERATOR_ANSWERS[plan.prompt - 1] });
      }

      const inactive = await prisma.student.findMany({
        where: {
          id: { in: planned.map((answer) => answer.studentId) },
          OR: [{ suspendedAt: { not: null } }, { removedAt: { not: null } }],
        },
        select: { id: true },
      });
      const skippedIds = new Set(inactive.map((student) => student.id));
      let answered = 0;
      let skipped = 0;
      for (const { studentId, sentence } of planned) {
        if (skippedIds.has(studentId)) {
          skipped += 1;
          continue;
        }
        await prompts.answer({ studentId, sessionHash: null }, promptId, sentence);
        answered += 1;
      }
      return { prompt: plan.prompt, published: plan.publish, answered, skipped };
    },
  };
}
