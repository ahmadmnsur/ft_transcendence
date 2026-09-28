import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { CloseIcon } from '../icons/CloseIcon';
import { FileIcon } from '../icons/FileIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { ProgressBar } from './ProgressBar';

export interface FileDropProps {
  accept: Array<string>;
  maxBytes: number;
  onSelect: (file: File) => void;
  onClear?: () => void;
  progress?: number;
  label?: string;
  hint?: string;
}

const typeNames: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  'application/pdf': 'PDF',
};

function typeName(mime: string): string {
  return typeNames[mime] ?? mime.split('/')[1]?.toUpperCase() ?? mime;
}

function joinNames(names: Array<string>): string {
  if (names.length <= 2) return names.join(' or ');
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

function matchesType(file: File, accept: Array<string>): boolean {
  return accept.some((pattern) => {
    if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1));
    return file.type === pattern;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${parseFloat((bytes / (1024 * 1024)).toFixed(1))} MB`;
}

export function FileDrop({
  accept,
  maxBytes,
  onSelect,
  onClear,
  progress,
  label = 'Attach a file',
  hint,
}: FileDropProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const hintId = `filedrop-${inputId}-hint`;
  const errorId = `filedrop-${inputId}-error`;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const acceptedNames = joinNames(accept.map(typeName));

  // The only place preview URLs are created or revoked.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function check(candidate: File): string | null {
    if (candidate.size === 0) return 'This file is empty.';
    if (!matchesType(candidate, accept)) {
      const rejected = candidate.type ? `${typeName(candidate.type)} files are not accepted. ` : 'This file type is not accepted. ';
      return `${rejected}Use ${acceptedNames}.`;
    }
    if (candidate.size > maxBytes) return `File is ${formatBytes(candidate.size)}; the limit is ${formatBytes(maxBytes)}.`;
    return null;
  }

  function take(candidate: File): void {
    const problem = check(candidate);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(candidate);
    onSelect(candidate);
  }

  function clear(): void {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onClear?.();
  }

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    const candidate = event.dataTransfer.files?.[0];
    if (candidate) take(candidate);
  }

  const isPdf = file?.type === 'application/pdf';

  return (
    <div
      className="min-w-0"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <p id={`filedrop-${inputId}-label`} className="mb-1 block text-sm font-medium text-neutral-800">
        {label}
      </p>
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-labelledby={`filedrop-${inputId}-label`}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={[
            'flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
            dragging ? 'border-primary-600 bg-primary-50' : 'border-neutral-500 bg-white hover:border-neutral-600 hover:bg-neutral-50',
          ].join(' ')}
        >
          <span aria-hidden="true" className="text-neutral-600">
            <UploadIcon size={24} />
          </span>
          <span className="text-sm text-neutral-800">
            Drag a file here, or <span className="font-semibold text-primary-700 underline underline-offset-2">browse</span>
          </span>
          <span id={hintId} className="max-w-full break-words text-xs text-neutral-700">
            {hint ?? `${acceptedNames}, up to ${formatBytes(maxBytes)}`}
          </span>
        </div>
      ) : (
        <div
          className={`flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 ${dragging ? 'ring-2 ring-primary-600' : ''}`}
        >
          {preview && preview.file === file ? (
            <img src={preview.url} alt={`Preview of ${file.name}`} className="h-12 w-12 shrink-0 rounded-lg bg-neutral-100 object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
              {isPdf ? <FileIcon size={24} /> : <UploadIcon size={24} />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900">{file.name}</p>
            <p className="text-xs tabular-nums text-neutral-700">{formatBytes(file.size)}</p>
            {progress !== undefined ? (
              <div className="mt-1">
                <ProgressBar value={progress} max={100} label={`Upload progress for ${file.name}`} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label={`Remove ${file.name}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept.join(',')}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const candidate = event.target.files?.[0];
          if (candidate) take(candidate);
        }}
        className="sr-only"
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
