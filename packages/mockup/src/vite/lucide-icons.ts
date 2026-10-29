/**
 * 45MBの`lucide-react`を毎回取得せず、`@iconify-json/lucide`から互換モジュールを生成する。
 * devの1,800リクエストを避けるため1モジュールとし、buildではPURE注釈で未使用アイコンを落とす。
 * 生成コストを抑えるためSVGはReact要素へ展開せずbody文字列を埋め込む。
 *
 * 提供する root export は「全アイコン名」＋ `Icon` / `createLucideIcon` まで（`SUPPORTED_LUCIDE_API` 参照）。
 * 本物にある `icons`（全アイコンのレコード）は提供しない — 参照した時点で全アイコンがバンドルへ入り、
 * このモジュールの目的そのものが無くなるため。未提供の名前を import した場合は
 * `describeMissingLucideExport()` が rollup のエラーを対応範囲の説明へ差し替える。
 * この対応範囲は `lucide-types.ts` が生成する型定義と共通なので、変えるときは両方を揃えること。
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

import { MockupContractError } from '../core/types.js';

export const LUCIDE_PACKAGE_NAME = 'lucide-react';

export const VIRTUAL_LUCIDE_ID = 'virtual:lism-mockup/lucide-react';
export const RESOLVED_VIRTUAL_LUCIDE_ID = `\0${VIRTUAL_LUCIDE_ID}`;

/**
 * アイコン名以外に提供する root export。
 *
 * どちらも呼び出し側が渡す `iconNode` を描画するだけでアイコンセットを参照しないため、
 * アイコンを1つも増やさずに本物と同じものを供給できる。
 */
export const SUPPORTED_LUCIDE_API = ['Icon', 'createLucideIcon'] as const;

const UNSUPPORTED_LUCIDE_EXPORTS: ReadonlyMap<string, string> = new Map([
  [
    'icons',
    'the "icons" record is not provided: reading it pulls every lucide icon into the bundle, which is what this generated module exists to avoid. ' +
      "Import the icons you need by name instead (import { Bell } from 'lucide-react').",
  ],
]);

const LUCIDE_SCOPE_NOTE =
  `@lism-css/mockup supplies ${LUCIDE_PACKAGE_NAME} as a generated module holding the icon components plus ` +
  `${SUPPORTED_LUCIDE_API.map((name) => `"${name}"`).join(' and ')}. Package subpaths (${LUCIDE_PACKAGE_NAME}/icons/...) are not available either.`;

interface IconifyIcon {
  body: string;
  width?: number;
  height?: number;
}

export interface LucideIconSet {
  icons: Record<string, IconifyIcon>;
  aliases?: Record<string, { parent: string }>;
  width?: number;
  height?: number;
}

/**
 * lucide-react が `<svg>` ルートに付ける既定値（`defaultAttributes` + `Icon` の初期値）。
 *
 * lism-css 側の `.a--icon:where(:not([fill]))` / `:where(:not([width]))` が属性の有無で分岐するため、
 * ここがずれると既存モックアップの見た目が変わる。lucide-react 0.577.0 の実装に合わせている。
 */
const LUCIDE_DEFAULTS = {
  size: 24,
  color: 'currentColor',
  strokeWidth: 2,
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function toCamelCase(value: string): string {
  return value.replace(/^([A-Z])|[\s\-_]+(\w)/g, (_match, first: string | undefined, rest: string | undefined) =>
    rest ? rest.toUpperCase() : (first as string).toLowerCase()
  );
}

/**
 * lucide-react の `toPascalCase` と同じ変換（kebab → PascalCase）。
 *
 * 数字の扱いが素朴な実装と違う（`arrow-up-0-1` → `ArrowUp01`）ため、
 * 自前ルールを推測せず lucide-react の実装をそのまま写している。
 */
export function toPascalCase(value: string): string {
  const camel = toCamelCase(value);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toKebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * lucide-reactの`createLucideIcon`と同じ候補を作り、重複を除く。
 */
export function lucideClassName(iconKey: string): string {
  const candidates = ['lucide', `lucide-${toKebabCase(toPascalCase(iconKey))}`, `lucide-${iconKey}`];
  return [...new Set(candidates)].join(' ');
}

/**
 * `<svg>` ルートが持つのと同じ値を、body 側の要素から取り除く。
 *
 * Iconify の body は最適化のために `fill="none" stroke="currentColor" …` を子要素へ書き出すが、
 * それを残すと `color` / `strokeWidth` などの props がルートにしか効かなくなる
 * （子要素の presentation attribute が継承値より強いため）。
 *
 * 取り除くのは「その属性の出現がすべてルートの既定値と同じ」ときだけにする。
 * `palette` のように一部の子要素だけ `fill="currentColor"` を持つアイコンは、
 * 値が混在するのでその属性は丸ごと残す（消すと塗りが変わってしまう）。
 */
export function stripInheritedAttributes(body: string): string {
  const inherited: [attribute: string, value: string][] = [
    ['fill', LUCIDE_DEFAULTS.fill],
    ['stroke', LUCIDE_DEFAULTS.color],
    ['stroke-width', String(LUCIDE_DEFAULTS.strokeWidth)],
    ['stroke-linecap', LUCIDE_DEFAULTS.strokeLinecap],
    ['stroke-linejoin', LUCIDE_DEFAULTS.strokeLinejoin],
  ];

  let result = body;
  for (const [attribute, value] of inherited) {
    // 属性は必ず空白区切りで並ぶので、先頭の空白ごと照合する。
    // これで `stroke="…"` が `stroke-width="…"` に誤って一致することもない。
    const pattern = new RegExp(`\\s${attribute}="([^"]*)"`, 'g');
    const found = [...result.matchAll(pattern)];
    if (found.length === 0 || found.some((match) => match[1] !== value)) continue;
    result = result.replace(pattern, '');
  }
  return result;
}

export interface LucideIconEntry {
  key: string;
  exportName: string;
  className: string;
  viewBox: string;
  body: string;
}

export interface LucideIconIndex {
  readonly entries: readonly LucideIconEntry[];
  readonly keyByExportName: ReadonlyMap<string, string>;
  iconKeyFor(exportName: string): string;
}

function findSuggestion(exportName: string, names: Iterable<string>): string | null {
  const lower = exportName.toLowerCase();
  let prefixMatch: string | null = null;
  for (const name of names) {
    const candidate = name.toLowerCase();
    if (candidate === lower) return name;
    if (prefixMatch === null && candidate.startsWith(lower)) prefixMatch = name;
  }
  return prefixMatch;
}

/**
 * `icons.json`からlucide-react互換のexport索引を作る。
 *
 * 名前の対応は文字列変換を推測で書かず、`icons.json` のキー一覧から機械的に生成する。
 * `Icon` サフィックス付きの別名（`BellIcon`）と `aliases`（`Sidebar` → `panel-left`）も含める。
 */
export function buildLucideIconIndex(iconSet: LucideIconSet): LucideIconIndex {
  const setWidth = iconSet.width ?? 24;
  const setHeight = iconSet.height ?? 24;

  const entries: LucideIconEntry[] = [];
  const keyByExportName = new Map<string, string>();

  // 実体のあるアイコンを先に登録する。エイリアスと PascalCase が衝突したとき
  // （`arrow-up-01` と `arrow-up-0-1` はどちらも `ArrowUp01`）に本体側を勝たせるため。
  for (const [key, icon] of Object.entries(iconSet.icons)) {
    const exportName = toPascalCase(key);
    entries.push({
      key,
      exportName,
      className: lucideClassName(key),
      viewBox: `0 0 ${icon.width ?? setWidth} ${icon.height ?? setHeight}`,
      body: stripInheritedAttributes(icon.body),
    });
    keyByExportName.set(exportName, key);
  }

  // 別名は「本体名 → `Icon` サフィックス → エイリアス名 → エイリアスの `Icon` サフィックス」の
  // 優先順で登録する。既に埋まっている名前は上書きしない。
  const addAlias = (exportName: string, key: string): void => {
    if (!keyByExportName.has(exportName)) keyByExportName.set(exportName, key);
  };
  for (const entry of entries) addAlias(`${entry.exportName}Icon`, entry.key);
  for (const [alias, { parent }] of Object.entries(iconSet.aliases ?? {})) {
    // 本体が存在しないエイリアスは生成対象にしない（データ側の不整合をコードへ持ち込まない）。
    if (!(parent in iconSet.icons)) continue;
    addAlias(toPascalCase(alias), parent);
  }
  for (const [alias, { parent }] of Object.entries(iconSet.aliases ?? {})) {
    if (!(parent in iconSet.icons)) continue;
    addAlias(`${toPascalCase(alias)}Icon`, parent);
  }

  return {
    entries,
    keyByExportName,
    iconKeyFor(exportName: string): string {
      const key = keyByExportName.get(exportName);
      if (key !== undefined) return key;

      const suggestion = findSuggestion(exportName, keyByExportName.keys());
      throw new MockupContractError(
        `"${exportName}" is not an icon of ${LUCIDE_PACKAGE_NAME}.` +
          (suggestion === null ? '' : ` Did you mean "${suggestion}"?`) +
          ' See https://lucide.dev/icons/ for the available icons.'
      );
    },
  };
}

/**
 * 仮想モジュールのコードを生成する。
 *
 * ランタイムは `createElement` + `dangerouslySetInnerHTML` だけで、lucide-react の
 * `Icon` / `createLucideIcon` が作る `<svg>` と同じルート属性・class 名になるようにしている。
 * props も lucide-react と同じ意味で受け取る。
 */
export function generateLucideModule(iconSet: LucideIconSet): string {
  const index = buildLucideIconIndex(iconSet);
  const { size, color, strokeWidth, fill, strokeLinecap, strokeLinejoin } = LUCIDE_DEFAULTS;

  // アイコン名以外の export は固定なので、アイコンと同じ名前が現れたら生成物が壊れる
  // （同じ名前を2回 export することになる）。iconify 側でそんなアイコンが増えたら止める。
  const collision = SUPPORTED_LUCIDE_API.find((name) => index.keyByExportName.has(name));
  if (collision !== undefined) {
    throw new Error(
      `@lism-css/mockup cannot generate the ${LUCIDE_PACKAGE_NAME} module: "${collision}" is now both an icon name and part of the module's own API. ` +
        'Please report this at https://github.com/lism-css/core/issues.'
    );
  }

  // モジュールスコープの識別子は小文字始まりか UPPER_SNAKE にしてある。
  // アイコンの const 名は必ず PascalCase なので、両者が衝突することはない。
  const runtime = `// Generated by @lism-css/mockup from @iconify-json/lucide. Do not edit.
import { createElement, forwardRef } from 'react';

const DEFAULT_VIEW_BOX = '0 0 ${size} ${size}';

/** Same as lucide-react's hasA11yProp: skip aria-hidden when the caller passes a11y props. */
function hasA11yProp(props) {
  for (const prop in props) {
    if (prop.startsWith('aria-') || prop === 'role' || prop === 'title') return true;
  }
  return false;
}

/**
 * Builds one icon component.
 * The attributes, their order and the class name match what lucide-react 0.577.0 renders.
 */
function icon(displayName, iconClassName, body, viewBox = DEFAULT_VIEW_BOX) {
  const Component = forwardRef(
    (
      {
        size = ${size},
        color = '${color}',
        strokeWidth = ${strokeWidth},
        absoluteStrokeWidth,
        className,
        children,
        ...rest
      },
      ref
    ) => {
      const props = {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox,
        fill: '${fill}',
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? (Number(strokeWidth) * ${size}) / Number(size) : strokeWidth,
        strokeLinecap: '${strokeLinecap}',
        strokeLinejoin: '${strokeLinejoin}',
        className: className ? iconClassName + ' ' + className : iconClassName,
        ref,
        ...(!children && !hasA11yProp(rest) ? { 'aria-hidden': 'true' } : null),
        ...rest,
      };

      // React cannot take both children and dangerouslySetInnerHTML, so when the caller
      // passes children the body goes into a bare <g>, which does not affect rendering.
      return !children
        ? createElement('svg', { ...props, dangerouslySetInnerHTML: { __html: body } })
        : createElement('svg', props, createElement('g', { dangerouslySetInnerHTML: { __html: body } }), children);
    }
  );
  Component.displayName = displayName;
  return Component;
}

function mergeClasses(...classes) {
  return classes
    .filter((className, index, array) => Boolean(className) && className.trim() !== '' && array.indexOf(className) === index)
    .join(' ')
    .trim();
}

function toCamelCase(value) {
  return value.replace(/^([A-Z])|[\\s\\-_]+(\\w)/g, (_match, first, rest) => (rest ? rest.toUpperCase() : first.toLowerCase()));
}
function toPascalCase(value) {
  const camel = toCamelCase(value);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
function toKebabCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * lucide-react's generic \`Icon\`, which draws the icon data it is handed.
 *
 * Unlike the icon components above it builds real React elements: the caller owns the
 * data, so there is no pre-rendered body string to inject. The attributes and their
 * order match lucide-react 0.577.0's \`Icon\`.
 */
const lucideIcon = /*#__PURE__*/ forwardRef(
  (
    {
      color = '${color}',
      size = ${size},
      strokeWidth = ${strokeWidth},
      absoluteStrokeWidth,
      className = '',
      children,
      iconNode,
      ...rest
    },
    ref
  ) =>
    createElement(
      'svg',
      {
        ref,
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: DEFAULT_VIEW_BOX,
        fill: '${fill}',
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? (Number(strokeWidth) * ${size}) / Number(size) : strokeWidth,
        strokeLinecap: '${strokeLinecap}',
        strokeLinejoin: '${strokeLinejoin}',
        className: mergeClasses('lucide', className),
        ...(!children && !hasA11yProp(rest) ? { 'aria-hidden': 'true' } : null),
        ...rest,
      },
      [...iconNode.map(([tag, attrs]) => createElement(tag, attrs)), ...(Array.isArray(children) ? children : [children])]
    )
);

function createLucideIcon(iconName, iconNode) {
  const Component = forwardRef(({ className, ...props }, ref) =>
    createElement(lucideIcon, {
      ref,
      iconNode,
      className: mergeClasses(\`lucide-\${toKebabCase(toPascalCase(iconName))}\`, \`lucide-\${iconName}\`, className),
      ...props,
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
}
`;

  const declarations = index.entries.map((entry) => {
    const args = [entry.exportName, entry.className, entry.body].map((value) => JSON.stringify(value));
    if (entry.viewBox !== `0 0 ${size} ${size}`) args.push(JSON.stringify(entry.viewBox));
    return `const ${entry.exportName} = /*#__PURE__*/ icon(${args.join(', ')});`;
  });

  // export 文は 1文にまとめず適度に分割する（1文が数千指定子になるのを避けるため）。
  const specifiers = [...index.keyByExportName.keys()].map((exportName) => {
    const local = toPascalCase(index.iconKeyFor(exportName));
    return exportName === local ? exportName : `${local} as ${exportName}`;
  });
  const exportStatements: string[] = ['export { lucideIcon as Icon, createLucideIcon };'];
  for (let i = 0; i < specifiers.length; i += 500) {
    exportStatements.push(`export { ${specifiers.slice(i, i + 500).join(', ')} };`);
  }

  return [runtime, ...declarations, '', ...exportStatements, ''].join('\n');
}

/**
 * rollup が「その export は無い」で落ちたとき、対応範囲を説明するメッセージへ差し替える。
 *
 * rollup のエラーは `code` / `binding` / `exporter` を持つので、メッセージ文字列ではなく
 * その3つで判定する。素の rollup エラーは `"icons" is not exported by " virtual:…"` のように
 * 利用者が書いていないモジュール名を指すため、そのままでは直し方が分からない。
 */
export function describeMissingLucideExport(error: unknown): string | null {
  const rollupError = error as { code?: unknown; binding?: unknown; exporter?: unknown } | null | undefined;
  if (rollupError?.code !== 'MISSING_EXPORT' || rollupError.exporter !== RESOLVED_VIRTUAL_LUCIDE_ID) return null;
  if (typeof rollupError.binding !== 'string') return null;
  const binding = rollupError.binding;

  const known = UNSUPPORTED_LUCIDE_EXPORTS.get(binding);
  if (known !== undefined) return `Cannot import "${binding}" from ${LUCIDE_PACKAGE_NAME}: ${known}\n${LUCIDE_SCOPE_NOTE}`;

  try {
    buildLucideIconIndex(loadLucideIconSet()).iconKeyFor(binding);
  } catch (lookupError) {
    if (lookupError instanceof MockupContractError) return `${lookupError.message}\n${LUCIDE_SCOPE_NOTE}`;
  }
  return null;
}

let cachedIconSet: LucideIconSet | null = null;

/**
 * `@iconify-json/lucide` の `icons.json` を読む（1プロセス1回）。
 *
 * JSON の import 属性ではなくファイル読み込みにしているのは、`dist/`（ESM）と vitest の
 * どちらから実行しても同じ書き方で動かすため。`@iconify-json/lucide` は `./icons.json` を
 * 条件なしで export しているので、`createRequire()` でも解決できる。
 */
export function loadLucideIconSet(): LucideIconSet {
  if (cachedIconSet === null) {
    const file = createRequire(import.meta.url).resolve('@iconify-json/lucide/icons.json');
    cachedIconSet = JSON.parse(fs.readFileSync(file, 'utf-8')) as LucideIconSet;
  }
  return cachedIconSet;
}

/**
 * `lucide-react` を仮想モジュールへ解決する vite プラグイン。
 *
 * `importBoundaryPlugin` は許可済み bare import を `this.resolve(..., { skipSelf: true })` で
 * 解決し直すため、このプラグインも `enforce: 'pre'` に置いて vite の node 解決より先に応答する。
 * ビューア自身の import は境界チェックを通らず（データディレクトリ外のため）ここへ直接届く。
 */
export function lucideIconsPlugin(): Plugin {
  let code: string | null = null;

  return {
    name: 'lism-mockup:lucide-icons',
    enforce: 'pre',

    resolveId(source) {
      return source === LUCIDE_PACKAGE_NAME ? RESOLVED_VIRTUAL_LUCIDE_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_VIRTUAL_LUCIDE_ID) return null;
      code ??= generateLucideModule(loadLucideIconSet());
      return code;
    },
  };
}
