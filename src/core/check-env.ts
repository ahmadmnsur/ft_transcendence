import { assertEnvOrExit } from './env';
import { checkDatabase, checkSupabaseKeys, errorCode } from './supabase-check';

// The boot check, the boot chain's first step (§15.5): the values (steps 1 and
// 2), then Supabase's keys (3), then the database (4). The api's own entry, the
// seed entry, the resets and the test harness run steps 1 and 2 only (§15.4).
async function check(): Promise<void> {
  assertEnvOrExit(process.env);
  const failure = (await checkSupabaseKeys(process.env)) ?? (await checkDatabase(process.env));
  if (failure !== undefined) {
    console.error(`Supabase check failed: ${failure}`);
    process.exit(1);
  }
}

check().catch((err: unknown) => {
  console.error(`Supabase check failed: the check stopped${errorCode(err)}`);
  process.exit(1);
});
