/** パッケージ自身のビルドと各プラグインが共有する SCSS 直列化関数群。 */
import getMaybeTokenValue from 'lism-css/lib/getMaybeTokenValue';
import getTokenVarName from 'lism-css/lib/getTokenVarName';
import { TOKEN_SCOPE } from 'lism-css/config/defaults/token-scope';
// PropConfig は config 執筆用の型（lism-css core）を single source として共有する。
import type { PropConfig } from 'lism-css/config-types';

type TokenValue = string | number;
type Tokens = Record<string, unknown>;

export type { PropConfig };

export interface BuildConfig {
  tokens: Tokens;
  props: Record<string, PropConfig>;
  /**
   * ブレイクポイント定義。`'480px'` 等のサイズ文字列、または 0（無効）。
   * lism.config.js で差分上書きでき、xs/xl はサイズを与えるだけで有効化できる。
   */
  breakpoints?: Record<string, string | number>;
  /** CSS 出力には使わず、追加 trait の型生成に使う。 */
  traits?: Record<string, string>;
  /**
   * Property Class へデフォルトで `!important` を付与するか（Sass `$default_important`）。
   * lism.config.js のルートキー `defaultImportant: true` で有効化する。
   * これは CSS 生成時に決まるビルド時設定で、runtime injection では切り替えられない。
   * `@layer` ありビルド（main / full）にのみ効く。no_layer 系エントリは常に付与する（`_mixin.scss` 参照）。
   */
  defaultImportant?: boolean;
}

/**
 * トークンカタログ（配列 or 値付きフラットマップ）から、クラス化するキー一覧を取り出す。
 * '-' センチネル（実値は手書き SCSS）もカタログ上は有効なので、キーとして含める。
 */
function tokenCatalogKeys(catalog: unknown): string[] {
  if (Array.isArray(catalog)) return catalog.map(String);
  if (catalog && typeof catalog === 'object') return Object.keys(catalog);
  return [];
}

/** presets・utils・tokenからユーティリティ値を生成する。 */
function generateUtilities(propConfig: PropConfig, TOKENS: Tokens): Record<string, string> {
  const { utils = {}, presets: basePresets = [], token = '', tokenClass = 0 } = propConfig;

  // config 側の配列はマージ後も参照共有されているため、複製してから使う。
  // （直接 push すると、同一プロセスで複数回ビルドした時に presets が重複する）
  const presets = [...basePresets];
  const utilities: Record<string, string> = {};

  if (token && tokenClass === 1) {
    presets.push(...tokenCatalogKeys(TOKENS[token]));
    // color は palette を含む合成カタログとして解決されるため。
    if (token === 'color') presets.push(...tokenCatalogKeys(TOKENS.palette));
  }

  if (presets.length > 0) {
    presets.forEach((preset) => {
      utilities[preset] = getMaybeTokenValue(token, preset, TOKENS as Parameters<typeof getMaybeTokenValue>[2]);
    });
  }

  if (utils) {
    Object.entries(utils).forEach(([key, value]) => {
      utilities[key] = String(value);
    });
  }

  return utilities;
}

/** 1つのprop設定をSCSSのmap entryへ変換する。 */
function generatePropScss(propKey: string, propConfig: PropConfig, TOKENS: Tokens): string {
  const { prop = '', bp, isVar, alwaysVar, important } = propConfig;

  const utilities = generateUtilities(propConfig, TOKENS);
  const hasUtilities = Object.keys(utilities).length > 0;

  if (!hasUtilities && !bp) {
    return '';
  }

  let scss = `  '${propKey}': (\n`;
  if (isVar) {
    scss += `    prop: '${prop || `--${propKey}`}',\n`;
  } else {
    scss += `    prop: '${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}',\n`;
  }

  if (hasUtilities) {
    const exs = propConfig.exUtility || null;

    scss += `    utilities: (\n`;
    Object.entries(utilities).forEach(([utilKey, value]) => {
      // SCSS 側でバックスラッシュが1つ残るよう二重にエスケープする。
      const escapedKey = utilKey.replace(/\//g, '\\\\/').replace(/%/g, '\\\\%').replace(/:/g, '\\\\:');

      if (undefined === exs?.[utilKey]) {
        scss += `      '${escapedKey}': '${value}',\n`;
      }
    });
    scss += `    ),\n`;

    if (exs) {
      scss += `    exUtility: (\n`;

      for (const [exKey, exProps] of Object.entries(exs)) {
        if (typeof exProps === 'object') {
          scss += `      '${exKey}': (\n`;
          for (const _prop in exProps) {
            if (exProps[_prop]) {
              scss += `        '${_prop}': '${exProps[_prop]}',\n`;
            }
          }
          scss += `      ),\n`;
        }
      }
      scss += `    ),\n`;
    }
  }

  if (bp !== undefined) {
    if (Array.isArray(bp)) {
      // 1要素でも SCSS リストとして解釈させるため末尾カンマを付ける。
      const items = bp.map((b) => `'${b}'`).join(', ');
      scss += `    bp: (${items}${bp.length === 1 ? ',' : ''}),\n`;
    } else if (typeof bp === 'number') {
      scss += `    bp: ${bp},\n`;
    } else {
      throw new TypeError(`[lism-css] prop "${propKey}": bp must be 0, 1, or an array of breakpoint names. Received ${JSON.stringify(bp)}.`);
    }
  }
  if (isVar !== undefined) {
    scss += `    isVar: ${isVar},\n`;
  }
  if (alwaysVar !== undefined) {
    scss += `    alwaysVar: ${alwaysVar},\n`;
  }
  if (important !== undefined) {
    scss += `    important: ${important},\n`;
  }

  scss += `  ),`;

  return scss;
}

/** マージ済み・Set化前のCONFIGを直列化する。 */
export function serializePropConfig(CONFIG: BuildConfig): string {
  const { props: PROPS } = CONFIG;
  const TOKENS = CONFIG.tokens;

  let scssContent = '$props: (\n';

  const entries = Object.entries(PROPS);
  entries.forEach(([propKey, propConfig], index) => {
    const propContent = generatePropScss(propKey, propConfig, TOKENS);
    if (!propContent) return;
    scssContent += propContent;

    if (index < entries.length - 1) {
      scssContent += '\n';
    }
  });

  scssContent += '\n);\n';

  return scssContent;
}

/**
 * CONFIG の breakpoints を SCSS の `$breakpoints: ( ... );` 文字列へ直列化する。
 *
 * breakpoints 未定義時も `$breakpoints: ();` を出力し、`_setting.scss` の `props.$breakpoints`
 * 参照が常に解決できるようにする（未定義メンバ参照による sass エラーの防止）。
 */
export function serializeBreakpoints(CONFIG: BuildConfig): string {
  const entries = CONFIG.breakpoints ? Object.entries(CONFIG.breakpoints) : [];
  if (entries.length === 0) return '$breakpoints: ();\n';

  let scss = '$breakpoints: (\n';
  entries.forEach(([key, value]) => {
    const serialized = typeof value === 'number' ? value : `'${value}'`;
    scss += `  '${key}': ${serialized},\n`;
  });
  scss += ');\n';
  return scss;
}

/**
 * CONFIG.defaultImportantを`$default_important`へ直列化する。
 *
 * 未指定時も `$default_important: 0;` を出力し、
 * `_setting.scss` の `props.$default_important` 参照が常に解決できるようにする
 * （未定義メンバ参照による sass エラーの防止。`serializeBreakpoints` と同じ方針）。
 */
export function serializeDefaultImportant(CONFIG: BuildConfig): string {
  return `$default_important: ${CONFIG.defaultImportant ? 1 : 0};\n`;
}

/** prop・breakpoint・defaultImportantを1つのSCSS設定へまとめる。 */
export function serializeConfigScss(CONFIG: BuildConfig): string {
  return `${serializePropConfig(CONFIG)}\n${serializeBreakpoints(CONFIG)}\n${serializeDefaultImportant(CONFIG)}`;
}

/**
 * CONFIG.tokensをCSS変数の宣言へ直列化する。
 *
 * - 値が `'-'`（センチネル）または空のキーは出力しない（カタログ登録のみ・実値は手書き SCSS）。
 * - TOKEN_SCOPE 登録トークンは `:root` ではなく `:root, .{scope} { ... }` で出力する（詳細は lism-css の config/defaults/token-scope.ts）。
 *
 * 出力する宣言が無くても `:root {}` を返し、同梱デフォルトと生成物の体裁を一致させる。
 */
export function serializeTokens(CONFIG: BuildConfig): string {
  const { tokens = {} } = CONFIG;

  const rootDecls: string[] = [];
  const scopedDecls = new Map<string, string[]>();

  for (const [tokenKey, valueMap] of Object.entries(tokens)) {
    if (!valueMap || typeof valueMap !== 'object' || Array.isArray(valueMap)) continue;
    const scope = TOKEN_SCOPE[tokenKey as keyof typeof TOKEN_SCOPE];
    for (const [key, value] of Object.entries(valueMap as Record<string, TokenValue>)) {
      if (value === '-' || value === '' || value == null) continue;
      const decl = `  ${getTokenVarName(tokenKey, key)}: ${value};`;
      if (scope) {
        const list = scopedDecls.get(scope);
        if (list) list.push(decl);
        else scopedDecls.set(scope, [decl]);
      } else {
        rootDecls.push(decl);
      }
    }
  }

  let scss = rootDecls.length ? `:root {\n${rootDecls.join('\n')}\n}\n` : ':root {\n}\n';
  for (const [scope, decls] of scopedDecls) {
    scss += `:root,\n.${scope} {\n${decls.join('\n')}\n}\n`;
  }
  return scss;
}
