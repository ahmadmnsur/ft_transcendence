import { useEffect, useRef, useState } from 'react';
import { isValidLearningGoalText, LIMITS } from '@shared/limits';
import { ApiRefusalError } from '../api/client';
import type { LearningGoalView } from '../api/profile';
import { Banner, Button, Card, Modal, Select, SkillChip, TextArea, skillNameText } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';
import { revealClass } from './SettingRow';
import type { ProfileTarget } from './target';
import { useUnsavedChanges } from './unsaved';

type Status = { kind: 'saved' } | { kind: 'cleared' } | { kind: 'failed'; code: unknown };

export function LearningGoalCard({ target, learnPickerId }: { target: ProfileTarget; learnPickerId?: string }): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = target.voice === 'own' ? t.profile.goal : { ...t.profile.goal, ...t.admin.cards.goal };
  const profile = target.profile;
  const [draft, setDraft] = useState<{ skillId: string; text: string } | null>(null);
  const [skillError, setSkillError] = useState<'empty' | 'goal_skill_not_listed' | undefined>(undefined);
  const [textError, setTextError] = useState(false);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [editing, setEditing] = useState(false);
  const [focusTarget, setFocusTarget] = useState<'skill' | 'edit' | null>(null);
  const skillRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const learn = profile?.skills.learn ?? [];
  const goal = profile?.learningGoal ?? null;
  const dirty =
    editing && draft !== null && (draft.skillId !== (goal?.skill.id ?? '') || draft.text !== (goal?.text ?? ''));
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (draft === null || draft.skillId === '' || learn.some((skill) => skill.id === draft.skillId)) return;
    setDraft({ skillId: goal?.skill.id ?? '', text: draft.text });
  }, [draft, learn, goal]);

  useEffect(() => {
    if (profile === undefined || learn.length > 0) return;
    setEditing(false);
    setDraft(null);
    setSkillError(undefined);
    setTextError(false);
  }, [profile, learn.length]);

  useEffect(() => {
    if (focusTarget === null) return;
    const target = focusTarget === 'skill' ? skillRef.current : editRef.current;
    target?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  if (profile === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={target.failed} reserveClassName="min-h-48" />
      </Card>
    );
  }

  const skillId = draft?.skillId ?? goal?.skill.id ?? '';
  const text = draft?.text ?? goal?.text ?? '';

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
      await target.apply({ learningGoal: saved });
      setDraft(null);
      setEditing(false);
      setStatus({ kind: 'saved' });
      setFocusTarget('edit');
    } catch (error) {
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
      setFocusTarget('edit');
    } catch (error) {
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setClearing(false);
      setConfirmingClear(false);
    }
  }

  function onCancel(): void {
    setDraft(null);
    setSkillError(undefined);
    setTextError(false);
    setStatus(undefined);
    setEditing(false);
    setFocusTarget('edit');
  }

  function onFormKeyDown(event: React.KeyboardEvent): void {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing || dirty || pending) return;
    event.preventDefault();
    onCancel();
  }

  function onFindLearnPicker(id: string): void {
    const picker = document.getElementById(id);
    if (picker === null) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    picker.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    picker.focus({ preventScroll: true });
  }

  function onEdit(): void {
    setStatus(undefined);
    setEditing(true);
    setFocusTarget('skill');
  }

  function renderView(saved: LearningGoalView): React.JSX.Element {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="sr-only">{copy.currentHeading}</h3>
        <SkillChip name={saved.skill.name} variant="learn" className="self-start" />
        <p dir="auto" className="text-base text-ink wrap-anywhere">
          {saved.text}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button ref={editRef} variant="secondary" onClick={onEdit}>
            {copy.edit}
          </Button>
          <Button
            variant="danger-ghost"
            onClick={() => {
              setStatus(undefined);
              setConfirmingClear(true);
            }}
          >
            {copy.clear}
          </Button>
        </div>
      </div>
    );
  }

  function renderEmpty(): React.JSX.Element {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-sm text-ink-muted">{copy.none}</p>
        <Button ref={editRef} variant="secondary" onClick={onEdit}>
          {copy.set}
        </Button>
      </div>
    );
  }

  function renderForm(): React.JSX.Element {
    return (
      <form
        onSubmit={(event) => void onSubmit(event)}
        onKeyDown={onFormKeyDown}
        noValidate
        className={`flex min-w-0 flex-col gap-4 ${revealClass}`}
      >
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
            if (event.key === 'Enter') event.preventDefault();
          }}
          onChange={(event) => {
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
          <Button variant="secondary" aria-disabled={pending || undefined} onClick={onCancel}>
            {copy.cancel}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      {learn.length === 0 ? (
        <div className="flex min-w-0 flex-col items-start gap-3">
          <p className="text-sm text-ink-muted">{copy.noLearn}</p>
          {learnPickerId !== undefined ? (
            <Button variant="secondary" onClick={() => onFindLearnPicker(learnPickerId)}>
              {copy.addLearnSkill}
            </Button>
          ) : null}
        </div>
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
          {editing ? renderForm() : goal !== null ? renderView(goal) : renderEmpty()}
        </div>
      )}
      <Modal
        open={confirmingClear}
        size="sm"
        title={copy.confirmTitle}
        description={copy.confirmBody}
        onClose={() => {
          if (!clearing) setConfirmingClear(false);
        }}
        initialFocusRef={keepRef}
        footer={
          <>
            <Button
              ref={keepRef}
              variant="secondary"
              onClick={() => {
                if (!clearing) setConfirmingClear(false);
              }}
            >
              {copy.cancel}
            </Button>
            <Button variant="danger" loading={clearing} onClick={() => void onClear()}>
              {clearing ? copy.clearing : copy.clear}
            </Button>
          </>
        }
      />
    </Card>
  );
}
