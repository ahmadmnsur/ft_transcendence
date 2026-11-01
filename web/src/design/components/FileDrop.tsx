import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { CloseIcon } from '../icons/CloseIcon';
import { FileIcon } from '../icons/FileIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { useI18n, type I18n } from '../../i18n/context';
import { Button } from './Button';
import { buttonClasses } from './buttonClasses';
import { FieldMessages } from './field';
import { IconButton } from './IconButton';
import { Modal } from './Modal';
import { ProgressBar } from './ProgressBar';

export type FileType = 'image/png' | 'image/jpeg' | 'application/pdf';

export interface StoredFile {
  name: string;
  type: FileType;
  size?: number;
  previewUrl?: string;
}

type Problem =
  | { kind: 'empty' }
  | { kind: 'type'; extension: string }
  | { kind: 'mismatch'; extension: string; type: FileType }
  | { kind: 'size'; size: number };

export interface FileDropProps {
  accept: Array<FileType>;
  maxBytes: number;
  value: File | StoredFile | null;
  onChange: (file: File | null) => void;
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

function typeOfFile(file: File): FileType | undefined {
  const extension = extensionOf(file.name);
  if (extension) return typeOfExtension(extension);
  return file.type in fileTypes ? (file.type as FileType) : undefined;
}

function formatBytes(formatNumber: I18n['formatNumber'], bytes: number): string {
  const size = (unit: string, value: number, digits: number): string =>
    formatNumber(value, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: digits });
  if (bytes < 1024) return size('byte', bytes, 0);
  if (bytes < 1024 * 1024) return size('kilobyte', Math.round(bytes / 1024), 0);
  return size('megabyte', bytes / (1024 * 1024), 1);
}

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
  label,
  hint,
  className = '',
}: FileDropProps): React.JSX.Element {
  const { t, format, formatText, list, formatNumber } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLButtonElement>(null);
  const replaceRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  const baseId = `filedrop-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const labelId = `${baseId}-label`;
  const actionId = `${baseId}-action`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const [checkError, setCheckError] = useState<Problem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [objectUrl, setObjectUrl] = useState<{ file: File; url: string } | null>(null);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lastProps, setLastProps] = useState({ value, error });
  const typeNames = accept.map((type) => fileTypes[type].name);
  const acceptedTypes = list(typeNames, { type: 'disjunction' });
  const valueType = value ? typeOfValue(value) : undefined;
  const isImage = valueType === 'image/png' || valueType === 'image/jpeg';
  const isPdf = valueType === 'application/pdf';

  if (!sameValue(lastProps.value, value) || lastProps.error !== error) {
    if (!sameValue(lastProps.value, value)) setConfirmingDelete(false);
    setLastProps({ value, error });
    setCheckError(null);
  }
  const shownError = checkError ? problemText(checkError) : error;

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

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const active = document.activeElement;
    if (active && active !== document.body && !rootRef.current?.contains(active)) return;
    (value ? replaceRef.current : dropRef.current)?.focus();
  }, [value]);

  function check(candidate: File): Problem | null {
    if (candidate.size === 0) return { kind: 'empty' };
    const extension = extensionOf(candidate.name);
    const type = typeOfFile(candidate);
    const declared = candidate.type === 'application/octet-stream' ? '' : candidate.type;
    if (extension !== '' || declared !== '') {
      if (!type || !accept.includes(type)) {
        return { kind: 'type', extension };
      }
      if (declared !== '' && declared !== type) return { kind: 'mismatch', extension, type };
    }
    if (candidate.size > maxBytes) {
      return { kind: 'size', size: candidate.size };
    }
    return null;
  }

  function problemText(problem: Problem): React.JSX.Element {
    if (problem.kind === 'empty') return <>{t.design.fileDrop.empty}</>;
    if (problem.kind === 'type') {
      return problem.extension
        ? format(t.design.fileDrop.extensionRefused, { extension: problem.extension.toUpperCase(), types: acceptedTypes })
        : format(t.design.fileDrop.typeRefused, { types: acceptedTypes });
    }
    if (problem.kind === 'mismatch') {
      return format(t.design.fileDrop.typeMismatch, { extension: `.${problem.extension}`, type: fileTypes[problem.type].name });
    }
    const size = formatBytes(formatNumber, problem.size);
    const limit = formatBytes(formatNumber, maxBytes);
    return size === limit ? format(t.design.fileDrop.justOverLimit, { limit }) : format(t.design.fileDrop.overLimit, { size, limit });
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
    if (confirmingDelete) return;
    const candidate = event.dataTransfer.files?.[0];
    if (candidate) take(candidate);
  }

  let url: string | undefined;
  if (value instanceof File) url = objectUrl?.file === value ? objectUrl.url : undefined;
  else url = value?.previewUrl;

  const step = progress !== undefined && Number.isFinite(progress) ? Math.min(Math.max(Math.floor(progress / 25) * 25, 0), 100) : undefined;
  const uploadStatus =
    value && step !== undefined ? format(t.design.fileDrop.uploading, { fileName: value.name, progress: formatNumber(step / 100, { style: 'percent' }) }) : null;

  return (
    <div
      ref={rootRef}
      className={`min-w-0 ${className}`.trim()}
      onDragOver={(event) => {
        event.preventDefault();
        if (confirmingDelete) {
          event.dataTransfer.dropEffect = 'none';
          return;
        }
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <p id={labelId} className="mb-1 block text-sm font-medium text-ink">
        {label ?? t.design.fileDrop.label}
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
            <span className="pointer-coarse:hidden">
              {format(t.design.fileDrop.drop, { browse: <span className="font-semibold text-link underline underline-offset-2">{t.design.fileDrop.browse}</span> })}
            </span>
            <span className="hidden font-semibold text-link underline underline-offset-2 pointer-coarse:inline">{t.design.fileDrop.choose}</span>
          </span>
          <span id={hintId} className="max-w-full text-xs text-ink-muted">
            {hint ?? format(t.design.fileDrop.hint, { types: acceptedTypes, maxSize: formatBytes(formatNumber, maxBytes) })}
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
            {isImage && url && url !== brokenUrl ? (
              <img
                src={url}
                alt={formatText(t.design.fileDrop.preview, { fileName: value.name })}
                onError={() => setBrokenUrl(url)}
                className="h-12 w-12 shrink-0 rounded-lg bg-surface-muted object-cover"
              />
            ) : (
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
                <FileIcon size={24} />
              </span>
            )}
            <div className="min-w-0 flex-1 basis-40">
              <p className="text-sm font-medium text-ink wrap-anywhere">{value.name}</p>
              {value.size !== undefined ? <p className="text-xs tabular-nums text-ink-muted">{formatBytes(formatNumber, value.size)}</p> : null}
              {progress !== undefined ? (
                <ProgressBar value={progress} max={100} label={formatText(t.design.fileDrop.uploadProgress, { fileName: value.name })} className="mt-1" />
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button ref={replaceRef} type="button" onClick={browse} aria-label={formatText(t.design.fileDrop.replaceLabel, { fileName: value.name })} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                {t.design.fileDrop.replace}
              </button>
              {value instanceof File ? (
                <IconButton label={formatText(t.design.fileDrop.removeLabel, { fileName: value.name })} size="sm" onClick={remove}>
                  <CloseIcon size={16} />
                </IconButton>
              ) : (
                <Button variant="danger-ghost" size="sm" aria-label={formatText(t.design.fileDrop.deleteLabel, { fileName: value.name })} onClick={() => setConfirmingDelete(true)}>
                  {t.design.fileDrop.delete}
                </Button>
              )}
            </div>
          </div>
          {isPdf && url && !(value instanceof File) ? (
            <div className="mt-3 min-w-0">
              <iframe src={url} title={formatText(t.design.fileDrop.preview, { fileName: value.name })} className="h-72 w-full rounded-lg border border-line bg-surface-muted" />
              <a
                href={url}
                download={value.name}
                className="mt-2 inline-block text-sm font-semibold text-link underline underline-offset-2 focus-ring wrap-anywhere"
              >
                {format(t.design.fileDrop.download, { fileName: value.name })}
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
          event.target.value = '';
          if (candidate) take(candidate);
        }}
        className="sr-only"
      />
      {value && !(value instanceof File) ? (
        <Modal
          open={confirmingDelete}
          size="sm"
          title={t.design.fileDrop.confirmTitle}
          description={format(t.design.fileDrop.confirmDescription, { fileName: value.name })}
          onClose={() => setConfirmingDelete(false)}
          initialFocusRef={keepRef}
          footer={
            <>
              <Button ref={keepRef} variant="secondary" onClick={() => setConfirmingDelete(false)}>
                {t.design.fileDrop.keep}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmingDelete(false);
                  remove();
                }}
              >
                {t.design.fileDrop.delete}
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
