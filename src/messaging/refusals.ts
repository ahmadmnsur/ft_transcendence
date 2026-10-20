import { Refusal } from '../core/errors';

// §7.3's refusal, with the English sentence the SPA's dictionary also has.
// The SPA never displays a socket refusal's message: it picks its own text by
// code (§6.15).

// §7.3: an unknown target, the actor's own id, a Removed recipient or a Block
// standing between them, either way. One sentence for all four, so a blocked
// Student is not told which of the pair set it (§4.6, §11.2).
export function dmUnavailable(): Refusal {
  return new Refusal('dm_unavailable', "You can't send a Direct Message to this Student.");
}
