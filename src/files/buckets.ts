import { StorageError, type BucketSettings, type SupabaseStorageClient } from '../core/supabase-storage';
import type { LIMITS } from '../shared/limits';

// §9.8: the two private buckets, their settings and the step that sets
// them. This file is inside the schema gate (CONTRIBUTING.md → Review): the
// bucket names, their privacy, caps and types are here and nowhere else.

export type FileKind = 'avatars' | 'evidence';

// Every kind of file, in the order the bucket step, the cleanup and the
// emptying take them.
export const FILE_KINDS: readonly FileKind[] = ['avatars', 'evidence'];

// Which bucket each kind of file goes to. The API and the seed use the
// production pair; the test harness binds the suite's own (§16.2), so a run
// never lists or deletes a developer's files.
export abstract class FileBuckets {
  abstract readonly avatars: string;
  abstract readonly evidence: string;
}

export const PRODUCTION_BUCKETS: FileBuckets = { avatars: 'avatars', evidence: 'evidence' };

export const TEST_BUCKETS: FileBuckets = { avatars: 'test-avatars', evidence: 'test-evidence' };

// Private, with no access policies, so only the secret key opens them. The
// caps and types are a second guard only: §9.5's byte validation stays the
// check. They are written out here, not read from LIMITS, so changing a
// bucket's settings changes this gated file.
export const BUCKET_SETTINGS = {
  avatars: { public: false, fileSizeLimit: 2097152, allowedMimeTypes: ['image/png', 'image/jpeg'] },
  evidence: {
    public: false,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
  },
} as const satisfies Record<FileKind, BucketSettings>;

// The caps and types must stay §6.0.3's upload limits: when this file and
// src/shared/limits.ts disagree, this fails to compile.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Holds<T extends true> = T;
export type BucketsMatchLimits = Holds<
  | Same<(typeof BUCKET_SETTINGS)['avatars']['fileSizeLimit'], (typeof LIMITS)['avatar']['maxBytes']>
  | Same<(typeof BUCKET_SETTINGS)['avatars']['allowedMimeTypes'], (typeof LIMITS)['avatar']['mimeTypes']>
  | Same<(typeof BUCKET_SETTINGS)['evidence']['fileSizeLimit'], (typeof LIMITS)['evidence']['maxBytes']>
  | Same<(typeof BUCKET_SETTINGS)['evidence']['allowedMimeTypes'], (typeof LIMITS)['evidence']['mimeTypes']>
>;

// The bucket step's failure. Its message names the bucket and carries a
// call and a status only, so the seed may log it.
export class BucketStepError extends Error {}

export type BucketStepResult = { created: string[]; reset: string[] };

function sameTypes(current: readonly string[] | null, wanted: readonly string[]): boolean {
  if (current === null || current.length !== wanted.length) return false;
  return wanted.every((type) => current.includes(type));
}

function sameSettings(current: BucketSettings, wanted: BucketSettings): boolean {
  return (
    current.public === wanted.public &&
    current.fileSizeLimit === wanted.fileSizeLimit &&
    sameTypes(current.allowedMimeTypes, wanted.allowedMimeTypes ?? [])
  );
}

// §9.8's bucket step: the seed's first step on every run, and the test
// harness's for the suite's own buckets. It creates a missing bucket and sets
// back one whose settings differ, made public in the dashboard or given
// other caps or types. A create answered "already exists", which two boots
// at once can meet, is success, and that bucket's settings are then checked
// like any other's. A failure names the bucket.
export async function ensureBuckets(
  storage: SupabaseStorageClient,
  buckets: FileBuckets,
): Promise<BucketStepResult> {
  const result: BucketStepResult = { created: [], reset: [] };
  for (const kind of FILE_KINDS) {
    const name = buckets[kind];
    const wanted: BucketSettings = BUCKET_SETTINGS[kind];
    try {
      let current = await storage.getBucket(name);
      if (current === null) {
        if ((await storage.createBucket(name, wanted)) === 'created') {
          result.created.push(name);
          continue;
        }
        current = await storage.getBucket(name);
        if (current === null) throw new StorageError('bucket read', 404);
      }
      if (!sameSettings(current, wanted)) {
        await storage.updateBucket(name, wanted);
        result.reset.push(name);
      }
    } catch (err) {
      const reason = err instanceof StorageError ? err.message : 'an unexpected error';
      throw new BucketStepError(`the bucket ${name} could not be set: ${reason}`);
    }
  }
  return result;
}
