import { Fragment, useMemo } from 'react';
import { useI18n } from '../i18n/context';
import { direction } from '../i18n/language';
import type { Language } from '../i18n/types';
import { BRAND } from '../layout';
import {
  inlineText,
  parseMarkdown,
  type Block,
  type BulletItem,
  type InlineNode,
  type NumberedItem,
  type TableBlock,
} from './parse';

// The long-form reading surface for the legal pages (§3.5.4). All text
// arrives as React text children, so everything is escaped by construction.

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function Inline({ node }: { node: InlineNode }): React.JSX.Element | string {
  switch (node.kind) {
    case 'text':
      // The product name is isolated, as every value in the SPA's own text is (§3.5.5): in an
      // Arabic page, `21 Beirut` would otherwise read `Beirut 21`.
      return (
        <>
          {node.text.split(BRAND).map((part, index) => (
            <Fragment key={index}>
              {index > 0 && <bdi>{BRAND}</bdi>}
              {part}
            </Fragment>
          ))}
        </>
      );
    case 'code':
      return <code dir="ltr" className="whitespace-pre-wrap rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.875em] text-ink">{node.text}</code>;
    case 'strong':
      return (
        <strong className="font-semibold text-ink">
          <Inlines nodes={node.children} />
        </strong>
      );
    case 'emphasis':
      return (
        <em className="italic">
          <Inlines nodes={node.children} />
        </em>
      );
    case 'link':
      return (
        <a
          href={node.url}
          rel={isExternalUrl(node.url) ? 'noreferrer' : undefined}
          className="rounded-sm text-link underline decoration-1 underline-offset-2 focus-ring hover:decoration-2"
        >
          <Inlines nodes={node.text} />
        </a>
      );
  }
}

function Inlines({ nodes }: { nodes: InlineNode[] }): React.JSX.Element {
  return (
    <>
      {nodes.map((node, index) => (
        <Inline key={index} node={node} />
      ))}
    </>
  );
}

function BulletListItem({ item }: { item: BulletItem }): React.JSX.Element {
  return (
    <li>
      <Inlines nodes={item.children} />
      {item.nested.length > 0 && (
        <ul className="mt-2 list-[circle] space-y-2 ps-6 marker:text-ink-subtle">
          {item.nested.map((child, index) => (
            <li key={index}>
              <Inlines nodes={child.children} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function NumberedListItem({ item }: { item: NumberedItem }): React.JSX.Element {
  return (
    <li>
      <Inlines nodes={item.children} />
    </li>
  );
}

// Every cell's text sits at its start. A <th> is centred when its row's
// text-align is the initial `start`, so each header cell sets its own.
function LegalTable({
  block,
  label,
  tightTop,
}: {
  block: TableBlock;
  label: string;
  tightTop: boolean;
}): React.JSX.Element {
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={label}
      className={`overflow-x-auto rounded-lg border border-line bg-surface focus-ring ${
        tightTop ? 'mb-6 mt-2' : 'my-6'
      }`}
    >
      <table className="w-full border-collapse text-start text-sm leading-relaxed">
        <thead>
          <tr className="bg-surface-muted">
            {block.header.map((cell, index) => (
              <th key={index} scope="col" className="px-4 py-2.5 text-start align-bottom font-semibold text-ink">
                <Inlines nodes={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-t border-line px-4 py-3 align-top">
                  <Inlines nodes={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A paragraph that is exactly one bold phrase (`**Your account**`) labels
// the block under it, so it sits closer to its own block than to the last.
function isLabelParagraph(block: Block): boolean {
  return block.kind === 'paragraph' && block.children.length === 1 && block.children[0].kind === 'strong';
}

// Per-level heading classes; h4–h6 share one rung and h1 takes no top margin.
const HEADING_LOW_BASE_CLASS = 'mb-2 scroll-mt-6 text-balance text-base font-semibold text-ink';
const HEADING_BASE_CLASS: Record<number, string> = {
  1: 'scroll-mt-6 text-balance text-3xl font-semibold tracking-tight arabic:tracking-normal text-ink',
  2: 'mb-3 scroll-mt-6 text-balance text-xl font-semibold text-ink',
  3: 'mb-2 scroll-mt-6 text-balance text-lg font-semibold text-ink',
  4: HEADING_LOW_BASE_CLASS,
  5: HEADING_LOW_BASE_CLASS,
  6: HEADING_LOW_BASE_CLASS,
};
const HEADING_LOW_TOP_MARGIN = 'mt-6';
const HEADING_TOP_MARGIN: Record<number, string> = {
  2: 'mt-12',
  3: 'mt-8',
  4: HEADING_LOW_TOP_MARGIN,
  5: HEADING_LOW_TOP_MARGIN,
  6: HEADING_LOW_TOP_MARGIN,
};

function LegalBlock({
  block,
  label,
  tightTop,
  language,
}: {
  block: Block;
  label: string;
  tightTop: boolean;
  language: Language;
}): React.JSX.Element {
  switch (block.kind) {
    case 'heading': {
      // One element with a dynamic tag.
      const Heading = `h${block.level as 1 | 2 | 3 | 4 | 5 | 6}` as const;
      const base = HEADING_BASE_CLASS[block.level];
      const top = block.level === 1 ? '' : tightTop ? 'mt-2' : HEADING_TOP_MARGIN[block.level];
      return (
        <Heading id={block.id || undefined} className={top === '' ? base : `${base} ${top}`}>
          <Inlines nodes={block.children} />
        </Heading>
      );
    }
    case 'paragraph':
      return (
        <p className={isLabelParagraph(block) ? 'mt-8' : tightTop ? 'mt-2' : 'mt-4'}>
          <Inlines nodes={block.children} />
        </p>
      );
    case 'bulletList':
      return (
        <ul className={`list-disc space-y-2 ps-6 marker:text-ink-subtle ${tightTop ? 'mt-2' : 'mt-4'}`}>
          {block.items.map((item, index) => (
            <BulletListItem key={index} item={item} />
          ))}
        </ul>
      );
    case 'numberedList':
      return (
        <ol className={`${language === 'ar' ? 'list-[arabic-indic]' : 'list-decimal'} space-y-2 ps-6 marker:text-ink-subtle ${tightTop ? 'mt-2' : 'mt-4'}`}>
          {block.items.map((item, index) => (
            <NumberedListItem key={index} item={item} />
          ))}
        </ol>
      );
    case 'table':
      return <LegalTable block={block} label={label} tightTop={tightTop} />;
  }
}

export function LegalDocument({
  source,
  fileName,
  language,
}: {
  source: string;
  fileName: string;
  language: Language;
}): React.JSX.Element {
  const { t } = useI18n();
  const blocks = useMemo(() => parseMarkdown(source, fileName), [source, fileName]);
  // Each table names the nearest preceding heading, so the scroll region
  // has a label even though tables carry no caption of their own.
  let heading = '';
  const labelled = blocks.map((block, index) => {
    if (block.kind === 'heading') heading = inlineText(block.children);
    // A table before any heading still needs an accessible name.
    return { block, label: heading === '' ? t.legal.untitledTable : heading, tightTop: index > 0 && isLabelParagraph(blocks[index - 1]) };
  });
  return (
    <article
      lang={language}
      dir={direction[language]}
      className="mx-auto max-w-[68ch] text-base leading-relaxed text-ink selection:bg-primary-100 selection:text-primary-900 [&>h1+p]:border-b [&>h1+p]:border-line [&>h1+p]:pb-6 [&>h1+p]:text-sm [&>h1+p]:text-ink-muted [&>h1+p+*]:mt-6"
    >
      {labelled.map(({ block, label, tightTop }, index) => (
        <LegalBlock key={index} language={language} block={block} label={label} tightTop={tightTop} />
      ))}
    </article>
  );
}
