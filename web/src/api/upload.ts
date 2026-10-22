import { notifyUnauthorized, parseEnvelope, unexpected } from './client';

// §6.3 and §9.4's upload routes. An upload is multipart through
// XMLHttpRequest, for `upload.onprogress` (§3.5.2, §9.7), and carries
// `X-PeerConnect-CSRF: 1`; the browser adds the Origin the upload gate checks
// (§5.4). Its answer is read through the same envelope rules as every
// `apiFetch`: a refusal rejects with ApiRefusalError, any other failure with
// ApiProtocolError.

export interface UploadOptions {
  // The share of the file sent so far, 0–100.
  onProgress: (percent: number) => void;
  // Aborting stops the upload; the promise then rejects with an AbortError.
  signal: AbortSignal;
}

// `PUT` of one `file` part to `path`, under `/api`.
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
    // A network failure rejects as `fetch` does, with a TypeError.
    request.onerror = () => reject(new TypeError('The upload failed.'));
    request.onabort = () => reject(new DOMException('The upload was aborted.', 'AbortError'));
    options.signal.addEventListener('abort', () => request.abort(), { once: true });

    async function settle(): Promise<void> {
      // Decided from the status before the body parses, as in `apiFetch`.
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
