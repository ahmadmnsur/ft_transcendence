import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LIMITS } from '@shared/limits';
import { Checkbox, ChevronDownIcon, Select, SkillName, buttonClasses, skillNameText } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { ScoreDetails } from '../matching/MatchParts';

// Names from the Skill catalogue (§14.1), written here because a signed-out
// page reads nothing from the database (§3.5.1's note of 2026-10-25). Skill
// names are never translated.
const EXAMPLE_SKILLS = ['C', 'C++', 'Docker', 'Git', 'Makefile', 'Networking', 'React', 'Shell', 'SQL', 'Threads', 'TypeScript', 'Valgrind'];

// The example Match's Score, by §8.2: the invented Mentor teaches the Skill
// picked to learn (f = 1) and wants the one picked to teach (r = 1), which is
// 50; when the first is the Mentee's Learning Goal, 10 more. The invented
// Mentor has no Learning Goal, so without the visitor's the two ways round
// tie (§8.3 step 4).
const SCORE_WITHOUT_GOAL = 50;
const SCORE_WITH_GOAL = 60;
// §8.2: a Score is at most 100.
const SCORE_MAX = 100;
const EXAMPLE_ROUND = 4;
// How long the picks must stay still before the change is read out: arrow
// keys on a closed select change it once per option.
const SETTLE_MS = 700;

const BADGES = ['FIRST_MENTOR', 'KNOWLEDGE_SHARER', 'CONSISTENT_LEARNER'] as const;

const sectionHeading = 'text-2xl font-semibold text-balance text-ink sm:text-3xl';

// One blank of the opening sentence, as wide as the Skill it shows: the
// name is drawn as text, and a transparent native select lies over it, so
// the keyboard, a screen reader and a phone's picker get the real control.
// The drawn name is hidden from assistive technology: the heading's
// accessible name already reads the select's chosen option. A new name
// fades in, so a blank the other one changed shows that it moved. A name
// wider than the line, with the text enlarged, breaks inside the blank
// rather than pushing the page sideways.
function SkillBlank({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (skill: string) => void;
}): React.JSX.Element {
  return (
    <Select
      label={label}
      options={options.map((skill) => ({ value: skill, label: skillNameText(skill) }))}
      value={value}
      onValueChange={onChange}
      trigger={{
        className:
          'inline-flex max-w-full cursor-pointer items-center border-b-4 border-primary-500 px-0.5 text-primary-700 transition-colors duration-150 hover:border-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-expanded:border-primary-700 aria-expanded:bg-primary-50',
        children: (
          <>
            <SkillName
              key={value}
              name={value}
              className="min-w-0 transition-opacity duration-300 ease-out wrap-anywhere starting:opacity-0 motion-reduce:transition-none"
            />
            <ChevronDownIcon size="0.5em" strokeWidth={2.5} className="ms-[0.15em] text-primary-500" />
          </>
        ),
      }}
    />
  );
}

// A sentence that settles in when its Skill changes; the others stay still.
const settling = 'block transition-[opacity,translate] duration-300 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none';

// The example Match the two blanks make, in the words a real Match uses
// (§8.11): the Score with its sentences, the Mission, the reader's role and
// why the Match runs in that direction. The Learning Goal is the one input
// that moves the Score.
function ExampleMatch({ learn, teach }: { learn: string; teach: string }): React.JSX.Element {
  const { t, format, formatText } = useI18n();
  const copy = t.landing.example;
  const pair = t.matching.pair;
  const partner = copy.partner;
  const [goal, setGoal] = useState(true);
  const score = goal ? SCORE_WITH_GOAL : SCORE_WITHOUT_GOAL;

  // What the polite region reads: only the part that changed, once the
  // picks have settled, so a screen reader hears one update, not a queue.
  // It reads the picks as they were when they settled, never the ones
  // still changing, so a later run of arrow keys waits for its own pause.
  const [news, setNews] = useState<{ learn: string; teach: string; goal: boolean; skills: boolean; goalChanged: boolean } | null>(null);
  const heard = useRef({ learn, teach, goal });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const before = heard.current;
      heard.current = { learn, teach, goal };
      const skills = before.learn !== learn || before.teach !== teach;
      const goalChanged = before.goal !== goal;
      if (skills || goalChanged) setNews({ learn, teach, goal, skills, goalChanged });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [learn, teach, goal]);

  const teachesText = (skill: string): React.JSX.Element => format(pair.partnerTeachesYou, { partner, skills: skill });
  const taughtText = (skill: string): React.JSX.Element => format(pair.youTeachPartner, { partner, skills: skill });
  const whyText = (withGoal: boolean): React.ReactNode => (withGoal ? format(copy.mentorWhy, { partner }) : copy.mentorTie);
  const teaches = teachesText(learn);
  const taught = taughtText(teach);
  const why = whyText(goal);

  return (
    <section
      aria-labelledby="landing-example"
      className="relative max-w-3xl min-w-0 rounded-xl border border-line bg-surface px-5 pt-8 pb-5 shadow-sm sm:px-7 sm:pb-6"
    >
      <p
        aria-hidden="true"
        className="absolute -top-3 start-5 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-900 sm:start-7"
      >
        {copy.label}
      </p>
      <h2 id="landing-example" aria-label={formatText(copy.heading, { number: EXAMPLE_ROUND })} className="text-xl font-semibold text-ink">
        {format(copy.title, { number: EXAMPLE_ROUND })}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{pair.youAreMentee}</p>
      <dl className="mt-5 grid gap-6 sm:grid-cols-2">
        <ScoreDetails
          score={score}
          sentences={[
            <span key={learn} className={settling}>
              {teaches}
            </span>,
            <span key={teach} className={settling}>
              {taught}
            </span>,
            ...(goal ? [<span key="goal" className={settling}>{pair.goalYours}</span>] : []),
          ]}
        />
        <div className="min-w-0">
          <dt className="text-sm text-ink-muted">{t.matching.match.missionLabel}</dt>
          <dd className="mt-1 font-medium text-pretty text-ink">{t.matching.missions.PAIR_PROGRAMMING}</dd>
        </div>
      </dl>
      <Checkbox
        className="mt-6"
        label={formatText(copy.goalLabel, { skill: learn })}
        checked={goal}
        onChange={(event) => setGoal(event.target.checked)}
      />
      <p className="mt-4 border-t border-line pt-4 text-sm text-pretty text-ink-muted">{why}</p>
      <p aria-live="polite" className="sr-only">
        {news?.skills ? (
          <>
            <span>{teachesText(news.learn)}</span> <span>{taughtText(news.teach)}</span>
          </>
        ) : null}
        {news?.goalChanged ? (
          <>
            {' '}
            <span>{format(t.matching.match.scoreValue, { score: news.goal ? SCORE_WITH_GOAL : SCORE_WITHOUT_GOAL, max: SCORE_MAX })}</span>{' '}
            <span>{whyText(news.goal)}</span>
          </>
        ) : null}
      </p>
    </section>
  );
}

// The way in: one action, and the sign-in for those who already have an
// account, as the sign-up page offers it.
function WayIn({ className = '' }: { className?: string }): React.JSX.Element {
  const { t, format } = useI18n();
  return (
    <div className={`flex flex-col items-start gap-3 ${className}`.trim()}>
      <Link to="/sign-up" className={`w-full text-center wrap-anywhere sm:w-auto lg:w-full ${buttonClasses({ variant: 'primary', size: 'lg' })}`}>
        {t.landing.signUp}
      </Link>
      <p className="text-sm text-ink-muted">
        {format(t.auth.signUp.haveAccount, {
          link: (
            <Link to="/sign-in" className="rounded text-link underline underline-offset-2 focus-ring">
              {t.auth.signUp.signInLink}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

// `/` for a signed-out visitor (§3.5.1's note of 2026-10-25): the question
// every Student answers, the example Match it makes, then the Round, the
// Review, the Reflection Prompts and the XP, and the way in. It reads nothing
// from the database: every example is marked as one.
export function LandingPage(): React.JSX.Element {
  const { t, format, formatNumber } = useI18n();
  const copy = t.landing;
  const [learn, setLearn] = useState('Docker');
  const [teach, setTeach] = useState('C');

  // The teach blank never offers the Skill picked to learn: picking that one
  // to learn hands the old learn pick to the teach blank.
  function onLearn(skill: string): void {
    if (skill === teach) setTeach(learn);
    setLearn(skill);
  }

  const steps = [
    { title: copy.round.skillsTitle, body: copy.round.skillsBody },
    { title: copy.round.matchTitle, body: copy.round.matchBody },
    { title: copy.round.meetTitle, body: copy.round.meetBody },
    { title: copy.round.reviewTitle, body: copy.round.reviewBody },
  ];
  const parts = [
    { term: t.reviews.outcome, body: copy.review.outcomeBody },
    {
      term: t.reviews.feedback,
      body: format(copy.review.feedbackBody, { min: LIMITS.privateFeedback.ratingMin, max: LIMITS.privateFeedback.ratingMax }),
    },
    { term: t.reviews.takeaway, body: copy.review.takeawayBody },
  ];

  return (
    <>
      <PageTitle />
      <div className="flex flex-col gap-20 sm:gap-28">
        <section aria-labelledby="landing-question" className="pt-2 sm:pt-10">
          {/* The display line extends the type scale's 1.2 steps past 3xl, from
          3xl on a phone to the sixth step at full width. */}
          <h1
            id="landing-question"
            className="max-w-5xl text-[length:clamp(1.944rem,1.1rem+3vw,3.36rem)] leading-[1.14] font-semibold tracking-tight text-balance text-ink arabic:tracking-normal"
          >
            {format(copy.question, {
              learn: <SkillBlank label={copy.learnLabel} value={learn} options={EXAMPLE_SKILLS} onChange={onLearn} />,
              teach: (
                <SkillBlank
                  label={copy.teachLabel}
                  value={teach}
                  options={EXAMPLE_SKILLS.filter((skill) => skill !== learn)}
                  onChange={setTeach}
                />
              ),
            })}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-pretty text-ink-muted">{copy.lead}</p>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
            <WayIn className="lg:pt-4" />
            <ExampleMatch learn={learn} teach={teach} />
          </div>
        </section>

        <section aria-labelledby="landing-round">
          <h2 id="landing-round" className={sectionHeading}>
            {copy.round.heading}
          </h2>
          <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="min-w-0 border-t-2 border-primary-600 pt-4">
                <h3 className="text-lg font-semibold text-ink">
                  <span aria-hidden="true" className="me-2 text-primary-700 tabular-nums">
                    {formatNumber(index + 1)}
                  </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-pretty text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="landing-review" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="min-w-0">
            <h2 id="landing-review" className={sectionHeading}>
              {copy.review.heading}
            </h2>
            <p className="mt-3 text-pretty text-ink-muted">{copy.review.intro}</p>
          </div>
          <dl className="grid min-w-0 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {parts.map((part) => (
              <div key={part.term} className="grid gap-1 bg-surface px-5 py-5 wrap-anywhere sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
                <dt className="font-semibold text-ink">{part.term}</dt>
                <dd className="text-pretty text-ink-muted">{part.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="landing-prompts" className="rounded-2xl bg-primary-800 px-5 py-10 text-white sm:px-10 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-0">
            <div className="min-w-0 lg:pe-12">
              <h2 id="landing-prompts" className="text-2xl font-semibold text-balance sm:text-3xl">
                {copy.prompts.heading}
              </h2>
              <p className="mt-4 text-lg text-pretty text-primary-100">{copy.prompts.body}</p>
            </div>
            <figure className="min-w-0 border-t border-primary-600 pt-8 lg:border-t-0 lg:border-s lg:ps-12 lg:pt-0">
              <p className="text-2xl font-semibold text-balance sm:text-3xl">{copy.prompts.exampleQuestion}</p>
              <figcaption className="mt-4 text-sm font-medium text-primary-200">{copy.prompts.exampleLabel}</figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="landing-grow" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="min-w-0">
            <h2 id="landing-grow" className={sectionHeading}>
              {copy.grow.heading}
            </h2>
            <p className="mt-3 text-pretty text-ink-muted">{copy.grow.body}</p>
          </div>
          <ul className="flex min-w-0 flex-col">
            {BADGES.map((badge) => (
              <li key={badge} className="border-t border-line py-5 first:border-t-0 first:pt-1">
                <h3 className="text-lg font-semibold text-ink">{t.progress.badgeNames[badge]}</h3>
                <p className="mt-1 max-w-prose text-pretty text-ink-muted">{copy.grow.badges[badge]}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="landing-close"
          className="flex flex-col gap-6 border-t border-line pt-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16"
        >
          <div className="max-w-2xl min-w-0">
            <h2 id="landing-close" className={sectionHeading}>
              {copy.close.heading}
            </h2>
            <p className="mt-3 text-pretty text-ink-muted">{copy.close.body}</p>
          </div>
          <WayIn className="lg:shrink-0 lg:items-end" />
        </section>
      </div>
    </>
  );
}
