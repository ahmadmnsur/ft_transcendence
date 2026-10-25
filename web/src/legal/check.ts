import { inlineText, type Block, type BulletItem, type InlineNode } from './parse';

export type LegalLanguage = 'en' | 'fr' | 'ar';

export function legalLanguage(fileName: string): LegalLanguage {
  if (fileName.endsWith('.fr.md')) return 'fr';
  if (fileName.endsWith('.ar.md')) return 'ar';
  return 'en';
}

// One inline run as plain text. A code span stands as U+FFFC, so its content is skipped but
// the spaces around it are not; a link counts by its text, never its URL.
function textRun(nodes: InlineNode[]): { text: string; emphasis: number[] } {
  let text = '';
  const emphasis: number[] = [];
  function append(children: InlineNode[]): void {
    for (const node of children) {
      switch (node.kind) {
        case 'text':
          text += node.text;
          break;
        case 'code':
          text += '\uFFFC';
          break;
        case 'emphasis':
          emphasis.push(text.length);
          append(node.children);
          break;
        case 'strong':
          append(node.children);
          break;
        case 'link':
          append(node.text);
          break;
      }
    }
  }
  append(nodes);
  return { text, emphasis };
}

// The legal check's text rules (§3.5.4): no italic and no vowel mark in an Arabic file, no
// plain space before `: ; ! ? »` or after `«` in a French one. A line break inside a
// paragraph is already a plain space in the parsed text.
export function checkLegalText(blocks: Block[], fileName: string): void {
  const language = legalLanguage(fileName);
  function check(nodes: InlineNode[]): void {
    const { text, emphasis } = textRun(nodes);
    function fail(reason: string, index: number): never {
      const excerpt = text.slice(Math.max(0, index - 20), index + 21);
      throw new Error(`${fileName}: ${reason}; near "${excerpt}"`);
    }
    if (language === 'ar') {
      const mark = /[\u064B-\u0652]/.exec(text);
      const italic = emphasis[0];
      if (italic !== undefined && (mark === null || italic <= mark.index)) {
        fail('italic is not used in Arabic; write **bold** where the English uses *italic*', italic);
      }
      if (mark !== null) {
        const code = mark[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
        fail(`U+${code}: the Arabic of the legal pages carries no vowel marks`, mark.index);
      }
    }
    if (language === 'fr') {
      const space = / [:;!?»]|« /.exec(text);
      if (space !== null) {
        const character = space[0].trim();
        fail(`plain space next to "${character}": French writes U+202F before ; ! ?, U+00A0 before : and inside « »`, space.index);
      }
    }
  }
  function items(children: BulletItem[]): void {
    for (const item of children) {
      check(item.children);
      items(item.nested);
    }
  }
  for (const block of blocks) {
    switch (block.kind) {
      case 'heading':
      case 'paragraph':
        check(block.children);
        break;
      case 'bulletList':
        items(block.items);
        break;
      case 'numberedList':
        for (const item of block.items) check(item.children);
        break;
      case 'table':
        for (const cell of block.header) check(cell);
        for (const row of block.rows) for (const cell of row) check(cell);
        break;
    }
  }
}

export interface LegalDate {
  year: number;
  month: number;
  day: number;
  written: string;
}

// Fixed month names and digit conversion keep dates independent of the host (§3.5.4).
const months: Record<LegalLanguage, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};
const dateLabels: Record<LegalLanguage, string> = {
  en: 'Last updated:',
  fr: 'Dernière mise à jour\u00A0:',
  ar: 'آخر تحديث:',
};
const examples: Record<LegalLanguage, string> = {
  en: '25 October 2026',
  fr: '25 octobre 2026',
  ar: '٢٥ أكتوبر ٢٠٢٦',
};

// The date at the end of the line under the title, read in the file's own language.
export function readLegalDate(blocks: Block[], fileName: string): LegalDate {
  const language = legalLanguage(fileName);
  function fail(): never {
    throw new Error(`${fileName}: the line under the title must end with ${dateLabels[language]} <day> <month> <year>, for example ${dateLabels[language]} ${examples[language]}`);
  }
  if (blocks[0]?.kind !== 'heading' || blocks[0].level !== 1 || blocks[1]?.kind !== 'paragraph') fail();
  const text = inlineText(blocks[1].children);
  const digits = language === 'ar' ? '[٠-٩]' : '[0-9]';
  const pattern = new RegExp(`${dateLabels[language]} (${digits}{1,2}) (${months[language].join('|')}) (${digits}{4})$`);
  const match = pattern.exec(text);
  if (match === null) fail();
  const [, dayText, monthText, yearText] = match;
  const zero = language === 'ar' ? '٠' : '0';
  if (dayText.startsWith(zero)) fail();
  function number(written: string): number {
    let value = 0;
    for (const digit of written) value = value * 10 + digit.charCodeAt(0) - zero.charCodeAt(0);
    return value;
  }
  const day = number(dayText);
  const year = number(yearText);
  const month = months[language].indexOf(monthText) + 1;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]) fail();
  return { year, month, day, written: `${dayText} ${monthText} ${yearText}` };
}

// The three versions of a page share one *Last updated* date (§3.5.4); English comes first.
export function checkSameDate(versions: { fileName: string; date: LegalDate }[]): void {
  const english = versions[0];
  if (english === undefined) return;
  const differences = versions.slice(1).filter(({ date }) =>
    date.day !== english.date.day || date.month !== english.date.month || date.year !== english.date.year,
  );
  if (differences.length > 0) {
    const details = differences.map(({ fileName, date }) =>
      `${fileName}: ${date.written} differs from ${english.fileName}: ${english.date.written}`,
    ).join('; ');
    throw new Error(`${details}; the English, French and Arabic versions of a page share one Last updated date (§3.5.4)`);
  }
}
