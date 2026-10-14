// Each case edits one file, runs tsc, and restores the file. "fail" means
// tsc must reject the edit; "pass" means it must accept it.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const cases = [
  ['fail', 'fr: a key missing', 'src/i18n/fr.ts', "    title: 'Boîte de réception',\n", ''],
  ['fail', 'ar: plural form few missing', 'src/i18n/ar.ts', "      few: '{count} رسائل غير مقروءة',\n", ''],
  ['fail', 'fr: plural form many missing', 'src/i18n/fr.ts', " many: '{count} de messages non lus',", ''],
  ['fail', 'fr: {name} misspelt {nom}', 'src/i18n/fr.ts', "'{name} vous a envoyé un message'", "'{nom} vous a envoyé un message'"],
  ['fail', 'fr: extra placeholder {foo}', 'src/i18n/fr.ts', "'{name} vous a envoyé un message'", "'{name} vous a envoyé un message {foo}'"],
  ['fail', 'ar: extra placeholder in a plural form', 'src/i18n/ar.ts', "'{count} رسائل غير مقروءة'", "'{count} رسائل {who} غير مقروءة'"],
  ['fail', 'fr: key English lacks', 'src/i18n/fr.ts', "    title: 'Boîte de réception',\n", "    title: 'Boîte de réception',\n    extra: 'x',\n"],
  ['fail', 'en: new key, no fr/ar', 'src/i18n/en.ts', "    title: 'Inbox',\n", "    title: 'Inbox',\n    archived: 'Archived',\n"],
  ['fail', 'codes: new code, no English text', 'src/codes.ts', "'internal_error'", "'internal_error' | 'forbidden'"],
  ['fail', 'en: text for a code that does not exist', 'src/i18n/en.ts', "    internal_error: 'Something went wrong.',\n", "    internal_error: 'Something went wrong.',\n    bogus: 'x',\n"],
  ['fail', 'fr: a plural part missing a form', 'src/i18n/fr.ts', " many: 'seulement {count} peuvent l’enseigner',", ''],
  ['fail', 'ar: {skill} missing from parts text', 'src/i18n/ar.ts', "'{demand} تعلّم {skill}، {supply}.'", "'{demand} تعلّم، {supply}.'"],
  ['pass', 'ar: two form without {count}', 'src/i18n/ar.ts', "two: 'رسالتان غير مقروءتين'", "two: 'رسالتان غير مقروءتين'"],
  ['fail', 'call: value missing', 'src/use.tsx', "{ name: <bdi>Ahmad</bdi> }", '{}'],
  ['fail', 'call: wrong value name', 'src/use.tsx', "{ name: <bdi>Ahmad</bdi> }", '{ nom: <bdi>Ahmad</bdi> }'],
  ['fail', 'call: count not a number', 'src/use.tsx', '{ count: 3 }', "{ count: 'x' }"],
  ['fail', 'call: second count missing', 'src/use.tsx', 'supply: 1, ', ''],
  ['fail', 'render a template unfilled', 'src/use.tsx', '<p>{t.inbox.title}</p>', '<p>{t.inbox.sentYou}</p>'],
  ['fail', 'render a plural unfilled', 'src/use.tsx', '<p>{t.inbox.title}</p>', '<p>{t.inbox.unread}</p>'],
  ['fail', 'key used in code that English lacks', 'src/use.tsx', 't.errors.internal_error', 't.errors.nope'],
];
const tsc = "node_modules/.bin/tsc";
let bad = 0;
for (const [want, name, file, from, to] of cases) {
  const orig = readFileSync(file, 'utf8');
  if (!orig.includes(from)) { console.log(`MISSING ANCHOR  ${name}`); bad++; continue; }
  writeFileSync(file, orig.replace(from, to));
  let got = 'pass', out = '';
  try { execFileSync(tsc, ['-p', '.'], { stdio: 'pipe' }); } catch (e) { got = 'fail'; out = String(e.stdout).split('\n').find((l) => l.includes('error TS')) ?? ''; }
  writeFileSync(file, orig);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'BAD'} want ${want} got ${got}  ${name}${out ? '  | ' + out.replace(/^.*error /, '').slice(0, 110) : ''}`);
}
console.log(bad ? `${bad} unexpected` : 'all as expected');
