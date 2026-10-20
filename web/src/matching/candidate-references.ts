import type { StudentRef } from '../api/profile';

// A short reference shared by the pickers and the linked unmatched list.
// Extend a suffix when it collides, so even identical names stay distinct.
export function candidateReferences(students: readonly StudentRef[]): ReadonlyMap<string, string> {
  return new Map(students.map(({ id }) => {
    let length = 8;
    while (length < id.length && students.some((other) => other.id !== id && other.id.endsWith(id.slice(-length)))) {
      length += 1;
    }
    return [id, id.slice(-length)];
  }));
}
