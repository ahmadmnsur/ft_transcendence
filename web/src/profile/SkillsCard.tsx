import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS } from '@shared/limits';
import {
  ME_QUERY_KEY,
  meQueryOptions,
  setSkills,
  skillsQueryOptions,
  studentQueryKey,
  type SkillView,
} from '../api/profile';
import { Banner, Button, Card, Select, SkillChip, type BannerTone } from '../design';
import { formatCount, isolateName, profileCopy, profileErrorMessage, profileFailureMessage } from './messages';
import { PendingCardBody } from './PendingCardBody';

const copy = profileCopy.skills;

type Kind = 'teach' | 'learn';

interface Status {
  tone: BannerTone;
  title: string;
}

// The two lists hold the same ids in whatever order the Student arranged them,
// so an unsaved-changes check compares the id sets, never the order.
function sameIds(a: SkillView[], b: SkillView[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(b.map((skill) => skill.id));
  return a.every((skill) => ids.has(skill.id));
}

// §6.2: the two Skill lists, each 0–15 catalogue Skills, a Skill possibly on
// both. Only what is on screen is kept in the draft; a save replaces both
// lists in one call and refreshes `GET /api/me`, whose answer also tells
// whether the Learning Goal lost its Skill and was cleared.
export function SkillsCard(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: me, isError: meError } = useQuery(meQueryOptions());
  const {
    data: catalogue,
    isError: catalogueError,
    isPending: cataloguePending,
    refetch: refetchCatalogue,
  } = useQuery(skillsQueryOptions());
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
  // One lookup per kind, so the repeated `kind === 'teach' ? … : …` choices
  // read as data rather than seven branches.
  const boxRefs: Record<Kind, React.RefObject<HTMLDivElement | null>> = {
    teach: teachBoxRef,
    learn: learnBoxRef,
  };
  const selectRefs: Record<Kind, React.RefObject<HTMLSelectElement | null>> = {
    teach: teachSelectRef,
    learn: learnSelectRef,
  };
  const copyKeys: Record<Kind, { heading: string; selectLabel: string }> = {
    teach: { heading: copy.teachHeading, selectLabel: copy.teachSelectLabel },
    learn: { heading: copy.learnHeading, selectLabel: copy.learnSelectLabel },
  };

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
    const buttons = boxRefs[focusRequest.kind].current?.querySelectorAll('button');
    const chip = focusRequest.chipIndex === null ? undefined : buttons?.[focusRequest.chipIndex];
    (chip ?? selectRefs[focusRequest.kind].current)?.focus();
    setFocusRequest(null);
  }, [focusRequest]);

  // §6.2: the card shell shows at once. While the profile read is pending the
  // body says so and reserves the loaded height; a failed read leaves the body
  // empty, since `/me` shows the failure once above the cards.
  if (me === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={meError} reserveClassName="min-h-[30rem]" />
      </Card>
    );
  }

  const teach = draft?.teach ?? me.skills.teach;
  const learn = draft?.learn ?? me.skills.learn;

  // The Save button speaks up while the draft and the stored lists differ by
  // set, and warns once the draft's learn list drops the saved Goal's Skill,
  // because saving then clears the Goal (§6.2).
  const dirty = !(sameIds(teach, me.skills.teach) && sameIds(learn, me.skills.learn));
  const goalSkillId = me.learningGoal?.skill.id;
  const goalWillClear = goalSkillId !== undefined && !learn.some((skill) => skill.id === goalSkillId);
  // Read outside the handler: the narrowing of `me` does not reach a function
  // declaration.
  const meId = me.id;

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
    // A previous save's banners no longer describe what is on screen.
    setStatus(undefined);
    // The chip now at the removed one's index, or the new last chip when the
    // removed chip was last; the Select when none is left.
    setFocusRequest({ kind, chipIndex: next.length === 0 ? null : Math.min(index, next.length - 1) });
  }

  function onAdd(kind: Kind): void {
    if (pending) return;
    // At the limit the Add control is unavailable and its hint says why.
    if (listFor(kind).length >= LIMITS.skillList.maxItems) return;
    const chosen = choice[kind];
    if (chosen === '') {
      setChoiceError({ ...choiceError, [kind]: copy.chooseFirst });
      selectRefs[kind].current?.focus();
      return;
    }
    const skill = availableFor(kind).find((item) => item.id === chosen);
    if (skill === undefined) return;
    const next = [...listFor(kind), skill];
    setDraft({ teach: kind === 'teach' ? next : teach, learn: kind === 'learn' ? next : learn });
    setChoice({ ...choice, [kind]: '' });
    setChoiceError({ ...choiceError, [kind]: undefined });
    // A previous save's banners no longer describe what is on screen.
    setStatus(undefined);
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
      // The own public profile shows the lists too. It is dropped, not just
      // invalidated: an inactive query would render the old lists until its
      // background refetch returns, so the next visit must load afresh.
      queryClient.removeQueries({ queryKey: studentQueryKey(meId) });
      const saved: Status[] = [{ tone: 'success', title: copy.saved }];
      if (result.goalCleared) saved.push({ tone: 'info', title: copy.goalCleared });
      setStatus(saved);
    } catch (error) {
      setStatus([{ tone: 'danger', title: profileFailureMessage(error) }]);
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
      ? formatCount(copy.limitHint, LIMITS.skillList.maxItems)
      : cataloguePending
        ? copy.catalogueLoading
        : available.length === 0
          ? copy.nothingToAdd
          : undefined;
    return (
      <section className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{copyKeys[kind].heading}</h3>
        <div ref={boxRefs[kind]} className="mt-2 flex min-w-0 flex-wrap gap-2">
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
          ref={selectRefs[kind]}
          className="mt-3"
          label={copyKeys[kind].selectLabel}
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
          aria-disabled={atLimit || cataloguePending || pending ? true : undefined}
          onClick={() => onAdd(kind)}
        >
          {copy.add}
        </Button>
      </section>
    );
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      {catalogueError && catalogue === undefined ? (
        // §6.15: without the catalogue neither picker can offer a Skill, so the
        // card shows the generic sentence and one retry for the catalogue read.
        <div className="flex min-w-0 flex-col gap-3">
          <Banner tone="danger" title={profileErrorMessage(undefined)} />
          <Button variant="secondary" className="self-start" onClick={() => void refetchCatalogue()}>
            {profileCopy.me.retry}
          </Button>
        </div>
      ) : (
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
          {goalWillClear ? <Banner tone="warning" title={copy.goalWillClear} /> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pending}>
              {pending ? copy.saving : copy.save}
            </Button>
            {dirty ? <p className="text-sm text-ink-muted">{copy.unsaved}</p> : null}
          </div>
        </form>
      )}
    </Card>
  );
}
