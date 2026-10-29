/**
 * Next.js（16以降）用の統合エントリ。Vite/Astro のような bare CSS import の横取り口が無いため、
 * config 反映済み CSS を `<root>/.lism-css/css/*` へ事前生成し、`lism-css/<entry>.css` を alias で差し替える
 * （alias の形式は `webpack-alias.ts` の制約に従う）。dev 中の config 追従は `watchLismConfig` が担い、
 * 生成 CSS の変更は Turbopack（および `--webpack` dev の webpack）が拾うため再起動なしで反映される。
 */
import path from 'node:path';

import { generateCssToDir } from './generated-css';
import { buildWebpackAlias, buildTurbopackAlias } from './webpack-alias';
import { syncLismEnvDts } from './typegen';
import { watchLismConfig, type ConfigWatcher, type WatchLismConfigOptions } from './config-watcher';

/** Next.js の dev サーバーフェーズ識別子（`next/constants` の PHASE_DEVELOPMENT_SERVER。next 非依存にするため直書き）。 */
const PHASE_DEVELOPMENT_SERVER = 'phase-development-server';

// 同一 config を二重監視しないためのガード（config 関数が複数回呼ばれても watcher は 1 つに保つ）。
// dev サーバーのライフタイム中は閉じない（プロセス終了で watcher も消える。FSWatcher は unref 済み）。
const watchedConfigs = new Set<string>();

export interface WithLismOptions {
  /** lism.config の明示パス。未指定時は projectRoot から探索する。 */
  configPath?: string;
  /** lism.config 探索の基点。既定は `process.cwd()`。 */
  projectRoot?: string;
  /** `lism-env.d.ts` 自動生成を行うか（既定: true）。 */
  typegen?: boolean;
  /** full.css / full_no_layer.css も生成するか（既定: false。purge 併用時に有効化）。 */
  full?: boolean;
  /**
   * lism.config 監視の実装。未指定時は `watchLismConfig`。
   * テストから差し替えて、実 `fs.watch` を介さず `onChange` を直接発火するために使う。
   */
  watchConfig?: (opts: WatchLismConfigOptions) => ConfigWatcher;
}

/** Turbopack 設定の最小構造（next 非依存。実際の型は `T` 側に従う）。 */
interface TurbopackConfig {
  resolveAlias?: Record<string, string>;
  [key: string]: unknown;
}

/** webpack カスタマイズ関数の最小構造（next/webpack 非依存）。 */
type WebpackConfig = { resolve?: { alias?: Record<string, unknown>; [key: string]: unknown }; [key: string]: unknown };
type WebpackFn = (config: WebpackConfig, options: unknown) => WebpackConfig;

/**
 * Next.js の config を Lism CSS 対応へラップする。
 *
 * `export default withLism(nextConfig, opts)` のように next.config の default export へ渡す。
 * 返り値は async config 関数で、Next がそれを解決する際に CSS 事前生成 / typegen / alias 注入を行う。
 */
export function withLism<T extends Record<string, any>>(nextConfig?: T, opts?: WithLismOptions): (phase: string, ctx?: unknown) => Promise<T> {
  return async (phase?: string): Promise<T> => {
    const projectRoot = opts?.projectRoot ?? process.cwd();
    const outDir = path.join(projectRoot, '.lism-css/css');

    // bundler（Turbopack / webpack）側が最終 minify するため、ここでは minify せず生成する。
    const generated = await generateCssToDir({
      projectRoot,
      outDir,
      configPath: opts?.configPath,
      full: opts?.full ?? false,
      minify: false,
    });

    if (opts?.typegen !== false) {
      await syncLismEnvDts(projectRoot, { configPath: opts?.configPath });
    }

    if (phase === PHASE_DEVELOPMENT_SERVER && generated.userConfigPath && !watchedConfigs.has(generated.userConfigPath)) {
      const userConfigPath = generated.userConfigPath;
      watchedConfigs.add(userConfigPath);
      const watch = opts?.watchConfig ?? watchLismConfig;
      watch({
        configPath: userConfigPath,
        onChange: async () => {
          await generateCssToDir({ projectRoot, outDir, configPath: opts?.configPath, full: opts?.full ?? false, minify: false });
          if (opts?.typegen !== false) await syncLismEnvDts(projectRoot, { configPath: opts?.configPath });
        },
      });
    }

    const turboAlias = buildTurbopackAlias({ generated, userConfigPath: generated.userConfigPath }, projectRoot);
    const wpAlias = buildWebpackAlias({ generated, userConfigPath: generated.userConfigPath });

    const base = (nextConfig ?? {}) as T;
    const existingTurbopack = base.turbopack as TurbopackConfig | undefined;
    const userWebpack = base.webpack as WebpackFn | undefined;

    return {
      ...base,
      turbopack: {
        ...existingTurbopack,
        resolveAlias: { ...existingTurbopack?.resolveAlias, ...turboAlias },
      },
      // 既存 webpack カスタマイズがあれば compose（先に user 関数を通してから alias を足す）。
      webpack: (config: WebpackConfig, options: unknown): WebpackConfig => {
        const c = userWebpack ? userWebpack(config, options) : config;
        c.resolve = c.resolve ?? {};
        c.resolve.alias = { ...c.resolve.alias, ...wpAlias };
        return c;
      },
    };
  };
}

export default withLism;
