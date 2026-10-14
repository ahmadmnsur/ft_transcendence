// Each case makes one edit, runs tsc, and restores the file. "fail" means
// tsc must reject the edit; "pass" means it must accept it. Every error is
// listed by file and code, with the index files' problem lists in full.
// Exits 1 if a case does not behave as listed or its edit changes nothing.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const i = 'src/i18n';
const cases = [
  // Keys and area files
  ['fail', 'fr: a text English has is missing (inbox.title)', `${i}/fr/inbox.ts`, "  title: 'Boîte de réception',\n", ''],
  ['fail', 'fr: a key English lacks', `${i}/fr/inbox.ts`, "  title: 'Boîte de réception',\n", "  title: 'Boîte de réception',\n  extra: 'x',\n"],
  ['fail', 'fr: a plural form French does not write (two)', `${i}/fr/inbox.ts`, "one: '{count} message non lu', ", "one: '{count} message non lu', two: '{count} messages non lus', "],
  ['fail', 'en: a new text French and Arabic lack', `${i}/en/inbox.ts`, "  title: 'Inbox',\n", "  title: 'Inbox',\n  archived: 'Archived',\n"],
  ['fail', 'en: a text deleted, still in French and Arabic', `${i}/en/inbox.ts`, "  title: 'Inbox',\n", ''],
  ['fail', 'fr: an area file without its satisfies, with a key English lacks', `${i}/fr/nav.ts`, "} as const satisfies Catalogue<'fr', typeof nav>;", "  extra: 'x',\n} as const;"],
  ['fail', 'fr: an area file without as const', `${i}/fr/nav.ts`, "} as const satisfies Catalogue<'fr', typeof nav>;", "} satisfies Catalogue<'fr', typeof nav>;"],
  ['fail', 'fr: an area left out of the index (matches)', `${i}/fr/index.ts`, 'insights, matches }', 'insights }'],
  // Plural forms and {count}
  ['fail', 'ar: plural form few missing', `${i}/ar/inbox.ts`, "    few: '{count} رسائل غير مقروءة',\n", ''],
  ['fail', 'fr: plural form many missing', `${i}/fr/inbox.ts`, " many: '{count} de messages non lus',", ''],
  ['fail', 'fr: a part of a two-number sentence missing a form', `${i}/fr/insights.ts`, " many: 'seulement {count} peuvent l’enseigner',", ''],
  ['fail', 'fr: one without {count} (one holds 0 and 1)', `${i}/fr/inbox.ts`, "one: '{count} message non lu'", "one: 'un message non lu'"],
  ['fail', 'fr: other without {count}', `${i}/fr/inbox.ts`, "other: '{count} messages non lus'", "other: 'des messages non lus'"],
  ['fail', 'ar: few without {count}', `${i}/ar/inbox.ts`, "few: '{count} رسائل غير مقروءة'", "few: 'رسائل غير مقروءة'"],
  ['pass', 'en: one without {count} (one holds only 1)', `${i}/en/inbox.ts`, "one: '{count} unread message'", "one: 'one unread message'"],
  ['pass', 'ar: two with {count} (allowed, not required)', `${i}/ar/inbox.ts`, "two: 'رسالتان غير مقروءتين'", "two: '{count} رسالة غير مقروءة'"],
  ['fail', 'en: one has {name}, other lacks it', `${i}/en/inbox.ts`, "one: '{count} unread message'", "one: '{count} unread message from {name}'"],
  // Placeholders
  ['fail', 'fr: {name} misspelt {nom}', `${i}/fr/inbox.ts`, "'{name} vous a envoyé un message'", "'{nom} vous a envoyé un message'"],
  ['fail', 'fr: a placeholder English lacks ({foo})', `${i}/fr/inbox.ts`, "'{name} vous a envoyé un message'", "'{name} vous a envoyé un message {foo}'"],
  ['fail', 'ar: a placeholder English lacks, in one plural form ({who})', `${i}/ar/inbox.ts`, "'{count} رسائل غير مقروءة'", "'{count} رسائل {who} غير مقروءة'"],
  ['fail', 'ar: {skill} missing from a two-number sentence', `${i}/ar/insights.ts`, "'{demand} تعلّم {skill}، {supply}.'", "'{demand} تعلّم، {supply}.'"],
  ['fail', 'en: a placeholder name that is not camelCase ({first-name})', `${i}/en/inbox.ts`, "'{name} sent you a message'", "'{first-name} sent you a message'"],
  ['fail', 'en: a code-keyed text gains {max}', `${i}/en/errors.ts`, "not_found: 'This was not found.'", "not_found: 'This was not found ({max}).'"],
  ['fail', 'en: the code-keyed group without as const (point 1 of the review)', `${i}/en/errors.ts`, '} as const satisfies Record', '} satisfies Record'],
  // Two numbers in one sentence
  ['fail', 'fr: a two-number sentence missing a part (supply)', `${i}/fr/insights.ts`, "      supply: { one: 'seulement {count} peut l’enseigner', many: 'seulement {count} peuvent l’enseigner', other: 'seulement {count} peuvent l’enseigner' },\n", ''],
  ['fail', 'en: a part the text does not place ({supply})', `${i}/en/insights.ts`, "'{demand} to learn {skill}; {supply} it.'", "'{demand} to learn {skill}.'"],
  // Empty texts
  ['fail', 'fr: an empty text', `${i}/fr/inbox.ts`, "title: 'Boîte de réception'", "title: ''"],
  ['fail', 'fr: a text of spaces only', `${i}/fr/inbox.ts`, "title: 'Boîte de réception'", "title: '  '"],
  ['fail', 'fr: an empty plural form', `${i}/fr/inbox.ts`, "one: '{count} message non lu'", "one: ''"],
  ['fail', 'en: an empty text', `${i}/en/nav.ts`, "terms: 'Terms of Service'", "terms: ''"],
  // Reserved names
  ['fail', 'en: a group with a key named other', `${i}/en/nav.ts`, "terms: 'Terms of Service'", "terms: 'Terms of Service', other: 'Other'"],
  ['fail', 'en: a group with a key named text', `${i}/en/nav.ts`, "terms: 'Terms of Service'", "terms: 'Terms of Service', text: 'Text'"],
  // Codes
  ['fail', 'codes: a new code with no English text', 'src/codes.ts', "'internal_error'", "'internal_error' | 'forbidden'"],
  ['fail', 'en: text for a code that does not exist', `${i}/en/errors.ts`, "  internal_error: 'Something went wrong.',\n", "  internal_error: 'Something went wrong.',\n  bogus: 'x',\n"],
  // Calls
  ['fail', 'call: a value left out', 'src/use.tsx', '{ name: <bdi>Ahmad</bdi> }', '{}'],
  ['fail', 'call: a wrong value name', 'src/use.tsx', '{ name: <bdi>Ahmad</bdi> }', '{ nom: <bdi>Ahmad</bdi> }'],
  ['fail', 'call: a string as count', 'src/use.tsx', '{ count: 3 }', "{ count: '3' }"],
  ['fail', 'call: the second number of a two-number sentence left out', 'src/use.tsx', 'supply: 1, ', ''],
  ['fail', 'call: undefined as a value', 'src/use.tsx', '{ name: <bdi>Ahmad</bdi> }', '{ name: undefined }'],
  ['fail', 'call: null as a value', 'src/use.tsx', '{ name: <bdi>Ahmad</bdi> }', '{ name: null }'],
  ['fail', 'call: false as a value', 'src/use.tsx', '{ name: <bdi>Ahmad</bdi> }', '{ name: false }'],
  ['fail', 'call: an array as a value, not joined by list()', 'src/use.tsx', "list('ar', ['Docker', 'Git', 'C++'])", "['Docker', 'Git', 'C++']"],
  ['fail', 'render a text with placeholders unfilled', 'src/use.tsx', '<p>{t.inbox.title}</p>', '<p>{t.inbox.sentYou}</p>'],
  ['fail', 'render a plural unfilled', 'src/use.tsx', '<p>{t.inbox.title}</p>', '<p>{t.inbox.unread}</p>'],
  ['fail', 'a key English lacks, used in code', 'src/use.tsx', 't.errors[code]', 't.errors.nope'],
];

let bad = 0;
for (const [want, name, file, from, to] of cases) {
  const orig = readFileSync(file, 'utf8');
  const edited = orig.replace(from, to);
  if (!orig.includes(from) || edited === orig) {
    console.log(`BAD  edit changes nothing  ${name}`);
    bad++;
    continue;
  }
  writeFileSync(file, edited);
  let got = 'pass';
  let out = '';
  try {
    execFileSync('node_modules/.bin/tsc', ['-p', '.'], { stdio: 'pipe' });
  } catch (e) {
    got = 'fail';
    out = String(e.stdout);
  } finally {
    writeFileSync(file, orig);
  }
  const errors = [...out.matchAll(/^src\/(?:i18n\/)?(\S+?)\(\d+,\d+\): error (TS\d+): (.*)$/gm)];
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'BAD'}  want ${want}, got ${got}  ${name}`);
  for (const [, f, code, message] of errors) {
    const problems = f.endsWith('index.ts') ? message.match(/to type '(.*)'\.$/)?.[1] : undefined;
    console.log(`       ${f} ${code}${problems ? `  ${problems}` : ''}`);
  }
}
console.log(bad ? `${bad} not as listed` : `all ${cases.length} as listed`);
process.exitCode = bad ? 1 : 0;
