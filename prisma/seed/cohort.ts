import type { AuthService } from '../../src/auth/auth.service';
import type { EnvRecord } from '../../src/core/env';
import type { PrismaService } from '../../src/core/prisma.service';
import { isValidLearningGoalText } from '../../src/shared/limits';
import type { StudentsService } from '../../src/students/students.service';
import { NAMES, generateCohort } from '../fixtures/cohort';
import { assertSignUpFields } from './bootstrap';
import { SeedFailure } from './failure';

// §14.3: the generator's options for the thirty Students, and for the Peer
// Moderator's lists.
const COHORT_OPTIONS = { size: 30, seed: 42, unmatchable: 1 } as const;
const PEER_MODERATOR_OPTIONS = { size: 1, seed: 4242 } as const;

// The gap Skill G. No seeded Student lists it but X, who teaches it, and Y,
// who wants it, so X's Block of Y leaves it covered by no Match (ADR-0017 d8's
// note of 2026-09-23). X and Y are reserved positions.
export const GAP_SKILL = 'Valgrind';
export const X_POSITION = 1;
export const Y_POSITION = 2;

// §14.3's reserved positions: 0, the unmatchable Student, then X and Y.
// They stay Active candidates, so none of them is the demo Student.
export const RESERVED_POSITIONS: readonly number[] = [0, X_POSITION, Y_POSITION];

// The Student at position p, as the seed will make it: Skills by name, the
// Goal as its Skill's name. The generator's XP is dropped, so everyone starts
// at 0 XP.
export type PlannedStudent = {
  position: number;
  email: string;
  displayName: string;
  teach: string[];
  learn: string[];
  goal: string | null;
};

function withoutGap(skills: readonly string[]): string[] {
  return skills.filter((skill) => skill !== GAP_SKILL);
}

function goalSentence(skill: string): string {
  return `I want to get comfortable with ${skill} for my next project.`;
}

// The cohort in position order (§14.3). A generated Goal is kept when it is
// still on its LEARN list and is not G, which Y's list holds again.
export function cohortPlan(): PlannedStudent[] {
  return generateCohort(COHORT_OPTIONS).map((generated, position) => {
    const name = NAMES[position % NAMES.length];
    const teach = withoutGap(generated.canTeach);
    const learn = withoutGap(generated.wantsToLearn);
    if (position === X_POSITION) teach.push(GAP_SKILL);
    if (position === Y_POSITION) learn.push(GAP_SKILL);
    const goal = generated.learningGoal ?? null;
    return {
      position,
      email: `${name.toLowerCase()}.${String(position + 1).padStart(2, '0')}@peerconnect.test`,
      displayName: position >= NAMES.length ? `${name} 2` : name,
      teach,
      learn,
      goal: goal !== null && goal !== GAP_SKILL && learn.includes(goal) ? goal : null,
    };
  });
}

// The thirty emails, which §14.9's guard counts as the seed's own.
export function cohortEmails(): string[] {
  return cohortPlan().map((planned) => planned.email);
}

// Through sign-up itself, strictly in position order (§14.3), so NestJS makes
// the ids in that order. Returns them in position order.
export async function signUpCohort(
  cohort: readonly PlannedStudent[],
  env: EnvRecord,
  auth: AuthService,
): Promise<string[]> {
  // The boot check's step 1 already holds it to the password rule; sign-up
  // uses it trimmed, as the DTO hands it on (§5.1).
  const password = (env['SEED_STUDENT_PASSWORD'] as string).trim();
  const ids: string[] = [];
  for (const planned of cohort) {
    const fields = { email: planned.email, password, displayName: planned.displayName };
    assertSignUpFields(`position ${planned.position}`, fields);
    const created = await auth.signup({ ...fields, sessionToken: null });
    ids.push(created.student.id);
  }
  return ids;
}

// §14.3, §4.1: later slices break ties by the lower id, which must mean the
// lower position, so the order is read back from the database itself.
export async function assertIdOrder(
  prisma: PrismaService,
  cohort: readonly PlannedStudent[],
): Promise<void> {
  const rows = await prisma.student.findMany({
    where: { email: { in: cohort.map((planned) => planned.email) } },
    orderBy: { id: 'asc' },
    select: { email: true },
  });
  const inOrder =
    rows.length === cohort.length && rows.every((row, index) => row.email === cohort[index].email);
  if (!inOrder) {
    throw new SeedFailure(`the ${cohort.length} Students' id order is not their position order`);
  }
}

function skillId(skillIds: ReadonlyMap<string, string>, name: string): string {
  const id = skillIds.get(name);
  if (id === undefined) throw new SeedFailure('a Skill the seed lists is missing from the catalogue');
  return id;
}

// One Student's lists through `students.setSkills`, as that Student. The
// Skill-list path takes ids (§6.2).
async function setLists(
  students: StudentsService,
  studentId: string,
  lists: { teach: readonly string[]; learn: readonly string[] },
  skillIds: ReadonlyMap<string, string>,
): Promise<void> {
  const toIds = (names: readonly string[]): string[] => names.map((name) => skillId(skillIds, name));
  await students.setSkills({ studentId, sessionHash: null }, toIds(lists.teach), toIds(lists.learn));
}

// Each Student's lists, then the Goal through `students.setLearningGoal`, as
// that Student (§14.3). `ids` are in position order. Returns the number of
// Goals set.
export async function setCohortLists(
  cohort: readonly PlannedStudent[],
  ids: readonly string[],
  skillIds: ReadonlyMap<string, string>,
  students: StudentsService,
): Promise<number> {
  let goals = 0;
  for (const planned of cohort) {
    const studentId = ids[planned.position];
    await setLists(students, studentId, planned, skillIds);
    if (planned.goal === null) continue;
    // The DTO's rule for the sentence, which the seed checks itself (§6.2).
    const sentence = goalSentence(planned.goal);
    if (!isValidLearningGoalText(sentence)) {
      throw new SeedFailure(`position ${planned.position}'s Learning Goal sentence breaks its rule`);
    }
    await students.setLearningGoal(
      { studentId, sessionHash: null },
      skillId(skillIds, planned.goal),
      sentence,
    );
    goals += 1;
  }
  return goals;
}

// The Peer Moderator's lists: the one Student of their own seed, with G
// removed and no Goal (§14.3). Returns each list's length.
export async function setPeerModeratorLists(
  peerModeratorId: string,
  skillIds: ReadonlyMap<string, string>,
  students: StudentsService,
): Promise<{ teach: number; learn: number }> {
  const generated = generateCohort(PEER_MODERATOR_OPTIONS)[0];
  const lists = { teach: withoutGap(generated.canTeach), learn: withoutGap(generated.wantsToLearn) };
  await setLists(students, peerModeratorId, lists, skillIds);
  return { teach: lists.teach.length, learn: lists.learn.length };
}
