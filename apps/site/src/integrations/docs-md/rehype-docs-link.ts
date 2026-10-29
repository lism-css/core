/**
 * ドキュメント間リンクカード（<a class="c--docsLink">）の中身を
 * タイトル文字列のみに畳み込む rehype プラグイン。
 *
 * c--docsLink の HTML 出力は内部に
 * - <span class="c--docsLink_title">タイトル</span>
 * - <p class="c--docsLink_description">説明文</p>
 * - 装飾用の <svg> アイコン / 矢印
 * を持つため、そのまま rehype-remark に通すと「タイトルだけのリンク」と
 * 「説明文だけのリンク」が連続した同 URL リンクとして二重出力される。
 * .md ではタイトルだけで十分なので、<a> の children をタイトル text のみに置換する。
 */
import { visit } from 'unist-util-visit';
import type { Root, Element, Text } from 'hast';
import { hasClass } from './util';

export function rehypeDocsLink() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;
      if (!hasClass(node, 'c--docsLink')) return;

      const title = extractTitle(node);
      // タイトルが取れない場合は構造を壊さず温存（保険）
      if (!title) return;

      node.children = [{ type: 'text', value: title } satisfies Text];
    });
  };
}

function extractTitle(linkNode: Element): string {
  let titleEl: Element | undefined;
  visit(linkNode, 'element', (child: Element) => {
    if (hasClass(child, 'c--docsLink_title')) {
      titleEl = child;
      return false; // 最初の 1 件で打ち切り
    }
  });
  if (!titleEl) return '';

  let text = '';
  visit(titleEl, 'text', (n: Text) => {
    text += n.value;
  });
  return text.trim();
}
