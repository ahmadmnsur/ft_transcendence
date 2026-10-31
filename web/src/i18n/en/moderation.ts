import type { PostGroupAction, ResolvedState, StudentGroupAction } from '@shared/reports';
import type { EnGroup, EnPlural } from '../types';

type GroupAction = PostGroupAction | StudentGroupAction;

const actionLabels = {
  REMOVE_POST: 'Remove Post',
  ACTION: 'Mark as actioned',
  DISMISS: 'Dismiss',
} as const satisfies Record<GroupAction, string>;

const confirmTitles = {
  REMOVE_POST: 'Remove this Post?',
  ACTION: 'Mark this group as actioned?',
  DISMISS: 'Dismiss this group?',
} as const satisfies Record<GroupAction, string>;

const postBodies = {
  REMOVE_POST: {
    one: "The Post leaves the feed for everyone, and its Report is closed as actioned. You are recorded as the one who removed it. This can't be undone.",
    other: "The Post leaves the feed for everyone, and its {count} Reports are closed as actioned. You are recorded as the one who removed it. This can't be undone.",
  },
  DISMISS: {
    one: "The Post stays, and its Report is closed as dismissed. You are recorded as the one who dismissed it. This can't be undone.",
    other: "The Post stays, and its {count} Reports are closed as dismissed. You are recorded as the one who dismissed them. This can't be undone.",
  },
} as const satisfies Record<PostGroupAction, EnPlural>;

const studentBodies = {
  ACTION: {
    one: "The Report about {name} is closed as actioned. This applies no sanction: suspend or remove the Student from Users. You are recorded as the one who resolved it. This can't be undone.",
    other: "The {count} Reports about {name} are closed as actioned. This applies no sanction: suspend or remove the Student from Users. You are recorded as the one who resolved them. This can't be undone.",
  },
  DISMISS: {
    one: "The Report about {name} is closed as dismissed. You are recorded as the one who dismissed it. This can't be undone.",
    other: "The {count} Reports about {name} are closed as dismissed. You are recorded as the one who dismissed them. This can't be undone.",
  },
} as const satisfies Record<StudentGroupAction, EnPlural>;

const done = {
  REMOVE_POST: {
    one: 'The Post was removed, and its Report was closed.',
    other: 'The Post was removed, and its {count} Reports were closed.',
  },
  ACTION: { one: 'The Report was marked as actioned.', other: '{count} Reports were marked as actioned.' },
  DISMISS: { one: 'The Report was dismissed.', other: '{count} Reports were dismissed.' },
} as const satisfies Record<GroupAction, EnPlural>;

const postResolvedBy = {
  ACTIONED: 'Post removed by {name}',
  DISMISSED: 'Dismissed by {name}',
} as const satisfies Record<ResolvedState, string>;

const studentResolvedBy = {
  ACTIONED: 'Marked as actioned by {name}',
  DISMISSED: 'Dismissed by {name}',
} as const satisfies Record<ResolvedState, string>;

export default {
  peerTitle: 'Moderation',
  peerIntro: "Reported Posts waiting for a decision. You never see who filed a Report. A Post you wrote or reported goes to someone else, and so does a Post when you've blocked its author or one of its reporters, or one of them has blocked you.",
  adminTitle: 'Reports',
  adminIntro: "Reports about Posts and Students, with who filed each. A Report about you or your Post, or one you filed, goes to another Admin.",
  tabsLabel: 'Reports',
  openTab: 'Open',
  resolvedTab: 'Resolved',
  loading: 'Loading Reports…',
  retry: 'Try again',
  queue: {
    emptyTitle: 'No Reports to review.',
    peerEmpty: 'Reported Posts you may review appear here.',
    adminEmpty: 'Reports about Posts and Students appear here.',
    postGroup: 'Reported Post',
    studentGroup: 'Reported Student',
    reportCount: { one: '{count} Report', other: '{count} Reports' },
    reportsLabel: 'Reports in this group',
    openInUsers: 'Open in Users',
  },
  post: { removed: 'Removed from the feed' },
  report: {
    filedAt: 'Filed {time}',
    filedBy: 'Filed by {name}',
    noText: 'No details given.',
  },
  actions: {
    label: actionLabels,
    confirmTitle: confirmTitles,
    confirmBody: { post: postBodies, student: studentBodies },
    done,
    cancel: 'Cancel',
    working: 'Saving…',
  },
  audit: {
    resolvedBy: { post: postResolvedBy, student: studentResolvedBy },
    emptyTitle: 'No resolved Reports yet.',
    emptyDescription: 'Each resolution appears here, with who made it and every Report it closed.',
    paginationLabel: 'Resolved Reports pages',
  },
} as const satisfies EnGroup;
