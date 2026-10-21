import { Refusal } from '../core/errors';

// §6.9: a Post a moderator removed. Every Post route answers it, never 404,
// since a loaded feed can still show the Post (§3.8.2).
export function postUnavailable(): Refusal {
  return new Refusal('post_unavailable', 'This Post is no longer available.');
}
