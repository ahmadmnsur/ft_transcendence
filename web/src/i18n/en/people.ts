import type { EnGroup } from '../types';

// A Removed Student's name, which the SPA shows in place of the API's
// English displayName, and `/students`, the Advanced search (§6.2).
export default {
  tombstone: 'Former student',
  search: {
    title: 'Students',
    filtersLabel: 'Search Students',
    nameLabel: 'Name',
    // §6.0.3: the search term is at most 60 characters.
    nameInvalid: {
      one: 'Enter up to {count} character.',
      other: 'Enter up to {count} characters.',
    },
    teachesLabel: 'Can teach',
    wantsLabel: 'Wants to learn',
    anySkill: 'Any Skill',
    skillSearch: 'Search Skills…',
    goalLabel: 'Learning Goal',
    goalAny: 'Any',
    goalYes: 'Has a Learning Goal',
    goalNo: 'No Learning Goal',
    submit: 'Search',
    clear: 'Clear filters',
    // The Skill catalogue's failed read, retried on its own (§6.15).
    retry: 'Try again',
    sortLabel: 'Sort by',
    sort: {
      nameAsc: 'Name, A to Z',
      nameDesc: 'Name, Z to A',
      xpDesc: 'XP, highest first',
      xpAsc: 'XP, lowest first',
      joinedDesc: 'Newest Students first',
      joinedAsc: 'Oldest Students first',
    },
    count: {
      one: '{count} Student found',
      other: '{count} Students found',
    },
    caption: 'Students found',
    columns: {
      name: 'Name',
      teaches: 'Can teach',
      wants: 'Wants to learn',
      level: 'Level',
      xp: 'XP',
    },
    noSkills: 'None',
    emptyTitle: 'No Students match this search.',
    emptyDescription: 'Try another name, or clear some filters.',
  },
} as const satisfies EnGroup;
