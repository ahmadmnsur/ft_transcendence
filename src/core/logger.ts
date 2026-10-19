import { Injectable, type LoggerService } from '@nestjs/common';

type Level = 'log' | 'warn' | 'error';

// The call frames of a V8 stack, without its `<name>: <message>` header: a
// Prisma or driver message can embed argument values (§3.9). The header is cut
// by its exact text when it matches. When it does not (Node's
// `<name> [<code>]: <message>`, or a name set after the stack was read), the
// header still spans as many lines as the message, so that many are dropped.
// Then only the trailing frame lines are kept.
function frames(stack: string, header = '', message = ''): string[] {
  const lines = stack.startsWith(header)
    ? stack.slice(header.length).split('\n')
    : stack.split('\n').slice(message.split('\n').length);
  let first = lines.length;
  while (first > 0 && /^\s+at /.test(lines[first - 1])) first--;
  return lines.slice(first).map((line) => line.trim());
}

// An error whose message names no value by construction (a call and a
// status, say), so errorFields logs it as `reason`. StorageError is one.
export class SafeMessageError extends Error {}

type ErrorFields = { error: string; code: string | null; stack: string[]; reason?: string };

// What a log may say about an error: its class, its Prisma code if any, and
// its call frames. Never its message, unless it is a SafeMessageError.
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

// Node's default report prints the message, which can embed argument values
// (§3.9); log it the filter's way, then exit as Node would. The API's and the
// seed's entry points install it.
export function exitOnUncaught(kind: string): (err: unknown) => void {
  const logger = new AppLogger();
  return (err: unknown): void => {
    logger.entry('error', { [kind]: true, ...errorFields(err) });
    process.exit(1);
  };
}

// JSON lines on stdout at log, warn and error (§3.9, M13). There is no HTTP
// request logging: the only per-request entry is a 5xx from the exception
// filter. Nest's debug and verbose output is dropped.
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

  // Nest calls these as (message, context) or, for errors, (message, stack,
  // context). A stack is reduced to its frames, an Error to errorFields.
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
