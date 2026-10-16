import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiProtocolError } from '../api/client';
import { studentQueryOptions, type SkillView } from '../api/profile';
import { AlertIcon, Avatar, Button, EmptyState, PersonName, RoleLabel, SkillChip } from '../design';
import { NotFoundPage, PageTitle } from '../layout';
import { formatNumber, isolateName, profileCopy, profileErrorMessage } from '../profile/messages';

const copy = profileCopy.student;
const stats = profileCopy.stats;

// The shape the API's ParseUUIDPipe accepts (§6.0.1). A malformed id is
// known here, so no request is sent for it and the console stays clean
// (§3.5.2, §3.8.2).
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One of a Student's two Skill lists, read-only: a chip without a remove
// button, or the sentence saying the list is empty.
function SkillSection({
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

// §6.2, §4.6: any signed-in Student's profile. A Removed Student renders as
// the tombstone: the API's `displayName` is ignored, the avatar falls back
// to the bundled default, and no Skills, Goal or numbers show. A malformed
// id is answered here without a request; a 404 from the API is this page's
// not-found state; any other failure shows the generic sentence (§3.8.2,
// §6.15). Never an email.
export function StudentPage(): React.JSX.Element {
  const { studentId } = useParams({ from: '/students/$studentId' });
  const wellFormedId = UUID_PATTERN.test(studentId);
  // The query is disabled for a malformed id: the not-found state below
  // answers it without a request.
  const { data, error, isError, refetch } = useQuery({
    ...studentQueryOptions(studentId),
    enabled: wellFormedId,
  });

  if (!wellFormedId) return <NotFoundPage />;

  if (data === undefined) {
    if (isError) {
      if (error instanceof ApiProtocolError && error.status === 404) return <NotFoundPage />;
      return (
        <>
          <PageTitle />
          <h1 className="sr-only">{profileErrorMessage(undefined)}</h1>
          <EmptyState
            icon={<AlertIcon size={24} />}
            title={profileErrorMessage(undefined)}
            action={
              <Button variant="secondary" onClick={() => void refetch()}>
                {copy.retry}
              </Button>
            }
          />
        </>
      );
    }
    // The name is not known yet; the brand title holds until it is.
    return <PageTitle />;
  }

  const { student, profile } = data;
  const removed = student.removed;
  const name = removed ? profileCopy.tombstone : student.displayName;

  return (
    <>
      <PageTitle name={isolateName(name)} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={removed ? null : student.avatarUrl} alt="" size="xl" />
          <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-2xl font-semibold text-ink">
            <PersonName name={name} />
            {/* §12.8: the Admin label, and never any other role. */}
            {student.isAdmin && !removed ? <RoleLabel /> : null}
          </h1>
        </div>
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
            <section className="min-w-0">
              <h2 className="text-base font-semibold text-ink">{copy.goalHeading}</h2>
              {profile.learningGoal === null ? (
                <p className="mt-2 text-sm text-ink-muted">{copy.goalNone}</p>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    <bdi>{profile.learningGoal.skill.name}</bdi>
                  </p>
                  <p dir="auto" className="text-sm text-ink wrap-anywhere">
                    {profile.learningGoal.text}
                  </p>
                </>
              )}
            </section>
            <dl className="grid min-w-0 grid-cols-3 gap-4 rounded-xl border border-line bg-surface p-4">
              <div className="min-w-0">
                <dt className="text-sm text-ink-muted">{stats.xp}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-ink">{formatNumber(profile.xp)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-ink-muted">{stats.level}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-ink">{formatNumber(profile.level)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-ink-muted">{stats.streak}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-ink">{formatNumber(profile.streak)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </>
  );
}
