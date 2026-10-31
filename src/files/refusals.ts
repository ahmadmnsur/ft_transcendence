import { Refusal } from '../core/errors';


export function fileTooLarge(): Refusal {
  return new Refusal('file_too_large', 'This file is too large.');
}

export function fileTypeNotAllowed(): Refusal {
  return new Refusal('file_type_not_allowed', 'This type of file is not allowed.');
}

export function fileInvalid(): Refusal {
  return new Refusal('file_invalid', "This file can't be read.");
}
