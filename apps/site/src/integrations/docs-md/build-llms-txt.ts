/**
 * 英語ドキュメント (`apps/site/src/content/en/**`) の frontmatter を集計して
 * dist/llms.txt を生成する。
 *
 * セクション分類:
 * - Getting Started: トップレベルの overview/installation/changelog/features/mcp/skills
 * - UI Components:   ui/Xxx.mdx（パッケージ提供の Blocks。examples 配下を除く）
 * - Optional:        ui/examples/*, property-class/*
 * - Documentation:   それ以外すべて
 *
 * `_demo/` と `test.mdx`、`draft: true` のファイルは除外する。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { toContentSlug } from '../../lib/contentSlug';
import { walkMdx } from './util';

type FrontMatter = { title?: string; description?: string; draft?: boolean };
type Entry = { title: string; description: string; url: string; rel: string };
type Logger = { warn: (msg: string) => void; info: (msg: string) => void };

const SECTION_ORDER = ['Getting Started', 'Documentation', 'UI Components', 'Optional'] as const;
type Section = (typeof SECTION_ORDER)[number];

// Getting Started の表示順は意図的に固定（学習導線の自然な並び）
const GS_ORDER = ['overview', 'installation', 'changelog', 'features', 'mcp', 'skills'];
const GS_SLUGS = new Set(GS_ORDER);

const HEADER = `# Lism CSS

> Lism CSS is a lightweight, layout-first CSS framework for rapidly building the structural skeleton of websites. No build step required — just import the CSS. It also provides dedicated React and Astro components via npm.

- GitHub: https://github.com/lism-css/core
- npm: \`lism-css\` (core CSS + React components; Astro components via \`lism-css/astro\` subpath), \`@lism-css/ui\` (UI components)
- License: MIT`;

/**
 * MDX 冒頭の YAML frontmatter から title / description / draft を抽出する。
 * フィールドは単一行のスカラーのみ想定（このリポジトリでは現状すべてその形式）。
 */
export function parseFrontmatter(content: string): FrontMatter {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm: FrontMatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+?)\s*$/);
    if (!km) continue;
    const key = km[1];
    let value: string | boolean = km[2];
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (key === 'title' && typeof value === 'string') fm.title = value;
    else if (key === 'description' && typeof value === 'string') fm.description = value;
    else if (key === 'draft' && typeof value === 'boolean') fm.draft = value;
  }
  return fm;
}

export function classify(rel: string): Section | null {
  if (rel.startsWith('_demo/') || rel === 'test.mdx') return null;
  const slug = rel.replace(/\.mdx$/, '');
  // ui/ 直下（パッケージ提供の Blocks）以外の実装例は Optional 扱い
  if (rel.startsWith('ui/examples/')) return 'Optional';
  if (rel.startsWith('property-class/')) return 'Optional';
  if (rel.startsWith('ui/')) return 'UI Components';
  if (GS_SLUGS.has(slug)) return 'Getting Started';
  return 'Documentation';
}

export function toUrl(rel: string, siteUrl: string): string {
  // Astro の Content Collection と同じ slug 正規化を適用する。
  // primitives/ と trait-class/ のみ casing を保持し、それ以外は小文字化されるため、
  // ここで揃えないと llms.txt のリンクが case-sensitive 環境で 404 になる。
  // llms.txt の慣習に従い、HTML ページではなく .md バージョンを指す。
  const slug = toContentSlug(rel.replace(/\.mdx$/, ''));
  const base = siteUrl.replace(/\/$/, '');
  if (rel.startsWith('ui/')) return `${base}/en/${slug}.md`;
  return `${base}/en/docs/${slug}.md`;
}

function sortEntries(section: Section, entries: Entry[]): Entry[] {
  if (section === 'Getting Started') {
    const order = new Map(GS_ORDER.map((slug, i) => [slug, i] as const));
    return entries.slice().sort((a, b) => {
      const an = a.rel.replace(/\.mdx$/, '');
      const bn = b.rel.replace(/\.mdx$/, '');
      return (order.get(an) ?? 999) - (order.get(bn) ?? 999);
    });
  }
  return entries.slice().sort((a, b) => a.title.localeCompare(b.title));
}

export async function buildLlmsTxt(opts: { contentDir: string; outputPath: string; siteUrl: string; logger: Logger }): Promise<void> {
  const { contentDir, outputPath, siteUrl, logger } = opts;
  const files = await walkMdx(contentDir);
  const grouped = new Map<Section, Entry[]>();
  let count = 0;

  for (const rel of files) {
    const section = classify(rel);
    if (!section) continue;

    const abs = path.join(contentDir, rel);
    const content = await fs.readFile(abs, 'utf8');
    const fm = parseFrontmatter(content);
    if (fm.draft) continue;
    if (!fm.title || !fm.description) {
      logger.warn(`llms.txt: missing title/description in ${rel}`);
      continue;
    }

    const entry: Entry = {
      title: fm.title,
      description: fm.description,
      url: toUrl(rel, siteUrl),
      rel,
    };
    const list = grouped.get(section) ?? [];
    list.push(entry);
    grouped.set(section, list);
    count++;
  }

  const lines: string[] = [HEADER];
  for (const section of SECTION_ORDER) {
    const entries = grouped.get(section);
    if (!entries || entries.length === 0) continue;
    lines.push('', `## ${section}`, '');
    for (const e of sortEntries(section, entries)) {
      lines.push(`- [${e.title}](${e.url}): ${e.description}`);
    }
  }
  lines.push('');

  await fs.writeFile(outputPath, lines.join('\n'));
  logger.info(`generated llms.txt (${count} entries)`);
}
