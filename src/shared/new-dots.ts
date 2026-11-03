export const NEW_DOT_KEYS = ['messages', 'match', 'friends', 'prompts', 'feedback', 'reports', 'feed'] as const;

export type NewDotKey = (typeof NEW_DOT_KEYS)[number];

export type NewDots = Record<NewDotKey, boolean>;
