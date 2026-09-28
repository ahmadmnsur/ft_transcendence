import { useMemo, useState, type ReactNode } from 'react';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { Avatar } from './components/Avatar';
import { Banner } from './components/Banner';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Checkbox } from './components/Checkbox';
import { DataTable } from './components/DataTable';
import { EmptyState } from './components/EmptyState';
import { FileDrop } from './components/FileDrop';
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

function Section({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="min-w-0 border-t border-neutral-200 py-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-xl font-semibold text-neutral-900">{title}</h2>
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
  { id: 'amina', name: 'Amina Haddad', skill: 'C', xp: 1240, level: 6 },
  { id: 'jonas', name: 'Jonas Weber', skill: 'TypeScript', xp: 980, level: 5 },
  { id: 'lina', name: 'Lina Farouk', skill: 'Python', xp: 1560, level: 7 },
  { id: 'marco', name: 'Marco Silva', skill: 'Rust', xp: 420, level: 3 },
  { id: 'sara', name: 'Sara Nasser', skill: 'Docker', xp: 2100, level: 8 },
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
  columnHelper.accessor('xp', { header: 'XP' }),
  columnHelper.accessor('level', { header: 'Level' }),
];

const PAGE_SIZE = 5;

export function Showcase(): React.JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [pagerPage, setPagerPage] = useState(3);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [skills, setSkills] = useState<Array<string>>(['Docker', 'SQL']);
  const [swatches] = useState(() =>
    hues.map((hue) => ({ hue, steps: steps.map((step) => ({ step, hex: themeHex(hue, step) })) })),
  );

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

  return (
    <div className="min-w-0">
      <Section title="Colour palette">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {swatches.map(({ hue, steps }) => (
            <div key={hue} className="min-w-0 overflow-hidden rounded-lg border border-neutral-200">
              <p className="bg-white px-3 py-2 text-sm font-semibold capitalize text-neutral-900">{hue}</p>
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
      </Section>

      <Section title="Type scale">
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-700">Extra small : labels, captions</p>
          <p className="text-sm text-neutral-900">Small : form controls, secondary text</p>
          <p className="text-base text-neutral-900">Base : body copy. PeerConnect helps students find who can teach them.</p>
          <p className="text-lg font-medium text-neutral-900">Large : card titles, lead text</p>
          <p className="text-xl font-semibold text-neutral-900">Extra large : section headings</p>
          <p className="text-2xl font-semibold text-neutral-900">2XL : page headings</p>
          <p className="text-3xl font-semibold text-neutral-900">3XL : display</p>
          <p className="font-mono text-sm text-neutral-900">Monospace : code, data, XP 1,240</p>
        </div>
      </Section>

      <Section title="Icons">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {iconEntries.map(([name, icon]) => (
            <div key={name} className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-3 text-neutral-700">
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
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Display name" placeholder="e.g. amina" hint="Shown on your profile." defaultValue="amina" />
          <TextField label="Email" type="email" placeholder="you@example.com" error="Enter a valid email address." defaultValue="not-an-email" />
          <TextArea label="Why this skill matters" hint="One or two sentences." defaultValue="I want to read other students' C code with confidence." />
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
      </Section>

      <Section title="Cards, avatars, labels, chips">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Current match" subtitle="Round 3 · Pair programming" actions={<Button size="sm">Open</Button>}>
            <p className="text-sm text-neutral-800">Lina teaches C, which Amina wants to learn. Compatibility Score 86.</p>
          </Card>
          <Card title="People">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar alt="Amina Haddad" size="xl" />
              <Avatar alt="Jonas Weber" size="lg" src="missing-avatar.png" />
              <Avatar alt="Lina Farouk" size="md" />
              <Avatar alt="Marco Silva" size="sm" />
              <Avatar alt="Sara Nasser" size="xs" />
              <span className="inline-flex items-center gap-2 text-sm text-neutral-800">
                Sara Nasser <RoleLabel />
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <SkillChip name="C" variant="teach" />
              <SkillChip name="TypeScript" variant="learn" />
              {skills.map((skill) => (
                <SkillChip key={skill} name={skill} variant="teach" onRemove={() => setSkills((all) => all.filter((s) => s !== skill))} />
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
        <Modal open={modalOpen} title="Decline this match?" onClose={() => setModalOpen(false)}>
          <p className="text-sm text-neutral-800">Declining ends the match for both of you. It cannot be undone.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Keep match
            </Button>
            <Button variant="danger" onClick={() => setModalOpen(false)}>
              Decline
            </Button>
          </div>
        </Modal>
        <div className="mt-4">
          <Tabs
            ariaLabel="Showcase tabs"
            items={[
              { id: 'feed', label: 'Feed', content: <p className="text-sm text-neutral-800">Public takeaways from recent matches land here.</p> },
              { id: 'matches', label: 'Matches', content: <p className="text-sm text-neutral-800">Your current and past matches, one round at a time.</p> },
              { id: 'progress', label: 'Progress', content: <p className="text-sm text-neutral-800">XP 1,240 · Level 6 · Streak 3 rounds.</p> },
            ]}
          />
        </div>
      </Section>

      <Section title="Data table">
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
          caption="Students by XP"
          emptyDescription="Nobody matches these filters yet."
        />
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-neutral-800">Standalone pagination</p>
          <Pagination page={pagerPage} total={96} pageSize={10} onPageChange={setPagerPage} />
        </div>
      </Section>

      <Section title="Progress, file drop, empty state, banners">
        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">Progress</h3>
            <ProgressBar label="Level 6 progress" value={1240} max={2000} />
            <ProgressBar label="Evidence upload" value={100} max={100} />
            <FileDrop accept={['image/png', 'image/jpeg', 'application/pdf']} maxBytes={5 * 1024 * 1024} onSelect={() => undefined} progress={42} />
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-base font-semibold text-neutral-900">Empty state</h3>
            <EmptyState
              icon={<MessageIcon size={24} />}
              title="No messages yet"
              description="When another student sends you a Direct Message, it appears here."
              action={<Button size="sm">Find students</Button>}
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Banner tone="info" title="Round 3 is open" body="New matches were created this morning." />
          <Banner tone="success" title="Review submitted" body="Your takeaway was posted to the feed." />
          <Banner tone="warning" title="Round closes soon" body="Unreviewed matches close with the round." />
          {bannerVisible ? <Banner tone="danger" title="Upload failed" body="The file was larger than the limit." onDismiss={() => setBannerVisible(false)} /> : null}
        </div>
      </Section>
    </div>
  );
}
