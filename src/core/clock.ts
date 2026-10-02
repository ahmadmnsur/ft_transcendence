import { Injectable } from '@nestjs/common';

// Where the Unit of Work reads `now` (§3.6.2). Tests bind their own.
export abstract class Clock {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
