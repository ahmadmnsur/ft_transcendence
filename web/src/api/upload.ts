import { notifyUnauthorized, parseEnvelope, unexpected } from './client';


export interface UploadOptions {
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

export function uploadFile<T>(path: string, file: File, options: UploadOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    if (options.signal.aborted) {
      reject(new DOMException('The upload was aborted.', 'AbortError'));
      return;
    }
    const request = new XMLHttpRequest();
    request.open('PUT', `/api${path}`);
    request.setRequestHeader('Accept', 'application/json');
    request.setRequestHeader('X-PeerConnect-CSRF', '1');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) options.onProgress((event.loaded / event.total) * 100);
    };
    request.onload = () => {
      void settle();
    };
    request.onerror = () => reject(new TypeError('The upload failed.'));
    request.onabort = () => reject(new DOMException('The upload was aborted.', 'AbortError'));
    options.signal.addEventListener('abort', () => request.abort(), { once: true });

    async function settle(): Promise<void> {
      if (request.status === 401) await notifyUnauthorized();
      let body: unknown;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        reject(unexpected(request.status));
        return;
      }
      try {
        resolve(parseEnvelope<T>(request.status, body));
      } catch (error) {
        reject(error);
      }
    }

    const form = new FormData();
    form.append('file', file, file.name);
    request.send(form);
  });
}
