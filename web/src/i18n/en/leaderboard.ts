import type { EnGroup } from '../types';

export default {
  title: 'Leaderboard',
  description: 'All-time XP from completed Matches and Reflection Prompt answers. Only active Students and Peer Moderators are ranked.',
  caption: 'Top ten by XP, with your position below when outside the top ten',
  rank: 'Rank',
  student: 'Student',
  xp: 'XP',
  level: 'Level',
  yourPosition: 'Your position',
  loading: 'Loading the Leaderboard…',
  retry: 'Try again',
  emptyTitle: 'No Students to rank yet',
  emptyDescription: 'The Leaderboard will appear when an active Student joins.',
} as const satisfies EnGroup;
