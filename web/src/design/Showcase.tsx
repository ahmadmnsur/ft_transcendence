import { useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { Avatar } from './components/Avatar';
import { Banner } from './components/Banner';
import { Button } from './components/Button';
import { buttonClasses } from './components/buttonClasses';
import { Card } from './components/Card';
import { Checkbox } from './components/Checkbox';
import { DataTable } from './components/DataTable';
import { EmptyState } from './components/EmptyState';
import { FileDrop, type StoredFile } from './components/FileDrop';
import { IconButton } from './components/IconButton';
import { Modal } from './components/Modal';
import { Pagination } from './components/Pagination';
import { ProgressBar } from './components/ProgressBar';
import { RoleLabel } from './components/RoleLabel';
import { Select } from './components/Select';
import { SkillChip } from './components/SkillChip';
import { Tabs } from './components/Tabs';
import { TextArea } from './components/TextArea';
import { TextField } from './components/TextField';
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FileIcon,
  FlagIcon,
  InfoIcon,
  MessageIcon,
  SearchIcon,
  SortAscIcon,
  SortDescIcon,
  SortIcon,
  StarIcon,
  TrophyIcon,
  UploadIcon,
  UserIcon,
} from './icons';

const hues = ['primary', 'neutral', 'success', 'warning', 'danger'] as const;
const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
const roles = [
  'canvas',
  'surface',
  'surface-muted',
  'surface-sunken',
  'line',
  'line-strong',
  'ink',
  'ink-muted',
  'ink-subtle',
  'ink-danger',
  'link',
  'focus',
] as const;

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const full =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const r = channel(parseInt(full.slice(1, 3), 16));
  const g = channel(parseInt(full.slice(3, 5), 16));
  const b = channel(parseInt(full.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first: string, second: string): number {
  const high = Math.max(luminance(first), luminance(second));
  const low = Math.min(luminance(first), luminance(second));
  return (high + 0.05) / (low + 0.05);
}

// White or the palette ink, whichever reads better; black only on the few
// mid-tones where neither reaches AA. All three are read from the theme.
function swatchText(hex: string): string {
  const white = themeHex('white');
  const ink = themeHex('neutral', '900');
  const whiteContrast = contrast(white, hex);
  const inkContrast = contrast(ink, hex);
  if (whiteContrast >= inkContrast && whiteContrast >= 4.5) return 'text-white';
  if (inkContrast >= 4.5) return 'text-neutral-900';
  return 'text-black';
}

// The theme is the only source: values are read back from the built CSS.
function themeHex(hue: string, step?: string): string {
  const name = step === undefined ? `--color-${hue}` : `--color-${hue}-${step}`;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const iconEntries: Array<[string, ReactNode]> = [
  ['Close', <CloseIcon key="close" />],
  ['ChevronLeft', <ChevronLeftIcon key="chl" />],
  ['ChevronRight', <ChevronRightIcon key="chr" />],
  ['ChevronDown', <ChevronDownIcon key="chd" />],
  ['Sort', <SortIcon key="sort" />],
  ['SortAsc', <SortAscIcon key="asc" />],
  ['SortDesc', <SortDescIcon key="desc" />],
  ['Upload', <UploadIcon key="up" />],
  ['File', <FileIcon key="file" />],
  ['Check', <CheckIcon key="check" />],
  ['Alert', <AlertIcon key="alert" />],
  ['Info', <InfoIcon key="info" />],
  ['Search', <SearchIcon key="search" />],
  ['User', <UserIcon key="user" />],
  ['Message', <MessageIcon key="msg" />],
  ['Star', <StarIcon key="star" />],
  ['Trophy', <TrophyIcon key="trophy" />],
  ['Flag', <FlagIcon key="flag" />],
];

// The palette step a role token points at, found by its value.
function roleStep(role: string): string {
  const hex = themeHex(role);
  if (hex === themeHex('white')) return 'white';
  for (const hue of hues) {
    const step = steps.find((candidate) => themeHex(hue, candidate) === hex);
    if (step) return `${hue}-${step}`;
  }
  return hex;
}

const evidenceOnServer: StoredFile = { name: 'learning-outcome.pdf', type: 'application/pdf', size: 1_340_000 };

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section id={id} className="min-w-0 border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-xl font-semibold text-ink">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

interface StudentRow {
  id: string;
  name: string;
  skill: string;
  xp: number;
  level: number;
}

const sampleRows: Array<StudentRow> = [
  { id: 'amina', name: 'Amina Haddad', skill: 'C', xp: 1240, level: 5 },
  { id: 'jonas', name: 'Jonas Weber', skill: 'TypeScript', xp: 980, level: 4 },
  { id: 'lina', name: 'Lina Farouk', skill: 'Python', xp: 1560, level: 7 },
  { id: 'marco', name: 'Marco Silva', skill: 'Rust', xp: 420, level: 2 },
  { id: 'sara', name: 'Sara Nasser', skill: 'Docker', xp: 2100, level: 9 },
  { id: 'tom', name: 'Tom Becker', skill: 'SQL', xp: 760, level: 4 },
  { id: 'yuki', name: 'Yuki Tanaka', skill: 'C++', xp: 1890, level: 8 },
  { id: 'omar', name: 'Omar Khalil', skill: 'Git', xp: 310, level: 2 },
  { id: 'emma', name: 'Emma Rossi', skill: 'React', xp: 1330, level: 6 },
  { id: 'karim', name: 'Karim Aziz', skill: 'Networking', xp: 540, level: 3 },
  { id: 'nina', name: 'Nina Petrova', skill: 'Algorithms', xp: 1720, level: 7 },
  { id: 'paul', name: 'Paul Dubois', skill: 'Shell', xp: 880, level: 4 },
];

const columnHelper = createColumnHelper<StudentRow>();

const studentColumns = [
  columnHelper.accessor('name', { header: 'Student' }),
  columnHelper.accessor('skill', { header: 'Skill' }),
  columnHelper.accessor('xp', { header: 'XP', meta: { align: 'end' } }),
  columnHelper.accessor('level', { header: 'Level', meta: { align: 'end' } }),
];

const PAGE_SIZE = 5;

export function Showcase(): React.JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState('feed');
  const [tableError, setTableError] = useState(false);
  const [upload, setUpload] = useState<File | null>(null);
  const [saved, setSaved] = useState<File | StoredFile | null>(evidenceOnServer);
  const emailRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const bannersRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [pagerPage, setPagerPage] = useState(3);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [skills, setSkills] = useState<Array<string>>(['Docker', 'SQL']);
  const [swatches] = useState(() =>
    hues.map((hue) => ({ hue, steps: steps.map((step) => ({ step, hex: themeHex(hue, step) })) })),
  );
  const [roleSwatches] = useState(() => roles.map((role) => ({ role, hex: themeHex(role), step: roleStep(role) })));

  const sorted = useMemo(() => {
    const rows = [...sampleRows];
    const [rule] = sorting;
    if (!rule) return rows;
    const dir = rule.desc ? -1 : 1;
    rows.sort((a, b) => {
      const left = a[rule.id as keyof StudentRow];
      const right = b[rule.id as keyof StudentRow];
      if (left < right) return -dir;
      if (left > right) return dir;
      return 0;
    });
    return rows;
  }, [sorting]);

  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // The pressed remove button goes with its chip, so focus moves to the next
  // chip's button, or the previous one, or the chip list when none is left.
  function removeSkill(skill: string): void {
    const index = skills.indexOf(skill);
    const left = skills.filter((s) => s !== skill);
    flushSync(() => setSkills(left));
    const next = left[Math.min(index, left.length - 1)];
    const button = next ? chipsRef.current?.querySelector<HTMLButtonElement>(`button[aria-label="Remove ${next}"]`) : null;
    (button ?? chipsRef.current)?.focus();
  }

  function dismissBanner(): void {
    flushSync(() => setBannerVisible(false));
    bannersRef.current?.focus();
  }

  return (
    <div className="min-w-0">
      <Section title="Colour palette">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {swatches.map(({ hue, steps }) => (
            <div key={hue} className="min-w-0 overflow-hidden rounded-lg border border-line">
              <p className="bg-surface px-3 py-2 text-sm font-semibold capitalize text-ink">{hue}</p>
              {steps.map(({ step, hex }) => {
                const text = swatchText(hex);
                return (
                  <div key={step} className="flex items-center justify-between px-3 py-1 text-xs" style={{ backgroundColor: hex }}>
                    <span className={text}>
                      {hue}-{step}
                    </span>
                    <span className={`font-mono ${text}`}>{hex}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <h3 className="mb-2 mt-6 text-base font-semibold text-ink">Role tokens</h3>
        <p className="mb-3 text-sm text-ink-muted">Screens name these, not palette steps. Each points at one step.</p>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {roleSwatches.map(({ role, hex, step }) => (
            <div key={role} className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5">
              <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded border border-line" style={{ backgroundColor: hex }} />
              <span className="min-w-0 text-xs">
                <span className="block truncate font-semibold text-ink">{role}</span>
                <span className="block truncate font-mono text-ink-muted">{step}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-ink-muted">Extra small : labels, captions</p>
          <p className="text-sm text-ink">Small : form controls, secondary text</p>
          <p className="text-base text-ink">Base : body copy. PeerConnect helps students find who can teach them.</p>
          <p className="text-lg font-medium text-ink">Large : card titles, lead text</p>
          <p className="text-xl font-semibold text-ink">Extra large : section headings</p>
          <p className="text-2xl font-semibold text-ink">2XL : page headings</p>
          <p className="text-3xl font-semibold text-ink">3XL : display</p>
          <p className="font-mono text-sm text-ink">Monospace : code, data, XP 1,240</p>
        </div>
      </Section>

      <Section title="Icons">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {iconEntries.map(([name, icon]) => (
            <div key={name} className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-line bg-surface px-2 py-3 text-ink-muted">
              {icon}
              <span className="w-full truncate text-center text-xs">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="danger-ghost">Danger ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <IconButton label="Search students">
            <SearchIcon size={18} />
          </IconButton>
          <IconButton label="Send message" size="sm">
            <MessageIcon size={16} />
          </IconButton>
          <a href="#form-fields" className={buttonClasses({ variant: 'secondary' })}>
            A link styled as a button
          </a>
        </div>
      </Section>

      <Section id="form-fields" title="Form fields">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Display name" placeholder="e.g. amina" hint="Shown on your profile." />
          <TextField ref={emailRef} label="Email" type="email" placeholder="you@example.com" error="Enter a valid email address." defaultValue="not-an-email" />
          <TextArea label="Why this skill matters" hint="One or two sentences." placeholder="e.g. I want to read other students' C code with confidence." />
          <Select label="Round" defaultValue="3">
            <option value="1">Round 1</option>
            <option value="2">Round 2</option>
            <option value="3">Round 3</option>
          </Select>
          <TextField label="Disabled field" disabled defaultValue="Cannot edit" />
          <div className="flex flex-col gap-2">
            <Checkbox label="I can teach this skill" defaultChecked />
            <Checkbox label="Only students with a Learning Goal" hint="Shows only students who have set a Learning Goal." />
          </div>
        </div>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => emailRef.current?.focus()}>
          Focus the email field
        </Button>
      </Section>

      <Section title="Cards, avatars, labels, chips">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Current match" subtitle="Round 3 · Pair programming" actions={<Button size="sm">Open</Button>}>
            <p className="text-sm text-ink">Lina teaches C, which Amina wants to learn. Compatibility Score 86.</p>
          </Card>
          <Card
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                Sara Nasser <RoleLabel />
              </span>
            }
            subtitle="Teaches Docker · Level 9"
          >
            <p className="text-sm text-ink">An Admin, labelled beside the name in the card title.</p>
          </Card>
          <Card title="People">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar alt="Amina Haddad" size="xl" />
              <Avatar alt="Jonas Weber" size="lg" src="data:image/png;base64,AAAA" />
              <Avatar alt="Lina Farouk" size="md" />
              <Avatar alt="Marco Silva" size="sm" />
              <Avatar alt="Sara Nasser" size="xs" />
              <span className="inline-flex items-center gap-2 text-sm text-ink">
                Sara Nasser <RoleLabel />
              </span>
            </div>
            <div ref={chipsRef} role="group" aria-label="Skills" tabIndex={-1} className="mt-3 flex flex-wrap gap-2 focus-ring">
              <SkillChip name="C" variant="teach" />
              <SkillChip name="TypeScript" variant="learn" />
              {skills.map((skill) => (
                <SkillChip key={skill} name={skill} variant="teach" onRemove={() => removeSkill(skill)} />
              ))}
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Modal and tabs">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open dialog
          </Button>
        </div>
        <Modal
          open={modalOpen}
          title="Match with Lina Farouk"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="danger-ghost" className="mr-auto" onClick={() => setConfirmOpen(true)}>
                Decline match
              </Button>
              <Button onClick={() => setModalOpen(false)}>Done</Button>
            </>
          }
        >
          <p className="text-sm text-ink">Lina teaches C, which you want to learn. Round 3 · Pair programming.</p>
          <Modal
            open={confirmOpen}
            size="sm"
            title="Decline this match?"
            description="Declining ends the match for both of you. It cannot be undone."
            onClose={() => setConfirmOpen(false)}
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                  Keep match
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmOpen(false);
                    setModalOpen(false);
                  }}
                >
                  Decline
                </Button>
              </>
            }
          />
        </Modal>
        <div className="mt-4">
          <Tabs
            label="Your activity"
            value={tab}
            onValueChange={setTab}
            items={[
              { id: 'feed', label: 'Feed', content: <p className="text-sm text-ink">Public takeaways from recent matches land here.</p> },
              { id: 'matches', label: 'Matches', content: <p className="text-sm text-ink">Your current and past matches, one round at a time.</p> },
              { id: 'progress', label: 'Progress', content: <p className="text-sm text-ink">XP 1,240 · Level 5 · Streak 3 rounds.</p> },
            ]}
          />
          <p className="text-xs text-ink-muted">
            Selected tab id: <span className="font-mono">{tab}</span>
          </p>
        </div>
      </Section>

      <Section title="Data table">
        <Checkbox label="Show load error" checked={tableError} onChange={(event) => setTableError(event.target.checked)} className="mb-3" />
        <DataTable
          data={pageRows}
          columns={studentColumns}
          getRowId={(row) => row.id}
          total={sampleRows.length}
          page={page}
          pageSize={PAGE_SIZE}
          sorting={sorting}
          onSortingChange={(next) => {
            setSorting(next);
            setPage(1);
          }}
          onPageChange={setPage}
          caption="Students"
          emptyDescription="Nobody matches these filters yet."
          error={tableError ? 'The students could not be loaded. Try again in a moment.' : undefined}
          onRetry={() => setTableError(false)}
        />
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink">Standalone pagination</p>
          <Pagination page={pagerPage} total={96} pageSize={10} onPageChange={setPagerPage} />
        </div>
      </Section>

      <Section title="Progress, file drop, empty state, banners">
        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <h3 className="text-base font-semibold text-ink">Progress</h3>
            <ProgressBar label="Level 5" value={240} max={250} valueText="240 / 250 XP" />
            <ProgressBar label="Level 10" value={250} max={250} valueText="Top level" />
            <ProgressBar label="Evidence upload" value={100} max={100} />
            <FileDrop
              label="Evidence"
              accept={['image/png', 'image/jpeg', 'application/pdf']}
              maxBytes={5 * 1024 * 1024}
              value={upload}
              onChange={setUpload}
              progress={upload ? 42 : undefined}
            />
            <FileDrop
              label="Evidence already saved"
              accept={['image/png', 'image/jpeg', 'application/pdf']}
              maxBytes={5 * 1024 * 1024}
              value={saved}
              onChange={setSaved}
              error={saved === evidenceOnServer ? 'The server refused this file.' : undefined}
            />
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-base font-semibold text-ink">Empty state</h3>
            <EmptyState
              icon={<MessageIcon size={24} />}
              title="No messages yet"
              description="When another student sends you a Direct Message, it appears here."
              action={<Button size="sm">Find students</Button>}
            />
          </div>
        </div>
        <div ref={bannersRef} role="group" aria-label="Banners" tabIndex={-1} className="mt-4 space-y-2 focus-ring">
          <Banner
            tone="info"
            title="Round 3 is open"
            body={
              <>
                New matches were created this morning.{' '}
                <a href="#form-fields" className="font-semibold underline underline-offset-2 focus-ring">
                  See your match
                </a>
              </>
            }
          />
          <Banner tone="success" title="Review submitted" body="Your takeaway was posted to the feed." />
          <Banner tone="warning" title="Round closes soon" body="Unreviewed matches close with the round." />
          {bannerVisible ? <Banner tone="danger" title="Upload failed" body="The file was larger than the limit." onDismiss={dismissBanner} /> : null}
        </div>
      </Section>
    </div>
  );
}
