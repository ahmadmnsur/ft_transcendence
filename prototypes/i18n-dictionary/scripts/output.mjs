// Renders the prototype's texts with react-dom/server, after
// `tsc -p tsconfig.emit.json` has compiled src/ to out/.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
writeFileSync('out/package.json', '{"type":"commonjs"}\n');
const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server');
const { createElement: h, Fragment } = require('react');
const en = require('../out/i18n/en.js').default;
const fr = require('../out/i18n/fr.js').default;
const ar = require('../out/i18n/ar.js').default;
const { format, formatText, over } = require('../out/i18n/text.js');
const { firstLanguage } = require('../out/i18n/language.js');
const show = (n) => renderToStaticMarkup(h(Fragment, null, n));

console.log('## Plurals');
for (const n of [0, 1, 2, 3, 11, 100, 1000000]) {
  console.log(`${n} | en ${show(format('en', en.inbox.unread, { count: n }))} | fr ${show(format('fr', fr.inbox.unread, { count: n }))} | ar ${show(format('ar', ar.inbox.unread, { count: n }))}`);
}
console.log('## A name, and two numbers in one sentence');
console.log(show(format('ar', ar.inbox.sentYou, { name: h('bdi', null, 'Ahmad') })));
console.log(formatText('fr', fr.inbox.sentYou, { name: 'Ahmad' }));
console.log(show(format('en', en.insights.gapSome, { demand: 12, supply: 1, skill: h('bdi', null, 'C++') })));
console.log(show(format('fr', fr.insights.gapSome, { demand: 1, supply: 3, skill: h('bdi', null, 'C++') })));
console.log(show(format('ar', ar.insights.gapSome, { demand: 2, supply: 11, skill: h('bdi', null, 'C++') })));
console.log('## First visit (stored choice, browser languages)');
for (const [s, b] of [[null, ['de-DE', 'de', 'fr-FR', 'fr']], [null, ['fr-CA']], [null, ['de-DE', 'es']], [null, []], [null, ['AR-lb', 'en-US']], ['ar', ['fr-FR']], ['de', ['fr-FR']]]) {
  console.log(`${JSON.stringify(s)} ${JSON.stringify(b)} -> ${firstLanguage(s, b)}`);
}
console.log('## French with texts missing, laid over English');
const partial = JSON.parse(JSON.stringify(fr));
delete partial.inbox.title;
delete partial.nav;
const merged = over(en, partial);
console.log(`${merged.inbox.title} | ${merged.nav.privacy} | ${show(format('fr', merged.inbox.sentYou, { name: 'Ahmad' }))}`);
