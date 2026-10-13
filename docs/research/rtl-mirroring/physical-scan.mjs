// Finds the physical (left/right) Tailwind v4 classes and CSS declarations in a folder.
// Used for docs/research/rtl-mirroring.md, section 1; kept for #146, which settles the rule.
// Widened on 2026-10-13 after Ahmad's reviews of 18e04ea and 52957a1 (#140). How it was checked
// against Tailwind 4.3.3's own class list, extractor and file scanner: the doc, section 2.
//
// Usage: node physical-scan.mjs web
//
// Files. It reads what Tailwind 4.3.3 reads in that folder when it is Vite's root and the CSS
// gives no `source()`: every file except those a `.gitignore` ignores (asked of `git ls-files`),
// the folders and files on Tailwind's ignore lists (such as `node_modules`, `.git`,
// `package-lock.json`, `.env`, `*.log`, `*.lock`, Sass, Less and Stylus), and binary files (here:
// any file that holds a NUL byte). It also reads the CSS files, from which Tailwind takes no
// class. Outside a git repository it cannot ask what `.gitignore` ignores, so it reads those
// files too.
//
// Classes. It takes a class where Tailwind's extractor can take one (`boundary.rs` and `mod.rs`
// in `crates/oxide/src/extractor/` at v4.3.3): one starts after a space, a quote, a backtick,
// `.`, `}`, `>` or `[`, and ends before a space, a quote, a backtick, `]`, `{`, `=`, `\` or `<`.
// So `['ml-4', 'mr-4']`, `'.ml-4'` and `<p>ml-4</p>` give `ml-4`, and `cn(ml-4)` gives nothing,
// as in Tailwind. Before a `:` followed by a space or the file's end, a class may start after
// any character (`{ml-4: 1}`, `x!ml-4: `), as in Tailwind. Outside `[…]` and `(…)` a class
// holds only letters, digits and `-_.:!/%@*`; inside them, any character but a space, and `\`
// escapes the next one, so `bg-[linear-gradient(to_right,red,blue)]` and `content-['x']` stay
// whole. JSON and Markdown first go through Tailwind's own steps for them (brackets and braces
// outside strings, and `{…}` attribute blocks). Then it strips the variants at each `:` outside
// `[…]` and `(…)` (`md:hover:`, `has-[:focus]:`, but not the `:` in `ml-[length:3px]`), an `!`
// before or after, and a leading `-`, and reports:
// - a physical utility: `ml-`/`mr-`, `pl-`/`pr-`, `scroll-ml-`…, `left-`/`right-`, `text-left`,
//   `float-`/`clear-left`, `border-l`/`border-r` with any width or colour, `rounded-l-`/`-tl-`…,
//   `bg-`/`object-`/`mask-` positions (`bg-top-left`), `mask-l-`/`mask-r-`, `mask-radial-at-left`,
//   `bg-linear-to-l` with or without a `/` modifier, `touch-pan-left`, `break-before-left`;
// - a utility with no flow-relative form, which needs an `rtl:` variant instead: `origin-` and
//   `perspective-origin-` other than `center`, `top` and `bottom` (`origin-[left_top]`,
//   `origin-(--x)`), `translate-x-`, `scale-x-`, `skew-x-`, and the one-sided resize cursors;
// - an arbitrary property or value that names one side, left or right (`[margin-left:4px]`,
//   `bg-[left_top]`), where quoted text, `url(…)` and a custom property's name do not count
//   (`content-['right']`, `[--panel-left:4px]`), or a box or corner shorthand whose left and right
//   differ (`p-[0_1rem_0_0]`, `rounded-[4px_0_0_4px]`, `[margin:0_4px_0_0]`).
//
// CSS files. Tailwind takes no class from a CSS file, so here it reports instead, outside comments:
// the classes after `@apply`; each declaration that names one side (`margin-left: 4px`,
// `text-align: right`; a custom property's name aside), whose origin is not centred left to right
// (`transform-origin: 0 0`), or whose box or corner shorthand differs on the left and the right
// (`margin: 0 4px 0 0`), `@utility` blocks included; and, for a person to read, each line with
// `@source`, `@plugin`, `@config` or `source(`, which change what Tailwind reads or makes, and each
// `@import` of CSS from outside the folder other than Tailwind's own. It judges each declaration
// alone, so a pair that is symmetric together (`border-top-left-radius` with
// `border-top-right-radius`) is reported too.
//
// Comments. A class in a `//` or `/* */` comment of a script (`<!-- -->` in HTML, SVG, XML and
// Markdown) is marked `(comment)`: most are prose (`right-aligns`), but a real class in a comment
// of a file Tailwind reads still generates CSS (`mr-auto` at `Modal.tsx:17`). Strings and regular
// expressions are skipped so that `"https://…"` is not a comment. A comment inside a template's
// `${…}`, or after an apostrophe in JSX text on the same line, counts as code: that reports more.
// The other way round, JSX text holding `//` (`<p>https://…</p>`) counts as a comment up to the
// line's end. In other files (JSON, plain text) every class counts as code.
//
// It cannot see:
// - arbitrary values that move something sideways without naming a side, other than the box and
//   corner shorthands: offsets (`shadow-[-4px_0_0_red]`, `translate-[4px]`,
//   `bg-position-[10px_0]`, `object-[10px_0]`), flips (`scale-[-1_1]`, `[transform:scaleX(-1)]`),
//   angles (`bg-linear-45`, `rotate-*`), and values held in a variable (`bg-position-(--pos)`);
//   the same holds for CSS declarations;
// - inline styles (`style="margin-left: 4px"`, `style={{ marginLeft: 4 }}`);
// - classes built by joining strings (`'m' + side + '-4'`), which Tailwind cannot see either;
// - what a `@plugin` or `@config` adds, files outside the folder that `@source` or `@import` adds,
//   and classes that `@source inline()` makes from braces (`ml-{1..2}`): it lists those lines for
//   a person;
// - Tailwind's steps for other languages (Vue, Svelte, Pug…): those files are read as plain text;
// - JavaScript that assumes left to right (`scrollLeft` math, arrow keys, inline `scaleX`).
// It matches names, not CSS, so it also reports some words Tailwind would not compile
// (`right-to-left`), and a class named inside a variant (`ml-4` in `has-[.ml-4]:p-2`). A class
// behind `rtl:` or `ltr:` is reported too (`rtl:origin-right`): whether that is allowed is #146's
// choice.
//
// Exit code: 1 when it reports a class outside a comment, a CSS declaration or a line to read
// by hand; 0 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.argv[2];
if (!root) {
  console.error('Usage: node physical-scan.mjs <dir>');
  process.exit(2);
}

// Tailwind 4.3.3's ignore lists, from `crates/oxide/src/scanner/fixtures/`.
const ignoredDirs = new Set(['.git', '.hg', '.jj', '.next', '.parcel-cache', '.pnpm-store',
  '.svelte-kit', '.svn', '.turbo', '.venv', '.vercel', '.yarn', '__pycache__', 'node_modules',
  'venv']);
const ignoredFile = /^(package-lock\.json|pnpm-lock\.yaml|bun\.lockb|\.gitignore|\.env|\.env\..*)$/;
const ignoredExt = /\.(less|lock|sass|scss|styl|log)$/;

const side = '((top|bottom)-)?(left|right)(-(top|bottom))?';
const physical = [
  /^(m|p)[lr]-.+$/, // ml- mr- pl- pr-
  /^scroll-(m|p)[lr]-.+$/, // scroll-ml- scroll-pr- …
  /^(left|right)-.+$/, // left-4 right-px left-(--sidebar)
  /^text-(left|right)$/,
  /^(float|clear)-(left|right)$/,
  /^border-[lr](-.+)?$/, // border-l border-l-2 border-l-ink border-l-danger-500/50 border-l-(--c)
  /^rounded-([lr]|[tb][lr])(-.+)?$/,
  new RegExp(`^(bg|object|mask)-${side}$`), // bg-left bg-top-left object-left-bottom mask-right
  /^mask-[lr]-.+$/, // mask-l-from-4 mask-r-to-80%
  /^mask-radial-at-((top|bottom)-)?(left|right)$/,
  /^(bg|mask)-(linear|gradient)-to-(l|r|tl|tr|bl|br)(\/.+)?$/, // bg-linear-to-l/srgb
  /^touch-pan-(left|right)$/,
  /^break-(before|after)-(left|right)$/,
  // No flow-relative form: these need an `rtl:` variant.
  /^(perspective-)?origin-(?!(center|top|bottom)$).+$/, // origin-left origin-[left_top]
  /^translate-x-.+$/,
  /^scale-x-.+$/,
  /^skew-x-.+$/,
  /^cursor-([ns]?[ew]|nesw|nwse)-resize$/,
];
const names = (side, text) => new RegExp(`(?<![a-z])${side}(?![a-z])`).test(text);
// Quoted text and `url(…)` name no side: `content-['right']`, `bg-[url(left.png)]`.
const oneSide = (text) => {
  const bare = text.replace(/(["'])(?:\\.|(?!\1).)*\1|url\([^)]*\)/g, '');
  return names('left', bare) !== names('right', bare);
};

// Splits `text` at each `sep` outside `[…]` and `(…)`; `\` escapes the next character.
function splitTop(text, sep) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') i++;
    else if (c === '[' || c === '(') depth++;
    else if ((c === ']' || c === ')') && depth > 0) depth--;
    else if (c === sep && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

// Whether a box or corner shorthand puts different values on the left and the right.
const boxProperty =
  /^(margin|padding|inset|scroll-margin|scroll-padding|border-width|border-style|border-color)$/;
function lopsided(property, value) {
  const parts = (v) => splitTop(v.trim(), ' ').filter(Boolean);
  if (boxProperty.test(property)) {
    const p = parts(value); // top right bottom left
    return p.length === 4 && p[1] !== p[3];
  }
  if (property === 'border-radius') {
    return value.split('/').some((v) => {
      const p = parts(v); // top-left top-right bottom-right bottom-left
      if (p.length === 2) return p[0] !== p[1];
      if (p.length === 3) return p[0] !== p[1] || p[2] !== p[1];
      return p.length === 4 && (p[0] !== p[1] || p[2] !== p[3]);
    });
  }
  return false;
}

function physicalDeclaration(property, value) {
  if (oneSide(`${property.startsWith('--') ? '' : property} ${value}`)) return true;
  // an origin that is not centred left to right (`transform-origin: 0 0`)
  if (/^(transform|perspective)-origin$/.test(property)) {
    return !/^(center|top|bottom|50%)(\s|$)/.test(value.trim());
  }
  return lopsided(property, value);
}

// The CSS property an arbitrary shorthand value sets.
const shorthandOf = { p: 'padding', m: 'margin', inset: 'inset', 'scroll-m': 'scroll-margin',
  'scroll-p': 'scroll-padding', rounded: 'border-radius', border: 'border-width' };

function isPhysical(base) {
  if (physical.some((re) => re.test(base))) return true;
  // An arbitrary property, `[margin-left:4px]`, with or without a modifier; for a custom property
  // only the value is read.
  const property = /^\[(-{0,2}[A-Za-z][\w-]*):(.+)\](\/.+)?$/.exec(base);
  if (property) {
    const [, name, value] = property;
    if (oneSide(`${name.startsWith('--') ? '' : name} ${value}`)) return true;
    return lopsided(name, value.replaceAll('_', ' '));
  }
  // An arbitrary value, `bg-[left_top]`, `p-[length:0_1rem_0_0]`, with or without a modifier.
  const value = /^([a-z][\w-]*?)-\[(.+)\](\/.+)?$/.exec(base);
  if (value) {
    if (oneSide(value[2])) return true;
    const shorthand = shorthandOf[value[1]];
    if (shorthand === undefined) return false;
    return lopsided(shorthand, value[2].replace(/^[a-z-]+:/, '').replaceAll('_', ' '));
  }
  return false;
}

// The utility a class names, without its variants, an `!` before or after, or a leading `-`.
const baseOf = (candidate) =>
  splitTop(candidate, ':').pop().replace(/^!/, '').replace(/!$/, '').replace(/^-/, '');

// Tailwind's boundaries: what may come just before and just after a class.
const space = /\s/;
const before = new Set(['"', "'", '`', '.', '}', '>', '[']);
const after = new Set(['"', "'", '`', ']', '{', '=', '\\', '<']);
const classChar = /[A-Za-z0-9_\-.:!/%@*]/;

// The class that starts at `start`, as its end, or -1 when none does.
function classEnd(text, start) {
  if ('.:/%'.includes(text[start])) return -1; // no class starts with these
  let depth = 0;
  for (let j = start; ; j++) {
    const c = text[j];
    if (depth === 0) {
      if (j > start && (c === undefined || space.test(c) || after.has(c))) return j;
      if (c === undefined) return -1;
      if (c === '[' || c === '(') depth++;
      else if (!classChar.test(c)) return -1;
    } else {
      if (c === undefined || space.test(c)) return -1;
      if (c === '\\') {
        // `\` escapes the next character, so `\[` opens nothing; it cannot escape a space
        if (text[j + 1] === undefined || space.test(text[j + 1])) return -1;
        j++;
      } else if (c === '[' || c === '(') depth++;
      else if (c === ']' || c === ')') depth--;
    }
  }
}

// Where the class that ends at `end`, just before a `:`, starts; -1 when none does.
function keyStart(text, end) {
  let depth = 0;
  let afterClose = -1; // just after the outermost `]` or `)` met so far
  let s = end;
  for (; s > 0; s--) {
    const c = text[s - 1];
    if (c === ']' || c === ')') {
      if (depth++ === 0) afterClose = s;
    } else if ((c === '[' || c === '(') && depth > 0) depth--;
    else if (depth > 0 ? space.test(c) : c === ':' || !classChar.test(c)) break;
  }
  if (depth > 0) s = afterClose; // that bracket was never opened: the class starts after it
  while (s < end && '.:/%'.includes(text[s])) s++; // no class starts with these
  return s < end ? s : -1;
}

// Every physical class in `text`, as [class, offset]. Like Tailwind, it keeps a class that lies
// inside another only when the outer one is not reported (`.ml-4` gives `ml-4`).
function physicalClasses(text) {
  const spans = [];
  const add = (s, e) => {
    const base = baseOf(text.slice(s, e));
    if (base && isPhysical(base)) spans.push([s, e]);
  };
  for (let s = 0; s < text.length; s++) {
    if (s > 0 && !space.test(text[s - 1]) && !before.has(text[s - 1])) continue;
    const e = classEnd(text, s);
    if (e >= 0) add(s, text[e - 1] === ':' ? e - 1 : e); // `ml-4: …` gives `ml-4`
  }
  // Before `:` and a space, Tailwind takes the class whatever comes before it (`{ml-4: 1}`,
  // `x!ml-4: `, `[margin-left:4px]left-1/2: `), so every start back to the run's start is tried.
  for (let i = text.indexOf(':'); i >= 0; i = text.indexOf(':', i + 1)) {
    if (i + 1 < text.length && !space.test(text[i + 1])) continue;
    let first = keyStart(text, i);
    if (first < 0) {
      first = i;
      while (first > 0 && classChar.test(text[first - 1]) && text[first - 1] !== ':') first--;
    }
    // a start counts when one whole class runs from it to the colon (not `ml-4']` in `['ml-4']: `)
    for (let t = first; t < i; t++) if (classEnd(text, t) === i + 1) add(t, i);
  }
  const kept = [];
  let maxEnd = -1;
  for (const [s, e] of spans.sort((a, b) => a[0] - b[0] || b[1] - a[1])) {
    if (e > maxEnd) {
      kept.push([text.slice(s, e), s]);
      maxEnd = e;
    }
  }
  return kept;
}

// Tailwind's steps before it reads JSON and Markdown (`crates/oxide/src/extractor/pre_processors/`
// at v4.3.3). Each one swaps characters for spaces, so offsets and lines stay the same.
function preProcess(text, ext) {
  const out = text.split('');
  if (/^(json|jsonl|ndjson)$/.test(ext)) {
    // brackets and braces outside strings become spaces
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '"') {
        for (i++; i < text.length && text[i] !== '"'; i += text[i] === '\\' ? 2 : 1);
      } else if ('[{]}'.includes(text[i])) out[i] = ' ';
    }
  } else if (/^mdx?$/.test(ext)) {
    // in a `{…}` attribute block, the braces and each `.` outside brackets become spaces
    const stack = [];
    let inBlock = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (!inBlock && c === '{') { out[i] = ' '; inBlock = true; }
      else if (inBlock && '([{<'.includes(c)) stack.push(c);
      else if (inBlock && ')]}>'.includes(c) && stack.length > 0) stack.pop();
      else if (inBlock && c === '}') { out[i] = ' '; inBlock = false; }
      else if (inBlock && c === '.' && stack.length === 0) out[i] = ' ';
    }
  }
  return out.join('');
}

// Whether a `/` at `i` starts a regular expression rather than a division or `</tag>`.
function regexCanStart(text, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(text[j])) j--;
  if (j < 0) return true;
  if ('(,=:[!&|?{;+-*%~^>'.includes(text[j])) return true;
  const word = /[A-Za-z_$]+$/.exec(text.slice(Math.max(0, j - 10), j + 1));
  const keyword = /^(return|typeof|case|do|else|in|of|void|yield|await|delete|throw|new)$/;
  return word !== null && keyword.test(word[0]);
}

// Marks which characters of a JavaScript or TypeScript file are inside a comment.
function scriptComments(text) {
  const mask = new Uint8Array(text.length);
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      mask.fill(1, i, stop);
      i = stop;
    } else if (c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      const stop = end < 0 ? text.length : end;
      mask.fill(1, i, stop);
      i = stop;
    } else if (c === '"' || c === "'" || c === '`') {
      // a string; `'` and `"` end at the line's end even when unclosed (JSX text)
      i++;
      while (i < text.length && text[i] !== c && (c === '`' || text[i] !== '\n')) {
        i += text[i] === '\\' ? 2 : 1;
      }
      i++;
    } else if (c === '/' && regexCanStart(text, i)) {
      // a regular expression: skip it, so a quote or a backtick inside it starts nothing
      let inClass = false;
      i++;
      while (i < text.length && text[i] !== '\n' && (text[i] !== '/' || inClass)) {
        if (text[i] === '[') inClass = true;
        else if (text[i] === ']') inClass = false;
        i += text[i] === '\\' ? 2 : 1;
      }
      i++;
    } else {
      i++;
    }
  }
  return mask;
}

// Marks the characters between `open` and `close`.
function blockComments(text, open, close) {
  const mask = new Uint8Array(text.length);
  for (let i = text.indexOf(open); i >= 0; i = text.indexOf(open, i)) {
    const end = text.indexOf(close, i + open.length);
    const stop = end < 0 ? text.length : end + close.length;
    mask.fill(1, i, stop);
    i = stop;
  }
  return mask;
}

function listFiles(dir) {
  let found;
  try {
    // Tailwind skips what a `.gitignore` ignores; git knows which files those are.
    found = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28,
    }).split('\0').filter(Boolean);
  } catch {
    found = [];
    (function walk(sub) {
      for (const entry of fs.readdirSync(path.join(dir, sub), { withFileTypes: true })) {
        const p = path.join(sub, entry.name);
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) walk(p);
        } else found.push(p);
      }
    })('');
  }
  return found
    .filter((p) => {
      const parts = p.split(/[\\/]/);
      if (parts.slice(0, -1).some((d) => ignoredDirs.has(d))) return false;
      if (ignoredFile.test(parts.at(-1)) || ignoredExt.test(p)) return false;
      const full = path.join(dir, p);
      return fs.existsSync(full) && fs.statSync(full).isFile();
    })
    .sort();
}

const hits = [];
const declarations = [];
const byHand = [];
for (const name of listFiles(root)) {
  const bytes = fs.readFileSync(path.join(root, name));
  if (bytes.includes(0)) continue; // binary
  const text = bytes.toString('utf8');
  const ext = path.extname(name).slice(1).toLowerCase();
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (offset) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  if (ext === 'css') {
    // Blank the comments, keeping every offset and line.
    const css = text.replace(/\/\*[\s\S]*?(\*\/|$)/g, (c) => c.replace(/[^\n]/g, ' '));
    for (const m of css.matchAll(/@apply\s+([^;{}]*)/g)) {
      const listStart = m.index + m[0].length - m[1].length;
      for (const t of m[1].matchAll(/\S+/g)) {
        if (!isPhysical(baseOf(t[0]))) continue;
        hits.push({ where: `${name}:${lineOf(listStart + t.index)}`, text: t[0], comment: false });
      }
    }
    // `@apply md:ml-4;` is not a declaration `md: ml-4`
    const rules = css.replace(/@apply\s[^;{}]*/g, (a) => ' '.repeat(a.length));
    const declaration = /(?<=^|[{;\s])(-{0,2}[A-Za-z][\w-]*)\s*:\s*([^;{}]+)(?=[;}])/g;
    for (const m of rules.matchAll(declaration)) {
      if (physicalDeclaration(m[1].toLowerCase(), m[2])) {
        declarations.push(`${name}:${lineOf(m.index)}\t${m[1]}: ${m[2].trim()}\t(css)`);
      }
    }
    css.split('\n').forEach((line, i) => {
      // CSS imported from outside the folder, other than Tailwind itself, is not read here
      const imported = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/.exec(line)?.[1];
      const leaves = (target) =>
        path.relative(root, path.join(root, path.dirname(name), target)).startsWith('..');
      const outside = imported !== undefined && !/^tailwindcss(\/|$)/.test(imported)
        && (!imported.startsWith('.') || leaves(imported));
      if (outside || /@source\b|@plugin\b|@config\b|\bsource\(/.test(line)) {
        byHand.push(`${name}:${i + 1}\t${line.trim()}\t(read by hand)`);
      }
    });
    continue;
  }
  let mask = null;
  if (/^[cm]?[jt]sx?$/.test(ext)) mask = scriptComments(text);
  else if (/^(html?|svg|xml|mdx?)$/.test(ext)) mask = blockComments(text, '<!--', '-->');
  for (const [candidate, offset] of physicalClasses(preProcess(text, ext))) {
    const comment = mask !== null && mask[offset] === 1;
    hits.push({ where: `${name}:${lineOf(offset)}`, text: candidate, comment });
  }
}

for (const h of hits) console.log(`${h.where}\t${h.text}${h.comment ? '\t(comment)' : ''}`);
for (const d of declarations) console.log(d);
for (const b of byHand) console.log(b);
const inCode = hits.filter((h) => !h.comment).length;
console.log(`\n${inCode} in code, ${hits.length - inCode} in comments, `
  + `${declarations.length} CSS declarations, ${byHand.length} lines to read by hand`);
// Not `process.exit()`, which can cut the output short when it goes to a pipe.
process.exitCode = inCode > 0 || declarations.length > 0 || byHand.length > 0 ? 1 : 0;
