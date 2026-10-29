/**
 * `dev` / `check` 共通の vite 設定組み立て。
 *
 * 両コマンドが同じ列挙・検証・境界ロジックを通るよう、プラグイン構成はここ1箇所で決める
 * （`check` 成功なのに `dev` で表示されない、という不一致を作らないため）。
 */
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { lismConfigAlias } from '@lism-css/plugin/vite';
import type { InlineConfig } from 'vite';

import { getMockPackageRoot, safeRealpath } from '../core/paths.js';
import type { MockupRuntime } from '../core/runtime.js';
import { buildImportAllowlist, type ImportAllowlist } from './allowlist.js';
import { importBoundaryPlugin } from './boundary.js';
import { lucideIconsPlugin } from './lucide-icons.js';
import { VIRTUAL_CHECK_ENTRY_ID, virtualModulesPlugin } from './virtual-modules.js';

export type MockupViteMode = 'dev' | 'build';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface MockupViteConfigOptions {
  runtime: MockupRuntime;
  viewerDir: string;
  mode: MockupViteMode;
  /**
   * 許可リスト。省略時はここで作る。
   * 構築は node_modules の走査を伴うため、コマンド側で先に作った場合はそれを渡して使い回す。
   */
  allowlist?: ImportAllowlist;
}

export function createImportAllowlist(runtime: MockupRuntime): ImportAllowlist {
  return buildImportAllowlist({ dataDir: runtime.data.dataDir, extraPackages: runtime.data.config.imports });
}

/**
 * `server.fs.allow`は多層防御であり、境界の本体は`importBoundaryPlugin`。
 * workspaceリンクのrealpath、追加パッケージの依存、共有`cacheDir`と`configDir`は
 * データディレクトリ外にあるため個別に許可する。
 */
export function collectFsAllowRoots(options: {
  viewerDir: string;
  dataDir: string;
  tempDir: string;
  cacheDir: string;
  configDir: string;
  allowlist: ImportAllowlist;
}): string[] {
  const roots = new Set<string>([
    safeRealpath(getMockPackageRoot()),
    safeRealpath(options.viewerDir),
    options.dataDir,
    options.tempDir,
    options.cacheDir,
    options.configDir,
    ...options.allowlist.packageRoots,
    ...options.allowlist.dependencyRoots,
    ...options.allowlist.mockupDependencyRoots,
  ]);
  return [...roots];
}

export function createMockViteConfig({
  runtime,
  viewerDir,
  mode,
  allowlist = createImportAllowlist(runtime),
}: MockupViteConfigOptions): InlineConfig {
  const dataDir = runtime.data.dataDir;

  const config: InlineConfig = {
    // ユーザー側の vite 設定・.env は読まない（ビューアは CLI 同梱の固定配布物）。
    configFile: false,
    envFile: false,
    root: viewerDir,
    // データディレクトリへは書かず（読み取り専用の配布物でも動く）、起動間で使い回せる場所を使う。
    cacheDir: runtime.cacheDir,
    clearScreen: false,
    // build のエラーは check 側で整形して出すため、vite 自身のログは抑える。
    logLevel: mode === 'build' ? 'silent' : 'info',
    plugins: [
      lismConfigAlias({ configPath: runtime.configPath }),
      virtualModulesPlugin(runtime),
      importBoundaryPlugin({
        dataDir,
        allowlist,
        // 許可済みbare importが事前バンドル先へ解決されても拒否しないため。
        generatedDir: runtime.cacheDir,
        getPageSpecifiers: () => runtime.getPageSpecifiers(),
      }),
      // 許可判定後の再解決で仮想モジュールを返すため、境界チェックの後ろに置く。
      lucideIconsPlugin(),
      // cacheDir配下の事前バンドル済み依存を不要なBabel解析から除外する。
      react({ exclude: [new RegExp(escapeRegExp(runtime.cacheDir))] }),
    ],
    resolve: {
      // ページ・ビューア・lism-ui が同じ React インスタンスを共有するようにする。
      dedupe: ['react', 'react-dom'],
    },
    server: {
      // localhost 限定。allowedHosts / CORS 全許可は使わない。
      host: 'localhost',
      fs: {
        strict: true,
        allow: collectFsAllowRoots({
          viewerDir,
          dataDir,
          tempDir: runtime.tempDir,
          cacheDir: runtime.cacheDir,
          configDir: runtime.configDir,
          allowlist,
        }),
      },
    },
  };

  if (mode === 'build') {
    config.build = {
      // bundle 検証だけが目的なのでファイルは書き出さない。
      write: false,
      minify: false,
      outDir: path.join(runtime.tempDir, 'build'),
      emptyOutDir: false,
      // 全ページを静的 import する仮想 entry を使う（tree-shaking で検証が空振りしないように）。
      rollupOptions: { input: VIRTUAL_CHECK_ENTRY_ID },
    };
  }

  return config;
}
