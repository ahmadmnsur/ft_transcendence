// Copies src/ to .scale/, adds 1,500 texts per language (1,200 plain, a
// third with two placeholders; 240 plurals; 60 with two numbers), and
// reports tsc's check time next to the small set's.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const forms = { en: ['one', 'other'], fr: ['one', 'many', 'other'], ar: ['zero', 'one', 'two', 'few', 'many', 'other'] };
const plural = (lang, text) => `{ ${forms[lang].map((f) => `${f}: '${text}'`).join(', ')} }`;
function texts(lang) {
  const areas = [];
  for (let a = 0; a < 30; a++) {
    const lines = [];
    for (let i = 0; i < 40; i++) lines.push(`      t${i}: '${lang} ${a}.${i}${i % 3 === 0 ? ' {name} {other}' : ''}',`);
    for (let i = 0; i < 8; i++) lines.push(`      p${i}: ${plural(lang, `{count} ${lang} {name}`)},`);
    for (let i = 0; i < 2; i++) lines.push(`      x${i}: { text: '{a} ${lang} {skill} {b}', parts: { a: ${plural(lang, '{count} a')}, b: ${plural(lang, '{count} b')} } },`);
    areas.push(`    area${a}: {\n${lines.join('\n')}\n    },`);
  }
  return `  big: {\n${areas.join('\n')}\n  },\n`;
}
rmSync('.scale', { recursive: true, force: true });
cpSync('.', '.scale', { recursive: true, filter: (p) => !p.includes('node_modules') && !p.includes('.scale') && !p.includes('/out') });
for (const lang of ['en', 'fr', 'ar']) {
  const file = `.scale/src/i18n/${lang}.ts`;
  const anchor = lang === 'en' ? 'export default {\n' : `const ${lang} = {\n`;
  writeFileSync(file, readFileSync(file, 'utf8').replace(anchor, anchor + texts(lang)));
}
const tsc = (dir) => execFileSync('node_modules/.bin/tsc', ['-p', dir, '--extendedDiagnostics'], { encoding: 'utf8' })
  .split('\n').filter((l) => /^(Check time|Total time|Instantiations)/.test(l)).join('; ');
console.log(`small set: ${tsc('.')}`);
console.log(`1,500 texts per language: ${tsc('.scale')}`);
rmSync('.scale', { recursive: true, force: true });
