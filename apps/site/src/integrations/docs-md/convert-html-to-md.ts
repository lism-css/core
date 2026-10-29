/**
 * ビルド後の HTML から `article[data-pagefind-body]` を抽出し、
 * 各種 rehype プラグインで整形してから Markdown に変換するパイプライン。
 */
import fs from 'node:fs/promises';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Element } from 'hast';
import { rehypeStripNoise } from './rehype-strip-noise';
import { rehypePreview } from './rehype-preview';
import { rehypeDocsLink } from './rehype-docs-link';
import { rehypeCodeLanguage } from './rehype-code-language';
import { rehypeCallouts } from './rehype-callouts';
import { rehypeExtractMeta, META_DATA_KEY, type DocMeta } from './rehype-extract-meta';
import { rehypeAbsoluteUrls } from './rehype-absolute-urls';

/** 呼び出し側はこのエラーのみ skip 扱いとし、他の例外は build を失敗させる */
export class ArticleNotFoundError extends Error {
  constructor() {
    super('article[data-pagefind-body] not found');
    this.name = 'ArticleNotFoundError';
  }
}

function rehypeKeepArticle() {
  return (tree: HastRoot) => {
    let target: Element | undefined;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'article') return;
      const attr = node.properties?.dataPagefindBody;
      if (attr === true || attr === 'true' || attr === '') {
        target = node;
        return false; // 最初の 1 件で打ち切り
      }
    });
    if (!target) {
      throw new ArticleNotFoundError();
    }
    tree.children = [target];
  };
}

/**
 * remark-stringify は `[` を `\[` にエスケープするため、
 * GFM Alert の `[!NOTE]` 等が `\[!NOTE]` になり Alert として認識されなくなる。
 * 既知の Alert 種別に限定してアンエスケープする（誤爆を防ぐため種別をホワイトリスト化）。
 */
export function unescapeGfmAlerts(md: string): string {
  return md.replace(/\\(\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)])/g, '$1');
}

/**
 * YAML 文字列値のためのエスケープ。
 * 入力に改行が混じった場合は単一行 frontmatter が壊れるため、空白へ潰してから
 * バックスラッシュとダブルクオートをエスケープして二重引用符で囲む。
 */
export function yamlString(value: string): string {
  return `"${value.replace(/\r?\n/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(meta: DocMeta): string {
  const lines: string[] = ['---'];
  if (meta.title) lines.push(`title: ${yamlString(meta.title)}`);
  if (meta.description) lines.push(`description: ${yamlString(meta.description)}`);
  if (meta.url) lines.push(`url: ${meta.url}`);
  lines.push('---', '');
  return lines.join('\n');
}

export async function convertHtmlToMd(htmlPath: string, mdPath: string, opts: { siteUrl: string }): Promise<void> {
  const html = await fs.readFile(htmlPath, 'utf8');

  const file = await unified()
    .use(rehypeParse)
    .use(rehypeExtractMeta)
    .use(rehypeKeepArticle)
    .use(rehypeStripNoise)
    .use(rehypePreview)
    .use(rehypeDocsLink)
    .use(rehypeCodeLanguage)
    .use(rehypeCallouts)
    .use(rehypeAbsoluteUrls, { siteUrl: opts.siteUrl })
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      incrementListMarker: false,
      rule: '-',
    })
    .process(html);

  const meta = (file.data[META_DATA_KEY] as DocMeta | undefined) ?? {};
  await fs.writeFile(mdPath, buildFrontmatter(meta) + unescapeGfmAlerts(String(file)));
}
