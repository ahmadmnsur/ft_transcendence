import { Refusal } from '../core/errors';

export function goalSkillNotListed(): Refusal {
  return new Refusal('goal_skill_not_listed', 'This Skill is not on your learn list.');
}
