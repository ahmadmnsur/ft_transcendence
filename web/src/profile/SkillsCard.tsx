import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LIMITS } from '@shared/limits';
import { skillsQueryOptions, type SkillView } from '../api/profile';
import { Banner, Button, Card, Select, SkillChip, skillNameText } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';
import type { ProfileTarget } from './target';

type Kind = 'teach' | 'learn';

type Status = { kind: 'saved'; goalCleared: boolean } | { kind: 'failed'; code: unknown };

function sameIds(a: SkillView[], b: SkillView[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(b.map((skill) => skill.id));
  return a.every((skill) => ids.has(skill.id));
}

function inCatalogueOrder(list: SkillView[], catalogue: SkillView[] | undefined): SkillView[] {
  if (catalogue === undefined) return list;
  const rank = new Map(catalogue.map((skill, index) => [skill.id, index]));
  return [...list].sort((a, b) => (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size));
}

export function SkillsCard({ target }: { target: ProfileTarget }): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = target.voice === 'own' ? t.profile.skills : { ...t.profile.skills, ...t.admin.cards.skills };
  const profile = target.profile;
  const {
    data: catalogue,
    isError: catalogueError,
    isPending: cataloguePending,
    refetch: refetchCatalogue,
  } = useQuery(skillsQueryOptions());
  const [draft, setDraft] = useState<{ teach: SkillView[]; learn: SkillView[] } | null>(null);
  const [choice, setChoice] = useState<Record<Kind, string>>({ teach: '', learn: '' });
  const [choiceError, setChoiceError] = useState<Record<Kind, boolean>>({ teach: false, learn: false });
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ kind: Kind; chipIndex: number | null } | null>(null);
  const teachBoxRef = useRef<HTMLDivElement>(null);
  const learnBoxRef = useRef<HTMLDivElement>(null);
  const teachSelectRef = useRef<HTMLButtonElement>(null);
  const learnSelectRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const boxRefs: Record<Kind, React.RefObject<HTMLDivElement | null>> = {
    teach: teachBoxRef,
    learn: learnBoxRef,
  };
  const selectRefs: Record<Kind, React.RefObject<HTMLButtonElement | null>> = {
    teach: teachSelectRef,
    learn: learnSelectRef,
  };
  const copyKeys: Record<Kind, { heading: string; selectLabel: string; search: string }> = {
    teach: { heading: copy.teachHeading, selectLabel: copy.teachSelectLabel, search: copy.teachSearch },
    learn: { heading: copy.learnHeading, selectLabel: copy.learnSelectLabel, search: copy.learnSearch },
  };

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (focusRequest === null) return;
    const buttons = boxRefs[focusRequest.kind].current?.querySelectorAll('button');
    const chip = focusRequest.chipIndex === null ? undefined : buttons?.[focusRequest.chipIndex];
    (chip ?? selectRefs[focusRequest.kind].current)?.focus();
    setFocusRequest(null);
  }, [focusRequest]);

  if (profile === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={target.failed} reserveClassName="min-h-[30rem]" />
      </Card>
    );
  }

  const teach = draft?.teach ?? profile.skills.teach;
  const learn = draft?.learn ?? profile.skills.learn;

  const dirty = !(sameIds(teach, profile.skills.teach) && sameIds(learn, profile.skills.learn));
  const goalSkillId = profile.learningGoal?.skill.id;
  const goalWillClear = goalSkillId !== undefined && !learn.some((skill) => skill.id === goalSkillId);

  function listFor(kind: Kind): SkillView[] {
    return kind === 'teach' ? teach : learn;
  }

  function availableFor(kind: Kind): SkillView[] {
    const chosen = new Set(listFor(kind).map((skill) => skill.id));
    return (catalogue?.items ?? []).filter((skill) => !chosen.has(skill.id));
  }

  function onRemove(kind: Kind, id: string): void {
    if (pending) return;
    const index = listFor(kind).findIndex((skill) => skill.id === id);
    const next = listFor(kind).filter((skill) => skill.id !== id);
    setDraft({ teach: kind === 'teach' ? next : teach, learn: kind === 'learn' ? next : learn });
    setStatus(undefined);
    setFocusRequest({ kind, chipIndex: next.length === 0 ? null : Math.min(index, next.length - 1) });
  }

  function onAdd(kind: Kind): void {
    if (pending) return;
    if (listFor(kind).length >= LIMITS.skillList.maxItems) return;
    const chosen = choice[kind];
    if (chosen === '') {
      setChoiceError({ ...choiceError, [kind]: true });
      selectRefs[kind].current?.focus();
      return;
    }
    const skill = availableFor(kind).find((item) => item.id === chosen);
    if (skill === undefined) return;
    const next = [...listFor(kind), skill];
    setDraft({ teach: kind === 'teach' ? next : teach, learn: kind === 'learn' ? next : learn });
    setChoice({ ...choice, [kind]: '' });
    setChoiceError({ ...choiceError, [kind]: false });
    setStatus(undefined);
  }

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    setStatus(undefined);
    setPending(true);
    try {
      const result = await target.api.setSkills({
        teach: teach.map((skill) => skill.id),
        learn: learn.map((skill) => skill.id),
      });
      const skills = { teach: inCatalogueOrder(teach, catalogue?.items), learn: inCatalogueOrder(learn, catalogue?.items) };
      await target.apply(result.goalCleared ? { skills, learningGoal: null } : { skills });
      setDraft(null);
      target.reread();
      setStatus({ kind: 'saved', goalCleared: result.goalCleared });
    } catch (error) {
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setPending(false);
    }
  }

  function renderPicker(kind: Kind): React.JSX.Element {
    const list = listFor(kind);
    const available = availableFor(kind);
    const atLimit = list.length >= LIMITS.skillList.maxItems;
    const hint = atLimit
      ? format(copy.limitHint, { count: LIMITS.skillList.maxItems })
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
          error={choiceError[kind] ? copy.chooseFirst : undefined}
          options={available.map((skill) => ({ value: skill.id, label: skillNameText(skill.name) }))}
          value={choice[kind]}
          loading={cataloguePending}
          onValueChange={(skillId) => {
            setChoice({ ...choice, [kind]: skillId });
            setChoiceError({ ...choiceError, [kind]: false });
          }}
          placeholder={copy.selectPlaceholder}
          searchable
          searchPlaceholder={copyKeys[kind].search}
        />
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
        <div className="flex min-w-0 flex-col gap-3">
          <Banner tone="danger" title={t.errors.unknown} />
          <Button variant="secondary" className="self-start" onClick={() => void refetchCatalogue()}>
            {t.profile.me.retry}
          </Button>
        </div>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-5">
          {status !== undefined ? (
            <div ref={statusRef} tabIndex={-1} className="flex flex-col gap-2 rounded-lg focus-ring">
              {status.kind === 'failed' ? (
                <Banner tone="danger" title={errorText(status.code)} />
              ) : (
                <>
                  <Banner tone="success" title={copy.saved} />
                  {status.goalCleared ? <Banner tone="info" title={copy.goalCleared} /> : null}
                </>
              )}
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
