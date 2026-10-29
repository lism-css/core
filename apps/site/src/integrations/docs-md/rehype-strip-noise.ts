/**
 * .md 出力に不要な要素・属性を除去する rehype プラグイン。
 *
 * - <nav class="c--postNav">: 前後記事ナビ
 * - <button class="c--copyBtn">: コピーボタン
 *   （内側に display:none のラベル span がありテキストが漏れるため）
 * - <script> / <style>: クライアント側の挙動・装飾用（Markdown には不要）
 * - data-astro-cid-* 属性: Astro のスコープ CSS 識別子
 */
import { visit, SKIP } from 'unist-util-visit';
import type { Root, Element, Parents } from 'hast';
import { hasClass } from './util';

const DROP_TAG = new Set(['script', 'style']);
const DROP_BUTTON_CLASSES = ['c--copyBtn'];

export function rehypeStripNoise() {
  return (tree: Root) => {
    // ノード除去（後ろから走査するために走査後に処理）
    const removals: Array<{ parent: Parents; index: number }> = [];

    visit(tree, 'element', (node: Element, index: number | undefined, parent: Parents | undefined) => {
      if (index === undefined || !parent) return;

      if (DROP_TAG.has(node.tagName)) {
        removals.push({ parent, index });
        return SKIP; // 子孫は走査しないが兄弟は引き続き処理
      }

      if (node.tagName === 'nav' && hasClass(node, 'c--postNav')) {
        removals.push({ parent, index });
        return SKIP;
      }

      if (node.tagName === 'button' && DROP_BUTTON_CLASSES.some((cls) => hasClass(node, cls))) {
        removals.push({ parent, index });
        return SKIP;
      }

      // 空の <pre><code></code></pre> を除去（タブ片側が未指定のときに発生する空コードブロックを抑止）
      if (node.tagName === 'pre' && isEmptyPre(node)) {
        removals.push({ parent, index });
        return SKIP;
      }

      if (node.properties) {
        for (const key of Object.keys(node.properties)) {
          // hast は data-* 属性を camelCase 化する: dataAstroCidXxx
          if (key.startsWith('dataAstroCid')) {
            delete node.properties[key];
          }
        }
      }
    });

    // 後ろから削除（インデックスがずれないように）
    removals.sort((a, b) => b.index - a.index);
    for (const { parent, index } of removals) {
      parent.children.splice(index, 1);
    }
  };
}

/**
 * <pre> の唯一の意味ある子が空の <code> の場合に true を返す。
 * 空白テキストノードのみは無視する。
 */
function isEmptyPre(pre: Element): boolean {
  const codeChild = pre.children.find((c) => c.type === 'element' && c.tagName === 'code');
  if (!codeChild || codeChild.type !== 'element') return false;
  const hasContent = codeChild.children.some((c) => (c.type === 'text' && c.value.trim() !== '') || c.type === 'element');
  return !hasContent;
}
