/**
 * <div class="c--docsNote"> を GFM Alert（`> [!NOTE]`）の blockquote へ変換する rehype プラグイン。
 * 色（--keycolor）→種別は COLOR_TO_ALERT（色と preset の対応は mdx/Callout.astro）。未知の色・keycolor なしは NOTE。
 * アイコン要素は除去し、タイトルは <strong> 段落として Alert 内に残す。
 *
 * 入力: <div class="c--docsNote" style="--keycolor:var(--blue)"><div class="c--docsNote_icon">…</div><p>本文</p></div>
 * 出力: <blockquote><p>[!NOTE]</p><p>本文</p></blockquote>（後段の rehype-remark が `> [!NOTE]` にする）
 */
import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent, Parents } from 'hast';
import { hasClass } from './util';

type GfmAlertType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const COLOR_TO_ALERT: Record<string, GfmAlertType> = {
  blue: 'NOTE',
  green: 'TIP',
  gray: 'NOTE',
  grey: 'NOTE',
  orange: 'IMPORTANT',
  yellow: 'WARNING',
  red: 'CAUTION',
  purple: 'NOTE',
};

const KEYCOLOR_RE = /--keycolor:\s*var\(--([a-z]+)\)/i;

function detectAlertType(node: Element): GfmAlertType {
  const style = node.properties?.style;
  if (typeof style === 'string') {
    const m = style.match(KEYCOLOR_RE);
    if (m && COLOR_TO_ALERT[m[1].toLowerCase()]) {
      return COLOR_TO_ALERT[m[1].toLowerCase()];
    }
  }
  return 'NOTE';
}

/** c--docsNote_title の div を <strong> 段落に変換する（他の子はそのまま） */
function transformChild(child: ElementContent): ElementContent {
  if (child.type !== 'element') return child;
  if (child.tagName !== 'div') return child;
  if (!hasClass(child, 'c--docsNote_title')) return child;

  return {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'strong',
        properties: {},
        children: child.children,
      },
    ],
  } satisfies Element;
}

export function rehypeCallouts() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Parents | undefined) => {
      if (index === undefined || !parent) return;
      if (node.tagName !== 'div') return;
      if (!hasClass(node, 'c--docsNote')) return;

      const alertType = detectAlertType(node);

      // アイコン要素を除去し、callout_title を strong 化
      const bodyChildren: ElementContent[] = [];
      for (const child of node.children) {
        if (child.type === 'element' && hasClass(child, 'c--docsNote_icon')) continue;
        bodyChildren.push(transformChild(child));
      }

      const blockquote: Element = {
        type: 'element',
        tagName: 'blockquote',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: `[!${alertType}]` }],
          },
          ...bodyChildren,
        ],
      };

      parent.children[index] = blockquote;
    });
  };
}
