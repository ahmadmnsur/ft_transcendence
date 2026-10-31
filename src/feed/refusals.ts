import { Refusal } from '../core/errors';

export function postUnavailable(): Refusal {
  return new Refusal('post_unavailable', 'This Post is no longer available.');
}
