/**
 * 検証済みtokensから生成したlism.configをReactランタイムとCSS生成で共有する。
 * lism.configにダークの概念は無いため、ダーク値は`.set--dark`へだけ反映する。
 *
 * 契約違反は警告にせず必ずエラーにする（警告だと `check` 成功の意味が崩れるため）。
 */
import fs from 'node:fs';
import path from 'node:path';

import { loadBuildConfigs, loadDefaultConfig, serializeTokens } from '@lism-css/plugin/builder';
import getTokenVarName from 'lism-css/lib/getTokenVarName';

import { isPlainObject, MockupContractError, type MockupTokens, type TokenEntry, type TokenGroupEntry } from './types.js';

export const TOKENS_FILENAME = 'tokens.json';
export const DARK_TOKENS_FILENAME = 'tokens.dark.json';

/**
 * ダーク時のトークンを載せるスコープクラス。
 *
 * ページ全体・一部・プレビュー箱のどれにも付けられるよう、`:root`には限定しない。
 */
export const DARK_SCOPE_CLASS = 'set--dark';

/**
 * `.mjs` にしない。`loadBuildConfigs()` の jiti は ESM ファイルをネイティブ import で読むため、
 * 同じパスを書き換えても Node の ESM キャッシュが効いて `tokens.json` の変更を拾えなくなる。
 * `.js`（jiti の transform 経路 + `moduleCache: false`）なら毎回読み直される。
 */
export const GENERATED_CONFIG_FILENAME = 'lism.config.js';

/** 新しいキーの追加を許可するトークン種別。それ以外は既存キーの値上書きのみ。 */
const NEW_KEY_ALLOWED_TOKENS = new Set(['color']);

/**
 * トークンキーに使えない予約キー。
 *
 * `writeConfigModule()` が書き出すのは `export default { ... }` のオブジェクトリテラルで、
 * その中の `"__proto__": ...` はプロトタイプ設定構文と解釈されるため own key として残らない。
 * 検証だけ通って生成 CSS とトークン一覧から黙って消えるより、ここで契約違反にする。
 */
const RESERVED_TOKEN_KEY = '__proto__';

const VAR_REFERENCE_PATTERN = /var\(\s*(--[\w-]+)/g;

/**
 * 一覧に出すのは「生成 CSS が実際に定義しているトークン」だけなので、除外規則は
 * `serializeTokens()` と揃える必要がある。片方だけ変わるズレを見つけやすいよう、
 * 複製したルールはこの関数1つに閉じ込める。
 */
function isOmittedTokenValue(value: string | number | null | undefined): boolean {
  return value === '-' || value === '' || value == null;
}

function defaultTokenKeys(catalog: unknown): string[] {
  if (Array.isArray(catalog)) return catalog.map((key) => String(key));
  if (isPlainObject(catalog)) return Object.keys(catalog);
  return [];
}

interface TokenFileRules {
  filename: string;
  newKeyAllowed: ReadonlySet<string>;
  /**
   * 既存キーであっても、比較対象が CSS 変数を持たない（`'-'` センチネル等）なら弾くか。
   *
   * ダークだけで有効になる。ライトに実値が無いトークンをダークにだけ持たせると
   * 「ライトに対する差分」として一覧に並べられなくなるため。
   */
  requireExistingValue: boolean;
}

const LIGHT_RULES: TokenFileRules = {
  filename: TOKENS_FILENAME,
  newKeyAllowed: NEW_KEY_ALLOWED_TOKENS,
  requireExistingValue: false,
};

const DARK_RULES: TokenFileRules = {
  filename: DARK_TOKENS_FILENAME,
  // ライトのどこにも存在しない完全な新規キーは弾く（`color` の例外はダークへ持ち込まない）。
  newKeyAllowed: new Set<string>(),
  requireExistingValue: true,
};

function unknownKeyMessage(rules: TokenFileRules, group: string, key: string, knownKeys: string[]): string {
  if (!rules.requireExistingValue) {
    return `${rules.filename}: "${group}.${key}" is not an existing token. Only "color" accepts new keys; other groups can override existing values only (${group}: ${knownKeys.join(', ')}).`;
  }
  const head = `${rules.filename}: "${group}.${key}" does not exist in the light theme.`;
  // 種別ごと上書き不可（`flow` のように実値を手書き SCSS が持つもの）なら、
  // 空の候補リストを出しても直し方が分からないので、そう書く。
  if (knownKeys.length === 0) {
    return `${head} No token in "${group}" can be overridden: the light theme declares no CSS variable for this group.`;
  }
  return `${head} ${rules.filename} can only override tokens that ${TOKENS_FILENAME} or Lism CSS already defines (${group}: ${knownKeys.join(', ')}).`;
}

function validateTokenFile(raw: unknown, knownTokens: Record<string, unknown>, file: string, rules: TokenFileRules): MockupTokens {
  if (!isPlainObject(raw)) {
    throw new MockupContractError(`${rules.filename} must contain a JSON object of token groups (e.g. { "color": { "brand": "#333" } }).`, {
      file,
    });
  }

  // ユーザー入力のキーを持たせる器は必ず null プロトタイプにする。
  // 素の `{}` だと `constructor` / `toString` が継承分と紛れ、下流の存在判定がプロトタイプ由来のキーに引っかかる。
  const tokens = Object.create(null) as MockupTokens;
  for (const [group, values] of Object.entries(raw)) {
    // `in` は `constructor` / `toString` / `__proto__` まで既知グループ扱いにしてしまうため hasOwn で判定する。
    if (!Object.hasOwn(knownTokens, group)) {
      throw new MockupContractError(`${rules.filename}: unknown token group "${group}". Available groups: ${Object.keys(knownTokens).join(', ')}.`, {
        file,
      });
    }
    if (!isPlainObject(values)) {
      throw new MockupContractError(`${rules.filename}: "${group}" must be an object of token key / value pairs.`, { file });
    }

    const catalog = knownTokens[group];
    // ダークは「実値を持つキー」だけを上書き対象にするため、案内するキー一覧も同じ条件で絞る。
    const knownKeys = rules.requireExistingValue
      ? defaultTokenKeys(catalog).filter((key) => isPlainObject(catalog) && !isOmittedTokenValue(catalog[key] as string | number | null))
      : defaultTokenKeys(catalog);

    const entry = Object.create(null) as Record<string, string | number>;
    for (const [key, value] of Object.entries(values)) {
      if (key === RESERVED_TOKEN_KEY) {
        throw new MockupContractError(
          `${rules.filename}: "${group}.${key}" cannot be used as a token key (the generated ${GENERATED_CONFIG_FILENAME} cannot carry it). Rename the token.`,
          { file }
        );
      }
      if (!knownKeys.includes(key) && !rules.newKeyAllowed.has(group)) {
        throw new MockupContractError(unknownKeyMessage(rules, group, key, knownKeys), { file });
      }
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new MockupContractError(`${rules.filename}: "${group}.${key}" must be a string or a number.`, { file });
      }
      entry[key] = value;
    }
    tokens[group] = entry;
  }

  return tokens;
}

export function validateTokens(raw: unknown, defaultTokens: Record<string, unknown>, file: string): MockupTokens {
  return validateTokenFile(raw, defaultTokens, file, LIGHT_RULES);
}

/**
 * 上書きできるのは「ライト側に実値があるトークン」だけ。判定の正は default-config 単体ではなく
 * マージ後のライト側トークンで、`tokens.json` が `color` に足した独自キーもダークで上書きできる。
 */
export function validateDarkTokens(raw: unknown, lightTokens: Record<string, unknown>, file: string): MockupTokens {
  return validateTokenFile(raw, lightTokens, file, DARK_RULES);
}

/**
 * ダークの検証と`.set--dark`の依存解決が同じライト側トークンを参照するための正本。
 */
export function mergeLightTokens(defaultTokens: Record<string, unknown>, overrides: MockupTokens): Record<string, Record<string, string | number>> {
  const merged = Object.create(null) as Record<string, Record<string, string | number>>;

  for (const [group, catalog] of Object.entries(defaultTokens)) {
    const entry = Object.create(null) as Record<string, string | number>;
    if (isPlainObject(catalog)) {
      for (const [key, value] of Object.entries(catalog)) entry[key] = value as string | number;
    } else {
      // 配列カタログ（キーだけの登録）は CSS 変数を持たない。センチネルと同じ扱いにする。
      for (const key of defaultTokenKeys(catalog)) entry[key] = '-';
    }
    merged[group] = entry;
  }

  for (const [group, values] of Object.entries(overrides)) {
    const entry = merged[group] ?? (merged[group] = Object.create(null) as Record<string, string | number>);
    for (const [key, value] of Object.entries(values)) entry[key] = value;
  }

  return merged;
}

/** トークンファイルを読み込む。ファイルが無い場合は null（空トークン扱い）。 */
export function readTokensFile(dataDir: string, filename: string = TOKENS_FILENAME): { raw: unknown; file: string } | null {
  const file = path.join(dataDir, filename);

  // 存在確認と読み込みを分けると同じパスへ2回 syscall が走るので、読み込みの失敗（ENOENT）で
  // 「無い」を判定する。ENOENT 以外（権限エラー等）はここで握りつぶさず、そのまま投げ直す。
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  try {
    return { raw: JSON.parse(content), file };
  } catch (error) {
    throw new MockupContractError(`${filename} is not valid JSON: ${(error as Error).message}`, { file });
  }
}

/**
 * ライト / ダークの2ファイルを読み、default-config を正として検証した結果を返す。
 *
 * ここで要るのはマージ前の default-config だけなので `loadDefaultConfig()` を使う。
 * `loadBuildConfigs()` だと user 設定の読み込みと full preset のマージまで走り、
 * dev watch で `tokens.json` を保存するたびに無駄な計算を繰り返すことになる。
 */
export async function loadTokens(dataDir: string): Promise<{ tokens: MockupTokens; darkTokens: MockupTokens }> {
  const light = readTokensFile(dataDir, TOKENS_FILENAME);
  const dark = readTokensFile(dataDir, DARK_TOKENS_FILENAME);
  if (!light && !dark) return { tokens: {}, darkTokens: {} };

  const defaultConfig = await loadDefaultConfig();
  const tokens = light ? validateTokens(light.raw, defaultConfig.tokens, light.file) : {};
  if (!dark) return { tokens, darkTokens: {} };

  return { tokens, darkTokens: validateDarkTokens(dark.raw, mergeLightTokens(defaultConfig.tokens, tokens), dark.file) };
}

export function writeConfigModule(dir: string, tokens: MockupTokens): string {
  const file = path.join(dir, GENERATED_CONFIG_FILENAME);
  const body = `// Generated by @lism-css/mockup from ${TOKENS_FILENAME}. Do not edit.\nexport default ${JSON.stringify({ tokens }, null, 2)};\n`;
  // 並走プロセスが書き込み途中を読まないよう、一時ファイルからrenameで原子的に置き換える。
  const temp = path.join(dir, `.${GENERATED_CONFIG_FILENAME}.${process.pid}.tmp`);
  fs.writeFileSync(temp, body, 'utf-8');
  fs.renameSync(temp, file);
  return file;
}

export interface DarkTokenEntry {
  group: string;
  key: string;
  varName: string;
  value: string;
  /** `tokens.dark.json` が直接指定したものか（false は依存で再宣言されたもの）。 */
  isDeclared: boolean;
}

function referencedVarNames(value: string): string[] {
  return [...value.matchAll(VAR_REFERENCE_PATTERN)].map((match) => match[1]);
}

/**
 * ダーク指定とその依存トークンを、ライト側の順序で列挙する。
 *
 * `tokens.dark.json` の指定に加え、その値を参照して組み立てられているライト側トークンも
 * 同じブロックへ再宣言する。CSS カスタムプロパティの `var()` は「宣言した要素の計算値」を作る
 * 時点で解決されるため、`.set--dark { --L: 70% }` だけでは `:root` で確定済みの
 * `--red: oklch(var(--L) …)` は変わらない。再宣言して初めてダークの `--L` で組み直される。
 * lism-css の `.set--s` / `.set--bxsh`（TOKEN_SCOPE）が依存トークンを再宣言しているのと同じ理屈。
 *
 * 参照は連鎖しうる（`--L` → `--red`、`--fz--base` → `--hl-unit` → `--hl--base`）ため、
 * 追加が起きなくなるまで繰り返す。
 */
export function collectDarkTokens(lightTokens: Record<string, unknown>, darkTokens: MockupTokens): DarkTokenEntry[] {
  // 配列カタログ等は CSS 変数を持たないので、`serializeTokens()` と同じ規則で最初に外す。
  const groupEntries = Object.entries(lightTokens).filter((pair): pair is [string, Record<string, string | number>] => isPlainObject(pair[1]));

  const declaredVarNames = new Set<string>();
  const declared = new Map<string, string>();
  const entryId = (group: string, key: string) => `${group}\0${key}`;

  for (const [group, values] of Object.entries(darkTokens)) {
    for (const [key, value] of Object.entries(values)) {
      if (isOmittedTokenValue(value)) continue;
      declared.set(entryId(group, key), String(value));
      declaredVarNames.add(getTokenVarName(group, key));
    }
  }
  if (declared.size === 0) return [];

  let added = true;
  while (added) {
    added = false;
    for (const [group, values] of groupEntries) {
      for (const [key, value] of Object.entries(values)) {
        const id = entryId(group, key);
        if (declared.has(id) || isOmittedTokenValue(value)) continue;
        if (!referencedVarNames(String(value)).some((name) => declaredVarNames.has(name))) continue;

        declared.set(id, String(value));
        declaredVarNames.add(getTokenVarName(group, key));
        added = true;
      }
    }
  }

  // 並びはライト側に揃える（一覧のダークセクションが元のセクションと同じ順で読める）。
  const entries: DarkTokenEntry[] = [];
  for (const [group, values] of groupEntries) {
    for (const key of Object.keys(values)) {
      const value = declared.get(entryId(group, key));
      if (value === undefined) continue;
      entries.push({
        group,
        key,
        varName: getTokenVarName(group, key),
        value,
        isDeclared: Object.hasOwn(darkTokens, group) && Object.hasOwn(darkTokens[group], key),
      });
    }
  }
  return entries;
}

/** `.set--dark` ブロックの CSS。ダーク宣言が無ければ空文字（＝クラス自体が存在しない）。 */
export function serializeDarkTokens(entries: DarkTokenEntry[]): string {
  if (entries.length === 0) return '';
  const decls = entries.map((entry) => `  ${entry.varName}: ${entry.value};`);
  return `.${DARK_SCOPE_CLASS} {\n${decls.join('\n')}\n}\n`;
}

const STRUCTURAL_VARS_GROUP = 'vars';

/**
 * 固定の対応表を持たず、トークン値の `var()` 参照から導く。lism-css 側で構造変数が
 * 増減しても追従し、どのグループからも参照されない変数は振り分け先なし（`vars` セクション残り）
 * として扱える。複数グループから参照される場合はマージ順で最初のグループに置く。
 */
function mapStructuralVarTargets(mergedTokens: Record<string, unknown>): Map<string, string> {
  const targets = new Map<string, string>();
  const varsMap = mergedTokens[STRUCTURAL_VARS_GROUP];
  if (!isPlainObject(varsMap)) return targets;

  for (const [group, valueMap] of Object.entries(mergedTokens)) {
    if (group === STRUCTURAL_VARS_GROUP || !isPlainObject(valueMap)) continue;
    for (const value of Object.values(valueMap)) {
      if (typeof value !== 'string') continue;
      for (const name of referencedVarNames(value)) {
        if (Object.hasOwn(varsMap, name) && !targets.has(name)) targets.set(name, group);
      }
    }
  }
  return targets;
}

/**
 * マージ済みトークンをビューアの一覧データへ変換する。
 *
 * 構造変数（`vars`）は独立したセクションにせず、それを参照しているグループの
 * `structuralVars` へ振り分ける（`--L` はパレットの基準明度、のように使う場所で読めるため）。
 * どこからも参照されない変数だけが `vars` セクションに残る。
 */
export function collectTokenGroups(
  mergedTokens: Record<string, unknown>,
  defaultTokens: Record<string, unknown>,
  overrides: MockupTokens,
  darkEntries: DarkTokenEntry[] = []
): TokenGroupEntry[] {
  const groups: TokenGroupEntry[] = [];
  const varTargets = mapStructuralVarTargets(mergedTokens);

  const entriesOf = (group: string, valueMap: Record<string, string | number>): TokenEntry[] => {
    // 上書き元は null プロトタイプのユーザー入力なので、`in` ではなく hasOwn で own key だけを見る。
    const overrideGroup = Object.hasOwn(overrides, group) && isPlainObject(overrides[group]) ? overrides[group] : null;
    const knownKeys = overrideGroup ? defaultTokenKeys(defaultTokens[group]) : [];

    const tokens: TokenEntry[] = [];
    // 値は string | number 前提（default-config の定義と `validateTokens` の契約）。serializeTokens と同じ見なし方。
    for (const [key, value] of Object.entries(valueMap)) {
      if (isOmittedTokenValue(value)) continue;

      const isOverride = overrideGroup !== null && Object.hasOwn(overrideGroup, key);
      const source: TokenEntry['source'] = isOverride ? (knownKeys.includes(key) ? 'overridden' : 'custom') : 'default';

      tokens.push({ key, varName: getTokenVarName(group, key), value: String(value), source });
    }
    return tokens;
  };

  // 構造変数を参照元グループへ振り分ける。メインのループはマージ順に進むため、
  // vars がどの位置にあっても振り分け結果が揃っているよう先に処理しておく。
  const structuralByGroup = new Map<string, TokenEntry[]>();
  const residualVars: TokenEntry[] = [];
  const varsMap = mergedTokens[STRUCTURAL_VARS_GROUP];
  if (isPlainObject(varsMap)) {
    for (const token of entriesOf(STRUCTURAL_VARS_GROUP, varsMap as Record<string, string | number>)) {
      const target = varTargets.get(token.key);
      if (target === undefined) {
        residualVars.push(token);
        continue;
      }
      const list = structuralByGroup.get(target);
      if (list) list.push(token);
      else structuralByGroup.set(target, [token]);
    }
  }

  // ダークの構造変数も同じ振り分けで運ぶ（`vars (dark)` ではなく `palette (dark)` の構造変数になる）。
  const darkTokensByGroup = new Map<string, DarkTokenEntry[]>();
  const darkVarsByGroup = new Map<string, DarkTokenEntry[]>();
  for (const entry of darkEntries) {
    const target = entry.group === STRUCTURAL_VARS_GROUP ? varTargets.get(entry.key) : undefined;
    const store = target === undefined ? darkTokensByGroup : darkVarsByGroup;
    const group = target ?? entry.group;
    const list = store.get(group);
    if (list) list.push(entry);
    else store.set(group, [entry]);
  }

  // ダークのセクションはすべてライトからの差分なので一覧では区別しないが、
  // 「直接書いたもの」と「依存で再宣言されたもの」の別はここで保っておく。
  const toDarkEntry = (entry: DarkTokenEntry): TokenEntry => ({
    key: entry.key,
    varName: entry.varName,
    value: entry.value,
    source: entry.isDeclared ? 'overridden' : 'default',
  });

  for (const [group, valueMap] of Object.entries(mergedTokens)) {
    // 配列カタログ（キーだけの登録）などは CSS 変数を持たないため、serializeTokens と同じ規則で飛ばす。
    if (!isPlainObject(valueMap)) continue;

    // vars 自身のセクションに出すのは、どのグループからも参照されていない残りだけ。
    const isVarsGroup = group === STRUCTURAL_VARS_GROUP;
    const tokens = isVarsGroup ? residualVars : entriesOf(group, valueMap as Record<string, string | number>);
    const structuralVars = structuralByGroup.get(group);

    if (tokens.length === 0 && structuralVars === undefined) continue;
    const varPrefix = getTokenVarName(group, '');

    const entry: TokenGroupEntry = { id: group, group, label: group, varPrefix, tokens };
    if (structuralVars !== undefined) entry.structuralVars = structuralVars;
    groups.push(entry);

    const dark = darkTokensByGroup.get(group);
    const darkVars = darkVarsByGroup.get(group);
    if (!dark && !darkVars) continue;
    const darkEntry: TokenGroupEntry = {
      id: `${group}--dark`,
      group,
      label: `${group} (dark)`,
      isDark: true,
      varPrefix,
      tokens: (dark ?? []).map(toDarkEntry),
    };
    if (darkVars !== undefined) darkEntry.structuralVars = darkVars.map(toDarkEntry);
    groups.push(darkEntry);
  }

  return groups;
}

/**
 * 生成configからトークンCSSとビューア用一覧をまとめて作る。
 *
 * ビューアは Lism 標準の `lism-css/main.css` を読むため、main 側の BuildConfig を直列化する。
 * CSSと一覧は同じconfigから作り、ずれを防ぐ。
 */
export async function buildTokensArtifacts(
  dataDir: string,
  configPath: string,
  overrides: MockupTokens,
  darkOverrides: MockupTokens = {}
): Promise<{ css: string; groups: TokenGroupEntry[] }> {
  const { mainConfig, defaultConfig } = await loadBuildConfigs(dataDir, { configPath });
  const darkEntries = collectDarkTokens(mainConfig.tokens, darkOverrides);

  return {
    css: serializeTokens(mainConfig) + serializeDarkTokens(darkEntries),
    groups: collectTokenGroups(mainConfig.tokens, defaultConfig.tokens, overrides, darkEntries),
  };
}
