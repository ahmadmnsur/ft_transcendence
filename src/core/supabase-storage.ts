import { Injectable } from '@nestjs/common';
import { AppConfig } from './app-config';
import { SafeMessageError } from './logger';


export type BucketSettings = {
  public: boolean;
  fileSizeLimit: number | null;
  allowedMimeTypes: readonly string[] | null;
};

export type StoredObject = { name: string; createdAt: Date };

const STORAGE_TIMEOUT_MS = 30_000;

const LIST_PAGE_SIZE = 100;

const DELETE_BATCH_SIZE = 100;

export class StorageError extends SafeMessageError {
  constructor(what: string, status?: number) {
    super(
      status === undefined
        ? `Supabase Storage ${what} got no answer`
        : `Supabase Storage ${what} answered ${status}`,
    );
  }
}

async function failureStatus(response: Response): Promise<number> {
  try {
    const body = (await response.json()) as { statusCode?: unknown } | null;
    const inner = Number(body?.statusCode);
    if (Number.isInteger(inner) && inner >= 400 && inner <= 599) return inner;
  } catch {
  }
  return response.status;
}

async function release(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
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

  constructor(config: AppConfig) {
    this.baseUrl = `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1`;
    this.secretKey = config.supabaseSecretKey;
  }

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

  async upload(bucket: string, name: string, bytes: Buffer, contentType: string): Promise<void> {
    const response = await this.call('upload', 'POST', this.objectPath(bucket, name), {
      bytes,
      contentType,
    });
    if (!response.ok) throw new StorageError('upload', await failureStatus(response));
    await release(response);
  }

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

  async listAll(bucket: string, pageSize: number = LIST_PAGE_SIZE): Promise<StoredObject[]> {
    const files = new Map<string, StoredObject>();
    for (let offset = 0; ; offset += pageSize) {
      const page = await this.listPage(bucket, pageSize, offset);
      if (page === null) return [];
      const before = files.size;
      for (const file of page.files) files.set(file.name, file);
      if (page.entries < pageSize) return [...files.values()];
      if (files.size === before) throw new StorageError('list');
    }
  }

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
