import type { LimitedArray } from './utils';
import type { BreakpointSequence } from '../../../config/defaults/breakpoints';

// ブレイクポイント関連の型

/**
 * 型が「広告する（補完・許可する）」ブレイクポイントのレジストリ。
 *
 * パッケージのデフォルト広告は `sm` / `md` / `lg` のみ。
 * `xl` / `xs` を使うプロジェクトは、自前の `.d.ts` で `declare module 'lism-css'` により
 * この interface を拡張すると、`Responsive<T>` の
 * オブジェクトキー（`{ xl: ... }` など）と配列記法の最大長が連動して広がる。
 *
 * ランタイム（`getBpData` の解釈・配列記法の位置）は `base/sm/md/lg/xl` を
 * 固定で保持しており、ここで切り替えるのは「型が提示・許可するキーの範囲」だけ。
 * これにより「CSS は出力されないのに型では常に許される」xl の非対称を解消する。
 *
 * @example プロジェクト側の型定義ファイル（例: `src/lism.d.ts`）で xl / xs を解禁する
 * ```ts
 * import 'lism-css';
 *
 * declare module 'lism-css' {
 *   interface BreakpointRegistry {
 *     xl: true; // 配列の5要素目 [.., xl] と { xl: ... } を解禁
 *     xs: true; // { xs: ... } を解禁（xs は配列記法では書けない）
 *   }
 * }
 * ```
 */
export interface BreakpointRegistry {
  sm: true;
  md: true;
  lg: true;
}

/** 広告するブレイクポイントキー（`base` を除く。文字列キーのみ抽出して string 制約を満たす） */
type AdvertisedBpKey = Extract<keyof BreakpointRegistry, string>;

/**
 * 配列記法の位置順（`base` を除く）。位置は固定の契約（変更しない）。
 * `xs` はこの並びに含めない（= 配列記法では書けず、オブジェクト記法のみ）。
 * 定義は `config/defaults/breakpoints` の `BREAK_POINTS` を single source とする。
 */
type ArrayBpSequence = BreakpointSequence;

/** タプルのうち `Keys` に含まれる要素だけを残す */
type FilterByKeys<Tuple extends readonly unknown[], Keys, Acc extends unknown[] = []> = Tuple extends readonly [infer Head, ...infer Rest]
  ? FilterByKeys<Rest, Keys, Head extends Keys ? [...Acc, Head] : Acc>
  : Acc;

/**
 * 広告する配列の最大長 = base(1) + 配列対象 BP のうち広告されている数。
 * `extends infer N extends number` で number へ制約し、LimitedArray の N 制約を満たす。
 */
type ArrayMaxLength<Bp extends string> = [unknown, ...FilterByKeys<ArrayBpSequence, Bp>]['length'] extends infer N extends number ? N : never;

/**
 * 広告キーを明示的に受け取るレスポンシブ型のコア。
 * 公開用の {@link Responsive} は `Bp` に `keyof BreakpointRegistry` を差し込む。
 * （型テストで「デフォルト / +xl / +xs」をmodule augmentationなしに検証するためにエクスポートしている）
 */
export type ResponsiveFor<T, Bp extends string> = T | LimitedArray<T | null, ArrayMaxLength<Bp>> | Partial<Record<'base' | Bp, T>>;

/**
 * プロパティ値をレスポンシブ対応の型に変換するユーティリティ型
 *
 * 単一の値、配列形式（位置は `[base, sm, md, lg, xl]` で固定）、
 * ブレイクポイントオブジェクト形式のいずれかを受け付ける。
 * 許可されるキー・配列長はデフォルトで `base/sm/md/lg`（xl/xs は {@link BreakpointRegistry} の拡張で解禁）。
 *
 * @example
 * ```ts
 * type FzProp = Responsive<'s' | 'm' | 'l'>;
 * // 結果（デフォルト広告 sm/md/lg のとき）:
 * // | 's' | 'm' | 'l'
 * // | ['s' | 'm' | 'l'] | ... (最大4要素 [base, sm, md, lg])
 * // | { base?: ...; sm?: ...; md?: ...; lg?: ... }
 *
 * // 使用例
 * const a: FzProp = 'm';                           // 単一値
 * const b: FzProp = ['s', 'm', 'l'];               // 配列形式
 * const c: FzProp = { base: 's', md: 'l' };        // オブジェクト形式
 * ```
 */
export type Responsive<T> = ResponsiveFor<T, AdvertisedBpKey>;

/**
 * オブジェクト型の各プロパティをレスポンシブ対応に変換するユーティリティ型
 *
 * @example
 * ```ts
 * type OriginalProps = {
 *   fz: 's' | 'm' | 'l';
 *   color: string;
 * };
 *
 * type ResponsiveProps = MakeResponsive<OriginalProps>;
 * // 結果:
 * // {
 * //   fz?: Responsive<'s' | 'm' | 'l'>;
 * //   color?: Responsive<string>;
 * // }
 * ```
 */
export type MakeResponsive<T> = {
  [K in keyof T]?: Responsive<T[K]>;
};
