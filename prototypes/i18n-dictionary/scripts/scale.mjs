// Copies the prototype to .scale/, adds an area of 1,500 texts to each
// language (1,200 plain, a third with two placeholders; 240 plurals; 60 with
// two numbers), and reports tsc's check time next to the small set's.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const forms = { en: ['one', 'other'], fr: ['one', 'many', 'other'], ar: ['zero', 'one', 'two', 'few', 'many', 'other'] };
const plural = (lang, text) => `{ ${forms[lang].map((f) => `${f}: '${text}'`).join(', ')} }`;
function area(lang) {
  const groups = [];
  for (let a = 0; a < 30; a++) {
    const lines = [];
    for (let n = 0; n < 40; n++) lines.push(`    t${n}: '${lang} ${a}.${n}${n % 3 === 0 ? ' {name} {other}' : ''}',`);
    for (let n = 0; n < 8; n++) lines.push(`    p${n}: ${plural(lang, `{count} ${lang} {name}`)},`);
    for (let n = 0; n < 2; n++) lines.push(`    x${n}: { text: '{a} ${lang} {skill} {b}', parts: { a: ${plural(lang, '{count} a')}, b: ${plural(lang, '{count} b')} } },`);
    groups.push(`  group${a}: {\n${lines.join('\n')}\n  },`);
  }
  const head = lang === 'en' ? "import type { EnGroup } from '../types';\n" : "import type big from '../en/big';\nimport type { Catalogue } from '../types';\n";
  const tail = lang === 'en' ? 'EnGroup' : `Catalogue<'${lang}', typeof big>`;
  return `${head}\nexport default {\n${groups.join('\n')}\n} as const satisfies ${tail};\n`;
}

rmSync('.scale', { recursive: true, force: true });
cpSync('.', '.scale', { recursive: true, filter: (p) => !p.includes('node_modules') && !p.includes('.scale') && !p.includes('/out') });
for (const lang of ['en', 'fr', 'ar']) {
  writeFileSync(`.scale/src/i18n/${lang}/big.ts`, area(lang));
  const index = `.scale/src/i18n/${lang}/index.ts`;
  writeFileSync(index, readFileSync(index, 'utf8').replace("import errors from './errors';", "import big from './big';\nimport errors from './errors';").replace('insights, matches }', 'insights, matches, big }'));
}
const tsc = (dir) => {
  const out = execFileSync('node_modules/.bin/tsc', ['-p', dir, '--extendedDiagnostics'], { encoding: 'utf8' });
  return out.split('\n').filter((l) => /^(Instantiations|Check time|Total time)/.test(l)).map((l) => l.replace(/\s+/g, ' ')).join('; ');
};
console.log(`small set: ${tsc('.')}`);
console.log(`1,500 more texts per language: ${tsc('.scale')}`);
rmSync('.scale', { recursive: true, force: true });
