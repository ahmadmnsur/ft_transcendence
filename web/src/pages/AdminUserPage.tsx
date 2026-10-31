import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { ROLES, type Role } from '@shared/roles';
import { isUuid } from '@shared/uuid';
import {
  adminStudentQueryOptions,
  changeStudentRole,
  sanctionStudent,
  type AdminStudentDetail,
  type AdminStudentMatch,
  type Sanction,
} from '../api/admin-students';
import { ApiProtocolError } from '../api/client';
import { sessionQueryOptions } from '../api/session';
import { AlertIcon, Avatar, Banner, Button, Card, DataTable, EmptyState, Modal, PersonName, Select } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { MatchStatusLabel } from '../matching/MatchParts';
import { AvatarCard } from '../profile/AvatarCard';
import { failureCode } from '../profile/failure';
import { LearningGoalCard } from '../profile/LearningGoalCard';
import { ProfileDetailsCard } from '../profile/ProfileDetailsCard';
import { GoalSection, SkillSection } from '../profile/ProfileSections';
import { SkillsCard } from '../profile/SkillsCard';
import { StudentLink } from '../profile/StudentLink';
import { useStudentProfileTarget } from '../profile/target';
import { ProgressCard } from '../progress/ProgressCard';

type RoleStatus = { kind: 'changed'; role: Role } | { kind: 'failed'; code: unknown };

function RoleCard({
  student,
  self,
  onRemoved,
}: {
  student: AdminStudentDetail;
  self: boolean;
  onRemoved: () => void;
}): React.JSX.Element {
  const { t, formatText, personNameValue, errorText } = useI18n();
  const copy = t.admin.user.role;
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<Role>(student.role);
  const [unchanged, setUnchanged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<RoleStatus | undefined>(undefined);
  const selectRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  if (self) {
    return (
      <Card title={copy.title} headingLevel={2}>
        <p className="text-sm text-ink-muted">{copy.self}</p>
      </Card>
    );
  }

  const consequence =
    choice === 'ADMIN'
      ? copy.confirm.toAdmin
      : student.role === 'ADMIN'
        ? choice === 'PEER_MODERATOR'
          ? `${copy.confirm.fromAdmin} ${copy.confirm.toModerator}`
          : copy.confirm.fromAdmin
        : choice === 'PEER_MODERATOR'
          ? copy.confirm.toModerator
          : copy.confirm.toStudent;

  function onSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (pending) return;
    setStatus(undefined);
    if (choice === student.role) {
      setUnchanged(true);
      selectRef.current?.focus();
      return;
    }
    setConfirming(true);
  }

  async function onConfirm(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await changeStudentRole(queryClient, student.id, choice);
      setStatus({ kind: 'changed', role: choice });
    } catch (error) {
      const code = failureCode(error);
      setStatus({ kind: 'failed', code });
      if (code === 'student_removed') onRemoved();
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'changed' ? (
              <Banner tone="success" title={formatText(copy.changed, { role: t.admin.roles[status.role] })} />
            ) : (
              <Banner tone="danger" title={errorText(status.code)} />
            )}
          </div>
        ) : null}
        <Select
          ref={selectRef}
          label={copy.label}
          options={ROLES.map((role) => ({ value: role, label: t.admin.roles[role] }))}
          value={choice}
          error={unchanged ? copy.unchanged : undefined}
          onValueChange={(next) => {
            setChoice(ROLES.find((role) => role === next) ?? student.role);
            setUnchanged(false);
          }}
        />
        <Button type="submit" variant="secondary" loading={pending} className="self-start">
          {pending ? copy.submitting : copy.submit}
        </Button>
      </form>
      <Modal
        open={confirming}
        size="sm"
        title={formatText(copy.confirm.title, {
          name: personNameValue(student.displayName, false),
          role: t.admin.roles[choice],
        })}
        description={consequence}
        onClose={() => {
          if (!pending) setConfirming(false);
        }}
        initialFocusRef={cancelRef}
        footer={
          <>
            <Button
              ref={cancelRef}
              variant="secondary"
              onClick={() => {
                if (!pending) setConfirming(false);
              }}
            >
              {copy.confirm.cancel}
            </Button>
            <Button loading={pending} onClick={() => void onConfirm()}>
              {pending ? copy.submitting : copy.confirm.confirm}
            </Button>
          </>
        }
      />
    </Card>
  );
}

type SanctionStatus = { kind: 'done'; action: Exclude<Sanction, 'remove'> } | { kind: 'failed'; code: unknown };

function SanctionsCard({
  student,
  self,
  onRemoved,
}: {
  student: AdminStudentDetail;
  self: boolean;
  onRemoved: () => void;
}): React.JSX.Element {
  const { t, formatText, personNameValue, errorText } = useI18n();
  const copy = t.admin.user.sanctions;
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Sanction>('suspend');
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<SanctionStatus | undefined>(undefined);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  if (self) {
    return (
      <Card title={copy.title} headingLevel={2}>
        <p className="text-sm text-ink-muted">{copy.self}</p>
      </Card>
    );
  }

  const name = personNameValue(student.displayName, false);
  const admin = student.role === 'ADMIN';
  const dialog = {
    suspend: {
      title: copy.confirm.suspendTitle,
      body: admin ? copy.confirm.suspendAdminBody : copy.confirm.suspendBody,
      confirm: copy.suspend,
    },
    reinstate: {
      title: copy.confirm.reinstateTitle,
      body: admin ? copy.confirm.reinstateAdminBody : copy.confirm.reinstateBody,
      confirm: copy.reinstate,
    },
    remove: {
      title: copy.confirm.removeTitle,
      body: formatText(copy.confirm.removeBody, { tombstone: t.people.tombstone }),
      confirm: copy.remove,
    },
  };
  const asked = dialog[action];

  function ask(next: Sanction): void {
    if (pending) return;
    setStatus(undefined);
    setAction(next);
    setConfirming(true);
  }

  async function onConfirm(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await sanctionStudent(queryClient, student.id, action);
      if (action === 'remove') onRemoved();
      else setStatus({ kind: 'done', action });
    } catch (error) {
      const code = failureCode(error);
      setStatus({ kind: 'failed', code });
      if (code === 'student_removed') onRemoved();
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <div className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'done' ? (
              <Banner tone="success" title={status.action === 'suspend' ? copy.suspended : copy.reinstated} />
            ) : (
              <Banner tone="danger" title={errorText(status.code)} />
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {student.status === 'SUSPENDED' ? (
            <Button variant="secondary" onClick={() => ask('reinstate')}>
              {copy.reinstate}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => ask('suspend')}>
              {copy.suspend}
            </Button>
          )}
          <Button variant="danger" onClick={() => ask('remove')}>
            {copy.remove}
          </Button>
        </div>
      </div>
      <Modal
        open={confirming}
        size="sm"
        title={formatText(asked.title, { name })}
        description={asked.body}
        onClose={() => {
          if (!pending) setConfirming(false);
        }}
        initialFocusRef={cancelRef}
        footer={
          <>
            <Button
              ref={cancelRef}
              variant="secondary"
              onClick={() => {
                if (!pending) setConfirming(false);
              }}
            >
              {copy.confirm.cancel}
            </Button>
            <Button variant={action === 'reinstate' ? 'primary' : 'danger'} loading={pending} onClick={() => void onConfirm()}>
              {pending ? copy.working : asked.confirm}
            </Button>
          </>
        }
      />
    </Card>
  );
}

const column = createColumnHelper<AdminStudentMatch>();

function MatchesCard({ student }: { student: AdminStudentDetail }): React.JSX.Element {
  const { t, formatText, formatNumber } = useI18n();
  const copy = t.admin.user.matches;
  const columns = useMemo(
    () => [
      column.accessor('roundNumber', {
        header: copy.columns.round,
        enableSorting: false,
        meta: { align: 'end' },
        cell: (info) => formatNumber(info.getValue()),
      }),
      column.display({
        id: 'role',
        header: copy.columns.role,
        cell: ({ row }) =>
          row.original.mentor.id === student.id ? t.matching.match.mentorLabel : t.matching.match.menteeLabel,
      }),
      column.display({
        id: 'partner',
        header: copy.columns.partner,
        cell: ({ row }) => (
          <StudentLink student={row.original.mentor.id === student.id ? row.original.mentee : row.original.mentor} />
        ),
      }),
      column.display({
        id: 'status',
        header: copy.columns.status,
        cell: ({ row }) => (
          <span className="flex flex-col items-start gap-1">
            <MatchStatusLabel status={row.original.status} />
            {row.original.handMade ? (
              <span className="text-xs text-ink-muted">{t.matching.match.handMade}</span>
            ) : null}
          </span>
        ),
      }),
      column.display({
        id: 'view',
        header: () => (
          <span className="relative">
            <span className="sr-only">{copy.view}</span>
          </span>
        ),
        cell: ({ row }) => (
          <Link
            to="/admin/matches/$matchId"
            params={{ matchId: row.original.id }}
            aria-label={formatText(copy.viewNamed, { number: row.original.roundNumber })}
            className="rounded font-medium text-link underline-offset-2 hover:underline focus-ring"
          >
            {copy.view}
          </Link>
        ),
      }),
    ],
    [copy, t, formatText, formatNumber, student.id],
  );

  return (
    <Card title={copy.title} headingLevel={2}>
      <DataTable
        data={student.matches}
        columns={columns}
        getRowId={(row) => row.id}
        total={student.matches.length}
        page={1}
        pageSize={Math.max(student.matches.length, 1)}
        sorting={[]}
        onSortingChange={() => undefined}
        onPageChange={() => undefined}
        caption={copy.caption}
        emptyTitle={copy.emptyTitle}
      />
    </Card>
  );
}

function AdminUser({ studentId }: { studentId: string }): React.JSX.Element {
  const { t, personNameText, errorText } = useI18n();
  const copy = t.admin.user;
  const detail = useQuery(adminStudentQueryOptions(studentId));
  const target = useStudentProfileTarget(studentId);
  const session = useQuery(sessionQueryOptions());
  const [justRemoved, setJustRemoved] = useState(false);
  const removedRef = useRef<HTMLDivElement>(null);
  const removed = detail.data?.status === 'REMOVED';

  useEffect(() => {
    if (justRemoved && removed) removedRef.current?.focus();
  }, [justRemoved, removed]);

  const data = detail.data;
  if (data === undefined) {
    if (detail.isError && detail.error instanceof ApiProtocolError && detail.error.status === 404) {
      return <NotFoundPage />;
    }
    return (
      <>
        <PageTitle name={t.admin.users.title} />
        {detail.isError ? (
          <>
            <h1 className="sr-only">{errorText(failureCode(detail.error))}</h1>
            <EmptyState
              icon={<AlertIcon size={24} />}
              title={errorText(failureCode(detail.error))}
              action={
                <Button variant="secondary" onClick={() => void detail.refetch()}>
                  {copy.retry}
                </Button>
              }
            />
          </>
        ) : (
          <p aria-busy="true" className="text-sm text-ink-muted">
            {copy.loading}
          </p>
        )}
      </>
    );
  }

  const self = session.data?.authenticated === true && session.data.student.id === data.id;
  const profileCopy = t.profile.student;

  return (
    <>
      <PageTitle name={personNameText(data.displayName, false)} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={data.avatarUrl} alt="" size="xl" />
          <h1 className="min-w-0 text-2xl font-semibold text-ink wrap-anywhere">
            <PersonName name={data.displayName} removed={false} />
          </h1>
        </div>
        <dl className="grid min-w-0 grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-muted">{copy.emailLabel}</dt>
          <dd className="min-w-0 text-ink">
            <bdi dir="ltr" className="wrap-anywhere">
              {data.email}
            </bdi>
          </dd>
          <dt className="text-ink-muted">{copy.roleLabel}</dt>
          <dd className="text-ink">{t.admin.roles[data.role]}</dd>
          <dt className="text-ink-muted">{copy.statusLabel}</dt>
          <dd className="text-ink">{t.admin.statuses[data.status]}</dd>
        </dl>
        {removed ? (
          <div ref={removedRef} tabIndex={-1} className="rounded-lg focus-ring">
            <Banner tone="info" title={copy.removedNote} />
          </div>
        ) : (
          <>
            {data.status === 'SUSPENDED' ? <Banner tone="warning" title={copy.suspendedNote} /> : null}
            <Link
              to="/students/$studentId"
              params={{ studentId: data.id }}
              className="self-start rounded text-sm text-link underline underline-offset-2 focus-ring"
            >
              {copy.publicProfileLink}
            </Link>
            <RoleCard key={data.id} student={data} self={self} onRemoved={() => setJustRemoved(true)} />
            <SanctionsCard key={`${data.id}-sanctions`} student={data} self={self} onRemoved={() => setJustRemoved(true)} />
            <AvatarCard target={target} />
            <ProfileDetailsCard target={target} />
            <SkillsCard target={target} />
            <LearningGoalCard target={target} />
          </>
        )}
        {removed ? (
          <>
            <SkillSection
              title={profileCopy.teachHeading}
              empty={profileCopy.teachEmpty}
              variant="teach"
              skills={data.skills.teach}
            />
            <SkillSection
              title={profileCopy.learnHeading}
              empty={profileCopy.learnEmpty}
              variant="learn"
              skills={data.skills.learn}
            />
            <GoalSection title={profileCopy.goalHeading} empty={profileCopy.goalNone} goal={data.learningGoal} />
          </>
        ) : null}
        <ProgressCard progress={data} />
        <MatchesCard student={data} />
        <Link to="/admin/users" className="self-start rounded text-link underline underline-offset-2 focus-ring">
          {copy.usersLink}
        </Link>
      </div>
    </>
  );
}

export function AdminUserPage(): React.JSX.Element {
  const { studentId } = useParams({ from: '/admin/users/$studentId' });
  if (!isUuid(studentId)) return <NotFoundPage />;
  const lowerStudentId = studentId.toLowerCase();
  return <AdminUser key={lowerStudentId} studentId={lowerStudentId} />;
}
