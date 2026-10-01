/**
 * UI コンポーネント一覧ページ (`/ui/` および `/en/ui/`) 用の `.md` を生成する。
 *
 * これらのインデックスページは `excludeFromSearch` で `data-pagefind-body` を持たないため、
 * 通常の HTML→MD 変換パイプライン (`convert-html-to-md`) では skip される。
 * AI ツールから一覧として参照できるよう、本モジュールが代替ルートとして
 * content collection を走査して簡素なリンクリスト形式の `.md` を出力する。
 *
 * - frontmatter (title / description / url) は dist 側 index.html から抽出して同期を保つ
 * - 本文は content/{lang}/ui/ 配下の `.mdx` から組み立てる（`_` 始まり / `draft: true` は除外）
 * - 見出しは Blocks（ui/ 直下）/ Examples（ui/examples/）の2分類
 * - リンクは個別ページの `.md`（`convert-html-to-md` が生成済み）を指す
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { extractDocMetaFromTree, type DocMeta } from './rehype-extract-meta';
import { yamlString } from './convert-html-to-md';
import { parseFrontmatter } from './build-llms-txt';
import { walkMdx } from './util';
import { toContentSlug } from '../../lib/contentSlug';

type Logger = { warn: (msg: string) => void; info: (msg: string) => void };

type Entry = { title: string; description: string; slug: string };

async function extractHtmlMeta(htmlPath: string): Promise<DocMeta> {
  const html = await fs.readFile(htmlPath, 'utf8');
  // compiler 無しで parse のみ行うため `.parse()` を直接使う（`.process()` だと未指定エラー）
  const tree = unified().use(rehypeParse).parse(html);
  return extractDocMetaFromTree(tree);
}

function formatEntry(e: Entry, urlPrefix: string): string {
  const url = `${urlPrefix}${e.slug}.md`;
  return e.description ? `- [${e.title}](${url}): ${e.description}` : `- [${e.title}](${url})`;
}

export async function buildUiIndexMd(opts: {
  htmlPath: string;
  outputPath: string;
  uiContentDir: string;
  uiUrlPrefix: string;
  logger: Logger;
}): Promise<void> {
  const { htmlPath, outputPath, uiContentDir, uiUrlPrefix, logger } = opts;

  const meta = await extractHtmlMeta(htmlPath);
  if (!meta.title) {
    logger.warn(`ui index md skipped: no <title> in ${htmlPath}`);
    return;
  }

  // _opt-in / _demo など `_` 始まりは公開対象外なので走査時に除外
  const files = await walkMdx(uiContentDir, { skipUnderscore: true });
  // ui/ 直下（パッケージ提供）/ examples/ の2分類
  const blocks: Entry[] = [];
  const examples: Entry[] = [];

  for (const rel of files) {
    const abs = path.join(uiContentDir, rel);
    const content = await fs.readFile(abs, 'utf8');
    const fm = parseFrontmatter(content);
    if (fm.draft) continue;
    if (!fm.title) {
      logger.warn(`ui index md: missing title in ui/${rel}`);
      continue;
    }
    // toContentSlug は ui/ プレフィックスを含む形で受けて、url 用 slug 部分（ui/ 以下）を返す
    const fullSlug = toContentSlug(`ui/${rel.replace(/\.mdx$/, '')}`);
    const slug = fullSlug.replace(/^ui\//, '');
    const entry: Entry = {
      title: fm.title,
      description: fm.description ?? '',
      slug,
    };
    if (rel.startsWith('examples/')) examples.push(entry);
    else blocks.push(entry);
  }

  const sortByTitle = (a: Entry, b: Entry) => a.title.localeCompare(b.title);
  blocks.sort(sortByTitle);
  examples.sort(sortByTitle);

  const lines: string[] = ['---', `title: ${yamlString(meta.title)}`];
  if (meta.description) lines.push(`description: ${yamlString(meta.description)}`);
  if (meta.url) lines.push(`url: ${meta.url}`);
  lines.push('---', '');
  lines.push(`# ${meta.title}`, '');
  if (meta.description) {
    lines.push(meta.description, '');
  }

  if (blocks.length > 0) {
    lines.push('## Blocks', '');
    for (const e of blocks) lines.push(formatEntry(e, uiUrlPrefix));
    lines.push('');
  }
  if (examples.length > 0) {
    lines.push('## Examples', '');
    for (const e of examples) lines.push(formatEntry(e, uiUrlPrefix));
    lines.push('');
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, lines.join('\n'));
  logger.info(`generated ${path.basename(outputPath)} (${blocks.length} blocks, ${examples.length} examples)`);
}
