import { Injectable } from '@nestjs/common';
import { AppConfig } from './app-config';

// §9.8: Supabase Storage, called by the API alone, from the server, with the
// secret key. Plain `fetch`, no Supabase package, like the Auth client.
// Nothing secret leaves this module: no key and no response body reach a
// log, an error or a return value, and a file's bytes only the read that
// asked for them.

// A bucket's settings, as the bucket step sets and compares them (§9.8).
// Storage reports a bucket with no cap or no type list as null.
export type BucketSettings = {
  public: boolean;
  fileSizeLimit: number | null;
  allowedMimeTypes: readonly string[] | null;
};

// One file of a bucket's list: its name, which is its row's token, and
// when Storage stored it.
export type StoredObject = { name: string; createdAt: Date };

const STORAGE_TIMEOUT_MS = 30_000;

// Files per page of a list. Any size works: a short page ends the list.
const LIST_PAGE_SIZE = 100;

// Names per call of the bulk delete.
const DELETE_BATCH_SIZE = 100;

// A failed Storage call. The message names the call and Storage's status,
// never a body or a key, so it is safe in a log line or the seed's failure.
export class StorageError extends Error {
  constructor(what: string, status?: number) {
    super(
      status === undefined
        ? `Supabase Storage ${what} got no answer`
        : `Supabase Storage ${what} answered ${status}`,
    );
  }
}

// Storage's own status for a failed call. The fallback's Storage answers
// some failures 400 with the real status in the body's `statusCode` ("404"
// for a missing bucket or file, "409" for one that already exists), so the
// body's value wins when it is there. The body is read for that field only
// and never kept.
async function failureStatus(response: Response): Promise<number> {
  try {
    const body = (await response.json()) as { statusCode?: unknown } | null;
    const inner = Number(body?.statusCode);
    if (Number.isInteger(inner) && inner >= 400 && inner <= 599) return inner;
  } catch {
    // Not JSON: the HTTP status stands.
  }
  return response.status;
}

// Releases a response whose body is never read. Never throws.
async function release(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Best effort.
  }
}

function settingsBody(settings: BucketSettings): Record<string, unknown> {
  return {
    public: settings.public,
    file_size_limit: settings.fileSizeLimit,
    allowed_mime_types: settings.allowedMimeTypes,
  };
}

type RequestBody = { json: unknown } | { bytes: Buffer; contentType: string };

@Injectable()
export class SupabaseStorageClient {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  // The secret key comes through AppConfig, which refuses to construct
  // without it (§5.1).
  constructor(config: AppConfig) {
    this.baseUrl = `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1`;
    this.secretKey = config.supabaseSecretKey;
  }

  // The bucket's settings, or null when it does not exist.
  async getBucket(name: string): Promise<BucketSettings | null> {
    const response = await this.call('bucket read', 'GET', `/bucket/${encodeURIComponent(name)}`);
    if (!response.ok) {
      const status = await failureStatus(response);
      if (status === 404) return null;
      throw new StorageError('bucket read', status);
    }
    let body: { public?: unknown; file_size_limit?: unknown; allowed_mime_types?: unknown };
    try {
      body = (await response.json()) as typeof body;
    } catch {
      throw new StorageError('bucket read', response.status);
    }
    const limit = body.file_size_limit;
    const types = body.allowed_mime_types;
    if (
      typeof body.public !== 'boolean' ||
      (limit !== null && typeof limit !== 'number') ||
      (types !== null && !(Array.isArray(types) && types.every((type) => typeof type === 'string')))
    ) {
      throw new StorageError('bucket read', response.status);
    }
    return { public: body.public, fileSizeLimit: limit, allowedMimeTypes: types };
  }

  // Creates the bucket. "Already exists", which two boots at once can meet,
  // is `exists`, never a failure.
  async createBucket(name: string, settings: BucketSettings): Promise<'created' | 'exists'> {
    const response = await this.call('bucket create', 'POST', '/bucket', {
      json: { id: name, name, ...settingsBody(settings) },
    });
    if (response.ok) {
      await release(response);
      return 'created';
    }
    const status = await failureStatus(response);
    if (status === 409) return 'exists';
    throw new StorageError('bucket create', status);
  }

  async updateBucket(name: string, settings: BucketSettings): Promise<void> {
    const response = await this.call('bucket update', 'PUT', `/bucket/${encodeURIComponent(name)}`, {
      json: settingsBody(settings),
    });
    if (!response.ok) throw new StorageError('bucket update', await failureStatus(response));
    await release(response);
  }

  // Uploads a new file, declaring its canonical type, so Storage keeps the
  // validated label (§9.5 step 6). Never overwrites: a file's name is a new
  // token every time (§9.8).
  async upload(bucket: string, name: string, bytes: Buffer, contentType: string): Promise<void> {
    const response = await this.call('upload', 'POST', this.objectPath(bucket, name), {
      bytes,
      contentType,
    });
    if (!response.ok) throw new StorageError('upload', await failureStatus(response));
    await release(response);
  }

  // The whole file. A missing file throws like any other failure: its row
  // names it, so the caller answers 500, never 404 (§9.8 Reading).
  async download(bucket: string, name: string): Promise<Buffer> {
    const response = await this.call(
      'download',
      'GET',
      `/object/authenticated/${encodeURIComponent(bucket)}/${encodeURIComponent(name)}`,
    );
    if (!response.ok) throw new StorageError('download', await failureStatus(response));
    try {
      return Buffer.from(await response.arrayBuffer());
    } catch {
      throw new StorageError('download', response.status);
    }
  }

  // Every file in the bucket, read whole before the caller deletes any,
  // since deleting page by page shifts the list and skips files (§9.8,
  // §14.9). A bucket that does not exist holds no file. Any failure throws.
  async listAll(bucket: string, pageSize: number = LIST_PAGE_SIZE): Promise<StoredObject[]> {
    const files = new Map<string, StoredObject>();
    for (let offset = 0; ; offset += pageSize) {
      const page = await this.listPage(bucket, pageSize, offset);
      if (page === null) return [];
      const before = files.size;
      for (const file of page.files) files.set(file.name, file);
      // A short page ends the list.
      if (page.entries < pageSize) return [...files.values()];
      // A full page of names already seen means `offset` was ignored: the
      // rest of the list would never come, so this is no complete list.
      if (files.size === before) throw new StorageError('list');
    }
  }

  // Deletes these files. A name with no file is skipped by Storage, so a
  // file already gone is no failure.
  async remove(bucket: string, names: readonly string[]): Promise<void> {
    for (let start = 0; start < names.length; start += DELETE_BATCH_SIZE) {
      const batch = names.slice(start, start + DELETE_BATCH_SIZE);
      const response = await this.call('delete', 'DELETE', `/object/${encodeURIComponent(bucket)}`, {
        json: { prefixes: batch },
      });
      if (!response.ok) throw new StorageError('delete', await failureStatus(response));
      await release(response);
    }
  }

  // One page of the list, by name, or null when the bucket does not exist.
  // `entries` counts every entry, folders included, so a short page is told
  // from a full one; `files` keeps only files, which have an id.
  private async listPage(
    bucket: string,
    limit: number,
    offset: number,
  ): Promise<{ entries: number; files: StoredObject[] } | null> {
    const response = await this.call('list', 'POST', `/object/list/${encodeURIComponent(bucket)}`, {
      json: { prefix: '', limit, offset, sortBy: { column: 'name', order: 'asc' } },
    });
    if (!response.ok) {
      const status = await failureStatus(response);
      if (status === 404) return null;
      throw new StorageError('list', status);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new StorageError('list', response.status);
    }
    if (!Array.isArray(body)) throw new StorageError('list', response.status);
    const files: StoredObject[] = [];
    for (const entry of body as Array<{ name?: unknown; id?: unknown; created_at?: unknown }>) {
      if (typeof entry?.name !== 'string') throw new StorageError('list', response.status);
      // A folder has no id; the buckets are flat, so none is expected.
      if (entry.id === null || entry.id === undefined) continue;
      const createdAt = new Date(typeof entry.created_at === 'string' ? entry.created_at : Number.NaN);
      if (Number.isNaN(createdAt.getTime())) throw new StorageError('list', response.status);
      files.push({ name: entry.name, createdAt });
    }
    return { entries: body.length, files };
  }

  private objectPath(bucket: string, name: string): string {
    return `/object/${encodeURIComponent(bucket)}/${encodeURIComponent(name)}`;
  }

  // Every call carries the secret key the way Supabase's own clients do. A
  // redirect would carry the key to another address, so none is followed.
  private async call(what: string, method: string, path: string, body?: RequestBody): Promise<Response> {
    const headers: Record<string, string> = {
      apikey: this.secretKey,
      Authorization: `Bearer ${this.secretKey}`,
    };
    let payload: string | Uint8Array<ArrayBuffer> | undefined;
    if (body !== undefined && 'json' in body) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body.json);
    } else if (body !== undefined) {
      headers['Content-Type'] = body.contentType;
      headers['x-upsert'] = 'false';
      // A copy on a plain ArrayBuffer, the only kind fetch's body type takes.
      payload = new Uint8Array(body.bytes);
    }
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: payload,
        redirect: 'manual',
        signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
      });
    } catch {
      throw new StorageError(what);
    }
  }
}
