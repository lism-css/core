/**
 * 「config 反映済み CSS を任意の出力先へ事前生成し、bare CSS import の alias map を返す」中立 helper。
 *
 * Vite/Astro 統合は `lismDynamicCss` が bare CSS import（`import 'lism-css/main.css'`）をオンザフライで
 * 横取りしてコンパイルするが、Turbopack（Next.js）/ webpack にはその横取り口が無い。
 * そこでこれらの環境では、config 反映済み CSS を `<root>/.lism-css/css/*` のような実ディレクトリへ**事前生成**し、
 * `lism-css/<entry>.css` をその生成物へ alias で差し替える方式を取る（Next.js 16 / Turbopackで確認済み）。
 *
 * 本 helper は bundler 非依存で、CLI の `buildCssToDir` を流用して出力する。
 */
import path from 'node:path';

import { buildCssToDir } from './compile';
import { loadBuildConfigs } from './load-config';
import { scssDir } from './paths';
import { normalizePath } from './normalize-path';

// full 系は purge 併用前提のスーパーセット。既定では生成しない（main 系のみ）。
const FULL_ENTRIES_IGNORE = ['full.scss', 'full_no_layer.scss'];

export interface GenerateCssOptions {
  projectRoot: string;
  outDir: string;
  configPath?: string;
  /** full.css / full_no_layer.css も生成するか（既定: false。purge 併用時に有効化）。 */
  full?: boolean;
  /** autoprefixer + cssnano を通すか（既定: true）。 */
  minify?: boolean;
  log?: (message: string) => void;
}

export interface GeneratedCss {
  entries: string[];
  aliasMap: Record<string, string>;
  outDir: string;
  /** watch 対象にすべき lism.config の絶対パス（無ければ null）。 */
  userConfigPath: string | null;
}

export async function generateCssToDir(opts: GenerateCssOptions): Promise<GeneratedCss> {
  const { projectRoot, outDir, configPath, full = false, minify = true, log } = opts;

  const { mainConfig, fullConfig, userConfigPath } = await loadBuildConfigs(projectRoot, { configPath });
  const written = await buildCssToDir({
    scssDir,
    distDir: outDir,
    mainConfig,
    fullConfig,
    ignore: full ? [] : FULL_ENTRIES_IGNORE,
    minify,
    log,
  });

  const entries: string[] = [];
  const aliasMap: Record<string, string> = {};
  for (const abs of written) {
    const entry = normalizePath(path.relative(outDir, abs)).replace(/\.css$/, '');
    entries.push(entry);
    aliasMap[`lism-css/${entry}.css`] = abs;
  }

  return { entries, aliasMap, outDir, userConfigPath };
}
