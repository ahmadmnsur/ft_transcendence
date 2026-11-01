import { assertEnvOrExit } from './env';
import { checkDatabase, checkSupabaseKeys, errorCodeSuffix } from './supabase-check';

async function check(): Promise<void> {
  assertEnvOrExit(process.env);
  const failure = (await checkSupabaseKeys(process.env)) ?? (await checkDatabase(process.env));
  if (failure !== undefined) {
    console.error(`Supabase check failed: ${failure}`);
    process.exit(1);
  }
  process.exit(0);
}

check().catch((err: unknown) => {
  console.error(`Supabase check failed: the check stopped${errorCodeSuffix(err)}`);
  process.exit(1);
});
