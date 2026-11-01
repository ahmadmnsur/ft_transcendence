import { StorageError, type BucketSettings, type SupabaseStorageClient } from '../core/supabase-storage';
import type { LIMITS } from '../shared/limits';


export type FileKind = 'avatars' | 'evidence';

export const FILE_KINDS: readonly FileKind[] = ['avatars', 'evidence'];

export abstract class FileBuckets {
  abstract readonly avatars: string;
  abstract readonly evidence: string;
}

export const PRODUCTION_BUCKETS: FileBuckets = { avatars: 'avatars', evidence: 'evidence' };

export const TEST_BUCKETS: FileBuckets = { avatars: 'test-avatars', evidence: 'test-evidence' };

export const BUCKET_SETTINGS = {
  avatars: { public: false, fileSizeLimit: 2097152, allowedMimeTypes: ['image/png', 'image/jpeg'] },
  evidence: {
    public: false,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
  },
} as const satisfies Record<FileKind, BucketSettings>;

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Holds<T extends true> = T;
export type BucketsMatchLimits = Holds<
  | Same<(typeof BUCKET_SETTINGS)['avatars']['fileSizeLimit'], (typeof LIMITS)['avatar']['maxBytes']>
  | Same<(typeof BUCKET_SETTINGS)['avatars']['allowedMimeTypes'], (typeof LIMITS)['avatar']['mimeTypes']>
  | Same<(typeof BUCKET_SETTINGS)['evidence']['fileSizeLimit'], (typeof LIMITS)['evidence']['maxBytes']>
  | Same<(typeof BUCKET_SETTINGS)['evidence']['allowedMimeTypes'], (typeof LIMITS)['evidence']['mimeTypes']>
>;

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
