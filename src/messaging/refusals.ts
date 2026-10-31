import { Refusal } from '../core/errors';


export function dmUnavailable(): Refusal {
  return new Refusal('dm_unavailable', "You can't send a Direct Message to this Student.");
}
