import 'reflect-metadata';
import { createInterface } from 'node:readline/promises';
import { AppConfig } from '../../src/core/app-config';
import { envFailure, resolveSupabaseTarget, type EnvRecord, type SupabaseTarget } from '../../src/core/env';
import { ApiError } from '../../src/core/errors';
import { SupabaseAuthClient } from '../../src/core/supabase-auth';
import { errorCodeSuffix } from '../../src/core/supabase-check';
import { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { emptyEverything } from '../seed/empty';
import { openLockConnection, tryTakeSeedLock } from '../seed/lock';
import { clearRecord } from '../seed/record';

// The two resets (§15.6, ADR-0004 d11's notes of 2026-10-03 and 2026-10-11).
// `make reset-team` runs this with `team` and reads .env; `make reset-local`
// runs it with `local` and reads .env.example alone. Each empties its one
// fixed target through the seed's own function, so the next boot seeds
// afresh, and leaves the project or the stack, its settings, the buckets and
// the keys. `make reset-team` has already checked, on the host, that the
// checkout is an up-to-date main (require-main.sh). It prints a variable's
// name, a host, the project ref and counts, never a value or an error's
// message, which can quote DATABASE_URL (§3.9).

// Each command's one target: the boot check's name for it, the file its
// values come from, and what to do once it is empty.
const TARGETS = {
  team: {
    command: 'make reset-team',
    name: 'the team project',
    kind: 'team',
    source: '.env',
    next: 'Now run make up from this same checkout, and keep every other stack stopped until its boot has finished writing the fixture.',
  },
  local: {
    command: 'make reset-local',
    name: 'the local fallback',
    kind: 'fallback',
    source: '.env.example',
    next: 'Boot it again with make local or make dev to seed it; if its stack is still up, run make down before that.',
  },
} as const;

type Target = (typeof TARGETS)[keyof typeof TARGETS];

function parseTarget(arg: string | undefined): Target {
  if (arg === 'team' || arg === 'local') return TARGETS[arg];
  console.error('usage: node dist/prisma/reset/main.js team|local');
  process.exit(2);
}

const target = parseTarget(process.argv[2]);

// Set just before the first write. From then on a stop leaves the target
// partly emptied, and running the reset again finishes it (§15.6 step 4).
let wrote = false;

function stop(message: string): never {
  const outcome = wrote ? 'Fix what it names, then run it again to finish the reset.' : 'Nothing was deleted.';
  console.error(`${target.command} ${message}. ${outcome}`);
  process.exit(1);
}

// An error as its class and code, never its message.
function failureLabel(err: unknown): string {
  const name = err instanceof Error ? err.constructor.name : typeof err;
  return `${name}${err instanceof ApiError ? ` (${err.code})` : errorCodeSuffix(err)}`;
}

process.on('uncaughtException', (err) => stop(`stopped: ${failureLabel(err)}`));
process.on('unhandledRejection', (err) => stop(`stopped: ${failureLabel(err)}`));

async function orStop<T>(doing: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    stop(`stopped while ${doing}: ${failureLabel(err)}`);
  }
}

// The boot check's steps 1 and 2 (§15.4, §15.5), since neither reset runs the
// boot chain, then this command's one target: a mixed .env would otherwise
// delete Supabase Auth users on one target and rows on the other.
function checkValues(env: EnvRecord): SupabaseTarget {
  const failure = envFailure(env);
  if (failure !== undefined) stop(`refused: ${failure}`);
  const found = resolveSupabaseTarget(env);
  if (found.kind !== target.kind) {
    stop(`refused: DATABASE_URL and SUPABASE_URL do not name ${target.name}; ${target.source} must hold its values`);
  }
  return found;
}

// One line from the terminal, or null when the input ends or Ctrl-C closes it.
async function ask(question: string): Promise<string | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const closed = new Promise<null>((resolve) => rl.once('close', () => resolve(null)));
  rl.on('SIGINT', () => rl.close());
  try {
    return await Promise.race([rl.question(question).catch(() => null), closed]);
  } finally {
    rl.close();
  }
}

// The team project's ref is printed and must be typed back before anything
// is deleted; a wrong ref deletes nothing (§15.6 step 2).
async function confirmRef(ref: string): Promise<void> {
  console.log(
    `${target.command} empties ${target.name} ${ref}: every row of our tables, every Supabase Auth user ` +
      'and every file in avatars and evidence. ' +
      'The tables, migrations, settings, buckets and keys stay. Every stack connected to it must be stopped.',
  );
  const typed = await ask('Type the project ref to go on: ');
  if (typed === null) {
    process.stdout.write('\n');
    stop('refused: no project ref was typed');
  }
  if (typed.trim() !== ref) stop(`refused: the typed ref is not ${ref}`);
}

// Supabase Auth's admin list, read once before the first write. The
// emptying's TRUNCATE comes before its first Auth call, so a wrong
// SUPABASE_SECRET_KEY would otherwise be found only once the rows are gone.
// Neither reset runs the boot check's step 3, which tests the keys (§15.5).
async function checkAuthAdmin(auth: SupabaseAuthClient): Promise<void> {
  try {
    await auth.adminListUserIds();
  } catch (err) {
    const host = new URL(process.env['SUPABASE_URL'] as string).hostname;
    // An ApiError here is busy_retry_later: no answer, a timeout or a 5xx.
    // Anything else carries no status: a wrong key's 401 or 403, but also a
    // path on SUPABASE_URL or a body that breaks off, so it names both values.
    stop(
      err instanceof ApiError
        ? `refused: Supabase Auth at SUPABASE_URL host ${host} did not answer; run the reset once it does`
        : `refused: Supabase Auth at SUPABASE_URL host ${host} did not return the admin list; check that SUPABASE_SECRET_KEY is ${target.name}'s secret key and SUPABASE_URL its bare address, then run the reset again`,
    );
  }
}

async function reset(): Promise<void> {
  const found = checkValues(process.env);
  const config = new AppConfig();
  const auth = new SupabaseAuthClient(config);
  const storage = new SupabaseStorageClient(config);
  if (found.kind === 'team') await confirmRef(found.ref);
  const where = found.kind === 'team' ? `${target.name} ${found.ref}` : target.name;

  // The seed's lock, on a connection of its own (§14.9). Losing it stops the
  // reset at once, with no reconnect, since a seed could take the freed lock.
  const host = new URL(process.env['DATABASE_URL'] as string).hostname;
  const lock = await orStop(`connecting to DATABASE_URL host ${host}`, () =>
    openLockConnection(process.env, () => stop('stopped: the lock connection was lost')),
  );
  if (!(await orStop("taking the seed's lock", () => tryTakeSeedLock(lock.client)))) {
    stop(`refused: a seed, or another reset, is running on ${where} and holds the seed's lock; run the reset once it has finished`);
  }
  await checkAuthAdmin(auth);
  console.log(`${target.command}: emptying ${where}`);

  // The first write, on the lock's connection: a reset that stops partway
  // leaves no record over the rows left (§14.9).
  wrote = true;
  await orStop('clearing the completion record', () => clearRecord(lock.client));
  const emptied = await orStop('emptying', () => emptyEverything(lock.client, auth, storage));
  // Closing on purpose is no loss; the lock ends with its connection.
  await lock.release().catch(() => undefined);

  console.log(
    `${target.command} emptied ${where}: the rows of ${emptied.tables} tables, ` +
      `${emptied.authUsers} Supabase Auth users and ${emptied.files} files deleted. ${target.next}`,
  );
}

// Exit at once, so no socket left open can hold the terminal.
void reset().then(() => process.exit(0));
