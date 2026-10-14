import type insights from '../en/insights';
import type { Catalogue } from '../types';

export default {
  gapSome: {
    text: '{demand} تعلّم {skill}، {supply}.',
    parts: {
      demand: { zero: 'لا أحد يريد', one: 'طالب واحد يريد', two: 'طالبان يريدان', few: '{count} طلاب يريدون', many: '{count} طالبًا يريدون', other: '{count} طالب يريدون' },
      supply: { zero: 'ولا أحد يعلّمها', one: 'ولا يعلّمها إلا واحد', two: 'ولا يعلّمها إلا اثنان', few: 'ولا يعلّمها إلا {count}', many: 'ولا يعلّمها إلا {count}', other: 'ولا يعلّمها إلا {count}' },
    },
  },
} as const satisfies Catalogue<'ar', typeof insights>;
