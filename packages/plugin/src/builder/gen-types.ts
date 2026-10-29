/** lism.config.jsからmodule augmentationの`.d.ts`を生成する純粋関数。ファイル操作は`typegen.ts`が担う。 */
import type { BuildConfig, PropConfig } from './serialize';

/** 型がデフォルトで広告済みのキー（`ResponsiveProps.ts` の `BreakpointRegistry` と一致させる）。 */
const DEFAULT_ADVERTISED = ['sm', 'md', 'lg'];

/** lism-cssの`config/defaults/breakpoints.ts`の`BREAK_POINTS_OBJ`（`base`を除く）と同期する。 */
const KNOWN_BP_KEYS = ['xs', 'sm', 'md', 'lg', 'xl'];

/** 自動生成物であることを示す識別マーカー。HEADER に埋め込み、削除時の安全判定にも使う。 */
export const GENERATED_MARKER = 'このファイルは lism-css が';

const HEADER = `// ${GENERATED_MARKER} lism.config.js の breakpoints / props / traits / tokens から自動生成します。
// 編集しないでください（次回の dev / build 時に上書きされます）。`;

const CUSTOM_PROP_VALUE_TYPE = 'CustomPropValue';
const CUSTOM_TRAIT_VALUE_TYPE = 'CustomTraitValue';

function isActiveSize(size: string | number | undefined): boolean {
  return !!size && size !== '0';
}

/**
 * 既知キー（xs/sm/md/lg/xl）に限定し、ランタイム非対応の独自キーは広告しない。
 */
export function extraAdvertisedBpKeys(breakpoints: BuildConfig['breakpoints']): string[] {
  if (!breakpoints) return [];
  return KNOWN_BP_KEYS.filter((key) => !DEFAULT_ADVERTISED.includes(key) && isActiveSize(breakpoints[key]));
}

/**
 * props で追加解禁すべきキー = 「マージ後 props にあり、default-config には無い」キー。
 * 既定 prop との衝突を避け、lism.config.js で新設された prop だけを型へ広告する。
 */
export function extraCustomPropKeys(props: BuildConfig['props'] | undefined, defaultPropKeys: Iterable<string>): string[] {
  if (!props) return [];
  const defaults = new Set(defaultPropKeys);
  return Object.keys(props).filter((key) => !defaults.has(key));
}

/** traits で追加解禁すべきキー（`extraCustomPropKeys` と同じ規則）。 */
export function extraCustomTraitKeys(traits: BuildConfig['traits'] | undefined, defaultTraitKeys: Iterable<string>): string[] {
  if (!traits) return [];
  const defaults = new Set(defaultTraitKeys);
  return Object.keys(traits).filter((key) => !defaults.has(key));
}

/** typegen が差分抽出に使う default-config（マージ前）。traits / tokens は未定義でも動くよう optional。 */
export type TypegenDefaultConfig = Pick<BuildConfig, 'props'> & Partial<Pick<BuildConfig, 'tokens' | 'traits'>>;

function tokenCatalogKeys(catalog: unknown): string[] {
  if (Array.isArray(catalog)) return catalog.map(String);
  if (catalog && typeof catalog === 'object') return Object.keys(catalog);
  return [];
}

/**
 * `PropValueTypes.ts`の`ExtractPropValues`と同じ規則で値リテラルを導出する。
 * token カタログは配列なら要素、値付きフラットマップならキー一覧（'-' センチネルもカタログ上有効なので含める）。
 * token: 'color' は color（セマンティック）∪ palette（パレット）の合成カタログとして解決されるため、palette も加える。
 */
export function derivePropValueLiterals(propConfig: PropConfig, tokens?: BuildConfig['tokens']): string[] {
  const values: string[] = [];
  if (propConfig.presets) values.push(...propConfig.presets.map(String));
  if (propConfig.utils) values.push(...Object.keys(propConfig.utils));
  if (propConfig.token) {
    values.push(...tokenCatalogKeys(tokens?.[propConfig.token]));
    // colorはpaletteを含む合成カタログとして解決されるため。
    if (propConfig.token === 'color') values.push(...tokenCatalogKeys(tokens?.palette));
  }
  return [...new Set(values)];
}

/**
 * 既定propへの追加値をマージ後configとdefaultsの差分から導出する。
 * 値の削除・置換は型のユニオン合成では表現できないため対象外（任意文字列は常に許容されるので実害はない）。
 */
export function extraPropValueEntries(
  mainConfig: Pick<BuildConfig, 'props'> & Partial<Pick<BuildConfig, 'tokens'>>,
  defaultConfig: TypegenDefaultConfig
): [string, string[]][] {
  const entries: [string, string[]][] = [];
  for (const [key, defaultProp] of Object.entries(defaultConfig.props)) {
    const mergedProp = mainConfig.props?.[key];
    if (!mergedProp) continue;
    const defaults = new Set(derivePropValueLiterals(defaultProp, defaultConfig.tokens));
    const added = derivePropValueLiterals(mergedProp, mainConfig.tokens).filter((value) => !defaults.has(value));
    if (added.length > 0) entries.push([key, added]);
  }
  return entries;
}

function formatTypePropertyKey(key: string): string {
  return /^[$A-Z_a-z][$\w]*$/.test(key) ? key : JSON.stringify(key);
}

function formatStringLiteralUnion(values: string[]): string {
  return values.map((value) => `'${escapeStringLiteral(value)}'`).join(' | ');
}

/**
 * 文字列を single quote リテラルの中身としてエスケープする。
 * バックスラッシュ・制御文字（改行等）のエスケープは JSON.stringify に任せ、生成 .d.ts の構文エラーを防ぐ。
 */
function escapeStringLiteral(value: string): string {
  return JSON.stringify(value).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'");
}

function generateBreakpointBlock(keys: string[]): string | null {
  if (keys.length === 0) return null;
  const lines = keys.map((key) => `    ${key}: true;`).join('\n');
  return `  interface BreakpointRegistry {
${lines}
  }`;
}

function generateCustomPropBlock(props: BuildConfig['props'] | undefined, keys: string[], tokens?: BuildConfig['tokens']): string | null {
  if (keys.length === 0) return null;
  const lines = keys
    .map((key) => {
      const values = derivePropValueLiterals(props?.[key] ?? {}, tokens);
      const type = values.length > 0 ? `${CUSTOM_PROP_VALUE_TYPE}<${formatStringLiteralUnion(values)}>` : CUSTOM_PROP_VALUE_TYPE;
      return `    ${formatTypePropertyKey(key)}?: ${type};`;
    })
    .join('\n');
  return `  interface CustomPropRegistry {
${lines}
  }`;
}

function generateCustomPropValueBlock(entries: [string, string[]][]): string | null {
  if (entries.length === 0) return null;
  const lines = entries.map(([key, values]) => `    ${formatTypePropertyKey(key)}: ${formatStringLiteralUnion(values)};`).join('\n');
  return `  interface CustomPropValueRegistry {
${lines}
  }`;
}

function generateCustomTraitBlock(keys: string[]): string | null {
  if (keys.length === 0) return null;
  const lines = keys.map((key) => `    ${formatTypePropertyKey(key)}?: ${CUSTOM_TRAIT_VALUE_TYPE};`).join('\n');
  return `  interface CustomTraitRegistry {
${lines}
  }`;
}

/**
 * isFullMode 時は FullModeRegistry を拡張し、型側でも full 版（isVar 系を除く全 props が responsive）に切り替える。
 * キー名・値は任意（PropValueTypes 側は `keyof` の有無だけを見る）。
 */
function generateFullModeBlock(isFullMode: boolean): string | null {
  if (!isFullMode) return null;
  return `  interface FullModeRegistry {
    enabled: true;
  }`;
}

/** 追加解禁キーも追加値も isFullMode も無ければ `null`（= ファイル不要）を返す。 */
export function generateLismEnvDts(
  mainConfig: Pick<BuildConfig, 'breakpoints' | 'props' | 'traits'> & Partial<Pick<BuildConfig, 'tokens'>>,
  defaultConfig: TypegenDefaultConfig,
  isFullMode = false
): string | null {
  const bpKeys = extraAdvertisedBpKeys(mainConfig.breakpoints);
  const propKeys = extraCustomPropKeys(mainConfig.props, Object.keys(defaultConfig.props));
  const traitKeys = extraCustomTraitKeys(mainConfig.traits, Object.keys(defaultConfig.traits ?? {}));
  const propValueEntries = extraPropValueEntries(mainConfig, defaultConfig);
  if (bpKeys.length === 0 && propKeys.length === 0 && traitKeys.length === 0 && propValueEntries.length === 0 && !isFullMode) return null;

  const blocks = [
    generateBreakpointBlock(bpKeys),
    generateCustomPropBlock(mainConfig.props, propKeys, mainConfig.tokens),
    generateCustomPropValueBlock(propValueEntries),
    generateCustomTraitBlock(traitKeys),
    generateFullModeBlock(isFullMode),
  ]
    .filter((block): block is string => block !== null)
    .join('\n\n');

  const typeImports = [propKeys.length > 0 ? CUSTOM_PROP_VALUE_TYPE : null, traitKeys.length > 0 ? CUSTOM_TRAIT_VALUE_TYPE : null].filter(
    (t): t is string => t !== null
  );
  const imports = typeImports.length > 0 ? `import 'lism-css';\nimport type { ${typeImports.join(', ')} } from 'lism-css';` : "import 'lism-css';";

  return `${HEADER}
${imports}

declare module 'lism-css' {
${blocks}
}
`;
}
