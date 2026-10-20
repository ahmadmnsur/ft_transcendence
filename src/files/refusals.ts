import { Refusal } from '../core/errors';

// §9.5's three refusals. A file whose bytes fail validation is normal use,
// so each is answered 200 with ok: false (§3.8.2), and the SPA picks its own
// text by code (§6.15).

export function fileTooLarge(): Refusal {
  return new Refusal('file_too_large', 'This file is too large.');
}

export function fileTypeNotAllowed(): Refusal {
  return new Refusal('file_type_not_allowed', 'This type of file is not allowed.');
}

export function fileInvalid(): Refusal {
  return new Refusal('file_invalid', "This file can't be read.");
}
