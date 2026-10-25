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
import { useFriendControl } from '../social/FriendControl';
import { OwnProgressCard, ProgressCard } from '../progress/ProgressCard';

// The shape the API's ParseUUIDPipe accepts (§6.0.1). A malformed id is
// known here, so no request is sent for it and the console stays clean
// (§3.5.2, §3.8.2).
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// §6.5, §7.3: the link to this Student's page on `/messages`, where the
// composer sends. Never on the viewer's own profile, and never for a
// Removed Student, who can receive nothing (§4.6).
function DirectMessageControl({ student }: { student: StudentRef }): React.JSX.Element | null {
  const { t } = useI18n();
  const { data: session } = useQuery(sessionQueryOptions());
  const viewerId = session?.authenticated === true ? session.student.id : null;
  if (viewerId === null || viewerId === student.id || student.removed) return null;
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

// §6.4, §6.5, §12.2: a profile's actions, none on the viewer's own profile.
// First, each on a line of its own, what just happened and where things stand:
// the friend control's status and note, then the Block control's. Then one row:
// the friend request buttons and the Direct Message link, then Report and Block,
// together at the row's end, wrapping as one. Statuses and notes come before the
// buttons in the page as on screen, so reading and Tab follow the eye.
function ProfileActions({ student }: { student: StudentRef }): React.JSX.Element | null {
  const { data: session } = useQuery(sessionQueryOptions());
  const friend = useFriendControl(student);
  const block = useBlockControl(student);
  const viewerId = session?.authenticated === true ? session.student.id : null;
  const target = { studentId: student.id };
  // Report and the Direct Message link show to the same viewers.
  const reportable = canReport(viewerId, target, student);
  const hasRow = reportable || (friend !== null && friend.action !== null) || (block !== null && block.action !== null);
  if (friend === null && block === null && !hasRow) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {friend?.status}
      {friend?.note}
      {block?.status}
      {block?.note}
      {hasRow ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-3">
          {friend?.action}
          <DirectMessageControl student={student} />
          <div className="ms-auto flex min-w-0 flex-wrap items-center gap-2">
            <ReportControl target={target} student={student} />
            {block?.action}
          </div>
        </div>
      ) : null}
      {friend?.dialog}
      {block?.dialog}
    </div>
  );
}

// §6.2: the Student's non-removed Posts, newest first, with their Likes, 20
// a page (§6.0.1).
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

// §6.2, §4.6: any signed-in Student's profile. A Removed Student renders as
// the tombstone: the API's `displayName` is ignored, the avatar falls back
// to the bundled default, and no Skills, Goal, numbers or Posts show. A
// malformed id is answered here without a request; a 404 from the API is
// this page's not-found state; any other failure shows the generic sentence
// (§3.8.2, §6.15). Never an email.
export function StudentPage(): React.JSX.Element {
  const { t, personNameText } = useI18n();
  const copy = t.profile.student;
  const session = useQuery(sessionQueryOptions()).data;
  const { studentId } = useParams({ from: '/students/$studentId' });
  const wellFormedId = UUID_PATTERN.test(studentId);
  // The query is disabled for a malformed id: the not-found state below
  // answers it without a request.
  const { data, error, isError, refetch } = useQuery({
    ...studentQueryOptions(studentId),
    enabled: wellFormedId,
  });
  // The friend and Block controls read the viewer's own Friends, requests
  // and Blocks. Starting those reads beside the profile's, rather than once
  // the profile shows, keeps the controls from appearing late and moving the
  // page.
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
    // The name is not known yet; the brand title holds until it is, and the
    // page says it is loading instead of staying blank on a slow link.
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
              {/* §12.8: the Admin label, and never any other role. */}
              {student.isAdmin && !removed ? <RoleLabel /> : null}
            </h1>
          </div>
          {/* Keyed by the Student, so a status or an open dialog never
          carries over to the next profile. */}
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
