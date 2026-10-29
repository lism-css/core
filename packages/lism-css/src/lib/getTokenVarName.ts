import { TOKEN_VAR_PREFIX } from '../../config/defaults/token-var-prefix';

/**
 * トークンのカタログ表現。membership 判定用に以下のいずれかを受け付ける:
 * - Set / 配列（キーの集合）
 * - 値付きフラットマップ（{ key: value }。実ランタイム / ビルドの tokens 形式）
 */
export type TokensConfig = Record<string, Set<string> | readonly string[] | string[] | Record<string, unknown>>;

/**
 * トークンキー + 値キーから CSS カスタムプロパティ名を導出する。
 *
 * 変数名の導出を1か所に集約し、getMaybeTokenValue（値の解決）と serialize（値の出力）が共有することで、
 * `lts="2xl"` の解決名と `:root` に出力する変数名を必ず一致させる。命名規則は config/defaults/token-var-prefix.ts。
 */
export default function getTokenVarName(tokenKey: string, key: string): string {
  const prefix = TOKEN_VAR_PREFIX[tokenKey as keyof typeof TOKEN_VAR_PREFIX];
  return prefix !== undefined ? `${prefix}${key}` : `--${tokenKey}--${key}`;
}
