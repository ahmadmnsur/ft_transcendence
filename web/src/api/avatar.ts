import { apiFetch } from './client';
import { uploadFile, type UploadOptions } from './upload';

// §6.3's avatar routes. The upload goes through `uploadFile`, for its
// progress (§9.7).

export function uploadAvatar(file: File, options: UploadOptions): Promise<{ avatarUrl: string }> {
  return uploadFile<{ avatarUrl: string }>('/me/avatar', file, options);
}

export async function deleteAvatar(): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>('/me/avatar', { method: 'DELETE', body: {} });
}
