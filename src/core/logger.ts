import { Injectable, type LoggerService } from '@nestjs/common';

type Level = 'log' | 'warn' | 'error';

function frames(stack: string, header = '', message = ''): string[] {
  const lines = stack.startsWith(header)
    ? stack.slice(header.length).split('\n')
    : stack.split('\n').slice(message.split('\n').length);
  let first = lines.length;
  while (first > 0 && /^\s+at /.test(lines[first - 1])) first--;
  return lines.slice(first).map((line) => line.trim());
}

export class SafeMessageError extends Error {}

type ErrorFields = { error: string; code: string | null; stack: string[]; reason?: string };

export function errorFields(err: unknown): ErrorFields {
  if (!(err instanceof Error)) return { error: typeof err, code: null, stack: [] };
  const code = (err as { code?: unknown }).code;
  return {
    error: err.constructor.name,
    code: typeof code === 'string' && /^P\d{4}$/.test(code) ? code : null,
    stack: frames(err.stack ?? '', Error.prototype.toString.call(err), String(err.message)),
    ...(err instanceof SafeMessageError ? { reason: err.message } : {}),
  };
}

export function exitOnUncaught(kind: string): (err: unknown) => void {
  const logger = new AppLogger();
  return (err: unknown): void => {
    logger.entry('error', { [kind]: true, ...errorFields(err) });
    process.exit(1);
  };
}

@Injectable()
export class AppLogger implements LoggerService {
  log(message: unknown, ...params: unknown[]): void {
    this.write('log', message, params);
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }

  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }

  entry(level: Level, fields: Record<string, unknown>): void {
    process.stdout.write(`${JSON.stringify({ level, time: new Date().toISOString(), ...fields })}\n`);
  }

  private write(level: Level, message: unknown, params: unknown[]): void {
    const strings = params.filter((param): param is string => typeof param === 'string');
    const stack = strings.find((param) => /\n\s+at /.test(param));
    const context = strings.filter((param) => param !== stack).at(-1);
    const fields: Record<string, unknown> =
      message instanceof Error ? errorFields(message) : { message };
    if (stack !== undefined && !(message instanceof Error)) fields['stack'] = frames(stack);
    this.entry(level, context === undefined ? fields : { context, ...fields });
  }
}
