import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// スキル Markdown の正本を直接参照（開発・テスト時）
// npm パッケージとして利用される場合は dist/data/guides/ にフォールバック
const skillsDir = resolve(__dirname, '..', '..', '..', '..', 'skills', 'lism-css-guide');
const distDir = resolve(__dirname, '..', 'data', 'guides');
const guidesDir = existsSync(skillsDir) ? skillsDir : distDir;

/** skills/ を直接参照しているか（= モノレポ開発時）。npm 配布物（dist/data/guides/）を使っている場合は false。 */
export const isRunningFromSource = guidesDir === skillsDir;

const cache = new Map<string, string>();

/** guides/ ディレクトリから Markdown ファイルを読み込む（キャッシュ付き）。
 *  filename にはサブディレクトリを含む posix 区切りの相対パス（例: `primitives/l--flex.md`）を渡せる。 */
export function loadMarkdown(filename: string): string {
  if (cache.has(filename)) return cache.get(filename)!;
  const filePath = resolve(guidesDir, filename);
  const content = readFileSync(filePath, 'utf-8');
  cache.set(filename, content);
  return content;
}

// Prop 検索・変換で参照するファイル群。
// 全 Prop の実テーブルは property-class/all-props.md に分冊されているため、
// property-class.md 単体では bd 系などの一部しか拾えない（#474）。
const PROP_SOURCE_FILES = ['property-class.md', 'property-class/all-props.md'];

export function loadPropsMarkdown(): string {
  return PROP_SOURCE_FILES.map((filename) => loadMarkdown(filename)).join('\n\n');
}

/** guidesDir 配下を再帰的に走査し、`.md` ファイルの相対パス（posix 区切り）を返す */
function walkMarkdownFiles(dir: string, baseDir: string = dir): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkMarkdownFiles(full, baseDir));
    } else if (stat.isFile() && entry.endsWith('.md')) {
      results.push(relative(baseDir, full).split('\\').join('/'));
    }
  }
  return results;
}

export function getGuideFilenames(): string[] {
  return walkMarkdownFiles(guidesDir);
}

/** 起動時に全ガイドを一括読み込みしてキャッシュに載せる */
export function preloadGuides(): void {
  for (const filename of getGuideFilenames()) {
    loadMarkdown(filename);
  }
}
