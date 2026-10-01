import { Param, ParseUUIDPipe } from '@nestjs/common';

// A UUID path parameter: a malformed one is 400 validation_failed (§6.0.1).
export function UuidParam(name: string): ParameterDecorator {
  return Param(name, new ParseUUIDPipe());
}
