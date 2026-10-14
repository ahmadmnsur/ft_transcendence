// Renders the prototype's texts with react-dom/server, after
// `tsc -p tsconfig.emit.json` has compiled src/ to out/. Also writes
// out/isolation.html, to open in a browser.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
writeFileSync('out/package.json', '{"type":"commonjs"}\n');
const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server');
const { createElement: h, Fragment } = require('react');
const en = require('../out/i18n/en/index.js').default;
const fr = require('../out/i18n/fr/index.js').default;
const ar = require('../out/i18n/ar/index.js').default;
const { format, formatText, list, listText, over } = require('../out/i18n/text.js');
const { firstLanguage } = require('../out/i18n/language.js');
const show = (n) => renderToStaticMarkup(h(Fragment, null, n));
const bare = (n) => show(n).replace(/<\/?bdi>/g, '');
const marks = (s) => s.replaceAll('⁨', '⟨FSI⟩').replaceAll('⁩', '⟨PDI⟩');
const dict = { en, fr, ar };

console.log('## Plurals (<bdi> tags left out)');
for (const n of [0, 1, 2, 3, 11, 100, 1000000]) {
  console.log(`${n} | ${['en', 'fr', 'ar'].map((l) => `${l} ${bare(format(l, dict[l].inbox.unread, { count: n }))}`).join(' | ')}`);
}

console.log('## A name, and two numbers in one sentence');
console.log(show(format('ar', ar.inbox.sentYou, { name: h('bdi', null, 'Ahmad') })));
console.log(show(format('en', en.insights.gapSome, { demand: 12, supply: 1, skill: h('bdi', null, 'C++') })));
console.log(show(format('fr', fr.insights.gapSome, { demand: 1, supply: 3, skill: h('bdi', null, 'C++') })));
console.log(show(format('ar', ar.insights.gapSome, { demand: 2, supply: 11, skill: h('bdi', null, 'C++') })));

console.log('## A number in a placeholder other than {count}');
for (const l of ['en', 'fr', 'ar']) console.log(`${l} ${show(format(l, dict[l].matches.evidenceLimit, { size: 1234567 }))}`);

console.log('## Plain strings (formatText), isolation marks shown as ⟨FSI⟩ ⟨PDI⟩');
console.log(marks(formatText('ar', ar.inbox.sentYou, { name: 'C++' })));
console.log(marks(formatText('fr', fr.inbox.sentYou, { name: 'Ahmad' })));
console.log(marks(formatText('ar', ar.inbox.unread, { count: 3 })));

console.log('## Lists');
const skills = ['Docker', 'Git', 'C++'];
for (const l of ['en', 'fr', 'ar']) {
  console.log(`${l} Intl.ListFormat alone: ${new Intl.ListFormat(l).format(skills)}`);
  console.log(`${l} list():     ${show(list(l, skills))}`);
  console.log(`${l} listText(): ${marks(listText(l, skills))}`);
}
console.log(show(format('ar', ar.matches.canTeach, { partner: h('bdi', null, 'Ahmad'), skills: list('ar', skills) })));

console.log('## First visit (stored choice, browser languages)');
const visits = [
  [null, ['de-DE', 'de', 'fr-FR', 'fr']], [null, ['fr-CA']], [null, ['de-DE', 'es']], [null, []], [null, ['AR-lb', 'en-US']],
  [null, ['ar-u-nu-latn']], [null, ['zh-Hant']], [null, ['']], [null, ['EN']], ['ar', ['fr-FR']], ['de', ['fr-FR']],
];
for (const [s, b] of visits) console.log(`${JSON.stringify(s)} ${JSON.stringify(b)} -> ${firstLanguage(s, b)}`);

console.log('## French with texts missing, laid over English (only `vite dev` can show this)');
const logged = [];
for (const k of ['log', 'warn', 'error']) {
  const real = console[k];
  console[k] = (...a) => { if (k !== 'log') logged.push(a); real(...a); };
}
const damaged = (edit) => { const copy = JSON.parse(JSON.stringify(fr)); edit(copy); return over(en, copy); };
const rows = [
  ['nav and inbox.title deleted', (f) => { delete f.nav; delete f.inbox.title; }, (m) => `${m.nav.privacy} | ${m.inbox.title} | ${bare(format('fr', m.inbox.sentYou, { name: 'Ahmad' }))}`],
  ['inbox.title empty', (f) => { f.inbox.title = ''; }, (m) => m.inbox.title],
  ['unread.many deleted, 1,000,000', (f) => { delete f.inbox.unread.many; }, (m) => bare(format('fr', m.inbox.unread, { count: 1000000 }))],
  ['unread.other deleted, 0 and 1,000,000', (f) => { delete f.inbox.unread.other; }, (m) => `${bare(format('fr', m.inbox.unread, { count: 0 }))} / ${bare(format('fr', m.inbox.unread, { count: 1000000 }))}`],
  ['gapSome.parts.supply deleted', (f) => { delete f.insights.gapSome.parts.supply; }, (m) => bare(format('fr', m.insights.gapSome, { demand: 1, supply: 3, skill: 'C++' }))],
  ['gapSome.parts deleted', (f) => { delete f.insights.gapSome.parts; }, (m) => bare(format('fr', m.insights.gapSome, { demand: 1, supply: 3, skill: 'C++' }))],
  ['gapSome.text empty', (f) => { f.insights.gapSome.text = ''; }, (m) => bare(format('fr', m.insights.gapSome, { demand: 1, supply: 3, skill: 'C++' }))],
  ['gapSome.parts.demand.other deleted', (f) => { delete f.insights.gapSome.parts.demand.other; }, (m) => bare(format('fr', m.insights.gapSome, { demand: 1, supply: 3, skill: 'C++' }))],
  ['inbox.sentYou a plural, not a text', (f) => { f.inbox.sentYou = { one: 'x', other: 'y' }; }, (m) => bare(format('fr', m.inbox.sentYou, { name: 'Ahmad' }))],
  ['the whole file missing', (f) => { for (const k of Object.keys(f)) delete f[k]; }, (m) => `${m.inbox.title} | ${bare(format('fr', m.inbox.unread, { count: 0 }))}`],
];
for (const [name, edit, read] of rows) console.log(`${name}: ${read(damaged(edit))}`);
const arNoOther = (() => { const copy = JSON.parse(JSON.stringify(ar)); delete copy.inbox.unread.other; return over(en, copy); })();
console.log(`Arabic unread.other deleted, 3: ${bare(format('ar', arNoOther.inbox.unread, { count: 3 }))}`);
console.log(`console.warn and console.error calls: ${logged.length}`);

// A page to open in a browser: each row once as before (no isolation) and
// once as now, in a right-to-left page.
const before = (text, name) => text.replace('{name}', name);
const row = (label, html) => `<tr><th dir="ltr">${label}</th><td>${html}</td></tr>`;
const page = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>isolation</title>
<style>body{font:20px sans-serif;margin:16px}td,th{border:1px solid #999;padding:6px}th{font:14px monospace;text-align:left}</style>
<table>
${row('p, no marks', `<p>${before(ar.inbox.sentYou, 'C++')}</p>`)}
${row('p, formatText', `<p>${formatText('ar', ar.inbox.sentYou, { name: 'C++' })}</p>`)}
${row('option, no marks / formatText', `<select size="2"><option>${before(ar.inbox.sentYou, 'C++')}</option><option>${formatText('ar', ar.inbox.sentYou, { name: 'C++' })}</option></select>`)}
${row('p, Intl.ListFormat alone', `<p>${new Intl.ListFormat('ar').format(skills)}</p>`)}
${row('p, listText', `<p>${listText('ar', skills)}</p>`)}
${row('p, list() in format()', `<p>${show(format('ar', ar.matches.canTeach, { partner: 'Ahmad', skills: list('ar', skills) }))}</p>`)}
${row('option, Intl.ListFormat alone / listText', `<select size="2"><option>${new Intl.ListFormat('ar').format(skills)}</option><option>${listText('ar', skills)}</option></select>`)}
</table></html>
`;
writeFileSync('out/isolation.html', page);
console.log('wrote out/isolation.html');
