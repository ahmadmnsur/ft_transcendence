import type { EnGroup } from '../types';

// The design system's own texts: what its components show, or give to a
// screen reader, when the screen passes none.
export default {
  dataTable: {
    emptyTitle: 'No rows found',
    retry: 'Try again',
    pagesLabel: '{caption} pages',
  },
  pagination: {
    label: 'Pagination',
    previous: 'Previous',
    previousLabel: 'Go to previous page',
    next: 'Next',
    nextLabel: 'Go to next page',
    pageOf: 'Page {page} of {pageCount}',
    pageLabel: 'Go to page {page}',
  },
  modal: { close: 'Close dialog' },
  banner: { dismiss: 'Dismiss {title}' },
  roleLabel: 'Admin',
  skillChip: {
    teach: 'Can teach: {skill}',
    learn: 'Wants to learn: {skill}',
    remove: 'Remove {skill}',
  },
  fileDrop: {
    label: 'Attach a file',
    drop: 'Drag a file here, or {browse}',
    browse: 'browse',
    choose: 'Choose a file',
    hint: '{types}, up to {maxSize}',
    empty: 'This file is empty.',
    typeRefused: 'This file type is not accepted. Use {types}.',
    extensionRefused: '{extension} files are not accepted. Use {types}.',
    typeMismatch: 'This file is named {extension} but is not a {type} file.',
    overLimit: 'This file is {size}, over the {limit} limit.',
    justOverLimit: 'This file is just over the {limit} limit.',
    preview: 'Preview of {fileName}',
    uploadProgress: 'Upload progress for {fileName}',
    uploading: 'Uploading {fileName}: {progress}',
    replace: 'Replace',
    replaceLabel: 'Replace {fileName}',
    removeLabel: 'Remove {fileName}',
    delete: 'Delete',
    deleteLabel: 'Delete {fileName}',
    download: 'Download {fileName}',
    confirmTitle: 'Delete this file?',
    confirmDescription: '{fileName} will be deleted. This cannot be undone.',
    keep: 'Keep file',
  },
} as const satisfies EnGroup;
