/**
 * UI コンポーネント一覧ページ (`/ui/` と `/en/ui/`) 用の `.md` を生成する。
 *
 * 一覧ページは `excludeFromSearch` で `data-pagefind-body` を持たず、通常の HTML→MD 変換 (`convert-html-to-md`) では skip されるため、
 * 代替として content/{lang}/ui/ 配下の `.mdx` を走査し、Blocks（ui/ 直下）/ Examples（ui/examples/）の2見出しでリンクリストを出力する
 * （`_` 始まりと `draft: true` は除外。リンク先は convert-html-to-md が生成した個別ページの `.md`）。
 * frontmatter (title / description / url) は dist 側 index.html から抽出して同期を保つ。
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
