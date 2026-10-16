import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidLearningGoalText, LIMITS } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import {
  ME_QUERY_KEY,
  clearLearningGoal,
  meQueryOptions,
  setLearningGoal,
  type OwnProfile,
} from '../api/profile';
import { Banner, Button, Card, Select, TextField, type BannerTone } from '../design';
import { isolateName, formatText, profileCopy, profileErrorMessage } from './messages';

const copy = profileCopy.goal;

interface Status {
  tone: BannerTone;
  title: string;
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiRefusalError) return profileErrorMessage(error.code);
  if (error instanceof ApiProtocolError) return profileErrorMessage(error.code);
  return profileErrorMessage(undefined);
}

// §6.2: the Learning Goal, one Skill on the saved learn list plus a 1–200
// character sentence, or cleared. The form only appears while the learn
// list has a Skill to name; saving writes both fields at once, clearing
// removes both.
export function LearningGoalCard(): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const { data: me } = useQuery(meQueryOptions());
  // Null while nothing is edited: the fields follow the server then, so a
  // refetch never overwrites what the Student is typing.
  const [draft, setDraft] = useState<{ skillId: string; text: string } | null>(null);
  const [skillError, setSkillError] = useState<string | undefined>(undefined);
  const [textError, setTextError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const skillRef = useRef<HTMLSelectElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const learn = me?.skills.learn ?? [];
  const goal = me?.learningGoal ?? null;

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors below.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // A Skill leaving the learn list also clears the saved Goal (§6.2), and
  // the Skills card's own save is what removes it: a Skill the Select no
  // longer offers falls back to the saved Goal, or to no choice at all.
  useEffect(() => {
    if (draft === null || draft.skillId === '' || learn.some((skill) => skill.id === draft.skillId)) return;
    setDraft({ skillId: goal?.skill.id ?? '', text: draft.text });
  }, [draft, learn, goal]);

  // The profile is not loaded yet; the card appears with its values filled.
  if (me === undefined) return null;

  const skillId = draft?.skillId ?? goal?.skill.id ?? '';
  const text = draft?.text ?? goal?.text ?? '';

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || clearing) return;
    const nextSkillError = skillId === '' ? copy.chooseSkillError : undefined;
    const nextTextError = isValidLearningGoalText(text)
      ? undefined
      : formatText(copy.textInvalid, LIMITS.learningGoalText);
    setSkillError(nextSkillError);
    setTextError(nextTextError);
    setStatus(undefined);
    if (nextSkillError !== undefined) {
      skillRef.current?.focus();
      return;
    }
    if (nextTextError !== undefined) {
      textRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      const saved = await setLearningGoal({ skillId, text: text.trim() });
      // The answer is the stored Goal (§6.2), so the cached read takes it
      // without a refetch.
      queryClient.setQueryData<OwnProfile>(ME_QUERY_KEY, (previous) =>
        previous === undefined ? previous : { ...previous, learningGoal: saved },
      );
      setDraft(null);
      setStatus({ tone: 'success', title: copy.saved });
    } catch (error) {
      // A refusal names the Skill field it is about; anything else sums up
      // in the status Banner.
      if (error instanceof ApiRefusalError && error.code === 'goal_skill_not_listed') {
        setSkillError(profileErrorMessage(error.code));
        skillRef.current?.focus();
        return;
      }
      setStatus({ tone: 'danger', title: failureMessage(error) });
    } finally {
      setPending(false);
    }
  }

  async function onClear(): Promise<void> {
    if (pending || clearing) return;
    setStatus(undefined);
    setClearing(true);
    try {
      await clearLearningGoal();
      queryClient.setQueryData<OwnProfile>(ME_QUERY_KEY, (previous) =>
        previous === undefined ? previous : { ...previous, learningGoal: null },
      );
      setDraft(null);
      setStatus({ tone: 'success', title: copy.cleared });
    } catch (error) {
      setStatus({ tone: 'danger', title: failureMessage(error) });
    } finally {
      setClearing(false);
    }
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle}>
      {learn.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.noLearn}</p>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
          {status !== undefined ? (
            <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
              <Banner tone={status.tone} title={status.title} />
            </div>
          ) : null}
          {goal !== null ? (
            <section className="min-w-0 rounded-lg border border-line bg-surface-muted p-3">
              <h4 className="text-sm font-semibold text-ink">{copy.currentHeading}</h4>
              <p className="mt-1 text-sm font-semibold text-ink">
                <bdi>{goal.skill.name}</bdi>
              </p>
              <p dir="auto" className="text-sm text-ink wrap-anywhere">
                {goal.text}
              </p>
            </section>
          ) : null}
          <Select
            ref={skillRef}
            label={copy.skillLabel}
            value={skillId}
            onChange={(event) => {
              setDraft({ skillId: event.target.value, text });
              setSkillError(undefined);
            }}
            error={skillError}
          >
            <option value="">{copy.skillPlaceholder}</option>
            {learn.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {isolateName(skill.name)}
              </option>
            ))}
          </Select>
          <TextField
            ref={textRef}
            label={copy.textLabel}
            hint={formatText(copy.textHint, LIMITS.learningGoalText)}
            type="text"
            value={text}
            onChange={(event) => {
              setDraft({ skillId, text: event.target.value });
              setTextError(undefined);
            }}
            error={textError}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending}>
              {pending ? copy.saving : copy.save}
            </Button>
            {goal !== null ? (
              <Button variant="secondary" loading={clearing} onClick={() => void onClear()}>
                {clearing ? copy.clearing : copy.clear}
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </Card>
  );
}
