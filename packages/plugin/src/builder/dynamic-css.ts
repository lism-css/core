/**
 * 動的CSSビルド Vite プラグイン（#427）。
 *
 * `import 'lism-css/main.css'` 等の CSS import を `resolveId` / `load` で捕捉し、
 * `lism.config.js` を反映した CSS をその場でコンパイルして返す（`@tailwindcss/vite` と同型）。
 *
 * NOTE: 本プラグインは Vite/Astro 統合エントリの `lismCss()` が内部で使う低レベル部品。
 */
import type { ModuleNode, Plugin, ViteDevServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

import { createCssCompiler, type CssCompiler } from './compile-entry';
import { loadBuildConfigs, type LoadedBuildConfigs } from './load-config';
import { normalizePath } from './normalize-path';
import { scssDir, cssDistDir as cssDistDirRaw, distDir as distDirRaw, packageRoot as packageRootRaw } from './paths';

export interface LismDynamicCssOptions {
  /** lism.config の明示パス。未指定時は Vite root から探索する。 */
  configPath?: string;
}

// id 比較は posix 区切りで行うため normalize しておく。
const cssDistDir = normalizePath(cssDistDirRaw);
const distDir = normalizePath(distDirRaw);
const packageRoot = normalizePath(packageRootRaw);
const sourceConfigDir = `${packageRoot}/config`;
const distConfigDir = `${distDir}/config`;

// `lism-css/<entry>.css`（bare specifier）を捕捉する。<entry> は primitives/layout のようなスラッシュ入りも許す。
const BARE_CSS_RE = /^lism-css\/(.+)\.css$/;
const CONFIG_FILE_RE = /\.(?:js|mjs|ts)$/;

const CORE_CONFIG_WATCH_FILES = [path.join(packageRootRaw, 'package.json')];
const CORE_CONFIG_WATCH_DIRS = [path.join(packageRootRaw, 'config'), path.join(distDirRaw, 'config')];

function isConfigModuleFile(file: string): boolean {
  return CONFIG_FILE_RE.test(file) && !file.endsWith('.d.ts');
}

function collectConfigFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectConfigFiles(filePath));
    } else if (entry.isFile() && isConfigModuleFile(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

function coreConfigWatchFiles(): string[] {
  return [
    ...CORE_CONFIG_WATCH_FILES.filter((filePath) => fs.existsSync(filePath)),
    ...CORE_CONFIG_WATCH_DIRS.flatMap((dir) => collectConfigFiles(dir)),
  ];
}

function isCoreCssSourceFile(file: string): boolean {
  const normalized = normalizePath(file);
  return normalized.startsWith(`${normalizePath(scssDir)}/`) && normalized.endsWith('.scss');
}

function isCoreConfigFile(file: string): boolean {
  const normalized = normalizePath(file);
  return (
    (normalized.startsWith(`${sourceConfigDir}/`) && isConfigModuleFile(normalized)) ||
    (normalized.startsWith(`${distConfigDir}/`) && isConfigModuleFile(normalized))
  );
}

function isCoreDistCssFile(file: string): boolean {
  const normalized = normalizePath(file);
  return normalized.startsWith(`${cssDistDir}/`) && normalized.endsWith('.css');
}

export function lismDynamicCss(options: LismDynamicCssOptions = {}): Plugin {
  let root = '';
  let configs: LoadedBuildConfigs | null = null;
  let compiler: CssCompiler | null = null;

  function getCompiler(): CssCompiler {
    if (!compiler) compiler = createCssCompiler({ scssDir });
    return compiler;
  }

  function resetDynamicCssState(): void {
    configs = null;
    compiler?.dispose();
    compiler = null;
  }

  async function getConfigs(): Promise<LoadedBuildConfigs> {
    if (!configs) configs = await loadBuildConfigs(root || process.cwd(), { configPath: options.configPath });
    return configs;
  }

  function idForEntry(entry: string): string {
    return `${cssDistDir}/${entry}.css`;
  }

  function entryForId(id: string): string | null {
    const filePath = normalizePath(id.split('?')[0]);
    if (!filePath.startsWith(`${cssDistDir}/`) || !filePath.endsWith('.css')) return null;
    return filePath.slice(cssDistDir.length + 1, -'.css'.length);
  }

  async function watchCoreSources(ctx: { addWatchFile(file: string): void }, c: CssCompiler, cfg: LoadedBuildConfigs): Promise<void> {
    if (cfg.userConfigPath) ctx.addWatchFile(cfg.userConfigPath);
    for (const file of coreConfigWatchFiles()) ctx.addWatchFile(file);
    for (const file of await c.sourceFiles()) ctx.addWatchFile(file);
  }

  async function collectAffectedCssModules(server: ViteDevServer): Promise<ModuleNode[]> {
    const affected: ModuleNode[] = [];
    for (const entry of await getCompiler().entries()) {
      const mod = server.moduleGraph.getModuleById(idForEntry(entry));
      if (mod) affected.push(mod);
    }
    return affected;
  }

  return {
    name: 'lism-css:css',
    enforce: 'pre',

    configResolved(c) {
      root = c.root;
    },

    async resolveId(source) {
      const [spec, query] = source.split('?');
      const m = BARE_CSS_RE.exec(spec);
      if (!m) return null;
      const entry = m[1];
      if (!(await getCompiler().hasEntry(entry))) return null;
      // 自身の dist/css 上のパスへ解決する。実ファイルの有無に関わらず load で内容を供給する。
      return query ? `${idForEntry(entry)}?${query}` : idForEntry(entry);
    },

    async load(id) {
      const entry = entryForId(id);
      if (entry === null) return null;
      const c = getCompiler();
      if (!(await c.hasEntry(entry))) return null;
      const cfg = await getConfigs();
      // core 開発中の SCSS / default config 変更も dev サーバー再起動なしで反映させる。
      await watchCoreSources(this, c, cfg);
      return c.compile(entry, cfg.mainConfig, cfg.fullConfig);
    },

    async handleHotUpdate(ctx) {
      const cfgPath = configs?.userConfigPath;
      const isUserConfig = !!cfgPath && normalizePath(ctx.file) === normalizePath(cfgPath);
      if (!isUserConfig && !isCoreCssSourceFile(ctx.file) && !isCoreConfigFile(ctx.file) && !isCoreDistCssFile(ctx.file)) return;

      const affected = await collectAffectedCssModules(ctx.server);
      // 設定・SCSS・dist CSS のどれが変わっても、次回 load で必ず読み直す。
      resetDynamicCssState();
      ctx.server.ws.send({ type: 'full-reload' });
      return affected;
    },

    buildEnd() {
      compiler?.dispose();
      compiler = null;
    },
    closeBundle() {
      compiler?.dispose();
      compiler = null;
    },
  };
}

export default lismDynamicCss;
