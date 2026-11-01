import type { LearningGoalView, SkillView } from '../api/profile';
import { SkillChip, SkillName } from '../design';


export function SkillSection({
  title,
  empty,
  variant,
  skills,
}: {
  title: string;
  empty: string;
  variant: 'teach' | 'learn';
  skills: SkillView[];
}): React.JSX.Element {
  return (
    <section className="min-w-0">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {skills.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={skill.id}>
              <SkillChip name={skill.name} variant={variant} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GoalSection({
  title,
  empty,
  goal,
}: {
  title: string;
  empty: string;
  goal: LearningGoalView | null;
}): React.JSX.Element {
  return (
    <section className="min-w-0">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {goal === null ? (
        <p className="mt-2 text-sm text-ink-muted">{empty}</p>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-ink">
            <SkillName name={goal.skill.name} />
          </p>
          <p dir="auto" className="text-sm text-ink wrap-anywhere">
            {goal.text}
          </p>
        </>
      )}
    </section>
  );
}
