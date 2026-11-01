export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function levelOf(xp: number): number {
  return Math.min(10, 1 + Math.floor(xp / 250));
}

export const SKILLS: readonly string[] = [
  'C',
  'C++',
  'Makefile',
  'Shell',
  'Git',
  'Docker',
  'Networking',
  'Sockets',
  'HTTP',
  'SQL',
  'Prisma',
  'NestJS',
  'React',
  'Tailwind',
  'TypeScript',
  'Testing',
  'Debugging',
  'Valgrind',
  'Algorithms',
  'Graphics',
  'Threads',
  'Security',
  'Linux',
  'Nginx',
];

export const RARE_SKILLS: readonly string[] = [
  'Quantum Computing',
  'FPGA Design',
  'Rust Macros',
];

export const NAMES: readonly string[] = [
  'Karim',
  'Ahmad',
  'Lina',
  'Youssef',
  'Sofia',
  'Mehdi',
  'Nour',
  'Omar',
  'Hiba',
  'Tarek',
  'Salma',
  'Bilal',
  'Rania',
  'Anas',
  'Dounia',
  'Ilyas',
  'Fadel',
  'Kamel',
  'Amine',
  'Zineb',
  'Walid',
  'Nadia',
  'Sami',
  'Houda',
];

export type CohortStudent = {
  id: string;
  name: string;
  canTeach: string[];
  wantsToLearn: string[];
  learningGoal: string | null | undefined;
  xp: number;
};

export function generateCohort({
  size = 20,
  seed = 42,
  maxTeach = 5,
  maxWant = 5,
  unmatchable = 0,
}: {
  size?: number;
  seed?: number;
  maxTeach?: number;
  maxWant?: number;
  unmatchable?: number;
} = {}): CohortStudent[] {
  const rnd = mulberry32(seed);
  const take = (pool: readonly string[], n: number): string[] => {
    const copy = pool.slice();
    const out: string[] = [];
    for (let i = 0; i < n && copy.length; i++) {
      out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    }
    return out;
  };
  const students: CohortStudent[] = [];
  for (let i = 0; i < size; i++) {
    const canTeach = take(SKILLS, 1 + Math.floor(rnd() * maxTeach));
    const wantsToLearn = take(
      SKILLS.filter((s) => !canTeach.includes(s)),
      1 + Math.floor(rnd() * maxWant),
    );
    const learningGoal =
      rnd() < 0.6 ? wantsToLearn[Math.floor(rnd() * wantsToLearn.length)] : null;
    const xp = Math.floor(rnd() * 2500);
    rnd();
    students.push({
      id: 's' + i,
      name: NAMES[i % NAMES.length],
      canTeach,
      wantsToLearn,
      learningGoal,
      xp,
    });
  }
  for (let i = 0; i < unmatchable && i < students.length; i++) {
    students[i].wantsToLearn = RARE_SKILLS.slice(0, 2);
    students[i].learningGoal = RARE_SKILLS[0];
  }
  return students;
}
