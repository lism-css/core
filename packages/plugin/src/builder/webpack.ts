/**
 * webpack 主導の bundler 向け汎用プリミティブ（`@lism-css/plugin/webpack`）。
 *
 * webpackベースのビルドには、Vite/Astroのような「bare CSS importを
 * オンザフライで横取りする口」が無い。そこで（必要なら）config 反映済み CSS を `<root>/.lism-css/css/*` へ
 * 事前生成してaliasで差し替える。WP/テーマ固有のロジックは消費側の責務とする。
 *
 * 想定する使い方（`webpack.config.js`(CJS) 拡張スニペット）:
 * ```js
 * const { withLismWebpack } = require('@lism-css/plugin/webpack');
 * module.exports = withLismWebpack(require('@wordpress/scripts/config/webpack.config'), { css: true });
 * ```
 * webpack は `module.exports` が Promise でも受け付けるため、`withLismWebpack` は async（Promise を返す）でよい。
 *
 * bridge SCSS 生成（`generateLismScss`）は含めない。理由は scss-source.ts 冒頭を参照。
 *
 * NOTE: webpack / `@wordpress/scripts` には依存しない。webpack config / compiler はジェネリック `T` や最小の
 * 構造的型で扱い、webpack 型を import しない。
 */
import path from 'node:path';

import { CONFIG_TARGET_ID } from './config-alias';
import { generateCssToDir, type GeneratedCss } from './generated-css';
import { findUserConfigPath } from './load-config';
import { syncLismEnvDts } from './typegen';

export interface WithLismWebpackOptions {
  /** lism.config の明示パス。未指定時は projectRoot から探索する。 */
  configPath?: string;
  /** lism.config 探索の基点。既定は `process.cwd()`。 */
  projectRoot?: string;
  /** `lism-css/<entry>.css` → 生成 CSS の alias を張る（CSS を事前生成する）。既定: false。SCSS-source は false。 */
  css?: boolean;
  /** `lism-css/config.js$` → user lism.config の alias を張る。既定: true。 */
  config?: boolean;
  /** `lism-env.d.ts` 自動生成を行うか。既定: false。 */
  typegen?: boolean;
  /** watchRun での再生成 + `lism.config.js` を `fileDependencies` へ登録するか。既定: true。 */
  watch?: boolean;
  /** full.css / full_no_layer.css も生成するか（`css: true` 時のみ有効。既定: false。purge 併用時に有効化）。 */
  full?: boolean;
}

interface WebpackConfig {
  resolve?: { alias?: Record<string, unknown>; [key: string]: unknown };
  plugins?: unknown[];
  [key: string]: unknown;
}

interface Compiler {
  hooks: {
    watchRun: { tapPromise(name: string, fn: () => Promise<void>): void };
    afterCompile: { tap(name: string, fn: (compilation: { fileDependencies: Set<string> }) => void): void };
  };
}

interface LismCssWebpackPluginOptions {
  projectRoot: string;
  outDir: string | null;
  configPath?: string;
  css: boolean;
  typegen: boolean;
  full: boolean;
  /** watch 依存へ登録する user lism.config の絶対パス（無ければ null）。 */
  userConfigPath: string | null;
}

/**
 * CSS・型の再生成とconfig依存の登録を担うwatch用プラグイン。
 *
 * webpack 型は import せず、`apply(compiler)` の compiler / compilation を最小の構造的型で扱う。
 * - watchRun: `css` / `typegen` が有効な時だけ CSS / `lism-env.d.ts` を再生成する。
 * - afterCompile: `lism.config.js` を `fileDependencies` へ登録し、config 変更でも再ビルドを発火させる。
 */
class LismCssWebpackPlugin {
  private readonly options: LismCssWebpackPluginOptions;

  constructor(options: LismCssWebpackPluginOptions) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    const { projectRoot, outDir, configPath, css, typegen, full, userConfigPath } = this.options;

    if (css || typegen) {
      compiler.hooks.watchRun.tapPromise('LismCssWebpack', async () => {
        // bundler（webpack）側が最終 minify するため、ここでは minify せず生成する。
        // css: false では CSS を再生成しない（ゴミ CSS / 無駄ビルドの防止）。
        if (css && outDir) await generateCssToDir({ projectRoot, outDir, configPath, full, minify: false });
        if (typegen) await syncLismEnvDts(projectRoot, { configPath });
      });
    }

    // css の有無に依らず登録する。
    if (userConfigPath) {
      compiler.hooks.afterCompile.tap('LismCssWebpack', (compilation) => {
        compilation.fileDependencies.add(userConfigPath);
      });
    }
  }
}

/**
 * webpack configをLism CSS対応へラップする。
 *
 * 既存 config を壊さない浅いクローンへ `resolve.alias`（CSS / config 差し替え）と watch 追従プラグインを
 * マージして返す。CSS 事前生成・typegen は非同期なので Promise を返す（webpack は Promise config を受け付ける）。
 */
export async function withLismWebpack<T extends Record<string, any>>(webpackConfig?: T, opts?: WithLismWebpackOptions): Promise<T> {
  const projectRoot = opts?.projectRoot ?? process.cwd();
  const css = opts?.css ?? false;
  const configAlias = opts?.config ?? true;
  const typegen = opts?.typegen ?? false;
  const watch = opts?.watch ?? true;
  const full = opts?.full ?? false;
  const outDir = css ? path.join(projectRoot, '.lism-css/css') : null;

  // css: true の時だけ CSS を事前生成する（`.lism-css/css` を作らない / CSS alias を張らない no-op を死守）。
  let generated: GeneratedCss | null = null;
  if (css && outDir) {
    // 最終 minify は webpack 側で行う。
    generated = await generateCssToDir({ projectRoot, outDir, configPath: opts?.configPath, full, minify: false });
  }

  if (typegen) {
    await syncLismEnvDts(projectRoot, { configPath: opts?.configPath });
  }

  const userConfigPath = generated ? generated.userConfigPath : findUserConfigPath(projectRoot, opts?.configPath);

  const alias: Record<string, string> = {};
  if (css && generated) Object.assign(alias, generated.aliasMap);
  if (configAlias && userConfigPath) alias[`${CONFIG_TARGET_ID}$`] = userConfigPath;

  const base = (webpackConfig ?? {}) as T;
  const existingResolve = base.resolve as WebpackConfig['resolve'] | undefined;
  const existingPlugins = base.plugins as unknown[] | undefined;

  const plugins = [...(existingPlugins ?? [])];
  if (watch) {
    plugins.push(
      new LismCssWebpackPlugin({
        projectRoot,
        outDir,
        configPath: opts?.configPath,
        css,
        typegen,
        full,
        userConfigPath,
      })
    );
  }

  return {
    ...base,
    resolve: {
      ...existingResolve,
      alias: { ...existingResolve?.alias, ...alias },
    },
    plugins,
  };
}

export default withLismWebpack;
