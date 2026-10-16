import { Refusal } from '../core/errors';

// §6.2: `PUT /api/me/learning-goal` refuses when the Skill is not on the
// actor's LEARN list. A plain Refusal: normal use never reaches it, and the
// SPA picks its own text by code (§6.15).
export function goalSkillNotListed(): Refusal {
  return new Refusal('goal_skill_not_listed', 'This Skill is not on your learn list.');
}
