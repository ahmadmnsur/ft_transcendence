// Finds the physical (left/right) Tailwind v4 classes and CSS declarations in a folder.
// Used for docs/research/rtl-mirroring.md, section 1; kept for #146, which settles the rule.
// Rebuilt on 2026-10-13 and 2026-10-14 after Ahmad's reviews of 18e04ea, 52957a1 and 1c75324
// (#140). How it was checked against Tailwind 4.3.3's own code: the doc, section 2.
//
// Usage: node physical-scan.mjs web
// It needs the SPA's own TypeScript and PostCSS (`npm --prefix web ci` first); its last line
// names the versions it used.
//
// Files. It reads what Tailwind 4.3.3 reads in that folder when it is Vite's root and the CSS
// gives no `source()`: every file except those a `.gitignore` ignores (asked of `git ls-files`),
// the folders and files on Tailwind's ignore lists (such as `node_modules`, `.git`,
// `package-lock.json`, `.env`, `*.log`, `*.lock`, Sass, Less and Stylus), and the files whose
// extension is on its binary list. Extensions are matched as written, as Tailwind does, so
// `photo.PNG` and `case.CSS` are read as text. It also reads the CSS files, from which Tailwind
// takes no class. Outside a git repository it cannot ask what `.gitignore` ignores, so it reads
// those files too.
//
// Classes. It takes a class where Tailwind's extractor can take one (`boundary.rs` and `mod.rs`
// in `crates/oxide/src/extractor/` at v4.3.3): one starts after a space, a quote, a backtick,
// `.`, `}`, `>` or `[`, and ends before a space, a quote, a backtick, `]`, `{`, `=`, `\` or `<`.
// So `['ml-4', 'mr-4']`, `'.ml-4'` and `<p>ml-4</p>` give `ml-4`, and `cn(ml-4)` gives nothing,
// as in Tailwind. Before a `:` followed by a space or the file's end, a class may start after
// any character (`{ml-4: 1}`, `x!ml-4: `), as in Tailwind. Outside `[…]` and `(…)` a class
// holds only letters, digits and `-_.:!/%@*`; inside them, any character but a space, with
// quoted strings read whole and `\` escaping the next character, so `content-['x']` and
// `[&[title=":)"]]:text-left` stay whole. JSON and Markdown first go through Tailwind's own steps
// for them (brackets and braces outside strings, and `{…}` attribute blocks). Then it strips the
// variants at each `:` outside `[…]` and `(…)` (`md:hover:`, `has-[:focus]:`, but not the `:`
// in `ml-[length:3px]`), an `!` before or after, and a leading `-`, and reports:
// - a physical utility: `ml-`/`mr-`, `pl-`/`pr-`, `scroll-ml-`…, `left-`/`right-`, `text-left`,
//   `float-`/`clear-left`, `border-l`/`border-r` with any width or colour, `rounded-l-`/`-tl-`…,
//   `bg-`/`object-`/`mask-` positions (`bg-top-left`), `mask-l-`/`mask-r-`, `mask-radial-at-left`,
//   `bg-linear-to-l` with or without a `/` modifier, `touch-pan-left`, `break-before-left`;
// - a utility with no flow-relative form, which needs an `rtl:` variant instead: `origin-` and
//   `perspective-origin-` other than `center`, `top` and `bottom` (`origin-[left_top]`,
//   `origin-(--x)`), `translate-x-`, `scale-x-`, `skew-x-`, and the one-sided resize cursors;
// - an arbitrary property, read as a declaration (below: `[margin-left:4px]`,
//   `[padding-left:env(safe-area-inset-right)]`, `[margin:0_4px_0_0]`), or an arbitrary value that
//   names one side (`bg-[left_top]`) or is a box or corner shorthand whose left and right differ
//   (`p-[0_1rem_0_0]`, `rounded-[4px_0_0_4px]`).
//
// Declarations. A declaration is physical when its property names one side, whatever its value
// holds (`padding-left: env(safe-area-inset-right)`); when its value names one side
// (`text-align: RIGHT`; quoted text, `url(…)` and a custom property's name do not count); when
// its origin is not centred left to right (`transform-origin: 0 0`); or when its box or corner
// shorthand differs on the left and the right (`margin: 0 4px 0 0`). Side words are matched in
// any case. Each declaration is judged alone, so a pair that is symmetric together
// (`border-top-left-radius` with `border-top-right-radius`) is reported too.
//
// CSS. Tailwind takes no class from a CSS file, so there it reports instead, reading the file with
// PostCSS (strings, comments, `!important` and at-rules over several lines as CSS reads them):
// the classes after `@apply`; each physical declaration, `@utility` blocks included; and, for a
// person to read, each `@source`, `@plugin` and `@config`, each `source(`, each `@import` of CSS
// from outside the folder other than Tailwind's own, and a file PostCSS cannot read. In HTML, SVG
// and XML it checks each `<style>` text and `style` attribute the same way, for declarations. It
// finds those by text, not by parsing the markup, so it also checks some inside comments and
// scripts: that reports more, never less.
//
// Comments. In a script (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, `.cts`), a class
// inside a comment is marked `(comment)`. TypeScript's own parser finds the comments, so JSX text,
// strings, regular expressions and templates hold none (`<p>image/*</p>` is text). Most such hits
// are prose (`right-aligns`), but a real class in a comment of a file Tailwind reads still
// generates CSS (`mr-auto` at `Modal.tsx:17`). In every other file, HTML comments included, each
// class counts as code: Tailwind reads those too.
//
// It cannot see:
// - arbitrary values that move something sideways without naming a side, other than the box and
//   corner shorthands: offsets (`shadow-[-4px_0_0_red]`, `translate-[4px]`,
//   `bg-position-[10px_0]`, `object-[10px_0]`), flips (`scale-[-1_1]`, `[transform:scaleX(-1)]`),
//   angles (`bg-linear-45`, `rotate-*`), and values held in a variable (`bg-position-(--pos)`);
//   the same holds for CSS declarations;
// - style objects in scripts (`style={{ marginLeft: 4 }}`);
// - classes built by joining strings (`'m' + side + '-4'`), which Tailwind cannot see either;
// - what a `@plugin` or `@config` adds, files outside the folder that `@source` or `@import` adds,
//   and classes that `@source inline()` makes from braces (`ml-{1..2}`): it lists those lines for
//   a person;
// - Tailwind's steps for other languages (Vue, Svelte, Pug…): those files are read as plain text;
// - JavaScript that assumes left to right (`scrollLeft` math, arrow keys, inline `scaleX`).
// It matches names, not CSS, so it also reports some words Tailwind would not compile
// (`right-to-left`, `ml-4A`), and a class named inside a variant (`ml-4` in `has-[.ml-4]:p-2`). A
// class behind `rtl:` or `ltr:` is reported too (`rtl:origin-right`): whether that is allowed is
// #146's choice.
//
// Exit code: 1 when it reports a class outside a comment, a CSS declaration or a line to read
// by hand; 0 otherwise; 2 when TypeScript or PostCSS is missing.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.argv[2];
if (!root) {
  console.error('Usage: node physical-scan.mjs <dir>');
  process.exit(2);
}

// TypeScript and PostCSS come from the SPA's own `node_modules` (TypeScript is a dev dependency,
// PostCSS comes with Vite), looked up from the folder, then from the working directory.
function load(name) {
  for (const from of [root, process.cwd()]) {
    try {
      return createRequire(path.resolve(from, 'physical-scan.cjs'))(name);
    } catch {
      // not there: try the next place
    }
  }
  console.error(`Cannot find ${name}: run \`npm --prefix web ci\` first.`);
  process.exit(2);
}
const ts = load('typescript');
const postcss = load('postcss');

// Tailwind 4.3.3's ignore lists, from `crates/oxide/src/scanner/fixtures/`.
const ignoredDirs = new Set(['.git', '.hg', '.jj', '.next', '.parcel-cache', '.pnpm-store',
  '.svelte-kit', '.svn', '.turbo', '.venv', '.vercel', '.yarn', '__pycache__', 'node_modules',
  'venv']);
const ignoredFile = /^(package-lock\.json|pnpm-lock\.yaml|bun\.lockb|\.gitignore|\.env|\.env\..*)$/;
const ignoredExt = /\.(less|lock|sass|scss|styl|log)$/;
// Binary files go by their extension, matched as written, so `.PNG` is read and `.png` is not.
const binaryExt = new Set(`
  3dm 3ds 3g2 3gp 7z a aac adp ai aif aiff alz ape apk appimage ar arj asf au avi avif bak baml bh
  bin bk bmp btif bz2 bzip2 cab caf cgm class cmx cpio cr2 cur dat db dcm deb dex djvu dll dmg dng
  doc docm docx dot dotm dra DS_Store dsk dts dtshd dvb dwg dxf ecelp4800 ecelp7470 ecelp9600 egg
  eol eot epub exe exr f4v fbs fh fla flac flatpak fli flv fpx fst fvt g3 geojson gh gif graffle
  gz gzip h261 h263 h264 hdr icns ico ief img ipa iso jar jpeg jpg jpgv jpm jxr key ktx lha lib
  lockb lvp lz lzh lzma lzo m3u m4a m4v mar mdi mht mid midi mj2 mka mkv mmr mng mobi mov movie
  mp3 mp4 mp4a mpeg mpg mpga mxu nef node npx numbers nupkg o oa odp ods odt oga ogg ogv otf ott
  pages pbm pcx pdb pdf pea pgm pic plist png pnm pot potm potx ppa ppam ppm pps ppsm ppsx ppt
  pptm pptx psd pya pyc pyo pyv qt rar ras raw resources rgb rip rlc rmf rmvb rpm rtf rz s3m s7z
  scpt sgi shar sil sketch slk smv snap snk so sqlite sqlite3 stl storedata sub suo swf
  symbolsarchive tar tbz tbz2 tga tgz thmx tif tiff tlz ttc ttf txz udf uvh uvi uvm uvp uvs uvu
  viv vob war wasm wav wax wbmp wdp weba webm webp whl wim wm wma wmv wmx woff woff2 wrm wvx xbm
  xif xla xlam xls xlsb xlsm xlsx xlt xltm xltx xm xmind xpi xpm xwd xz z zip zipx
`.split(/\s+/).filter(Boolean));

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
// Side words are matched in any case, as CSS reads keywords (`text-align: RIGHT`).
const names = (side, text) => new RegExp(`(?<![a-z])${side}(?![a-z])`, 'i').test(text);
// Quoted text and `url(…)` name no side: `content-['right']`, `bg-[url(left.png)]`.
const oneSide = (text) => {
  const bare = text.replace(/(["'])(?:\\.|(?!\1).)*\1|url\([^)]*\)/g, '');
  return names('left', bare) !== names('right', bare);
};

// Where the quote at `i` closes, or -1 when a space or the end comes first. `\` escapes.
function quoteEnd(text, i) {
  for (let j = i + 1; j < text.length; j++) {
    if (space.test(text[j])) return -1;
    if (text[j] === '\\') j++;
    else if (text[j] === text[i]) return j;
  }
  return -1;
}

// Splits `text` at each `sep` outside `[…]`, `(…)` and the quotes inside them; `\` escapes the
// next character.
function splitTop(text, sep) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') i++;
    else if (depth > 0 && (c === '"' || c === "'" || c === '`')) {
      const close = quoteEnd(text, i);
      if (close >= 0) i = close;
    } else if (c === '[' || c === '(') depth++;
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
  const parts = (v) => splitTop(v.replace(/!\s*important\s*$/i, '').replace(/\s+/g, ' ').trim()
    .toLowerCase(), ' ').filter(Boolean);
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

// A property named for one side counts whatever its value holds
// (`padding-left: env(safe-area-inset-right)`); a custom property's name does not count.
function physicalDeclaration(property, value) {
  const name = property.toLowerCase();
  if ((!name.startsWith('--') && oneSide(name)) || oneSide(value)) return true;
  // an origin that is not centred left to right (`transform-origin: 0 0`)
  if (/^(transform|perspective)-origin$/.test(name)) {
    return !/^(center|top|bottom|50%)(\s|$)/i.test(value.trim());
  }
  return lopsided(name, value);
}

// The CSS property an arbitrary shorthand value sets.
const shorthandOf = { p: 'padding', m: 'margin', inset: 'inset', 'scroll-m': 'scroll-margin',
  'scroll-p': 'scroll-padding', rounded: 'border-radius', border: 'border-width' };

function isPhysical(base) {
  if (physical.some((re) => re.test(base))) return true;
  // An arbitrary property, `[margin-left:4px]`, with or without a modifier, read as a declaration.
  const property = /^\[(-{0,2}[A-Za-z][\w-]*):(.+)\](\/.+)?$/.exec(base);
  if (property) return physicalDeclaration(property[1], property[2].replaceAll('_', ' '));
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
      } else if (c === '"' || c === "'" || c === '`') {
        // a quoted string, as in `[&[title=":)"]]:`; an unclosed one ends no class
        j = quoteEnd(text, j);
        if (j < 0) return -1;
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

// TypeScript's own parser finds a script's comments: the leading and trailing comment ranges at
// every token, leaving out JSX text (`<p>image/*</p>` holds no comment) and JSDoc nodes, which lie
// inside a comment already.
const scriptKind = { ts: ts.ScriptKind.TS, mts: ts.ScriptKind.TS, cts: ts.ScriptKind.TS,
  tsx: ts.ScriptKind.TSX, js: ts.ScriptKind.JS, mjs: ts.ScriptKind.JS, cjs: ts.ScriptKind.JS,
  jsx: ts.ScriptKind.JSX };
function scriptComments(text, kind) {
  const mask = new Uint8Array(text.length);
  const file = ts.createSourceFile('scanned', text, ts.ScriptTarget.Latest, true, kind);
  const mark = (pos) => {
    const ranges = [...(ts.getLeadingCommentRanges(text, pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, pos) ?? [])];
    for (const r of ranges) mask.fill(1, r.pos, r.end);
  };
  (function visit(node) {
    if (node.kind === ts.SyntaxKind.JsxText) return;
    const { FirstJSDocNode, LastJSDocNode } = ts.SyntaxKind;
    if (node.kind >= FirstJSDocNode && node.kind <= LastJSDocNode) return;
    const children = node.getChildren(file);
    if (children.length === 0) mark(node.pos);
    else children.forEach(visit);
  })(file);
  return mask;
}

// The CSS of an HTML, SVG or XML file: each `<style>` text and each `style` attribute value, as
// [css, offset]. Found by text, not by parsing the markup, so it also takes those inside comments
// and scripts: that checks more, never less.
function markupStyles(text) {
  const out = [];
  for (const m of text.matchAll(/<style(?=[\s/>])[^>]*>/gi)) {
    const start = m.index + m[0].length;
    const close = text.slice(start).search(/<\/style/i);
    const css = text.slice(start, close < 0 ? text.length : start + close);
    // `<![CDATA[`, `]]>`, `<!--` and `-->` around the CSS become spaces, so offsets hold
    const blank = (marker) => ' '.repeat(marker.length);
    out.push([css.replace(/<!\[CDATA\[|\]\]>|<!--|-->/g, blank), start]);
  }
  for (const m of text.matchAll(/(?<![\w-])style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)) {
    const value = m[1] ?? m[2] ?? m[3];
    // wrapped in a rule, whose `*{` stands two characters before the value
    const valueStart = m.index + m[0].length - value.length - (m[3] === undefined ? 1 : 0);
    out.push([`*{${value}}`, valueStart - 2]);
  }
  return out;
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
      const dot = parts.at(-1).lastIndexOf('.');
      if (dot >= 0 && binaryExt.has(parts.at(-1).slice(dot + 1))) return false;
      const full = path.join(dir, p);
      return fs.existsSync(full) && fs.statSync(full).isFile();
    })
    .sort();
}

const hits = [];
const declarations = [];
const byHand = [];

// Checks CSS with PostCSS, so that strings, comments, `!important` and at-rules over several lines
// read as CSS does: each physical declaration, the classes after `@apply` when `apply` is set,
// and the lines a person must read. `at` is where `css` starts in the file.
function checkCss(css, at, name, lineOf, apply) {
  let tree;
  try {
    tree = postcss.parse(css);
  } catch (error) {
    const line = lineOf(at) + (error.line ?? 1) - 1;
    const reason = error.reason ?? error.message;
    byHand.push(`${name}:${line}\tCSS that PostCSS cannot read: ${reason}\t(read by hand)`);
    return;
  }
  const lineAt = (node) => lineOf(at + node.source.start.offset);
  tree.walkDecls((d) => {
    if (!physicalDeclaration(d.prop, d.value)) return;
    const shown = `${d.prop}: ${d.value}${d.important ? ' !important' : ''}`.replace(/\s+/g, ' ');
    declarations.push(`${name}:${lineAt(d)}\t${shown}\t(css)`);
  });
  tree.walkAtRules((rule) => {
    const keyword = rule.name.toLowerCase();
    if (keyword === 'apply') {
      if (!apply) return;
      // the list as written, comments included, so that offsets hold
      const list = rule.raws.params?.raw ?? rule.params;
      const afterName = (rule.raws.afterName ?? '').length;
      const start = at + rule.source.start.offset + 1 + rule.name.length + afterName;
      for (const [candidate, offset] of applyList(list)) {
        if (!isPhysical(baseOf(candidate))) continue;
        hits.push({ where: `${name}:${lineOf(start + offset)}`, text: candidate, comment: false });
      }
      return;
    }
    // CSS imported from outside the folder, other than Tailwind itself, is not read here
    const imported = keyword === 'import'
      ? /^(?:url\(\s*)?["']?([^"')\s;]+)/.exec(rule.params)?.[1] : undefined;
    const leaves = (target) =>
      path.relative(root, path.join(root, path.dirname(name), target)).startsWith('..');
    const outside = imported !== undefined && !/^tailwindcss(\/|$)/.test(imported)
      && (!imported.startsWith('.') || leaves(imported));
    const changesSources = ['source', 'plugin', 'config'].includes(keyword);
    if (outside || changesSources || /\bsource\(/.test(rule.params)) {
      const shown = `@${rule.name} ${rule.params}`.replace(/\s+/g, ' ');
      byHand.push(`${name}:${lineAt(rule)}\t${shown}\t(read by hand)`);
    }
  });
}

// The classes of an `@apply` list, as [class, offset]: split at spaces outside `[…]`, `(…)` and
// quotes, with comments left out.
function applyList(list) {
  const out = [];
  let i = 0;
  while (i < list.length) {
    if (space.test(list[i])) {
      i++;
    } else if (list.startsWith('/*', i)) {
      const end = list.indexOf('*/', i + 2);
      i = end < 0 ? list.length : end + 2;
    } else {
      const start = i;
      let depth = 0;
      while (i < list.length && (depth > 0 || !space.test(list[i])) && !list.startsWith('/*', i)) {
        const c = list[i];
        if (c === '\\') i++;
        else if (c === '"' || c === "'") i = Math.max(i, list.indexOf(c, i + 1));
        else if (c === '[' || c === '(') depth++;
        else if ((c === ']' || c === ')') && depth > 0) depth--;
        i++;
      }
      out.push([list.slice(start, i), start]);
    }
  }
  return out;
}

for (const name of listFiles(root)) {
  const text = fs.readFileSync(path.join(root, name), 'utf8');
  // Extensions are matched as written, as Tailwind does: `case.CSS` is a source file.
  const ext = path.extname(name).slice(1);
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
    checkCss(text, 0, name, lineOf, true);
    continue;
  }
  // Comments are marked in scripts only; elsewhere every class counts as code.
  const mask = scriptKind[ext] === undefined ? null : scriptComments(text, scriptKind[ext]);
  if (/^(html|htm|svg|xml)$/.test(ext)) {
    for (const [css, at] of markupStyles(text)) checkCss(css, at, name, lineOf, false);
  }
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
  + `${declarations.length} CSS declarations, ${byHand.length} lines to read by hand `
  + `(TypeScript ${ts.version}, PostCSS ${postcss().version})`);
// Not `process.exit()`, which can cut the output short when it goes to a pipe.
process.exitCode = inCode > 0 || declarations.length > 0 || byHand.length > 0 ? 1 : 0;
