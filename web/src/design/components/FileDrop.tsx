import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { CloseIcon } from '../icons/CloseIcon';
import { FileIcon } from '../icons/FileIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { Button } from './Button';
import { buttonClasses } from './buttonClasses';
import { FieldMessages } from './field';
import { IconButton } from './IconButton';
import { Modal } from './Modal';
import { ProgressBar } from './ProgressBar';

// The file types the server accepts; Avatar takes the two images, Evidence all three.
export type FileType = 'image/png' | 'image/jpeg' | 'application/pdf';

// A file already on the server, such as saved Evidence.
export interface StoredFile {
  name: string;
  type: FileType;
  size?: number;
  // Where the file can be read, for the image or PDF preview.
  previewUrl?: string;
}

export interface FileDropProps {
  accept: Array<FileType>;
  maxBytes: number;
  // What the field shows. The caller owns it: set it to the File passed to
  // onChange, to the stored record after an upload, or to null to empty it.
  // A new value or error replaces the size and type message; to clear that
  // message without either, as a form reset does, give FileDrop a new key.
  value: File | StoredFile | null;
  // A file that passed the checks below, or null when the user removes it.
  onChange: (file: File | null) => void;
  // The caller's own error, such as the server refusing the upload.
  error?: string;
  progress?: number;
  label?: string;
  hint?: string;
  className?: string;
}

const fileTypes: Record<FileType, { name: string; extensions: Array<string> }> = {
  'image/png': { name: 'PNG', extensions: ['png'] },
  'image/jpeg': { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
  'application/pdf': { name: 'PDF', extensions: ['pdf'] },
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function typeOfExtension(extension: string): FileType | undefined {
  return (Object.keys(fileTypes) as Array<FileType>).find((type) => fileTypes[type].extensions.includes(extension));
}

// A picked file's type: its extension when the name has one; a name without
// one makes no claim, so the type the browser declared decides.
function typeOfFile(file: File): FileType | undefined {
  const extension = extensionOf(file.name);
  if (extension) return typeOfExtension(extension);
  return file.type in fileTypes ? (file.type as FileType) : undefined;
}

function joinNames(names: Array<string>): string {
  if (names.length <= 2) return names.join(' or ');
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${parseFloat((bytes / (1024 * 1024)).toFixed(1))} MB`;
}

// Stored files compare by content: a screen may build the record afresh on
// every render, and that is not a new value.
function sameValue(a: File | StoredFile | null, b: File | StoredFile | null): boolean {
  if (a === b) return true;
  if (!a || !b || a instanceof File || b instanceof File) return false;
  return a.name === b.name && a.type === b.type && a.size === b.size && a.previewUrl === b.previewUrl;
}

function typeOfValue(value: File | StoredFile): FileType | undefined {
  return value instanceof File ? typeOfFile(value) : value.type;
}

export function FileDrop({
  accept,
  maxBytes,
  value,
  onChange,
  error,
  progress,
  label = 'Attach a file',
  hint,
  className = '',
}: FileDropProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLButtonElement>(null);
  const replaceRef = useRef<HTMLButtonElement>(null);
  // Set when the user picks or removes a file, since either swaps the control they were on.
  const moveFocus = useRef(false);
  const baseId = `filedrop-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const labelId = `${baseId}-label`;
  const actionId = `${baseId}-action`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const [checkError, setCheckError] = useState<string | null>(null);
  // Removing a stored file deletes it on the server, so it is confirmed first;
  // a picked file that is not saved yet is removed at once.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [objectUrl, setObjectUrl] = useState<{ file: File; url: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lastProps, setLastProps] = useState({ value, error });
  const acceptedNames = joinNames(accept.map((type) => fileTypes[type].name));
  const valueType = value ? typeOfValue(value) : undefined;
  const isImage = valueType === 'image/png' || valueType === 'image/jpeg';
  const isPdf = valueType === 'application/pdf';

  // A new value or error from the caller replaces the size and type message,
  // so the latest problem is the one shown.
  if (!sameValue(lastProps.value, value) || lastProps.error !== error) {
    setLastProps({ value, error });
    setCheckError(null);
  }
  const shownError = checkError ?? error;

  // The only place object URLs are created or revoked. Only a picked image
  // gets one: the page's security policy frames same-origin URLs only, so a PDF
  // previews once it is stored and has a file URL.
  const pickedImage = value instanceof File && isImage;
  useEffect(() => {
    if (!(value instanceof File) || !pickedImage) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setObjectUrl({ file: value, url });
    return () => URL.revokeObjectURL(url);
  }, [value, pickedImage]);

  // After a pick or a remove, the control the user was on is gone; focus goes
  // to the one that replaced it, unless it has already moved elsewhere.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const active = document.activeElement;
    if (active && active !== document.body && !rootRef.current?.contains(active)) return;
    (value ? replaceRef.current : dropRef.current)?.focus();
  }, [value]);

  // The server's file checks, repeated here for quick feedback: not empty, an
  // accepted type, a declared type that agrees with the extension, and the size
  // cap. Only the server reads the bytes, so it still has the last word, and a
  // file that claims no type at all (no extension, nothing declared) is left to it.
  function check(candidate: File): string | null {
    if (candidate.size === 0) return 'This file is empty.';
    const extension = extensionOf(candidate.name);
    const type = typeOfFile(candidate);
    const declared = candidate.type === 'application/octet-stream' ? '' : candidate.type;
    if (extension !== '' || declared !== '') {
      if (!type || !accept.includes(type)) {
        const rejected = extension ? `${extension.toUpperCase()} files are` : 'This file type is';
        return `${rejected} not accepted. Use ${acceptedNames}.`;
      }
      if (declared !== '' && declared !== type) return `This file is named .${extension} but is not a ${fileTypes[type].name} file.`;
    }
    if (candidate.size > maxBytes) {
      const size = formatBytes(candidate.size);
      const limit = formatBytes(maxBytes);
      // Rounding can print both as the same number, so a file just over the cap says so.
      return size === limit ? `This file is just over the ${limit} limit.` : `This file is ${size}, over the ${limit} limit.`;
    }
    return null;
  }

  function take(candidate: File): void {
    const problem = check(candidate);
    setCheckError(problem);
    if (problem) return;
    moveFocus.current = true;
    onChange(candidate);
  }

  function browse(): void {
    inputRef.current?.click();
  }

  function remove(): void {
    setCheckError(null);
    moveFocus.current = true;
    onChange(null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    const candidate = event.dataTransfer.files?.[0];
    if (candidate) take(candidate);
  }

  let url: string | undefined;
  if (value instanceof File) url = objectUrl?.file === value ? objectUrl.url : undefined;
  else url = value?.previewUrl;

  // A progress bar's value is not read out as it changes, so the upload is
  // announced in quarter steps through a status region that stays mounted.
  const step = progress !== undefined && Number.isFinite(progress) ? Math.min(Math.max(Math.floor(progress / 25) * 25, 0), 100) : undefined;
  const uploadStatus = value && step !== undefined ? `Uploading ${value.name}: ${step}%` : '';

  return (
    <div
      ref={rootRef}
      className={`min-w-0 ${className}`.trim()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <p id={labelId} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </p>
      {!value ? (
        <button
          ref={dropRef}
          type="button"
          onClick={browse}
          aria-labelledby={`${labelId} ${actionId}`}
          aria-describedby={shownError ? `${hintId} ${errorId}` : hintId}
          className={[
            'flex w-full min-w-0 cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 focus-ring',
            dragging
              ? 'border-primary-600 bg-primary-50'
              : shownError
                ? 'border-danger-600 bg-surface hover:border-danger-700 hover:bg-canvas'
                : 'border-line-strong bg-surface hover:border-neutral-600 hover:bg-canvas',
          ].join(' ')}
        >
          <span aria-hidden="true" className="text-ink-subtle">
            <UploadIcon size={24} />
          </span>
          <span id={actionId} className="text-sm text-ink">
            {/* A phone cannot drag a file, so a touch screen is only offered the picker. */}
            <span className="pointer-coarse:hidden">
              Drag a file here, or <span className="font-semibold text-link underline underline-offset-2">browse</span>
            </span>
            <span className="hidden font-semibold text-link underline underline-offset-2 pointer-coarse:inline">Choose a file</span>
          </span>
          <span id={hintId} className="max-w-full text-xs text-ink-muted">
            {hint ?? `${acceptedNames}, up to ${formatBytes(maxBytes)}`}
          </span>
        </button>
      ) : (
        <div
          role="group"
          aria-labelledby={labelId}
          aria-describedby={shownError ? errorId : undefined}
          className={`min-w-0 rounded-xl border p-3 ${dragging ? 'border-primary-600 bg-primary-50' : shownError ? 'border-danger-600 bg-surface' : 'border-line bg-surface'}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {isImage && url ? (
              <img src={url} alt={`Preview of ${value.name}`} className="h-12 w-12 shrink-0 rounded-lg bg-surface-muted object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
                <FileIcon size={24} />
              </span>
            )}
            <div className="min-w-0 flex-1 basis-40">
              <p className="text-sm font-medium text-ink wrap-anywhere">{value.name}</p>
              {value.size !== undefined ? <p className="text-xs tabular-nums text-ink-muted">{formatBytes(value.size)}</p> : null}
              {progress !== undefined ? (
                <ProgressBar value={progress} max={100} label={`Upload progress for ${value.name}`} className="mt-1" />
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button ref={replaceRef} type="button" onClick={browse} aria-label={`Replace ${value.name}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                Replace
              </button>
              {value instanceof File ? (
                <IconButton label={`Remove ${value.name}`} size="sm" onClick={remove}>
                  <CloseIcon size={16} />
                </IconButton>
              ) : (
                <Button variant="danger-ghost" size="sm" aria-label={`Delete ${value.name}`} onClick={() => setConfirmingDelete(true)}>
                  Delete
                </Button>
              )}
            </div>
          </div>
          {isPdf && url && !(value instanceof File) ? (
            <div className="mt-3 min-w-0">
              <iframe src={url} title={`Preview of ${value.name}`} className="h-72 w-full rounded-lg border border-line bg-surface-muted" />
              <a
                href={url}
                download={value.name}
                className="mt-2 inline-block text-sm font-semibold text-link underline underline-offset-2 focus-ring wrap-anywhere"
              >
                Download {value.name}
              </a>
            </div>
          ) : null}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept.flatMap((type) => [type, ...fileTypes[type].extensions.map((extension) => `.${extension}`)]).join(',')}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const candidate = event.target.files?.[0];
          // Cleared at once so picking the same file again still fires a change.
          event.target.value = '';
          if (candidate) take(candidate);
        }}
        className="sr-only"
      />
      {value && !(value instanceof File) ? (
        <Modal
          open={confirmingDelete}
          size="sm"
          title="Delete this file?"
          description={`${value.name} will be deleted. This cannot be undone.`}
          onClose={() => setConfirmingDelete(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
                Keep file
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmingDelete(false);
                  remove();
                }}
              >
                Delete
              </Button>
            </>
          }
        />
      ) : null}
      <p role="status" className="sr-only">
        {uploadStatus}
      </p>
      <FieldMessages error={shownError} hintId={hintId} errorId={errorId} announce />
    </div>
  );
}
