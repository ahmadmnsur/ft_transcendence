import type { EnGroup } from '../types';

export default {
  title: 'Reflection Prompts', adminTitle: 'Publish a Reflection Prompt', live: 'Live', closed: 'Closed',
  history: 'Prompt history', noPrompts: 'No Reflection Prompts have been published.', loading: 'Loading Reflection Prompts…',
  answers: 'Answers', answerCount: 'Answers: {count}', noAnswers: 'No answers yet.',
  question: 'Reflection question', publish: 'Publish', publishing: 'Publishing…', published: 'Your Reflection Prompt is published.',
  publishHint: 'Publishing closes the previous Prompt. Questions and answers cannot be edited or deleted.',
  confirmTitle: 'Publish this Reflection Prompt?', cancel: 'Cancel',
  answerLabel: 'Your answer', answerHint: 'Your answer is visible immediately to every signed-in Student. You can answer once, and cannot edit or delete it.',
  submit: 'Publish answer', submitting: 'Publishing answer…', answered: 'You have answered this Reflection Prompt.',
  saved: 'Your answer is published.', more: 'Load more answers', retry: 'Try again', back: 'All Reflection Prompts',
} as const satisfies EnGroup;
