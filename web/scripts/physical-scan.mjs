import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = process.argv[2];
if (!root) {
  console.error('Usage: node scripts/physical-scan.mjs <dir>');
  process.exit(2);
}

function load(name) {
  for (const from of [root, process.cwd()]) {
    try {
      return createRequire(path.resolve(from, 'physical-scan.cjs'))(name);
    } catch {
    }
  }
  console.error(`Cannot find ${name}: run \`npm --prefix web ci\` first.`);
  process.exit(2);
}
const ts = load('typescript');
const postcss = load('postcss');

const ignoredDirs = new Set(['.git', '.hg', '.jj', '.next', '.parcel-cache', '.pnpm-store',
  '.svelte-kit', '.svn', '.turbo', '.venv', '.vercel', '.yarn', '__pycache__', 'node_modules',
  'venv']);
const ignoredFile = /^(package-lock\.json|pnpm-lock\.yaml|bun\.lockb|\.gitignore|\.env|\.env\..*)$/;
const ignoredExt = /\.(less|lock|sass|scss|styl|log)$/;
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
  /^(m|p)[lr]-.+$/,
  /^scroll-(m|p)[lr]-.+$/,
  /^(left|right)-.+$/,
  /^text-(left|right)$/,
  /^(float|clear)-(left|right)$/,
  /^border-[lr](-.+)?$/,
  /^rounded-([lr]|[tb][lr])(-.+)?$/,
  new RegExp(`^(bg|object|mask)-${side}$`),
  /^mask-[lr]-.+$/,
  /^mask-radial-at-((top|bottom)-)?(left|right)$/,
  /^(bg|mask)-(linear|gradient)-to-(l|r|tl|tr|bl|br)(\/.+)?$/,
  /^touch-pan-(left|right)$/,
  /^break-(before|after)-(left|right)$/,
  /^(perspective-)?origin-(?!(center|top|bottom)$).+$/,
  /^translate-x-.+$/,
  /^scale-x-.+$/,
  /^skew-x-.+$/,
  /^cursor-([ns]?[ew]|nesw|nwse)-resize$/,
];
const names = (side, text) => new RegExp(`(?<![a-z])${side}(?![a-z])`, 'i').test(text);
const oneSide = (text) => {
  const bare = text.replace(/(["'])(?:\\.|(?!\1).)*\1|url\([^)]*\)/g, '');
  return names('left', bare) !== names('right', bare);
};

function quoteEnd(text, i) {
  for (let j = i + 1; j < text.length; j++) {
    if (space.test(text[j])) return -1;
    if (text[j] === '\\') j++;
    else if (text[j] === text[i]) return j;
  }
  return -1;
}

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

const boxProperty =
  /^(margin|padding|inset|scroll-margin|scroll-padding|border-width|border-style|border-color)$/;
function lopsided(property, value) {
  const parts = (v) => splitTop(v.replace(/!\s*important\s*$/i, '').replace(/\s+/g, ' ').trim()
    .toLowerCase(), ' ').filter(Boolean);
  if (boxProperty.test(property)) {
    const p = parts(value);
    return p.length === 4 && p[1] !== p[3];
  }
  if (property === 'border-radius') {
    return value.split('/').some((v) => {
      const p = parts(v);
      if (p.length === 2) return p[0] !== p[1];
      if (p.length === 3) return p[0] !== p[1] || p[2] !== p[1];
      return p.length === 4 && (p[0] !== p[1] || p[2] !== p[3]);
    });
  }
  return false;
}

function physicalDeclaration(property, value) {
  const name = property.toLowerCase();
  if ((!name.startsWith('--') && oneSide(name)) || oneSide(value)) return true;
  if (/^(transform|perspective)-origin$/.test(name)) {
    return !/^(center|top|bottom|50%)(\s|$)/i.test(value.trim());
  }
  if (name === 'cursor' && /(?<![\w-])([ns]?[ew]|nesw|nwse)-resize(?![\w-])/i.test(value)) {
    return true;
  }
  return lopsided(name, value);
}

const shorthandOf = { p: 'padding', m: 'margin', inset: 'inset', 'scroll-m': 'scroll-margin',
  'scroll-p': 'scroll-padding', rounded: 'border-radius', border: 'border-width' };

function isPhysical(base) {
  if (physical.some((re) => re.test(base))) return true;
  const property = /^\[(-{0,2}[A-Za-z][\w-]*):(.+)\](\/.+)?$/.exec(base);
  if (property) return physicalDeclaration(property[1], property[2].replaceAll('_', ' '));
  const value = /^([a-z][\w-]*?)-\[(.+)\](\/.+)?$/.exec(base);
  if (value) {
    if (oneSide(value[2])) return true;
    const shorthand = shorthandOf[value[1]];
    if (shorthand === undefined) return false;
    return lopsided(shorthand, value[2].replace(/^[a-z-]+:/, '').replaceAll('_', ' '));
  }
  return false;
}

const baseOf = (candidate) =>
  splitTop(candidate, ':').pop().replace(/^!/, '').replace(/!$/, '').replace(/^-/, '');

const directional = (candidate) => splitTop(candidate, ':').slice(0, -1).some((v) => v === 'rtl' || v === 'ltr');

const space = /\s/;
const before = new Set(['"', "'", '`', '.', '}', '>', '[']);
const after = new Set(['"', "'", '`', ']', '{', '=', '\\', '<']);
const classChar = /[A-Za-z0-9_\-.:!/%@*]/;

function classEnd(text, start) {
  if ('.:/%'.includes(text[start])) return -1;
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
        if (text[j + 1] === undefined || space.test(text[j + 1])) return -1;
        j++;
      } else if (c === '"' || c === "'" || c === '`') {
        j = quoteEnd(text, j);
        if (j < 0) return -1;
      } else if (c === '[' || c === '(') depth++;
      else if (c === ']' || c === ')') depth--;
    }
  }
}

function keyStart(text, end) {
  let depth = 0;
  let afterClose = -1;
  let s = end;
  for (; s > 0; s--) {
    const c = text[s - 1];
    if (c === ']' || c === ')') {
      if (depth++ === 0) afterClose = s;
    } else if ((c === '[' || c === '(') && depth > 0) depth--;
    else if (depth > 0 ? space.test(c) : c === ':' || !classChar.test(c)) break;
  }
  if (depth > 0) s = afterClose;
  while (s < end && '.:/%'.includes(text[s])) s++;
  return s < end ? s : -1;
}

function physicalClasses(text) {
  const spans = [];
  const add = (s, e) => {
    const base = baseOf(text.slice(s, e));
    if (base && isPhysical(base)) spans.push([s, e]);
  };
  for (let s = 0; s < text.length; s++) {
    if (s > 0 && !space.test(text[s - 1]) && !before.has(text[s - 1])) continue;
    const e = classEnd(text, s);
    if (e >= 0) add(s, text[e - 1] === ':' ? e - 1 : e);
  }
  for (let i = text.indexOf(':'); i >= 0; i = text.indexOf(':', i + 1)) {
    if (i + 1 < text.length && !space.test(text[i + 1])) continue;
    let first = keyStart(text, i);
    if (first < 0) {
      first = i;
      while (first > 0 && classChar.test(text[first - 1]) && text[first - 1] !== ':') first--;
    }
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

function preProcess(text, ext) {
  const out = text.split('');
  if (/^(json|jsonl|ndjson)$/.test(ext)) {
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '"') {
        for (i++; i < text.length && text[i] !== '"'; i += text[i] === '\\' ? 2 : 1);
      } else if ('[{]}'.includes(text[i])) out[i] = ' ';
    }
  } else if (/^mdx?$/.test(ext)) {
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

const scriptKind = { ts: ts.ScriptKind.TS, mts: ts.ScriptKind.TS, cts: ts.ScriptKind.TS,
  tsx: ts.ScriptKind.TSX, js: ts.ScriptKind.JS, mjs: ts.ScriptKind.JS, cjs: ts.ScriptKind.JS,
  jsx: ts.ScriptKind.JSX };
const styleFile = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)$/;
function parseScript(text, kind) {
  const mask = new Uint8Array(text.length);
  const cssImports = [];
  const file = ts.createSourceFile('scanned', text, ts.ScriptTarget.Latest, true, kind);
  const mark = (pos) => {
    const ranges = [...(ts.getLeadingCommentRanges(text, pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, pos) ?? [])];
    for (const r of ranges) mask.fill(1, r.pos, r.end);
  };
  const written = (node) => node !== undefined
    && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node));
  const imported = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && written(node.moduleSpecifier)) {
      return node.moduleSpecifier;
    }
    if (ts.isCallExpression(node) && written(node.arguments[0])
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      return node.arguments[0];
    }
    return undefined;
  };
  (function visit(node) {
    if (node.kind === ts.SyntaxKind.JsxText) return;
    const { FirstJSDocNode, LastJSDocNode } = ts.SyntaxKind;
    if (node.kind >= FirstJSDocNode && node.kind <= LastJSDocNode) return;
    const name = imported(node);
    if (name !== undefined && styleFile.test(name.text.replace(/[?#].*$/, ''))) {
      cssImports.push([name.text, name.getStart(file)]);
    }
    const children = node.getChildren(file);
    if (children.length === 0) mark(node.pos);
    else children.forEach(visit);
  })(file);
  return { mask, cssImports };
}

function readsTarget(from, target) {
  const bare = target.replace(/[?#].*$/, '');
  if (/^tailwindcss(\/|$)/.test(bare)) return true;
  if (!bare.startsWith('.') && !bare.startsWith('/')) return false;
  const full = bare.startsWith('/')
    ? path.join(root, bare)
    : path.join(root, path.dirname(from), bare);
  const relative = path.relative(root, full).split(path.sep).join('/');
  if (relative.startsWith('..')) return false;
  return read.has(relative) || read.has(`${relative}.css`);
}

function markupStyles(text) {
  const out = [];
  for (const m of text.matchAll(/<style(?=[\s/>])[^>]*>/gi)) {
    const start = m.index + m[0].length;
    const close = text.slice(start).search(/<\/style/i);
    const css = text.slice(start, close < 0 ? text.length : start + close);
    const blank = (marker) => ' '.repeat(marker.length);
    out.push([css.replace(/<!\[CDATA\[|\]\]>|<!--|-->/g, blank), start, true]);
  }
  for (const m of text.matchAll(/(?<![\w-])style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)) {
    const value = m[1] ?? m[2] ?? m[3];
    const valueStart = m.index + m[0].length - value.length - (m[3] === undefined ? 1 : 0);
    out.push([`*{${value}}`, valueStart - 2, false]);
  }
  return out;
}

function markupLinks(text) {
  const out = [];
  const attribute = (tag, name) => new RegExp(
    `(?<![\\w-])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`, 'i').exec(tag);
  for (const m of text.matchAll(/<link(?=[\s/>])[^>]*>/gi)) {
    const rel = attribute(m[0], 'rel');
    const href = attribute(m[0], 'href');
    if (!rel || !href || !/(^|\s)stylesheet(\s|$)/i.test(rel[1] ?? rel[2] ?? rel[3])) continue;
    out.push([href[1] ?? href[2] ?? href[3], m.index + href.index]);
  }
  return out;
}

function walk(dir, sub, found, above) {
  const real = fs.realpathSync(path.join(dir, sub));
  if (above.has(real)) return;
  const inside = new Set(above).add(real);
  for (const entry of fs.readdirSync(path.join(dir, sub), { withFileTypes: true })) {
    const p = path.join(sub, entry.name);
    const isFolder = entry.isDirectory()
      || (entry.isSymbolicLink() && fs.existsSync(path.join(dir, p))
        && fs.statSync(path.join(dir, p)).isDirectory());
    if (isFolder) {
      if (!ignoredDirs.has(entry.name)) walk(dir, p, found, inside);
    } else found.push(p);
  }
}

function listFiles(dir) {
  const git = (...args) => execFileSync('git', ['ls-files', '-z', ...args], {
    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28,
  }).split('\0').filter(Boolean);
  let listed;
  let ignoredTracked;
  try {
    listed = git('--cached', '--others', '--exclude-standard');
    ignoredTracked = new Set(git('--cached', '--ignored', '--exclude-standard'));
  } catch {
    listed = undefined;
  }
  const found = [];
  if (listed === undefined) walk(dir, '', found, new Set());
  else {
    for (const p of listed) {
      if (ignoredTracked.has(p)) continue;
      const full = path.join(dir, p);
      if (fs.lstatSync(full, { throwIfNoEntry: false })?.isSymbolicLink()
        && fs.existsSync(full) && fs.statSync(full).isDirectory()) {
        const above = new Set();
        for (let q = path.dirname(full); ; q = path.dirname(q)) {
          above.add(fs.realpathSync(q));
          if (path.relative(dir, q) === '') break;
        }
        if (!p.split('/').some((d) => ignoredDirs.has(d))) walk(dir, p, found, above);
      } else found.push(p);
    }
  }
  return [...new Set(found.map((p) => p.split(path.sep).join('/')))]
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

const self = path.relative(path.resolve(root), fileURLToPath(import.meta.url)).split(path.sep).join('/');
const files = listFiles(root).filter((name) => name !== self);

const checkedByHand = new Set([
  "src/index.css\t@source not '../scripts'",
]);

const read = new Set(files);
const hits = [];
const declarations = [];
const byHand = [];
const hitAt = new Set();
let fileIndex = 0;
function hit(name, lineOf, offset, text, comment) {
  if (hitAt.has(`${name}\0${offset}`)) return;
  hitAt.add(`${name}\0${offset}`);
  hits.push({ where: `${name}:${lineOf(offset)}`, text, comment, file: fileIndex, offset });
}

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
      const list = rule.raws.params?.raw ?? rule.params;
      const afterName = (rule.raws.afterName ?? '').length;
      const start = at + rule.source.start.offset + 1 + rule.name.length + afterName;
      for (const [candidate, offset] of applyList(list)) {
        if (!isPhysical(baseOf(candidate)) || directional(candidate)) continue;
        hit(name, lineOf, start + offset, candidate, false);
      }
      return;
    }
    const imported = keyword === 'import' || keyword === 'reference'
      ? /^(?:url\(\s*)?["']?([^"')\s;]+)/.exec(rule.params)?.[1] : undefined;
    const unread = imported !== undefined && !readsTarget(name, imported);
    const changesSources = ['source', 'plugin', 'config'].includes(keyword);
    if (unread || changesSources || /\bsource\(/.test(rule.params)) {
      const shown = `@${rule.name} ${rule.params}`.replace(/\s+/g, ' ');
      byHand.push(`${name}:${lineAt(rule)}\t${shown}\t(read by hand)`);
    }
  });
}

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
        else if (c === '"' || c === "'") {
          let j = i + 1;
          while (j < list.length && list[j] !== c) j += list[j] === '\\' ? 2 : 1;
          if (j < list.length) i = j;
        } else if (c === '[' || c === '(') depth++;
        else if ((c === ']' || c === ')') && depth > 0) depth--;
        i++;
      }
      out.push([list.slice(start, i), start]);
    }
  }
  return out;
}

for (const [index, name] of files.entries()) {
  fileIndex = index;
  const text = fs.readFileSync(path.join(root, name), 'utf8');
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
  const script = scriptKind[ext] === undefined ? null : parseScript(text, scriptKind[ext]);
  const mask = script?.mask ?? null;
  const unread = [...(script?.cssImports ?? []), ...(/^html?$/.test(ext) ? markupLinks(text) : [])]
    .filter(([target]) => !readsTarget(name, target));
  for (const [target, offset] of unread) {
    const where = `${name}:${lineOf(offset)}`;
    byHand.push(`${where}\tCSS from a file it does not read: ${target}\t(read by hand)`);
  }
  if (/^(html|htm|svg|xml)$/.test(ext)) {
    for (const [css, at, isStyleText] of markupStyles(text)) {
      checkCss(css, at, name, lineOf, isStyleText);
    }
  }
  for (const [candidate, offset] of physicalClasses(preProcess(text, ext))) {
    if (!directional(candidate)) hit(name, lineOf, offset, candidate, mask !== null && mask[offset] === 1);
  }
}

hits.sort((a, b) => a.file - b.file || a.offset - b.offset);
for (const h of hits) console.log(`${h.where}\t${h.text}${h.comment ? '\t(comment)' : ''}`);
for (const d of declarations) console.log(d);
const checked = (line) => checkedByHand.has(line.slice(0, line.lastIndexOf('\t')).replace(/:\d+\t/, '\t'));
for (const b of byHand) console.log(checked(b) ? b.replace(/\(read by hand\)$/, '(read by hand, checked)') : b);
const unchecked = byHand.filter((b) => !checked(b)).length;
const inCode = hits.filter((h) => !h.comment).length;
console.log(`\n${inCode} in code, ${hits.length - inCode} in comments, `
  + `${declarations.length} CSS declarations, ${byHand.length} lines to read by hand, `
  + `${unchecked} not checked (TypeScript ${ts.version}, PostCSS ${postcss().version})`);
process.exitCode = inCode > 0 || declarations.length > 0 || unchecked > 0 ? 1 : 0;
