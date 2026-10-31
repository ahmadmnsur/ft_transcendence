import type { Language } from '../i18n/types';

export function legalLanguage(fileName: string): Language {
  if (fileName.endsWith('.fr.md')) return 'fr';
  if (fileName.endsWith('.ar.md')) return 'ar';
  return 'en';
}

export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; children: InlineNode[] }
  | { kind: 'emphasis'; children: InlineNode[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: InlineNode[]; url: string };

export interface HeadingBlock {
  kind: 'heading';
  level: number;
  id: string;
  children: InlineNode[];
}

export interface ParagraphBlock {
  kind: 'paragraph';
  children: InlineNode[];
}

export interface BulletItem {
  children: InlineNode[];
  nested: BulletItem[];
}

export interface BulletListBlock {
  kind: 'bulletList';
  items: BulletItem[];
}

export interface NumberedItem {
  children: InlineNode[];
}

export interface NumberedListBlock {
  kind: 'numberedList';
  items: NumberedItem[];
}

export type TableCell = InlineNode[];

export interface TableBlock {
  kind: 'table';
  header: TableCell[];
  rows: TableCell[][];
}

export type Block = HeadingBlock | ParagraphBlock | BulletListBlock | NumberedListBlock | TableBlock;

interface Line {
  no: number;
  text: string;
  blank: boolean;
}

function fail(fileName: string, line: number, reason: string): never {
  throw new Error(`${fileName}:${line}: ${reason}`);
}

export function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case 'text':
          return node.text;
        case 'code':
          return node.text;
        case 'strong':
        case 'emphasis':
          return inlineText(node.children);
        case 'link':
          return inlineText(node.text);
      }
    })
    .join('');
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-');
}

function isBlankText(text: string): boolean {
  return /^ *$/.test(text);
}

function countIndent(text: string): number {
  let indent = 0;
  while (indent < text.length && text[indent] === ' ') indent += 1;
  return indent;
}

function isThematicBreak(text: string): boolean {
  const stripped = text.replace(/ /g, '');
  return stripped.length >= 3 && /^(?:\*+|-+|_+)$/.test(stripped);
}

function isSetextLine(text: string): boolean {
  return /^(=+|-+)$/.test(text.trim());
}

function isFence(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

function isBlockquote(text: string): boolean {
  return /^ {0,3}>/.test(text);
}

function isRefDef(text: string): boolean {
  return /^ {0,3}\[[^\]\n]+\]:/.test(text);
}

function isHtmlLine(text: string): boolean {
  return /^ {0,3}<[A-Za-z/?!]/.test(text);
}

function isTableRow(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 2 && trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isStarBullet(text: string): boolean {
  return /^ {0,3}[*+]( |$)/.test(text);
}

function isParenNumbered(text: string): boolean {
  return /^ {0,3}\d{1,9}\)/.test(text);
}

function isTaskListItem(text: string): boolean {
  return /^\[( |x|X)\] /.test(text);
}

function looksLikeDelimiterRow(text: string): boolean {
  return /^ {0,3}\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(text) && /[|:]/.test(text);
}

function headingInfo(text: string): { level: number } | { error: string } | null {
  const match = /^ {0,3}(#{1,7})(?:\s|$)/.exec(text);
  if (match) {
    if (match[1].length > 6) return { error: 'more than six `#` in a heading' };
    return { level: match[1].length };
  }
  if (/^ {0,3}#{7}/.test(text)) return { error: 'more than six `#` in a heading' };
  if (/^ {0,3}#/.test(text)) return { error: 'ATX heading needs one space after the `#` run' };
  return null;
}

function dashBulletMarker(text: string): { indent: number } | null {
  const match = /^( *)-(?:$| (?! ))/.exec(text);
  if (!match) return null;
  return { indent: match[1].length };
}

function hasBadMarkerSpace(text: string): boolean {
  return /^( *)-  /.test(text) || /^( *)\d{1,9}\.  /.test(text);
}

function throwIfBadMarkerSpace(fileName: string, lineNo: number, text: string): void {
  if (hasBadMarkerSpace(text)) {
    fail(fileName, lineNo, 'use exactly one space after the list marker');
  }
}

function numberedMarker(text: string): { indent: number; value: number; width: number } | null {
  const match = /^( *)(\d{1,9})\.(?:$| (?! ))/.exec(text);
  if (!match) return null;
  return { indent: match[1].length, value: Number(match[2]), width: match[1].length + match[2].length + 2 };
}

function continuesParagraph(text: string, marker: { value: number; width: number }): boolean {
  return marker.value !== 1 || text.slice(marker.width) === '';
}

const ENTITY_ANYWHERE = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/;

const EMAIL_AUTOLINK =
  /<[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*>/y;

const BARE_SCHEME = /(?:https?|ftp):\/\//iy;
const BARE_WWW = /www\./iy;
const BARE_EMAIL = /[\w.+-]+@[\w.-]*\.[A-Za-z0-9]/y;
const ENTITY_HERE = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/y;

const EMOJI_CODE = /:([a-z0-9_+-]+):/y;
const LETTERLESS_EMOJI_CODES = new Set(['+1', '-1', '100', '1234']);

const BARE_URL_REASON =
  'URL-like text (`http://`, `https://`, `ftp://`, `www.` or an email address) is not supported in prose; write [text](url) or put it in inline code';

function matchAt(pattern: RegExp, source: string, index: number, end: number): boolean {
  pattern.lastIndex = index;
  const found = pattern.exec(source);
  return found !== null && found.index + found[0].length <= end;
}

function isFlankWhitespace(char: string | undefined): boolean {
  return char !== undefined && /\s/u.test(char);
}

function isFlankPunctuation(char: string | undefined): boolean {
  return char !== undefined && /[!-/:-@[-`{-~]|\p{P}/u.test(char);
}

function prevCodePoint(source: string, index: number): string | undefined {
  if (index <= 0) return undefined;
  const trail = source.charCodeAt(index - 1);
  if (trail >= 0xdc00 && trail <= 0xdfff && index >= 2) {
    const lead = source.charCodeAt(index - 2);
    if (lead >= 0xd800 && lead <= 0xdbff) return source.slice(index - 2, index);
  }
  return source[index - 1];
}

function nextCodePoint(source: string, index: number, end: number): string | undefined {
  if (index >= end) return undefined;
  const lead = source.charCodeAt(index);
  if (lead >= 0xd800 && lead <= 0xdbff && index + 1 < end) {
    const trail = source.charCodeAt(index + 1);
    if (trail >= 0xdc00 && trail <= 0xdfff) return source.slice(index, index + 2);
  }
  return source[index];
}

function underscoreCanOpen(after: string | undefined, before: string | undefined): boolean {
  if (!isLeftFlanking(before, after)) return false;
  return !isRightFlanking(before, after) || (before !== undefined && isFlankPunctuation(before));
}

function underscoreCanClose(before: string | undefined, after: string | undefined): boolean {
  if (!isRightFlanking(before, after)) return false;
  return !isLeftFlanking(before, after) || (after !== undefined && isFlankPunctuation(after));
}

function isLeftFlanking(before: string | undefined, after: string | undefined): boolean {
  return (
    after !== undefined &&
    !isFlankWhitespace(after) &&
    (!isFlankPunctuation(after) || before === undefined || isFlankWhitespace(before) || isFlankPunctuation(before))
  );
}

function isRightFlanking(before: string | undefined, after: string | undefined): boolean {
  return (
    before !== undefined &&
    !isFlankWhitespace(before) &&
    (!isFlankPunctuation(before) || after === undefined || isFlankWhitespace(after) || isFlankPunctuation(after))
  );
}

function canEmphasisOpen(
  source: string,
  at: number,
  markerLength: number,
  start: number,
  end: number,
): boolean {
  return isLeftFlanking(
    at > start ? prevCodePoint(source, at) : undefined,
    nextCodePoint(source, at + markerLength, end),
  );
}

function canEmphasisClose(
  source: string,
  at: number,
  markerLength: number,
  start: number,
  end: number,
): boolean {
  return isRightFlanking(
    at > start ? prevCodePoint(source, at) : undefined,
    nextCodePoint(source, at + markerLength, end),
  );
}

function isUrlAllowed(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('mailto:')) return true;
  if (url.startsWith('#')) return true;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  return false;
}

function findBracketClose(source: string, from: number, end: number): number {
  let depth = 0;
  let i = from;
  while (i < end) {
    const char = source[i];
    if (char === '`') {
      const close = source.indexOf('`', i + 1);
      if (close < 0 || close >= end) {
        i += 1;
      } else {
        i = close + 1;
      }
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

function parseRange(
  source: string,
  fileName: string,
  lineAt: (index: number) => number,
  start: number,
  end: number,
  inLinkText: boolean,
  collectFragment?: (frag: string, line: number) => void,
): InlineNode[] {
  const nodes: InlineNode[] = [];
  let text = '';
  let i = start;

  function flushText(): void {
    if (text !== '') {
      nodes.push({ kind: 'text', text });
      text = '';
    }
  }

  function childrenOf(childStart: number, childEnd: number, inLink: boolean): InlineNode[] {
    return parseRange(source, fileName, lineAt, childStart, childEnd, inLink, collectFragment);
  }

  function skipCodeOrLink(j: number): number | null {
    const char = source[j];
    if (char === '`') {
      const close = source.indexOf('`', j + 1);
      return close < 0 || close >= end ? end : close + 1;
    }
    if (char === '[') {
      const close = findBracketClose(source, j, end);
      if (close >= 0 && close + 1 < end && source[close + 1] === '(') {
        const paren = source.indexOf(')', close + 2);
        return paren < 0 || paren >= end ? end : paren + 1;
      }
    }
    return null;
  }

  function parseLink(open: number): number {
    const close = findBracketClose(source, open, end);
    if (close >= 0 && source[open + 1] === '^') {
      fail(fileName, lineAt(open), 'footnotes (`[^…]`) are not supported');
    }
    if (close < 0 || close + 1 >= end || source[close + 1] !== '(') {
      text += '[';
      return open + 1;
    }
    if (close === open + 1) fail(fileName, lineAt(open), 'link with empty text is not supported');
    if (source[close + 2] === '<') {
      fail(fileName, lineAt(open), 'angle-bracket link destinations (`[text](<url>)`) are not supported');
    }
    const paren = source.indexOf(')', close + 2);
    if (paren < 0 || paren >= end) fail(fileName, lineAt(open), 'link destination is never closed');
    const target = source.slice(close + 2, paren);
    if (target === '') {
      fail(fileName, lineAt(open), 'link with an empty URL is not supported');
    }
    if (/\s/.test(target)) {
      if (/\S\s+["'(]/.test(target)) {
        fail(fileName, lineAt(open), 'link with a title (`[text](url "title")`) is not supported');
      }
      fail(fileName, lineAt(open), 'spaces in or around a link URL are not supported');
    }
    if (target.includes('"')) {
      fail(fileName, lineAt(open), 'quotes (`"`) in a link URL are not supported');
    }
    if (target.includes('\\')) {
      fail(fileName, lineAt(open), 'backslashes in a link URL are not supported');
    }
    if (target.includes('(') || target.includes(')')) {
      fail(fileName, lineAt(open), 'parentheses in a link URL are not supported');
    }
    if (ENTITY_ANYWHERE.test(target)) {
      fail(fileName, lineAt(open), 'HTML entities in a link URL are not supported');
    }
    if (!isUrlAllowed(target)) {
      fail(fileName, lineAt(open), `unsupported link URL ${JSON.stringify(target)}`);
    }
    if (target.startsWith('/') && target.includes('#')) {
      fail(fileName, lineAt(open), 'links to a section of another page are not supported');
    }
    if (target === '#') {
      fail(fileName, lineAt(open), 'link to an empty fragment `#` is not supported');
    }
    if (target.startsWith('#') && collectFragment) {
      collectFragment(target.slice(1), lineAt(open));
    }
    flushText();
    nodes.push({ kind: 'link', text: childrenOf(open + 1, close, true), url: target });
    return paren + 1;
  }

  function parseCode(open: number): number {
    const close = source.indexOf('`', open + 1);
    if (close < 0 || close >= end) fail(fileName, lineAt(open), 'unmatched backtick (inline code is never closed)');
    if (source[close + 1] === '`') {
      fail(fileName, lineAt(open), 'only single-backtick inline code is supported');
    }
    if (lineAt(close) !== lineAt(open)) {
      fail(fileName, lineAt(open), 'inline code cannot continue onto the next line; keep it on one line');
    }
    flushText();
    let codeText = source.slice(open + 1, close);
    if (codeText.length >= 2 && codeText.startsWith(' ') && codeText.endsWith(' ') && /[^ ]/.test(codeText)) {
      codeText = codeText.slice(1, -1);
    }
    nodes.push({ kind: 'code', text: codeText });
    return close + 1;
  }

  function findEmphasisClose(open: number, marker: string): number {
    let j = open + marker.length;
    while (j < end) {
      const char = source[j];
      if (char === '`' || char === '[') {
        if (char === '[' && source[j + 1] === '^') return -1;
        const skipped = skipCodeOrLink(j);
        if (skipped !== null) {
          j = skipped;
          continue;
        }
      }
      if (char === '*' && source.startsWith('***', j)) return -1;
      if (marker === '**' && source.startsWith('**', j)) {
        if (!canEmphasisClose(source, j, 2, start, end)) {
          fail(fileName, lineAt(j), 'emphasis marker cannot close here');
        }
        return j;
      }
      if (marker === '*' && char === '*') {
        if (source.startsWith('**', j)) {
          if (!canEmphasisOpen(source, j, 2, start, end)) {
            fail(fileName, lineAt(j), 'emphasis marker cannot open here');
          }
          const strongClose = findEmphasisClose(j, '**');
          if (strongClose < 0) return -1;
          j = strongClose + 2;
          continue;
        }
        if (!canEmphasisClose(source, j, 1, start, end)) {
          fail(fileName, lineAt(j), 'emphasis marker cannot close here');
        }
        return j;
      }
      j += 1;
    }
    return -1;
  }

  function parseEmphasis(open: number, marker: string): number {
    const close = findEmphasisClose(open, marker);
    if (close < 0) {
      fail(
        fileName,
        lineAt(open),
        marker === '**' ? 'unmatched `**` (strong emphasis is never closed)' : 'unmatched `*` (emphasis is never closed)',
      );
    }
    flushText();
    const children = childrenOf(open + marker.length, close, inLinkText);
    nodes.push(marker === '**' ? { kind: 'strong', children } : { kind: 'emphasis', children });
    return close + marker.length;
  }

  function findUnderscoreClose(from: number): boolean {
    let j = from;
    while (j < end) {
      const char = source[j];
      if (char === '`' || char === '[') {
        if (char === '[' && source[j + 1] === '^') return false;
        const skipped = skipCodeOrLink(j);
        if (skipped !== null) {
          j = skipped;
          continue;
        }
      }
      if (char === '_') {
        let runEnd = j;
        while (runEnd < end && source[runEnd] === '_') runEnd += 1;
        if (underscoreCanClose(prevCodePoint(source, j), nextCodePoint(source, runEnd, end))) {
          return true;
        }
        j = runEnd;
        continue;
      }
      j += 1;
    }
    return false;
  }

  while (i < end) {
    const char = source[i];
    if (!inLinkText) {
      const prev = i > start ? source[i - 1] : '';
      if ((i === start || !/[A-Za-z]/.test(prev)) && matchAt(BARE_SCHEME, source, i, end)) {
        fail(fileName, lineAt(i), BARE_URL_REASON);
      }
      const gfmBoundary = i === start || /\s/.test(prev) || prev === '*' || prev === '_' || prev === '~' || prev === '(';
      if (gfmBoundary && matchAt(BARE_WWW, source, i, end)) {
        fail(fileName, lineAt(i), BARE_URL_REASON);
      }
      if ((i === start || !/[A-Za-z0-9._+-]/.test(prev)) && matchAt(BARE_EMAIL, source, i, end)) {
        fail(fileName, lineAt(i), BARE_URL_REASON);
      }
    }
    if (char === '\\') fail(fileName, lineAt(i), 'backslashes (escapes) are not supported');
    if (char === '&') {
      if (matchAt(ENTITY_HERE, source, i, end)) {
        fail(fileName, lineAt(i), 'HTML entities are not supported');
      }
      text += char;
      i += 1;
      continue;
    }
    if (char === '<') {
      const next = i + 1 < end ? source[i + 1] : '';
      if (matchAt(EMAIL_AUTOLINK, source, i, end)) {
        fail(fileName, lineAt(i), 'angle-bracket autolinks are not supported; write [text](url)');
      }
      if (/[A-Za-z/!?]/.test(next)) {
        fail(fileName, lineAt(i), 'inline HTML and autolinks (`<…>`) are not supported');
      }
      text += char;
      i += 1;
      continue;
    }
    if (char === '!') {
      if (i + 1 < end && source[i + 1] === '[') {
        fail(fileName, lineAt(i), 'images (`![…]`) are not supported');
      }
      text += char;
      i += 1;
      continue;
    }
    if (char === ':') {
      EMOJI_CODE.lastIndex = i;
      const code = EMOJI_CODE.exec(source);
      if (
        code !== null &&
        code.index + code[0].length <= end &&
        (/[a-z]/.test(code[1]) || LETTERLESS_EMOJI_CODES.has(code[1]))
      ) {
        fail(fileName, lineAt(i), `\`${code[0]}\` is not supported outside inline code (GitHub can show it as an emoji)`);
      }
      text += char;
      i += 1;
      continue;
    }
    if (char === '~') {
      fail(fileName, lineAt(i), '`~` is not supported outside inline code (GitHub can read it as strikethrough)');
    }
    if (char === '_') {
      let runEnd = i;
      while (runEnd < end && source[runEnd] === '_') runEnd += 1;
      const runLength = runEnd - i;
      if (
        underscoreCanOpen(nextCodePoint(source, runEnd, end), prevCodePoint(source, i)) &&
        findUnderscoreClose(runEnd)
      ) {
        fail(fileName, lineAt(i), '`_` emphasis is not supported (only `*` and `**`)');
      }
      text += source.slice(i, runEnd);
      i = runEnd;
      continue;
    }
    if (char === '`') {
      if (source[i + 1] === '`') {
        fail(fileName, lineAt(i), 'only single-backtick inline code is supported');
      }
      i = parseCode(i);
      continue;
    }
    if (char === '*' && source.startsWith('***', i)) {
      fail(fileName, lineAt(i), '`***` is not supported');
    }
    if (char === '*' && source.startsWith('**', i)) {
      if (!canEmphasisOpen(source, i, 2, start, end)) {
        fail(fileName, lineAt(i), 'emphasis marker cannot open here');
      }
      i = parseEmphasis(i, '**');
      continue;
    }
    if (char === '*') {
      if (!canEmphasisOpen(source, i, 1, start, end)) {
        fail(fileName, lineAt(i), 'emphasis marker cannot open here');
      }
      i = parseEmphasis(i, '*');
      continue;
    }
    if (char === '[') {
      if (inLinkText) {
        const close = findBracketClose(source, i, end);
        if (close >= 0 && close + 1 < end && source[close + 1] === '(') {
          fail(fileName, lineAt(i), 'nested links are not supported');
        }
      }
      i = parseLink(i);
      continue;
    }
    text += char;
    i += 1;
  }
  flushText();
  return nodes;
}

function parseInline(
  source: string,
  fileName: string,
  lineAt: (index: number) => number,
  collectFragment?: (frag: string, line: number) => void,
): InlineNode[] {
  return parseRange(source, fileName, lineAt, 0, source.length, false, collectFragment);
}

function splitRowCells(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  for (const char of row) {
    if (char === '|') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  if (cells.length > 0 && cells[0].trim() === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((cell) => cell.trim());
}

export function parseMarkdown(source: string, fileName: string): Block[] {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rawLines = normalized.split('\n');

  const hardBreakLines = new Set<number>();

  const lines: Line[] = rawLines.map((raw, index) => {
    const no = index + 1;
    if (raw.includes('\t')) fail(fileName, no, 'tab characters are not supported');
    if (/[\x00-\x08\x0B-\x1F\x7F-\x9F]/.test(raw)) fail(fileName, no, 'control characters are not supported');
    const spaceCheck = legalLanguage(fileName) === 'fr' ? raw.replace(/[\u00A0\u202F]/g, '') : raw;
    if (/[\u00A0\u1680\u2000-\u200D\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]/.test(spaceCheck)) {
      fail(fileName, no, 'non-breaking or invisible spaces are not supported; use a plain space');
    }
    if (isBlankText(raw)) return { no, text: '', blank: true };
    if (/ {2,}$/.test(raw)) hardBreakLines.add(no);
    return { no, text: raw.replace(/ +$/, ''), blank: false };
  });

  const blocks: Block[] = [];
  let i = 0;
  const fragments: { frag: string; line: number }[] = [];
  const usedIds = new Set<string>();

  function collectFragment(frag: string, line: number): void {
    fragments.push({ frag, line });
  }

  function inlineOf(text: string, no: number): InlineNode[] {
    return parseInline(text, fileName, () => no, collectFragment);
  }

  function inlineOfJoined(parts: { text: string; no: number }[]): InlineNode[] {
    const joined = parts.map((part) => part.text).join(' ');
    const firstBracket = joined.indexOf('[');
    const firstNonSpace = joined.search(/[^ ]/);
    if (firstNonSpace >= 0 && firstBracket === firstNonSpace) {
      const close = findBracketClose(joined, firstBracket, joined.length);
      if (close >= 0 && joined[close + 1] === ':') {
        fail(fileName, parts[0].no, 'link reference definitions (`[label]: url`) are not supported');
      }
    }
    const lineAt = (index: number): number => {
      let offset = 0;
      for (const part of parts) {
        if (index <= offset + part.text.length) return part.no;
        offset += part.text.length + 1;
      }
      return parts[parts.length - 1].no;
    };
    return parseInline(joined, fileName, lineAt, collectFragment);
  }

  function throwIfInnerHardBreak(parts: { text: string; no: number }[]): void {
    for (let k = 0; k + 1 < parts.length; k += 1) {
      if (hardBreakLines.has(parts[k].no)) {
        fail(fileName, parts[k].no, 'two or more spaces at the end of a line are not supported here; remove them');
      }
    }
  }

  function throwIfSpecialLine(line: Line, inParagraph: boolean): void {
    const text = line.text;
    throwIfBadMarkerSpace(fileName, line.no, text);
    if (isBlockquote(text)) fail(fileName, line.no, 'blockquotes (`>`) are not supported');
    if (isFence(text)) fail(fileName, line.no, 'fenced code blocks (``` or ~~~) are not supported');
    if (/^=+$/.test(text.trim()) || (inParagraph && isSetextLine(text))) {
      fail(fileName, line.no, 'setext headings (`===` / `---` under text) are not supported');
    }
    if (isThematicBreak(text)) fail(fileName, line.no, 'thematic breaks (`---`, `***`, `___`) are not supported');
    if (isRefDef(text)) fail(fileName, line.no, 'link reference definitions (`[label]: url`) are not supported');
    const heading = headingInfo(text);
    if (heading && 'error' in heading) fail(fileName, line.no, heading.error);
    if (heading) {
      if (inParagraph) fail(fileName, line.no, 'blank line required before a heading');
      return;
    }
    if (isStarBullet(text)) fail(fileName, line.no, 'only `-` bullets are supported (not `*` or `+`)');
    if (isParenNumbered(text)) fail(fileName, line.no, 'only `1.` numbered items are supported (not `1)`)');
    const dash = dashBulletMarker(text);
    if (dash && dash.indent === 0) {
      if (inParagraph) fail(fileName, line.no, 'blank line required before a list');
      return;
    }
    if (dash && dash.indent <= 3) {
      fail(fileName, line.no, 'a list item outside a list starts at the beginning of the line');
    }
    const numbered = numberedMarker(text);
    if (numbered && inParagraph && continuesParagraph(text, numbered)) {
      fail(fileName, line.no, 'a paragraph line cannot start with a number and `.`; rewrap the line');
    }
    if (numbered && numbered.indent === 0) {
      if (inParagraph) fail(fileName, line.no, 'blank line required before a list');
      return;
    }
    if (numbered && numbered.indent <= 3) {
      fail(fileName, line.no, 'a list item outside a list starts at the beginning of the line');
    }
    if (/^ {4}/.test(text)) fail(fileName, line.no, 'indented code blocks are not supported');
    if (looksLikeDelimiterRow(text)) {
      if (!isTableRow(text)) fail(fileName, line.no, 'pipe table rows need a leading and a trailing `|`');
      if (inParagraph) {
        if (isTableRow(lines[line.no - 2].text)) fail(fileName, line.no - 1, 'blank line required before a table');
        fail(fileName, line.no - 1, 'a table header row needs a leading and a trailing `|`');
      }
    }
    if (isTableRow(text)) {
      if (inParagraph) fail(fileName, line.no, 'blank line required before a table');
      return;
    }
    if (isHtmlLine(text) && !inParagraph) fail(fileName, line.no, 'HTML blocks are not supported');
  }

  function throwIfContinuationBlock(rest: string, lineNo: number): void {
    if (/^ /.test(rest)) fail(fileName, lineNo, "a list continuation line is indented more than its item's text");
    if (isBlockquote(rest)) fail(fileName, lineNo, 'blockquotes (`>`) are not supported');
    if (isFence(rest)) fail(fileName, lineNo, 'fenced code blocks (``` or ~~~) are not supported');
    if (isSetextLine(rest)) fail(fileName, lineNo, 'setext headings (`===` / `---` under text) are not supported');
    if (isThematicBreak(rest)) fail(fileName, lineNo, 'thematic breaks (`---`, `***`, `___`) are not supported');
    if (isRefDef(rest)) fail(fileName, lineNo, 'link reference definitions (`[label]: url`) are not supported');
    const heading = headingInfo(rest);
    if (heading && 'error' in heading) fail(fileName, lineNo, heading.error);
    if (heading) fail(fileName, lineNo, 'ATX headings cannot continue a list item');
    if (isStarBullet(rest)) fail(fileName, lineNo, 'only `-` bullets are supported (not `*` or `+`)');
    if (isParenNumbered(rest)) fail(fileName, lineNo, 'only `1.` numbered items are supported (not `1)`)');
    if (/^(?:-|\d{1,9}\.)(?: |$)/.test(rest)) {
      fail(fileName, lineNo, "a list marker cannot start a list item's text; nested items go on their own line");
    }
    if (looksLikeDelimiterRow(rest) && !isTableRow(rest)) {
      fail(fileName, lineNo, 'pipe table rows need a leading and a trailing `|`');
    }
    if (isTableRow(rest)) fail(fileName, lineNo, 'pipe table rows cannot continue a list item');
    if (isHtmlLine(rest)) fail(fileName, lineNo, 'HTML blocks are not supported');
  }

  function parseHeading(line: Line): HeadingBlock {
    const info = headingInfo(line.text);
    if (!info || 'error' in info) fail(fileName, line.no, 'ATX heading needs one space after the `#` run');
    const level = info.level;
    const content = line.text.replace(/^ {0,3}#{1,6} */, '');
    if (/(?:^| +)#+$/.test(content)) fail(fileName, line.no, 'ATX headings with a closing `#` sequence are not supported');
    const children = inlineOf(content, line.no);
    const base = slugifyHeading(inlineText(children));
    let id = base;
    let n = 0;
    while (usedIds.has(id)) {
      n += 1;
      id = `${base}-${n}`;
    }
    usedIds.add(id);
    return { kind: 'heading', level, id, children };
  }

  function parseParagraph(): ParagraphBlock {
    const parts: { text: string; no: number }[] = [];
    while (i < lines.length && !lines[i].blank) {
      const line = lines[i];
      if (/^ {4}/.test(line.text)) {
        parts.push({ text: line.text.replace(/^ +/, ''), no: line.no });
        i += 1;
        continue;
      }
      if (!isHtmlLine(line.text)) throwIfSpecialLine(line, true);
      parts.push({ text: line.text, no: line.no });
      i += 1;
    }
    throwIfInnerHardBreak(parts);
    return { kind: 'paragraph', children: inlineOfJoined(parts) };
  }

  interface OpenItem {
    parts: { text: string; no: number }[];
    nested: { parts: { text: string; no: number }[] }[];
  }

  function finishTopItem(list: BulletListBlock, open: OpenItem | null): void {
    if (!open) return;
    throwIfInnerHardBreak(open.parts);
    const items = open.nested.map((child) => {
      throwIfInnerHardBreak(child.parts);
      return { children: inlineOfJoined(child.parts), nested: [] };
    });
    list.items.push({ children: inlineOfJoined(open.parts), nested: items });
  }

  function parseBulletList(): BulletListBlock {
    const list: BulletListBlock = { kind: 'bulletList', items: [] };
    let open: OpenItem | null = null;
    let openNested: { parts: { text: string; no: number }[] } | null = null;

    function closeNested(): void {
      if (open && openNested) {
        open.nested.push(openNested);
        openNested = null;
      }
    }

    while (i < lines.length) {
      const line = lines[i];
      if (line.blank) {
        let j = i + 1;
        while (j < lines.length && lines[j].blank) j += 1;
        if (j < lines.length) {
          const dash = dashBulletMarker(lines[j].text);
          if (dash && dash.indent <= 2) {
            fail(fileName, lines[j].no, 'loose lists (a blank line between items) are not supported');
          }
          if (/^ /.test(lines[j].text)) {
            fail(fileName, lines[j].no, 'an indented line after a blank line belongs to the list item above (a loose list item); this is not supported');
          }
        }
        closeNested();
        finishTopItem(list, open);
        i = j;
        return list;
      }
      throwIfBadMarkerSpace(fileName, line.no, line.text);
      const dash = dashBulletMarker(line.text);
      if (dash && dash.indent === 0) {
        closeNested();
        finishTopItem(list, open);
        const itemText = line.text.slice(2);
        if (isTaskListItem(itemText)) {
          fail(fileName, line.no, 'task list items (`- [ ]` / `- [x]`) are not supported');
        }
        if (itemText === '') {
          fail(fileName, line.no, 'empty list items are not supported');
        }
        throwIfContinuationBlock(itemText, line.no);
        open = { parts: [{ text: itemText, no: line.no }], nested: [] };
        openNested = null;
        i += 1;
        continue;
      }
      if (dash && dash.indent === 2) {
        if (!open) fail(fileName, line.no, 'nested `-` item with no parent item');
        if (openNested) open.nested.push(openNested);
        const itemText = line.text.slice(4);
        if (isTaskListItem(itemText)) {
          fail(fileName, line.no, 'task list items (`- [ ]` / `- [x]`) are not supported');
        }
        if (itemText === '') {
          fail(fileName, line.no, 'empty list items are not supported');
        }
        throwIfContinuationBlock(itemText, line.no);
        openNested = { parts: [{ text: itemText, no: line.no }] };
        i += 1;
        continue;
      }
      if (dash) {
        if (openNested && dash.indent >= 4) {
          fail(fileName, line.no, 'nesting deeper than one level is not supported');
        }
        fail(fileName, line.no, 'nested `-` items are indented exactly 2 spaces');
      }
      const numbered = numberedMarker(line.text);
      if (numbered && numbered.indent === 0) {
        closeNested();
        finishTopItem(list, open);
        return list;
      }
      if (numbered && numbered.indent >= (openNested ? 4 : 2) && continuesParagraph(line.text, numbered)) {
        fail(fileName, line.no, 'a line inside a list item cannot start with a number and `.`; rewrap the line');
      }
      if (numbered) fail(fileName, line.no, 'only one nested `-` level is supported (no numbered nesting)');
      if (/^ {4}/.test(line.text)) {
        if (openNested && /^ {4}[^ ]/.test(line.text)) {
          const rest = line.text.slice(4);
          throwIfContinuationBlock(rest, line.no);
          openNested.parts.push({ text: rest, no: line.no });
          i += 1;
          continue;
        }
        fail(fileName, line.no, `list continuation lines are indented exactly ${openNested ? 4 : 2} spaces`);
      }
      if (/^ {2}[^ ]/.test(line.text)) {
        if (!open) fail(fileName, line.no, 'list continuation with no parent item');
        if (openNested) {
          fail(fileName, line.no, 'lazy continuation lines are not supported (indent a line under a nested item by 4 spaces)');
        }
        const rest = line.text.slice(2);
        throwIfContinuationBlock(rest, line.no);
        open.parts.push({ text: rest, no: line.no });
        i += 1;
        continue;
      }
      throwIfSpecialLine(line, false);
      if (isTableRow(line.text)) {
        fail(fileName, line.no, 'blank line required before a table');
      }
      if (headingInfo(line.text)) {
        if (countIndent(line.text) >= 2) {
          fail(fileName, line.no, 'ATX headings cannot continue a list item');
        }
        closeNested();
        finishTopItem(list, open);
        return list;
      }
      if (/^ /.test(line.text)) {
        fail(fileName, line.no, `list continuation lines are indented exactly ${openNested ? 4 : 2} spaces`);
      }
      if (isHtmlLine(line.text)) fail(fileName, line.no, 'HTML blocks are not supported');
      fail(fileName, line.no, 'lazy continuation lines are not supported (indent the line by 2 spaces)');
    }
    closeNested();
    finishTopItem(list, open);
    return list;
  }

  function parseNumberedList(): NumberedListBlock {
    const list: NumberedListBlock = { kind: 'numberedList', items: [] };
    let expected = 1;
    let open: { parts: { text: string; no: number }[]; width: number } | null = null;

    function closeOpen(): void {
      if (open) {
        throwIfInnerHardBreak(open.parts);
        list.items.push({ children: inlineOfJoined(open.parts) });
        open = null;
      }
    }

    while (i < lines.length) {
      const line = lines[i];
      if (line.blank) {
        let j = i + 1;
        while (j < lines.length && lines[j].blank) j += 1;
        if (j < lines.length) {
          const next = numberedMarker(lines[j].text);
          if (next && next.indent === 0) {
            fail(fileName, lines[j].no, 'loose lists (a blank line between items) are not supported');
          }
          if (/^ /.test(lines[j].text)) {
            fail(fileName, lines[j].no, 'an indented line after a blank line belongs to the list item above (a loose list item); this is not supported');
          }
        }
        closeOpen();
        i = j;
        return list;
      }
      const dashFirst = dashBulletMarker(line.text);
      if (dashFirst && dashFirst.indent === 0) {
        closeOpen();
        return list;
      }
      if (dashFirst) fail(fileName, line.no, 'a nested list under a numbered item is not supported');
      const numbered = numberedMarker(line.text);
      if (numbered && numbered.indent === 0) {
        if (numbered.value !== expected) {
          fail(fileName, line.no, `numbered items must run 1, 2, 3… with no gap (expected ${expected})`);
        }
        expected += 1;
        closeOpen();
        const itemText = line.text.slice(numbered.width);
        if (isTaskListItem(itemText)) {
          fail(fileName, line.no, 'task list items (`- [ ]` / `- [x]`) are not supported');
        }
        if (itemText === '') {
          fail(fileName, line.no, 'empty list items are not supported');
        }
        throwIfContinuationBlock(itemText, line.no);
        open = {
          parts: [{ text: itemText, no: line.no }],
          width: numbered.width,
        };
        i += 1;
        continue;
      }
      if (numbered && open && numbered.indent >= open.width && continuesParagraph(line.text, numbered)) {
        fail(fileName, line.no, 'a line inside a list item cannot start with a number and `.`; rewrap the line');
      }
      if (numbered) fail(fileName, line.no, 'nested numbered lists are not supported');
      if (/^ /.test(line.text)) {
        if (!open) fail(fileName, line.no, 'list continuation with no parent item');
        if (countIndent(line.text) !== open.width) {
          fail(fileName, line.no, `list continuation lines are indented exactly ${open.width} spaces`);
        }
        const rest = line.text.slice(open.width);
        throwIfContinuationBlock(rest, line.no);
        open.parts.push({ text: rest, no: line.no });
        i += 1;
        continue;
      }
      throwIfSpecialLine(line, false);
      if (isTableRow(line.text)) {
        fail(fileName, line.no, 'blank line required before a table');
      }
      if (headingInfo(line.text)) {
        closeOpen();
        return list;
      }
      if (isHtmlLine(line.text)) fail(fileName, line.no, 'HTML blocks are not supported');
      fail(fileName, line.no, 'lazy continuation lines are not supported (indent the line to the item text)');
    }
    closeOpen();
    return list;
  }

  function parseTable(headerLine: Line): TableBlock {
    if (looksLikeDelimiterRow(headerLine.text)) {
      fail(fileName, headerLine.no, 'a table starts with its header row, not a delimiter row (`| --- |`)');
    }
    if (headerLine.text.includes('\\')) {
      fail(fileName, headerLine.no, 'backslashes (escapes) are not supported');
    }
    const headerCells = splitRowCells(headerLine.text.trim());
    const delimiter = lines[i + 1];
    if (!delimiter || delimiter.blank || !isTableRow(delimiter.text)) {
      fail(fileName, headerLine.no, 'table without its delimiter row (`| --- | … |`)');
    }
    if (delimiter.text.includes('\\')) {
      fail(fileName, delimiter.no, 'backslashes (escapes) are not supported');
    }
    const delimiterCells = splitRowCells(delimiter.text.trim());
    if (delimiterCells.length !== headerCells.length) {
      fail(
        fileName,
        delimiter.no,
        `table row has ${delimiterCells.length} cells but the header has ${headerCells.length}`,
      );
    }
    for (const cell of delimiterCells) {
      if (/^:?-+:?$/.test(cell)) {
        if (cell.includes(':')) fail(fileName, delimiter.no, 'alignment colons in the delimiter row are not supported');
      } else {
        fail(fileName, headerLine.no, 'table without its delimiter row (`| --- | … |`)');
      }
    }
    const rows: TableCell[][] = [];
    i += 2;
    while (i < lines.length && !lines[i].blank && isTableRow(lines[i].text)) {
      const rowLine = lines[i];
      if (rowLine.text.includes('\\')) {
        fail(fileName, rowLine.no, 'backslashes (escapes) are not supported');
      }
      const texts = splitRowCells(rowLine.text.trim());
      if (texts.length !== headerCells.length) {
        fail(fileName, rowLine.no, `table row has ${texts.length} cells but the header has ${headerCells.length}`);
      }
      rows.push(texts.map((cell) => inlineOf(cell, rowLine.no)));
      i += 1;
    }
    if (i < lines.length && !lines[i].blank) {
      fail(fileName, lines[i].no, 'blank line required after a table');
    }
    return {
      kind: 'table',
      header: headerCells.map((cell) => inlineOf(cell, headerLine.no)),
      rows,
    };
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.blank) {
      i += 1;
      continue;
    }
    throwIfSpecialLine(line, false);
    const heading = headingInfo(line.text);
    if (heading && !('error' in heading)) {
      blocks.push(parseHeading(line));
      i += 1;
      continue;
    }
    const dash = dashBulletMarker(line.text);
    if (dash && dash.indent === 0) {
      blocks.push(parseBulletList());
      continue;
    }
    const numbered = numberedMarker(line.text);
    if (numbered && numbered.indent === 0) {
      if (numbered.value !== 1) {
        fail(fileName, line.no, 'numbered lists must start at 1');
      }
      blocks.push(parseNumberedList());
      continue;
    }
    if (isTableRow(line.text)) {
      blocks.push(parseTable(line));
      continue;
    }
    if (isHtmlLine(line.text)) fail(fileName, line.no, 'HTML blocks are not supported');
    blocks.push(parseParagraph());
  }
  const headingIds = new Set<string>();
  for (const block of blocks) {
    if (block.kind === 'heading') headingIds.add(block.id);
  }
  for (const { frag, line } of fragments) {
    let decoded = frag;
    try {
      decoded = decodeURIComponent(frag);
    } catch {
      fail(fileName, line, 'malformed percent-encoding in a link fragment');
    }
    if (!headingIds.has(decoded)) {
      fail(fileName, line, `link to #${frag} matches no heading in this document`);
    }
  }
  return blocks;
}
