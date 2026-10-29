/**
 * packages/lism-ui/src/ を走査し、CLI 用のカタログ JSON
 * (packages/lism-ui/registry-index.json) を生成する。
 *
 * 出力は CLI の `lism-cli ui list` / `--all` が giget で fetch して利用する。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const UI_SRC = path.resolve(PKG_ROOT, 'src');
const COMPONENTS_DIR = path.resolve(UI_SRC, 'components');
const HELPER_DIR = path.resolve(UI_SRC, 'helper');
const OUTPUT_FILE = path.resolve(PKG_ROOT, 'registry-index.json');

interface ComponentMeta {
  name: string;
  helpers: string[];
}

interface CatalogJson {
  version: string;
  /**
   * コンポーネントディレクトリから配信時に除外するルート直下のファイル一覧（内部エクスポート）。
   * カタログに同梱することで CLI 側と二重定義にならないようにしている。
   */
  excludeComponentFiles: string[];
  components: ComponentMeta[];
  helpers: string[];
}

const EXCLUDE_COMPONENT_FILES = ['__contexts.js', 'react.ts', 'astro.ts'];
const EXCLUDE_COMPONENT_FILES_SET = new Set(EXCLUDE_COMPONENT_FILES);

function walkFiles(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full, base));
    else files.push(path.relative(base, full));
  }
  return files;
}

/** ファイル内容から `helper/xxx` への相対 import を検出し、helper 名（拡張子なし）を返す */
function extractHelperDeps(content: string): string[] {
  const deps = new Set<string>();
  const pattern = /(?:from\s+|import\s+)['"](?:\.\.\/)+helper\/([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const helperPath = match[1];
    const helperName = helperPath.replace(/\.[^.]+$/, '');
    deps.add(helperName);
  }
  return [...deps].sort();
}

function isStoryFile(rel: string): boolean {
  return /(^|\/)[^/]+\.stories\.[a-z]+$/.test(rel);
}

function isTestFile(rel: string): boolean {
  return /(^|\/)[^/]+\.test\.[a-z]+$/.test(rel);
}

function generateCatalog(): CatalogJson {
  const pkgJsonPath = path.resolve(PKG_ROOT, 'package.json');
  const { version } = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as { version: string };

  const componentDirs = fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const components: ComponentMeta[] = [];

  for (const name of componentDirs) {
    const dir = path.join(COMPONENTS_DIR, name);
    const files = walkFiles(dir);
    const helperSet = new Set<string>();

    for (const rel of files) {
      if (EXCLUDE_COMPONENT_FILES_SET.has(rel)) continue;
      if (isStoryFile(rel)) continue;
      // 将来コンポーネント直下に *.test.* が置かれてもテスト由来の helper import が
      // カタログに混入しないようにするための予防線（fetcher.ts 側も同様に除外済み）
      if (isTestFile(rel)) continue;

      const content = fs.readFileSync(path.join(dir, rel), 'utf-8');
      for (const h of extractHelperDeps(content)) helperSet.add(h);
    }

    components.push({ name, helpers: [...helperSet].sort() });
  }

  const helperSet = new Set<string>();
  if (fs.existsSync(HELPER_DIR)) {
    for (const rel of walkFiles(HELPER_DIR)) {
      if (isTestFile(rel)) continue;
      const helperName = rel.replace(/\.[^.]+$/, '');
      helperSet.add(helperName);
    }
  }

  return {
    version,
    excludeComponentFiles: [...EXCLUDE_COMPONENT_FILES].sort(),
    components,
    helpers: [...helperSet].sort(),
  };
}

const catalog = generateCatalog();
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Registry index generated: ${catalog.components.length} components, ${catalog.helpers.length} helpers`);
console.log(`Output: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
