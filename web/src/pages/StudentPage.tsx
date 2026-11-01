import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { blocksQueryOptions } from '../api/blocks';
import { studentPostsQueryOptions } from '../api/feed';
import { friendRequestsQueryOptions, friendsQueryOptions } from '../api/friends';
import { ApiProtocolError } from '../api/client';
import { sessionQueryOptions } from '../api/session';
import { studentQueryOptions, type StudentRef } from '../api/profile';
import {
  AlertIcon,
  Avatar,
  Button,
  EmptyState,
  PersonName,
  RoleLabel,
  buttonClasses,
} from '../design';
import { PostList } from '../feed/PostList';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { ReportControl, canReport } from '../moderation/ReportControl';
import { GoalSection, SkillSection } from '../profile/ProfileSections';
import { useBlockControl } from '../social/BlockControl';
import { useFriendControl } from '../social/useFriendControl';
import { OwnProgressCard, ProgressCard } from '../progress/ProgressCard';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function DirectMessageControl({ student }: { student: StudentRef }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <Link
      to="/messages/$peerId"
      params={{ peerId: student.id }}
      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
    >
      {t.messages.profile.messageLink}
    </Link>
  );
}

function ProfileActions({ student }: { student: StudentRef }): React.JSX.Element | null {
  const { data: session } = useQuery(sessionQueryOptions());
  const friend = useFriendControl(student);
  const block = useBlockControl(student);
  const viewerId = session?.authenticated === true ? session.student.id : null;
  const target = { studentId: student.id };
  const messageable = viewerId !== null && viewerId !== student.id && !student.removed;
  const reportable = canReport(viewerId, target, student);
  const hasLeadingActions = messageable || (friend !== null && friend.buttons !== null);
  const hasRow = hasLeadingActions || reportable || (block !== null && block.buttons !== null);
  if (friend === null && block === null && !hasRow) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {friend?.status}
      {friend?.note}
      {block?.status}
      {block?.note}
      {hasRow ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-3">
          {friend?.buttons}
          {messageable ? <DirectMessageControl student={student} /> : null}
          <div className={`flex min-w-0 flex-wrap items-center gap-2${hasLeadingActions ? ' ms-auto' : ''}`}>
            <ReportControl target={target} student={student} />
            {block?.buttons}
          </div>
        </div>
      ) : null}
      {friend?.dialog}
      {block?.dialog}
    </div>
  );
}

function StudentPosts({ studentId }: { studentId: string }): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.feed.profile;
  const { page: requestedPage } = useSearch({ from: '/students/$studentId' });
  const navigate = useNavigate({ from: '/students/$studentId' });
  const page = requestedPage ?? 1;
  const posts = useQuery(studentPostsQueryOptions(studentId, page));
  return (
    <section className="min-w-0">
      <h2 className="mb-3 text-base font-semibold text-ink">{copy.heading}</h2>
      <PostList
        query={posts}
        page={page}
        onPageChange={(next, replace) => void navigate({ search: { page: next > 1 ? next : undefined }, replace })}
        label={copy.pages}
        empty={<p className="text-sm text-ink-muted">{copy.empty}</p>}
      />
    </section>
  );
}

export function StudentPage(): React.JSX.Element {
  const { t, personNameText } = useI18n();
  const copy = t.profile.student;
  const session = useQuery(sessionQueryOptions()).data;
  const { studentId } = useParams({ from: '/students/$studentId' });
  const wellFormedId = UUID_PATTERN.test(studentId);
  const { data, error, isError, refetch } = useQuery({
    ...studentQueryOptions(studentId),
    enabled: wellFormedId,
  });
  useQuery({ ...blocksQueryOptions(), enabled: wellFormedId });
  useQuery({ ...friendsQueryOptions(), enabled: wellFormedId });
  useQuery({ ...friendRequestsQueryOptions(), enabled: wellFormedId });

  if (!wellFormedId) return <NotFoundPage />;

  if (data === undefined) {
    if (isError) {
      if (error instanceof ApiProtocolError && error.status === 404) return <NotFoundPage />;
      return (
        <>
          <PageTitle />
          <h1 className="sr-only">{t.errors.unknown}</h1>
          <EmptyState
            icon={<AlertIcon size={24} />}
            title={t.errors.unknown}
            action={
              <Button variant="secondary" onClick={() => void refetch()}>
                {copy.retry}
              </Button>
            }
          />
        </>
      );
    }
    return (
      <>
        <PageTitle />
        <p aria-busy="true" className="mx-auto w-full max-w-2xl text-sm text-ink-muted">
          {copy.loading}
        </p>
      </>
    );
  }

  const { student, profile } = data;
  const removed = student.removed;

  return (
    <>
      <PageTitle name={personNameText(student.displayName, removed)} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex min-w-0 flex-col gap-4 border-b border-line pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar src={removed ? null : student.avatarUrl} alt="" size="xl" />
            <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-2xl font-semibold text-ink wrap-anywhere">
              <PersonName name={student.displayName} removed={removed} />
              {student.isAdmin && !removed ? <RoleLabel /> : null}
            </h1>
          </div>
          <ProfileActions key={student.id} student={student} />
        </header>
        {removed || profile === null ? (
          <p className="text-sm text-ink-muted">{copy.removedNote}</p>
        ) : (
          <>
            <SkillSection
              title={copy.teachHeading}
              empty={copy.teachEmpty}
              variant="teach"
              skills={profile.skills.teach}
            />
            <SkillSection
              title={copy.learnHeading}
              empty={copy.learnEmpty}
              variant="learn"
              skills={profile.skills.learn}
            />
            <GoalSection title={copy.goalHeading} empty={copy.goalNone} goal={profile.learningGoal} />
            {session?.authenticated && session.student.id === student.id ? <OwnProgressCard /> : <ProgressCard progress={profile} />}
            <StudentPosts key={student.id} studentId={student.id} />
          </>
        )}
      </div>
    </>
  );
}
