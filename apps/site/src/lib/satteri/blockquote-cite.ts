/**
 * blockquote 末尾の `-- 出典` 段落を figure > blockquote + figcaption に変換する HAST プラグイン。
 * 先頭は `-- `、`— `（em ダッシュ）、`– `（en ダッシュ）に対応。出典が URL 付きリンクなら blockquote[cite] にも設定し、
 * リンクなしなら cite 属性なし・figcaption はテキストのみ。
 *
 * 入力: `> 引用文` / `>` / `> -- [出典名](https://example.com)`
 * 出力:
 *   <figure class="b--blockquote">
 *     <blockquote cite="https://example.com"><p>引用文</p></blockquote>
 *     <figcaption><a href="https://example.com">出典名</a></figcaption>
 *   </figure>
 */
import { defineHastPlugin } from 'satteri';
import type { Element, ElementContent } from 'hast';

const CITE_PATTERN = /^(?:--|—|–)\s*/;

interface CiteInfo {
  text: string;
  url?: string;
}

function isBlankText(node: ElementContent): boolean {
  return node.type === 'text' && /^\s*$/.test(node.value);
}

function extractTextContent(element: Element): string {
  let text = '';
  for (const child of element.children) {
    if (child.type === 'text') {
      text += child.value;
    } else if (child.type === 'element') {
      text += extractTextContent(child);
    }
  }
  return text;
}

function extractCiteInfo(pElement: Element): CiteInfo | null {
  const pChildren = pElement.children;
  if (pChildren.length === 0) return null;

  const firstChild = pChildren[0];
  if (firstChild.type !== 'text') return null;
  if (!CITE_PATTERN.test(firstChild.value)) return null;

  const remainingText = firstChild.value.replace(CITE_PATTERN, '').trim();
  if (remainingText) {
    return { text: remainingText };
  }

  const secondChild = pChildren[1];
  if (secondChild?.type === 'element' && secondChild.tagName === 'a') {
    const href = secondChild.properties?.href;
    return { text: extractTextContent(secondChild), url: typeof href === 'string' ? href : undefined };
  }

  return null;
}

export const blockquoteCite = defineHastPlugin({
  name: 'blockquote-cite',
  element: {
    filter: ['blockquote'],
    visit(node) {
      const children = node.children;

      // 末尾の空白を除いて、最後の段落を出典として解析する
      let lastElementIndex = children.length - 1;
      while (lastElementIndex >= 0 && isBlankText(children[lastElementIndex])) {
        lastElementIndex--;
      }
      if (lastElementIndex < 0) return;

      const lastElement = children[lastElementIndex];
      if (lastElement.type !== 'element' || lastElement.tagName !== 'p') return;

      const citeInfo = extractCiteInfo(lastElement);
      if (!citeInfo) return;

      // 引用本文と出典を figure へ組み直す
      const blockquoteChildren = children.slice(0, lastElementIndex);
      while (blockquoteChildren.length > 0 && isBlankText(blockquoteChildren[blockquoteChildren.length - 1])) {
        blockquoteChildren.pop();
      }

      const figcaptionChildren: ElementContent[] = citeInfo.url
        ? [
            {
              type: 'element',
              tagName: 'a',
              properties: { href: citeInfo.url },
              children: [{ type: 'text', value: citeInfo.text }],
            },
          ]
        : [{ type: 'text', value: citeInfo.text }];

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['b--blockquote'] },
        children: [
          {
            type: 'element',
            tagName: 'blockquote',
            properties: citeInfo.url ? { cite: citeInfo.url } : {},
            children: blockquoteChildren,
          },
          { type: 'text', value: '\n' },
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: figcaptionChildren,
          },
        ],
      };
      return figure;
    },
  },
});
