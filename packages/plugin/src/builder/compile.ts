/**
 * 「config → CSS」変換の共有コア。同梱 SCSS は `@use './prop-config.gen'` のままディスク実ファイルを参照し、素の sass / docs の `@use 'lism-css/scss/setting' with (...)` 等のスタンドアロン利用を維持する。
 * ユーザー設定を反映する時は、node_modules を書き換えず src/scss を一時ディレクトリへ複製し、生成 SCSS だけ差し替えてコンパイルする。
 * パッケージ自身のビルドは、同梱デフォルトの生成 SCSS を更新しつつ src/scss を直接コンパイルする。
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import * as sass from 'sass';
import postcss, { type AcceptedPlugin } from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

import { serializeConfigScss, serializeTokens, type BuildConfig } from './serialize';

export type { BuildConfig } from './serialize';

const MAIN_PROP_CONFIG = '_prop-config.gen.scss';
const FULL_PROP_CONFIG = '_prop-config-full.gen.scss';
const TOKENS_GEN_PARTIAL = 'base/tokens/_tokens.gen.scss';
// 生成物であることを明示するヘッダ。値が空でもこのヘッダは常に書き出され、同梱デフォルトと一致させる。
const TOKENS_GEN_HEADER =
  '// このファイルは自動生成されます。直接編集しないでください（次回ビルド時に上書きされます）。\n' +
  '// 生成元: コア → config/defaults/tokens.ts / 利用側 → defaults + lism.config.js の tokens\n';
const PROP_CONFIG_GEN_HEADER =
  '// このファイルは自動生成されます。直接編集しないでください（次回ビルド時に上書きされます）。\n' +
  '// 生成元: コア → config/defaults の props / breakpoints（full は config/presets/props-full.ts も） / 利用側 → defaults + lism.config.js\n';

function resolvePostcssPlugins(minify: boolean): AcceptedPlugin[] {
  // minify=false は Vite が最終 minify する用途。
  return minify ? [autoprefixer, cssnano] : [autoprefixer];
}

export interface WritePropConfigOptions {
  /** prop-config を書き出す scss ディレクトリ。 */
  scssDir: string;
  /** main 系の prop-config を生成する CONFIG（マージ済み・Set 化前）。 */
  mainConfig: BuildConfig;
  /** full 系の prop-config を生成する CONFIG。省略時は full を書き出さない。 */
  fullConfig?: BuildConfig;
}

/**
 * 直列化した prop-config を scssDir へ書き出す。
 * パッケージ自身のビルドで同梱デフォルトを更新する用途と、一時ディレクトリへの注入の双方で使う。
 */
export function writePropConfigFiles({ scssDir, mainConfig, fullConfig }: WritePropConfigOptions): void {
  fs.writeFileSync(path.join(scssDir, MAIN_PROP_CONFIG), PROP_CONFIG_GEN_HEADER + serializeConfigScss(mainConfig), 'utf8');
  if (fullConfig) {
    fs.writeFileSync(path.join(scssDir, FULL_PROP_CONFIG), PROP_CONFIG_GEN_HEADER + serializeConfigScss(fullConfig), 'utf8');
  }
  // tokens のインライン値は main/full 共通のため、main 系から 1 ファイルだけ生成する。
  fs.writeFileSync(path.join(scssDir, TOKENS_GEN_PARTIAL), TOKENS_GEN_HEADER + serializeTokens(mainConfig), 'utf8');
}

export interface CompileTreeOptions {
  /** エントリを探索する scss ディレクトリの絶対パス。 */
  scssDir: string;
  /** 出力先 dist/css の絶対パス。 */
  distDir: string;
  /** 追加で除外するエントリ（glob パターン。例: ['full.scss', 'full_no_layer.scss']）。 */
  ignore?: string[];
  /** autoprefixer + cssnano を通すか（既定: true）。 */
  minify?: boolean;
  /** ログ出力関数（既定: console.log）。 */
  log?: (message: string) => void;
}

/**
 * scssDir 配下の全エントリ（`_*.scss` を除く）をコンパイルして distDir へ書き出す。
 */
export async function compileCssTree({ scssDir, distDir, ignore = [], minify = true, log = console.log }: CompileTreeOptions): Promise<string[]> {
  // glob は CJS 互換だが ESM からも利用可能。動的 import で external 化に追従。
  const { globSync } = await import('glob');

  const plugins = resolvePostcssPlugins(minify);

  // NOTE: CLI 経由だと cwd がプロジェクト側になるため、cwd を明示し absolute で受け取る。
  const files = globSync('**/*.scss', { cwd: scssDir, ignore: ['**/_*.scss', ...ignore], absolute: true });
  log(`▶️ [compileCssTree] ${files.length} entries`);

  const written: string[] = [];
  for (const filePath of files) {
    const fileName = filePath.replace(`${scssDir}/`, '');
    const distPath = path.resolve(distDir, fileName).replace('.scss', '.css').replace('/index.css', '.css');

    const compiled = sass.compile(filePath, { style: 'expanded' });
    const processed = await postcss(plugins).process(compiled.css, { from: undefined });
    writeCss(distPath, processed.css);
    written.push(distPath);
  }

  return written;
}

export interface BuildToDirOptions {
  /** ソースの scss ディレクトリ（インストール済みパッケージの src/scss）。書き換えない。 */
  scssDir: string;
  /** 出力先 dist/css の絶対パス。 */
  distDir: string;
  /** main 系が読む prop-config を生成する CONFIG（isFullMode 時は full preset 適用済みを渡す）。 */
  mainConfig: BuildConfig;
  /** full 系が読む prop-config を生成する CONFIG。 */
  fullConfig?: BuildConfig;
  /** 追加で除外するエントリ（glob パターン）。 */
  ignore?: string[];
  /** autoprefixer + cssnano を通すか（既定: true）。 */
  minify?: boolean;
  /** ログ出力関数（既定: console.log）。 */
  log?: (message: string) => void;
}

/** ユーザー設定を反映した CSS を一時ディレクトリ経由で生成する（CLI 用）。 */
export async function buildCssToDir({
  scssDir,
  distDir,
  mainConfig,
  fullConfig,
  ignore = [],
  minify = true,
  log = console.log,
}: BuildToDirOptions): Promise<string[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lism-css-scss-'));
  try {
    // src/scss をまるごと複製（相対 @use が一時ディレクトリ内で完結するように）。
    fs.cpSync(scssDir, tmpDir, { recursive: true });
    writePropConfigFiles({ scssDir: tmpDir, mainConfig, fullConfig });
    return await compileCssTree({ scssDir: tmpDir, distDir, ignore, minify, log });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * 同じディレクトリの一時ファイルへ書いてから rename で差し替える。
 * 既存ファイルをその場で上書きすると、pnpm のハードリンク配置ではストア側の実体まで書き換わり、
 * 同じバージョンをリンクする他プロジェクトへ漏れる。新しい実体に置き換えることでストアには触れない。
 */
function writeCss(filePath: string, css: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // worker_threads 間では PID が共通なので、呼び出しごとに一意な値を足して衝突を避ける。
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, css);
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    fs.rmSync(tmpPath, { force: true });
    throw error;
  }
}
