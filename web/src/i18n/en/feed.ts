import type { EnGroup } from '../types';

// `/`, the feed (§6.9), and a Post wherever it shows: on the feed, on a
// profile and under its Reflection Prompt.
export default {
  title: 'Feed',
  loading: 'Loading Posts…',
  emptyTitle: 'No Posts yet.',
  emptyDescription: 'Public Takeaways and answers to Reflection Prompts appear here.',
  more: 'Load more Posts',
  retry: 'Try again',
  post: {
    takeaway: 'Public Takeaway',
    // {question} is the Reflection Prompt's question, linked to its page.
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
  },
} as const satisfies EnGroup;
