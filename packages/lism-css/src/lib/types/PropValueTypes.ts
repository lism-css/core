import { TOKENS, PROPS } from '../../../config/index';
import type { FullBpExcludedKey, FullBpIsVarKey } from '../../../config/presets/props-full';
import type { WithArbitraryString, ArrayElement, ExtractArrayValues, ExtractObjectKeys, ExtractPropertyValue } from './utils';
import type { MakeResponsive } from './ResponsiveProps';
import type { FullModeRegistry } from './FullModeRegistry';
import type { CustomPropValueRegistry } from './CustomPropValueRegistry';

type PropsConfig = typeof PROPS;
type TokensConfig = typeof TOKENS;

/**
 * TOKENS のキー集合の型。配列 / Set は要素の型、値付きフラットマップ（{ key: value }）は keyof。
 */
type TokenConfigValues<K extends keyof TokensConfig> = TokensConfig[K] extends readonly unknown[]
  ? ArrayElement<TokensConfig[K]>
  : TokensConfig[K] extends object
    ? keyof TokensConfig[K] & string
    : never;

type ExtractTokenValues<T> =
  ExtractPropertyValue<T, 'token'> extends never
    ? never
    : ExtractPropertyValue<T, 'token'> extends keyof TokensConfig
      ? TokenConfigValues<ExtractPropertyValue<T, 'token'>>
      : never;

type ExtractPropValues<T> = ExtractArrayValues<T, 'presets'> | ExtractObjectKeys<T, 'utils'> | ExtractTokenValues<T>;

/**
 * lism.config.js で既定 prop へ追加された値（{@link CustomPropValueRegistry} の拡張分）を取得。
 * 拡張が無い prop は never（defaults 由来の型のまま）。
 */
type UserPropValues<K> = K extends keyof CustomPropValueRegistry ? Extract<CustomPropValueRegistry[K], string> : never;

// --- プロパティ値の型決定 ---

// [X] extends [never] の tuple ラップで ExtraValues（naked 型パラメータ）の分配を防ぐ。
type PropValueType<T, ExtraValues = never> = [ExtractPropValues<T> | ExtraValues] extends [never]
  ? string | number | boolean
  : WithArbitraryString<ExtractPropValues<T> | ExtraValues> | number | boolean | null;

// --- ブレイクポイント対応の判定 ---

/**
 * bp プロパティでレスポンシブ（配列・オブジェクト形式）が有効かを判定
 * - bp 未設定 / bp: 0 → false
 * - bp: 1 → 有効 BP すべてからユーティリティクラス生成
 * - bp: ['sm', 'md'] 等のリスト形式 → 列挙した BP のみ出力（型は bp: 1 と同様に許可）
 */
type HasBreakpointSupport<T> = [ExtractPropertyValue<T, 'bp'>] extends [never]
  ? false
  : ExtractPropertyValue<T, 'bp'> extends 0
    ? false
    : ExtractPropertyValue<T, 'bp'> extends 1 | readonly unknown[]
      ? true
      : false;

type AllPropKeys = keyof PropsConfig;

type PropsWithBreakpoint = {
  [K in AllPropKeys]: HasBreakpointSupport<PropsConfig[K]> extends true ? K : never;
}[AllPropKeys];

type PropsWithoutBreakpoint = Exclude<AllPropKeys, PropsWithBreakpoint>;

export type ResponsivePropValueTypes = {
  [K in PropsWithBreakpoint]?: PropValueType<PropsConfig[K], UserPropValues<K>>;
};

export type NonResponsivePropValueTypes = {
  [K in PropsWithoutBreakpoint]?: PropValueType<PropsConfig[K], UserPropValues<K>>;
};

type DefaultPropValueTypes = MakeResponsive<ResponsivePropValueTypes> & NonResponsivePropValueTypes;

// full モード（isFullMode）の型対応:
// lism.config.js の isFullMode では、isVar 系を除く全 props が responsive 化する
// （config/presets/props-full.ts のランタイム挙動）。これを型側にも反映する。
// 静的型は .js の値を読めないため、FullModeRegistry の module augmentation で opt-in する。

/**
 * isVar 系（state 変数扱い・full preset の対象外）の prop かを判定。
 * isVar 未設定の prop は `ExtractPropertyValue` が never を返す。`1 extends X` の向きで
 * 判定することで、X が never でも 1 でもない（= false）になり、tuple ラップ時の
 * `[never] extends [1]` が true に化ける罠を避ける。
 */
type IsVarProp<T> = 1 extends ExtractPropertyValue<T, 'isVar'> ? true : false;

/**
 * full モードでレスポンシブになる prop のキー。
 * - FullBpIsVarKey（bds / bdc）: isVar 系だが full preset が bp:1 を追加するためレスポンシブ
 * - FullBpExcludedKey（border ショートハンド系）: full preset の対象外なのでデフォルトの bp 判定のまま（#513）
 * - その他の isVar 系: props-full.ts の対象外なのでデフォルトの bp 判定のまま
 * - 上記以外: full preset が bp:1 にするため常にレスポンシブ
 */
type FullPropsWithBreakpoint = {
  [K in AllPropKeys]: K extends FullBpIsVarKey
    ? K
    : K extends FullBpExcludedKey
      ? HasBreakpointSupport<PropsConfig[K]> extends true
        ? K
        : never
      : IsVarProp<PropsConfig[K]> extends true
        ? HasBreakpointSupport<PropsConfig[K]> extends true
          ? K
          : never
        : K;
}[AllPropKeys];

type FullPropsWithoutBreakpoint = Exclude<AllPropKeys, FullPropsWithBreakpoint>;

type FullPropValueTypes = MakeResponsive<{
  [K in FullPropsWithBreakpoint]?: PropValueType<PropsConfig[K], UserPropValues<K>>;
}> & {
  [K in FullPropsWithoutBreakpoint]?: PropValueType<PropsConfig[K], UserPropValues<K>>;
};

/**
 * FullModeRegistry が module augmentation で拡張されている（= キーが1つ以上ある）か。
 * 空 interface の `keyof` は never。`[never] extends [never]` の tuple ラップで
 * naked never の分配（条件型が never に潰れる）を回避している（HasBreakpointSupport と同手法）。
 */
type IsFullModeAdvertised = [keyof FullModeRegistry] extends [never] ? false : true;

/**
 * PROPS 設定から生成される Props 型（レスポンシブ対応含む）
 * - bp が有効なプロパティ: レスポンシブ対応（配列・オブジェクト形式可）
 * - bp なしのプロパティ: 単一値のみ
 * - presets/utils/token なしのプロパティ: string | number | boolean（フォールバック）
 *
 * {@link FullModeRegistry} が拡張されている場合は full 版に切り替わり、isVar 系を除く
 * 全 props がレスポンシブになる（lism.config.js の isFullMode に型を追従させるための opt-in）。
 *
 * @example
 * ```ts
 * // bp が有効なプロパティ（fz など）
 * fz?: 'base' | 'l' | ... | ['base', 'l'] | { base: 'base', md: 'l' }
 *
 * // bp なしのプロパティ（fw など）
 * fw?: 'thin' | 'light' | 'normal' | ...
 *
 * // presets/utils/token なしで bp が有効なプロパティ（fxb など）
 * fxb?: Responsive<string | number | boolean>
 * ```
 */
export type PropValueTypes = IsFullModeAdvertised extends true ? FullPropValueTypes : DefaultPropValueTypes;
