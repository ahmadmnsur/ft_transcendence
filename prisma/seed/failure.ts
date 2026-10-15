// A failure the seed itself finds: a guard or an assertion. Its message is
// the seed's own fixed text with counts, never a name, an email or a
// password, so unlike any other error's message it may be logged (§3.9).
export class SeedFailure extends Error {}
