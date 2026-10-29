/**
 * 「config 読み込み」の共有ロジック。bin CLI と Vite プラグインが共有する。
 *
 * - `computeBuildConfigs`: defaults / full preset / full CSS defaults / userConfig をマージして main / full の BuildConfig を作る純粋関数。
 *   マージ順（later wins）は lism-css の `config/index.ts` と一致させる（JS ランタイムと CSS 出力の乖離防止）。
 * - `loadBuildConfigs`: lism-css の default-config / props-full preset / helper と
 *   projectRoot の `lism.config.{js,mjs,ts}` を読み込んでマージする。consumer 環境（インストール済みパッケージ）で実行される前提。
 *   user 設定は jiti（`moduleCache: false`）経由で import し、dev での `lism.config.*` 変更を再評価できるようにする。
 * - `loadDefaultConfig`: マージ前の default-config だけが要る呼び出し向けの軽量版。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import type { LismConfig } from 'lism-css/config-types';
import type { BuildConfig, PropConfig } from './serialize';

export type ObjDeepMerge = (origin: Record<string, unknown>, source: Record<string, unknown>) => Record<string, unknown>;

const USER_CONFIG_SEARCH = ['lism.config.ts', 'lism.config.mjs', 'lism.config.js'];
const FULL_CSS_DEFAULTS = {
  // full.css は purge 併用前提のスーパーセットとして xs を有効化する。
  // userConfig はこの後にマージするため、lism.config.* の breakpoints.xs が最後に勝つ。
  breakpoints: { xs: '360px' },
} satisfies Record<string, unknown>;

type DefaultModule<T> = { default: T };
type HelperModule = { objDeepMerge: ObjDeepMerge };

async function importFreshModule<T>(specifier: string): Promise<T> {
  const resolved = import.meta.resolve(specifier);
  if (!resolved.startsWith('file:')) return (await import(specifier)) as T;

  const filePath = fileURLToPath(resolved);
  const mtime = fs.statSync(filePath).mtimeMs;
  return (await import(`${pathToFileURL(filePath).href}?v=${mtime}`)) as T;
}

async function loadCoreBuildDeps(): Promise<{
  defaultConfig: BuildConfig;
  propsFull: Record<string, PropConfig>;
  objDeepMerge: ObjDeepMerge;
}> {
  const [tokens, props, traits, breakpoints, propsFullMod, helper] = await Promise.all([
    importFreshModule<DefaultModule<BuildConfig['tokens']>>('lism-css/config/defaults/tokens'),
    importFreshModule<DefaultModule<BuildConfig['props']>>('lism-css/config/defaults/props'),
    importFreshModule<DefaultModule<BuildConfig['traits']>>('lism-css/config/defaults/traits'),
    importFreshModule<DefaultModule<BuildConfig['breakpoints']>>('lism-css/config/defaults/breakpoints'),
    importFreshModule<DefaultModule<Record<string, PropConfig>>>('lism-css/config/presets/props-full'),
    importFreshModule<HelperModule>('lism-css/config/helper'),
  ]);

  return {
    defaultConfig: {
      tokens: tokens.default,
      props: props.default,
      traits: traits.default,
      breakpoints: breakpoints.default,
    },
    propsFull: propsFullMod.default,
    objDeepMerge: helper.objDeepMerge,
  };
}

export interface LoadedBuildConfigs {
  /** main 系（main.css / 個別レイヤ）が読む prop-config の元 CONFIG。isFullMode 時は fullConfig と同一。 */
  mainConfig: BuildConfig;
  /** full 系（full.css / full_no_layer.css）が読む prop-config の元 CONFIG。 */
  fullConfig: BuildConfig;
  /** マージ前の default-config。typegen で追加 prop / trait / 追加値の差分抽出に使う。 */
  defaultConfig: BuildConfig;
  /** lism.config.* の isFullMode フラグ。 */
  isFullMode: boolean;
  /** 見つかった user 設定ファイルの絶対パス（無ければ null）。watch 対象に使う。 */
  userConfigPath: string | null;
}

/** 明示パス、または projectRoot 直下の lism.config.{js,mjs,ts} を探す。 */
export function findUserConfigPath(projectRoot: string, configPath?: string): string | null {
  if (configPath) {
    const abs = path.resolve(projectRoot, configPath);
    return fs.existsSync(abs) ? abs : null;
  }

  for (const name of USER_CONFIG_SEARCH) {
    const abs = path.resolve(projectRoot, name);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

export interface ComputeBuildConfigsInput {
  defaultConfig: BuildConfig;
  propsFull: Record<string, PropConfig>;
  userConfig: Record<string, unknown>;
  objDeepMerge: ObjDeepMerge;
}

/**
 * defaults / full preset / userConfig から main / full の BuildConfig を作る純粋関数。
 *
 * マージ順（later wins）:
 *   - fullConfig: defaults → full preset → full CSS defaults → userConfig
 *   - mainConfig: isFullMode 時は fullConfig と同一、それ以外は defaults → userConfig
 *
 * full CSS defaults 以外は lism-css の `config/index.ts`（コンポーネント側）と同じ順序。
 * full CSS defaults は CSS 出力だけに効く設定なので、ランタイム側には無い。
 */
export function computeBuildConfigs({ defaultConfig, propsFull, userConfig, objDeepMerge }: ComputeBuildConfigsInput): {
  mainConfig: BuildConfig;
  fullConfig: BuildConfig;
  isFullMode: boolean;
} {
  const isFullMode = !!(userConfig as LismConfig).isFullMode;

  const base = defaultConfig as unknown as Record<string, unknown>;
  const fullBase = objDeepMerge(objDeepMerge(base, { props: propsFull }), FULL_CSS_DEFAULTS);
  const fullConfig = objDeepMerge(fullBase, userConfig) as unknown as BuildConfig;
  const mainConfig = isFullMode ? fullConfig : (objDeepMerge(base, userConfig) as unknown as BuildConfig);

  return { mainConfig, fullConfig, isFullMode };
}

/**
 * マージ前の default-config だけを読み込む。
 *
 * `loadBuildConfigs()` は user 設定の読み込みと full preset の深いマージ（`fullConfig`）まで必ず走らせるが、
 * default-config の値しか見ない呼び出し（トークンの既存キー判定など）にはそのどちらも要らない。
 * dev watch で何度も呼ばれる経路のために、その分を省いた入口を用意している。
 */
export async function loadDefaultConfig(): Promise<BuildConfig> {
  const { defaultConfig } = await loadCoreBuildDeps();
  return defaultConfig;
}

export interface LoadBuildConfigsOptions {
  /** lism.config の明示パス。未指定時は projectRoot から探索する。 */
  configPath?: string;
}

/**
 * projectRoot の lism.config を反映した main / full の BuildConfig を読み込む。
 */
export async function loadBuildConfigs(projectRoot: string, opts: LoadBuildConfigsOptions = {}): Promise<LoadedBuildConfigs> {
  const userConfigPath = findUserConfigPath(projectRoot, opts.configPath);
  let userConfig: Record<string, unknown> = {};
  if (userConfigPath) {
    // jiti で読み込む（.ts も含めて対応するため）。moduleCache: false で dev watch 時の
    // 再評価を担保する。jiti 2 の interopDefault は既定で true の
    // ため false を明示し、native import() と同じ「default 無し→空オブジェクト」の意味論を
    // 維持して手動で `?.default` を取り出す。
    const jiti = createJiti(import.meta.url, { moduleCache: false, interopDefault: false });
    const mod = await jiti.import(userConfigPath);
    userConfig = (mod as { default?: Record<string, unknown> })?.default ?? {};
  }

  const { defaultConfig, propsFull, objDeepMerge } = await loadCoreBuildDeps();
  const { mainConfig, fullConfig, isFullMode } = computeBuildConfigs({
    defaultConfig,
    propsFull,
    userConfig,
    objDeepMerge,
  });
  return {
    mainConfig,
    fullConfig,
    defaultConfig,
    isFullMode,
    userConfigPath,
  };
}
