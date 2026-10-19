import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateBy,
  ValidateIf,
  type ValidationOptions,
  type ValidatorConstraintInterface,
} from 'class-validator';
import {
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from '../shared/limits';
import { FORTY_TWO_INTENTS, type FortyTwoIntent } from './oauth-attempt-store';

// §6.1: the DTOs validate §6.0.3 through the shared validators, so the client
// pre-check and the server enforce the same limits. Passwords are validated
// and used trimmed: `isValidPassword` trims, and the transforms below pass
// the trimmed value on, so both ends send and use it (§5.1).

function trimmedString(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

export function sharedValidator(
  name: string,
  check: (value: string) => boolean,
): (options?: ValidationOptions) => PropertyDecorator {
  const constraint: ValidatorConstraintInterface = {
    validate(value: unknown): boolean {
      return typeof value === 'string' && check(value);
    },
  };
  return (options?: ValidationOptions) =>
    ValidateBy({ name, validator: constraint }, options);
}

export const IsValidEmailDto = sharedValidator('isValidEmail', isValidEmail);
export const IsValidPasswordDto = sharedValidator('isValidPassword', isValidPassword);
export const IsValidDisplayNameDto = sharedValidator('isValidDisplayName', isValidDisplayName);

// The global pipe transforms before it validates (`transform: true`), so
// validation sees the trimmed value and the service receives it.
export function Trimmed(): PropertyDecorator {
  return trimmedString();
}

export class SignupDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsValidEmailDto()
  email!: string;

  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  password!: string;

  @IsString()
  @Trimmed()
  @IsValidDisplayNameDto()
  displayName!: string;

  // Validated on both ends and not stored (ADR-0018 d12).
  @IsBoolean()
  @Equals(true)
  acceptTerms!: boolean;
}

export class LoginDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsValidEmailDto()
  email!: string;

  // A malformed password is a validation failure like a malformed email: the
  // client pre-checks it, so normal use never sends one (§3.8.2).
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  password!: string;
}

// §5.6 A's start body: `{ intent, password? }`. `intent` is one of the three
// intents. `password` is Connect 42's (`link`) current password, required
// for it and never used by the others — a `sign_in` or `confirm` carrying
// one still gets the same field validation.
export class Start42Dto {
  @IsIn(FORTY_TWO_INTENTS)
  intent!: FortyTwoIntent;

  @ValidateIf((dto: Start42Dto) => dto.intent === 'link' || dto.password !== undefined)
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  password?: string;
}

// §5.6 B: Disconnect 42's body. The current password is trimmed and
// validated like the password change's (§5.1).
export class Disconnect42Dto {
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  password!: string;
}

// §5.6 C: the new password after Confirm with 42, trimmed and validated like
// the password change's (§5.1), before the permission is taken.
export class Password42Dto {
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  newPassword!: string;
}

export class PasswordDto {
  // The current password is trimmed and validated exactly like a login
  // password: a password typed with a trailing space signs in and changes
  // alike, and normal use never sends a malformed one (§3.8.2, §5.1).
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  currentPassword!: string;

  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  newPassword!: string;
}
