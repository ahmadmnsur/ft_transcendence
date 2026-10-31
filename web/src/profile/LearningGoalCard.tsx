import { useEffect, useRef, useState } from 'react';
import { isValidLearningGoalText, LIMITS } from '@shared/limits';
import { ApiRefusalError } from '../api/client';
import type { LearningGoalView } from '../api/profile';
import { Banner, Button, Card, Select, SkillName, TextArea, skillNameText } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';
import type { ProfileTarget } from './target';

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch: a save, a clear, or a failure's code.
type Status = { kind: 'saved' } | { kind: 'cleared' } | { kind: 'failed'; code: unknown };

// §6.2: the Learning Goal, one Skill on the saved learn list plus a 1–200
// character sentence, or cleared. A saved Goal shows as plain content with an
// Edit button; the form appears for an edit, or whenever no Goal is saved, and
// only while the learn list has a Skill to name. Saving writes both fields at
// once, clearing removes both.
export function LearningGoalCard({ target }: { target: ProfileTarget }): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = target.voice === 'own' ? t.profile.goal : { ...t.profile.goal, ...t.admin.cards.goal };
  const profile = target.profile;
  // Null while nothing is edited: the fields follow the server then, so a
  // refetch never overwrites what the Student is typing.
  const [draft, setDraft] = useState<{ skillId: string; text: string } | null>(null);
  // No Skill chosen, or the server's refusal of one off the learn list.
  const [skillError, setSkillError] = useState<'empty' | 'goal_skill_not_listed' | undefined>(undefined);
  const [textError, setTextError] = useState(false);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [clearing, setClearing] = useState(false);
  // False views the saved Goal; the empty form shows whenever there is no
  // saved Goal to view.
  const [editing, setEditing] = useState(false);
  // Where focus lands once a mode change has rendered: the Select when the
  // form appears, the Edit button when the view returns.
  const [focusTarget, setFocusTarget] = useState<'skill' | 'edit' | null>(null);
  const skillRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const learn = profile?.skills.learn ?? [];
  const goal = profile?.learningGoal ?? null;

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

  // A mode change renders first, then focus lands where the change implies.
  useEffect(() => {
    if (focusTarget === null) return;
    const target = focusTarget === 'skill' ? skillRef.current : editRef.current;
    target?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  // §6.2: the card shell shows at once. While the profile read is pending the
  // body says so and reserves the loaded height; a failed read leaves the body
  // empty, since `/me` shows the failure once above the cards.
  if (profile === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={target.failed} reserveClassName="min-h-48" />
      </Card>
    );
  }

  const skillId = draft?.skillId ?? goal?.skill.id ?? '';
  const text = draft?.text ?? goal?.text ?? '';
  // A saved Goal shows as plain content unless the Student is editing it.
  const viewed = goal !== null && !editing ? goal : null;

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || clearing) return;
    const nextSkillError = skillId === '' ? 'empty' : undefined;
    const nextTextError = !isValidLearningGoalText(text);
    setSkillError(nextSkillError);
    setTextError(nextTextError);
    setStatus(undefined);
    if (nextSkillError !== undefined) {
      skillRef.current?.focus();
      return;
    }
    if (nextTextError) {
      textRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      const saved = await target.api.setLearningGoal({ skillId, text: text.trim() });
      // The answer is the stored Goal (§6.2), so the cached read takes it
      // without a refetch.
      await target.apply({ learningGoal: saved });
      setDraft(null);
      setEditing(false);
      setStatus({ kind: 'saved' });
      setFocusTarget('edit');
    } catch (error) {
      // A refusal names the Skill field it is about; anything else sums up
      // in the status Banner.
      if (error instanceof ApiRefusalError && error.code === 'goal_skill_not_listed') {
        setSkillError('goal_skill_not_listed');
        skillRef.current?.focus();
        return;
      }
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setPending(false);
    }
  }

  async function onClear(): Promise<void> {
    if (pending || clearing) return;
    setStatus(undefined);
    setClearing(true);
    try {
      await target.api.clearLearningGoal();
      await target.apply({ learningGoal: null });
      setDraft(null);
      setEditing(false);
      setStatus({ kind: 'cleared' });
      setFocusTarget('skill');
    } catch (error) {
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setClearing(false);
    }
  }

  // Cancel drops the draft and returns to the saved Goal's view.
  function onCancel(): void {
    setDraft(null);
    setSkillError(undefined);
    setTextError(false);
    setStatus(undefined);
    setEditing(false);
    setFocusTarget('edit');
  }

  function onEdit(): void {
    setEditing(true);
    setFocusTarget('skill');
  }

  // The saved Goal as plain content of the card: no nested bordered box.
  function renderView(saved: LearningGoalView): React.JSX.Element {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink">{copy.currentHeading}</h3>
        <p className="text-sm font-semibold text-ink">
          <SkillName name={saved.skill.name} />
        </p>
        <p dir="auto" className="text-sm text-ink wrap-anywhere">
          {saved.text}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button ref={editRef} variant="secondary" onClick={onEdit}>
            {copy.edit}
          </Button>
          <Button variant="secondary" loading={clearing} onClick={() => void onClear()}>
            {clearing ? copy.clearing : copy.clear}
          </Button>
        </div>
      </div>
    );
  }

  function renderForm(): React.JSX.Element {
    return (
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
        <Select
          ref={skillRef}
          label={copy.skillLabel}
          options={learn.map((skill) => ({ value: skill.id, label: skillNameText(skill.name) }))}
          value={skillId}
          onValueChange={(next) => {
            setDraft({ skillId: next, text });
            setSkillError(undefined);
          }}
          placeholder={copy.skillPlaceholder}
          error={
            skillError === undefined
              ? undefined
              : skillError === 'empty'
                ? copy.chooseSkillError
                : errorText(skillError)
          }
        />
        <TextArea
          ref={textRef}
          label={copy.textLabel}
          hint={format(copy.textHint, {
            count: LIMITS.learningGoalText.maxChars,
            minChars: LIMITS.learningGoalText.minChars,
          })}
          rows={3}
          value={text}
          onKeyDown={(event) => {
            // The sentence is one line: Enter never inserts a newline.
            if (event.key === 'Enter') event.preventDefault();
          }}
          onChange={(event) => {
            // A pasted newline becomes a space, so the value never holds `\n`
            // or `\r` (§6.2).
            setDraft({ skillId, text: event.target.value.replace(/[\r\n]+/g, ' ') });
            setTextError(false);
          }}
          error={
            textError
              ? format(copy.textInvalid, {
                  count: LIMITS.learningGoalText.maxChars,
                  minChars: LIMITS.learningGoalText.minChars,
                })
              : undefined
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending}>
            {pending ? copy.saving : copy.save}
          </Button>
          {goal !== null ? (
            <Button variant="secondary" onClick={onCancel}>
              {copy.cancel}
            </Button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      {learn.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.noLearn}</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          {status !== undefined ? (
            <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
              {status.kind === 'failed' ? (
                <Banner tone="danger" title={errorText(status.code)} />
              ) : (
                <Banner tone="success" title={status.kind === 'saved' ? copy.saved : copy.cleared} />
              )}
            </div>
          ) : null}
          {viewed !== null ? renderView(viewed) : renderForm()}
        </div>
      )}
    </Card>
  );
}
