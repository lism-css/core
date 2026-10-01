import type { DocsEntry, SearchResult } from './types.js';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_./]+/)
    .filter((t) => t.length > 0);
}

const PROP_CLASS_RE = /^\.?-([a-z][a-z0-9-]*)(:.+)?$/i;

/** Property Class記法からprop名を取り出す。get-props-system.tsからも利用する。 */
export function parsePropClassName(input: string): string | null {
  const m = input.match(PROP_CLASS_RE);
  return m ? m[1].toLowerCase() : null;
}

/** CSSプロパティとProperty Classを相互展開して検索語を補う。 */
function expandQuery(query: string, cssPropertyMap?: Map<string, string[]>): string {
  const additions: string[] = [];
  const queryLower = query.toLowerCase();
  const parsedProp = parsePropClassName(queryLower.trim());

  if (cssPropertyMap) {
    for (const [cssProp, lismProps] of cssPropertyMap) {
      if (parsedProp && lismProps.includes(parsedProp)) {
        additions.push(cssProp);
      }
      if (queryLower.includes(cssProp)) {
        additions.push(...lismProps);
      }
    }
  }

  if (parsedProp) {
    additions.push(parsedProp, 'property class');
  }

  return additions.length > 0 ? `${query} ${additions.join(' ')}` : query;
}

function scoreEntry(entry: DocsEntry, queryTokens: string[]): number {
  let score = 0;
  const titleLower = entry.title.toLowerCase();
  const descLower = entry.description.toLowerCase();
  const headingsLower = entry.headings.join(' ').toLowerCase();
  const keywordsLower = entry.keywords.join(' ').toLowerCase();
  const snippetLower = entry.snippet.toLowerCase();

  // titleからsnippetへ順に重みを下げる。
  for (const token of queryTokens) {
    if (titleLower.includes(token)) score += 10;
    if (keywordsLower.includes(token)) score += 5;
    if (headingsLower.includes(token)) score += 3;
    if (descLower.includes(token)) score += 2;
    if (snippetLower.includes(token)) score += 1;
  }

  return score;
}

export interface SearchDocsOptions {
  category?: string;
  limit?: number;
  cssPropertyMap?: Map<string, string[]>;
  guideTopics?: ReadonlySet<string>;
}

export function searchDocs(entries: DocsEntry[], query: string, options?: SearchDocsOptions): SearchResult[] {
  const { category, limit = 10, cssPropertyMap, guideTopics } = options ?? {};

  // CSSプロパティ名とProperty Class記法も同じ検索対象へ展開する。
  const expandedQuery = expandQuery(query, cssPropertyMap);
  const queryTokens = tokenize(expandedQuery);
  if (queryTokens.length === 0) return [];

  let filtered = entries;
  if (category && category !== 'all') {
    filtered = entries.filter((e) => e.category === category);
  }

  const scored = filtered
    .map((entry) => {
      const score = scoreEntry(entry, queryTokens);
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ entry, score }) => ({
    sourcePath: entry.sourcePath,
    url: slugToPageUrl(sourcePathToUrlSlug(entry.sourcePath)),
    heading: entry.title,
    snippet: entry.snippet,
    score,
    nextTool: getNextTool(entry, guideTopics),
  }));
}

const SITE_BASE_URL = 'https://lism-css.com';

/**
 * URL スラッグを公開ページの URL に変換する。
 * `ui/` 配下はサイト直下（`/ui/...`）、それ以外は `/docs/` 配下で公開される
 * （apps/site の `getPostUrl` と同じルーティング規則）。
 */
function slugToPageUrl(slug: string): string {
  return slug.startsWith('ui/') ? `${SITE_BASE_URL}/${slug}/` : `${SITE_BASE_URL}/docs/${slug}/`;
}

function getBasename(withoutExt: string): string {
  const parts = withoutExt.split('/');
  return parts[parts.length - 1];
}

/** 検索結果を掘り下げる推奨ツールを返す。カテゴリよりsourcePathの規則を優先する。 */
function getNextTool(entry: DocsEntry, guideTopics?: ReadonlySet<string>): string | null {
  const withoutExt = entry.sourcePath.replace(/\.mdx$/, '');
  const basename = getBasename(withoutExt);

  if (withoutExt === 'overview') {
    return 'get_overview()';
  }
  if (withoutExt === 'core-components/lism-props') {
    return 'get_props_system()';
  }
  if (withoutExt.startsWith('primitives/') || withoutExt.startsWith('trait-class/')) {
    return `get_component(name: "${basename}")`;
  }
  if (withoutExt === 'property-class') {
    return 'get_guide(topic: "property-class")';
  }
  if (withoutExt.startsWith('property-class/')) {
    return `get_props_system(prop: "${basename}")`;
  }
  // 実装例ページはパッケージ提供コンポーネントではないためget_componentでは解決できない。
  if (withoutExt.startsWith('ui/examples/')) {
    return null;
  }

  switch (entry.category) {
    case 'core-components':
      return `get_component(name: "${basename}")`;
    case 'ui':
      return `get_component(name: "${basename}", package: "@lism-css/ui")`;
    case 'guide':
      return guideTopics?.has(basename) ? `get_guide(topic: "${basename}")` : null;
    default:
      return null;
  }
}

/**
 * `sourcePath`（実 MDX ファイルの相対パス）を公開 URL のスラッグに変換する。
 *
 * - `primitives/` / `trait-class/` 配下のみファイル名の casing を保持
 *   （CSS クラス名と URL を一致させるための例外）
 * - それ以外は全て小文字化（Astro content collections の `generateId` と揃える）
 *
 * IMPORTANT: `apps/site/src/lib/contentSlug.ts` の `toContentSlug` と必ず同じロジックに保つこと。
 * 別ワークスペース（apps/site）なので直接 import できず、ローカル実装で複製している。
 * apps/site 側を変更した場合は必ずここも合わせて更新する。
 */
const PRESERVE_CASE_PREFIXES = ['primitives/', 'trait-class/'];

export function sourcePathToUrlSlug(sourcePath: string): string {
  const withoutExt = sourcePath.replace(/\.mdx$/, '');
  return PRESERVE_CASE_PREFIXES.some((prefix) => withoutExt.startsWith(prefix)) ? withoutExt : withoutExt.toLowerCase();
}
