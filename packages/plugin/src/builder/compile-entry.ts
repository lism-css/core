/**
 * 単一SCSSエントリをCSS文字列へ変換するオンザフライ・コンパイラ。
 * 作業ディレクトリへ複製した src/scss の生成SCSSだけをuser設定由来で差し替える（方式は compile.ts 冒頭と同じ）。
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createHash } from 'node:crypto';
import * as sass from 'sass';
import postcss, { type AcceptedPlugin } from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

import { serializeConfigScss, serializeTokens, type BuildConfig } from './serialize';
import { writePropConfigFiles } from './compile';

/**
 * src/scss を glob して「エントリ名 → 相対 scss パス」のマップを作る。
 * `compileCssTree` と同じ規則（`_*` 除外・`X/index.scss` → `X`）でエントリ名を導出するため、
 * dist/css に出力される CSS（= `lism-css/<entry>.css` で import 可能なもの）と完全に対応する。
 * 入れ子（`primitives/atomic`, `primitives/layout` 等）も含む。
 */
export async function listCssEntries(scssDir: string): Promise<Map<string, string>> {
  const { globSync } = await import('glob');
  const files = globSync('**/*.scss', { cwd: scssDir, ignore: ['**/_*.scss'] }).sort();
  const map = new Map<string, string>();
  for (const rel of files) {
    const entry = rel.replace(/\.scss$/, '').replace(/\/index$/, '');
    map.set(entry, rel);
  }
  return map;
}

/** partialを含む全SCSSをwatch対象として列挙する。 */
export async function listCssSourceFiles(scssDir: string): Promise<string[]> {
  const { globSync } = await import('glob');
  return globSync('**/*.scss', { cwd: scssDir, absolute: true }).sort();
}

function configSignature(mainConfig: BuildConfig, fullConfig?: BuildConfig): string {
  // breakpointsとトークン値の変更でも作業キャッシュを無効化できる署名を作る。
  const main = serializeConfigScss(mainConfig);
  const full = fullConfig ? serializeConfigScss(fullConfig) : '';
  const tokensGen = serializeTokens(mainConfig);
  return createHash('sha256').update(main).update('\0').update(full).update('\0').update(tokensGen).digest('hex');
}

export interface CssCompilerOptions {
  scssDir: string;
  minify?: boolean;
  log?: (message: string) => void;
}

export interface CssCompiler {
  compile(entry: string, mainConfig: BuildConfig, fullConfig?: BuildConfig): Promise<string>;
  hasEntry(entry: string): Promise<boolean>;
  entries(): Promise<string[]>;
  sourceFiles(): Promise<string[]>;
  dispose(): void;
}

/** config単位の作業ディレクトリとentry単位の結果を保持するCSSコンパイラを作る。 */
export function createCssCompiler({ scssDir, minify = false, log }: CssCompilerOptions): CssCompiler {
  const plugins: AcceptedPlugin[] = minify ? [autoprefixer, cssnano] : [autoprefixer];

  let entryMap: Map<string, string> | null = null;
  let workspace: { dir: string; sig: string } | null = null;
  const cssCache = new Map<string, string>();

  async function getEntryMap(): Promise<Map<string, string>> {
    if (!entryMap) entryMap = await listCssEntries(scssDir);
    return entryMap;
  }

  function disposeWorkspace(): void {
    if (workspace) {
      fs.rmSync(workspace.dir, { recursive: true, force: true });
      workspace = null;
    }
    cssCache.clear();
  }

  function ensureWorkspace(mainConfig: BuildConfig, fullConfig?: BuildConfig): { dir: string; sig: string } {
    const sig = configSignature(mainConfig, fullConfig);
    if (workspace && workspace.sig === sig) return workspace;
    // configが変わったら、作業ディレクトリとコンパイル結果をまとめて作り直す。
    disposeWorkspace();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lism-css-css-'));
    fs.cpSync(scssDir, dir, { recursive: true });
    writePropConfigFiles({ scssDir: dir, mainConfig, fullConfig });
    workspace = { dir, sig };
    log?.(`▶️ [lism-css] css workspace prepared (${sig.slice(0, 8)})`);
    return workspace;
  }

  return {
    async entries() {
      return [...(await getEntryMap()).keys()];
    },
    async sourceFiles() {
      return listCssSourceFiles(scssDir);
    },
    async hasEntry(entry) {
      return (await getEntryMap()).has(entry);
    },
    async compile(entry, mainConfig, fullConfig) {
      const rel = (await getEntryMap()).get(entry);
      if (!rel) throw new Error(`[lism-css] unknown CSS entry: "${entry}"`);
      const { dir, sig } = ensureWorkspace(mainConfig, fullConfig);
      // 非同期compile中のconfig切り替えで結果を取り違えないよう、cache keyにconfig署名を含める。
      const cacheKey = `${sig}:${entry}`;
      const cached = cssCache.get(cacheKey);
      if (cached !== undefined) return cached;
      const compiled = sass.compile(path.join(dir, rel), { style: 'expanded' });
      const processed = await postcss(plugins).process(compiled.css, { from: undefined });
      cssCache.set(cacheKey, processed.css);
      return processed.css;
    },
    dispose() {
      disposeWorkspace();
    },
  };
}
