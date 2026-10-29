// 汎用ユーティリティ型

/**
 * 最大 N 要素の配列型を生成するユーティリティ型
 *
 * @example
 * ```ts
 * type Max3 = LimitedArray<string, 3>;
 * // 結果: [string] | [string, string] | [string, string, string]
 * ```
 */
export type LimitedArray<T, N extends number, R extends T[] = [T]> = R['length'] extends N ? R : R | LimitedArray<T, N, [...R, T]>;

/**
 * プリセット値 | 任意文字列
 *
 * `string & {}` はリテラル型が string に吸収されるのを防ぎ、
 * エディタでプリセット値のサジェストを維持しつつ任意の文字列も受け付ける
 *
 * @example
 * ```ts
 * type Size = WithArbitraryString<'s' | 'm' | 'l'>;
 * // 結果: 's' | 'm' | 'l' | (string & {})
 * // → 's', 'm', 'l' がサジェストされつつ、'custom' などの任意の文字列も受け付ける
 * ```
 */
export type WithArbitraryString<T> = T | (string & {});

/** 配列の要素の型 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/** T[K] の配列要素の型。K が無ければ never */
export type ExtractArrayValues<T, K extends string> = T extends { [P in K]: readonly (infer E)[] } ? E : never;

/** T[K] のオブジェクトのキー。K が無ければ never */
export type ExtractObjectKeys<T, K extends string> = T extends { [P in K]: infer U } ? (U extends object ? keyof U : never) : never;

/** T[K] の型。K が無ければ never */
export type ExtractPropertyValue<T, K extends string> = T extends { [P in K]: infer V } ? V : never;
