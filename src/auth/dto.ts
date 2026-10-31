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

  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  password!: string;
}

export class Start42Dto {
  @IsIn(FORTY_TWO_INTENTS)
  intent!: FortyTwoIntent;

  @ValidateIf((dto: Start42Dto) => dto.intent === 'link' || dto.password !== undefined)
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  password?: string;
}

export class Disconnect42Dto {
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  password!: string;
}

export class Password42Dto {
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  newPassword!: string;
}

export class PasswordDto {
  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  currentPassword!: string;

  @IsString()
  @Trimmed()
  @IsValidPasswordDto()
  newPassword!: string;
}
