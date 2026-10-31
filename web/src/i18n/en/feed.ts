import type { EnGroup } from '../types';

export default {
  title: 'Feed',
  loading: 'Loading Posts…',
  emptyTitle: 'No Posts yet.',
  emptyDescription: 'Public Takeaways and answers to Reflection Prompts appear here.',
  pages: 'Feed pages',
  retry: 'Try again',
  post: {
    takeaway: 'Public Takeaway',
    answer: 'Answer to {question}',
    like: 'Like',
    likeCount: { one: '{count} Like', other: '{count} Likes' },
  },
  likers: {
    title: 'Who liked this Post',
    loading: 'Loading who liked this Post…',
    empty: 'Nobody has liked this Post yet.',
    retry: 'Try again',
  },
  profile: {
    heading: 'Posts',
    empty: 'No Posts yet.',
    pages: 'Post pages',
  },
} as const satisfies EnGroup;
