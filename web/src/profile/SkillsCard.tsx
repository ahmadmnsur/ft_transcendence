import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import {
  ME_QUERY_KEY,
  meQueryOptions,
  setSkills,
  skillsQueryOptions,
  type SkillView,
} from '../api/profile';
import { Banner, Button, Card, Select, SkillChip, type BannerTone } from '../design';
import { isolateName, formatText, profileCopy, profileErrorMessage } from './messages';

const copy = profileCopy.skills;

type Kind = 'teach' | 'learn';

interface Status {
  tone: BannerTone;
  title: string;
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiRefusalError) return profileErrorMessage(error.code);
  if (error instanceof ApiProtocolError) return profileErrorMessage(error.code);
  return profileErrorMessage(undefined);
}

// §6.2: the two Skill lists, each 0–15 catalogue Skills, a Skill possibly on
// both. Only what is on screen is kept in the draft; a save replaces both
// lists in one call and refreshes `GET /api/me`, whose answer also tells
// whether the Learning Goal lost its Skill and was cleared.
export function SkillsCard(): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const { data: me } = useQuery(meQueryOptions());
  const { data: catalogue } = useQuery(skillsQueryOptions());
  // Null while nothing is edited: the lists follow the server then, so a
  // refetch never drops what the Student just added or removed.
  const [draft, setDraft] = useState<{ teach: SkillView[]; learn: SkillView[] } | null>(null);
  const [choice, setChoice] = useState<Record<Kind, string>>({ teach: '', learn: '' });
  const [choiceError, setChoiceError] = useState<Record<Kind, string | undefined>>({
    teach: undefined,
    learn: undefined,
  });
  const [status, setStatus] = useState<Status[] | undefined>(undefined);
  const [pending, setPending] = useState(false);
  // The chip a removal should move focus to, once the list has re-rendered.
  const [focusRequest, setFocusRequest] = useState<{ kind: Kind; chipIndex: number | null } | null>(null);
  const teachBoxRef = useRef<HTMLDivElement>(null);
  const learnBoxRef = useRef<HTMLDivElement>(null);
  const teachSelectRef = useRef<HTMLSelectElement>(null);
  const learnSelectRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors below.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // The remove button goes with its chip, so focus moves to a neighbouring
  // chip's remove button, or to the Select when the list is now empty
  // (SkillChip's own comment asks the caller for this).
  useEffect(() => {
    if (focusRequest === null) return;
    const buttons = boxRef(focusRequest.kind).current?.querySelectorAll('button');
    const chip = focusRequest.chipIndex === null ? undefined : buttons?.[focusRequest.chipIndex];
    (chip ?? selectRef(focusRequest.kind).current)?.focus();
    setFocusRequest(null);
  }, [focusRequest]);

  // The profile is not loaded yet; the card appears with its lists filled.
  if (me === undefined) return null;

  const teach = draft?.teach ?? me.skills.teach;
  const learn = draft?.learn ?? me.skills.learn;

  function boxRef(kind: Kind): React.RefObject<HTMLDivElement | null> {
    return kind === 'teach' ? teachBoxRef : learnBoxRef;
  }

  function selectRef(kind: Kind): React.RefObject<HTMLSelectElement | null> {
    return kind === 'teach' ? teachSelectRef : learnSelectRef;
  }

  function listFor(kind: Kind): SkillView[] {
    return kind === 'teach' ? teach : learn;
  }

  // The catalogue minus the Skills already on this list: a Skill may sit on
  // the other list too (§6.2).
  function availableFor(kind: Kind): SkillView[] {
    const chosen = new Set(listFor(kind).map((skill) => skill.id));
    return (catalogue?.items ?? []).filter((skill) => !chosen.has(skill.id));
  }

  function onRemove(kind: Kind, id: string): void {
    if (pending) return;
    const index = listFor(kind).findIndex((skill) => skill.id === id);
    const next = listFor(kind).filter((skill) => skill.id !== id);
    setDraft({ teach: kind === 'teach' ? next : teach, learn: kind === 'learn' ? next : learn });
    // The chip that took the removed one's place, or the one before it; the
    // Select when none is left.
    setFocusRequest({ kind, chipIndex: next.length === 0 ? null : Math.max(index - 1, 0) });
  }

  function onAdd(kind: Kind): void {
    if (pending) return;
    // At the limit the Add control is unavailable and its hint says why.
    if (listFor(kind).length >= LIMITS.skillList.maxItems) return;
    const chosen = choice[kind];
    if (chosen === '') {
      setChoiceError({ ...choiceError, [kind]: copy.chooseFirst });
      selectRef(kind).current?.focus();
      return;
    }
    const skill = availableFor(kind).find((item) => item.id === chosen);
    if (skill === undefined) return;
    const next = [...listFor(kind), skill];
    setDraft({ teach: kind === 'teach' ? next : teach, learn: kind === 'learn' ? next : learn });
    setChoice({ ...choice, [kind]: '' });
    setChoiceError({ ...choiceError, [kind]: undefined });
  }

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    setStatus(undefined);
    setPending(true);
    try {
      const result = await setSkills({ teach: teach.map((skill) => skill.id), learn: learn.map((skill) => skill.id) });
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      const saved: Status[] = [{ tone: 'success', title: copy.saved }];
      if (result.goalCleared) saved.push({ tone: 'info', title: copy.goalCleared });
      setStatus(saved);
    } catch (error) {
      setStatus([{ tone: 'danger', title: failureMessage(error) }]);
    } finally {
      setPending(false);
    }
  }

  // A render helper, not a component: its own element identity keeps the
  // Select's focus across the re-render each add or remove causes.
  function renderPicker(kind: Kind): React.JSX.Element {
    const list = listFor(kind);
    const available = availableFor(kind);
    const atLimit = list.length >= LIMITS.skillList.maxItems;
    const hint = atLimit
      ? formatText(copy.limitHint, LIMITS.skillList)
      : available.length === 0
        ? copy.nothingToAdd
        : undefined;
    return (
      <section className="min-w-0">
        <h4 className="text-sm font-semibold text-ink">
          {kind === 'teach' ? copy.teachHeading : copy.learnHeading}
        </h4>
        <div ref={boxRef(kind)} className="mt-2 flex min-w-0 flex-wrap gap-2">
          {list.length === 0 ? (
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          ) : (
            list.map((skill) => (
              <SkillChip
                key={skill.id}
                name={skill.name}
                variant={kind}
                onRemove={() => onRemove(kind, skill.id)}
              />
            ))
          )}
        </div>
        <Select
          ref={selectRef(kind)}
          className="mt-3"
          label={kind === 'teach' ? copy.teachSelectLabel : copy.learnSelectLabel}
          hint={hint}
          error={choiceError[kind]}
          value={choice[kind]}
          onChange={(event) => {
            setChoice({ ...choice, [kind]: event.target.value });
            setChoiceError({ ...choiceError, [kind]: undefined });
          }}
        >
          <option value="">{copy.selectPlaceholder}</option>
          {available.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {isolateName(skill.name)}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          className="mt-2 self-start"
          aria-disabled={atLimit || pending ? true : undefined}
          onClick={() => onAdd(kind)}
        >
          {copy.add}
        </Button>
      </section>
    );
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-5">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="flex flex-col gap-2 rounded-lg focus-ring">
            {status.map((message, index) => (
              <Banner key={index} tone={message.tone} title={message.title} />
            ))}
          </div>
        ) : null}
        {renderPicker('teach')}
        {renderPicker('learn')}
        <Button type="submit" loading={pending} className="self-start">
          {pending ? copy.saving : copy.save}
        </Button>
      </form>
    </Card>
  );
}
