/**
 * 事前生成 CSS（`generated-css`）+ config 差し替えから、webpack / Turbopack の alias 構造を組む中立 helper。
 *
 * Next.js（Turbopack 主導 + webpack fallback）と `@lism-css/plugin/webpack`（webpack 主導）が共有する低レベル部品。
 *
 * - webpack の `resolve.alias` は絶対パスで解決できる。`lism-css/config.js` は完全一致（`$`）で差し替え、
 *   他の `lism-css/*` を巻き込まない。
 * - Turbopack の `resolveAlias` は**絶対パスを渡すと解決に失敗**したため、project-relative パスで渡す。
 */
import path from 'node:path';

import { CONFIG_TARGET_ID } from './config-alias';
import { normalizePath } from './normalize-path';
import type { GeneratedCss } from './generated-css';

export interface LismAliasInput {
  /** `generateCssToDir` の生成結果（`lism-css/<entry>.css` → 絶対パスの map を含む）。 */
  generated: GeneratedCss;
  /** alias 差し替え先の user lism.config 絶対パス。null なら config alias は作らない。 */
  userConfigPath: string | null;
}

/** webpack `resolve.alias` 形式（絶対パス）を返す。css は prefix 一致でよい（通常クエリ無し）。config は冒頭のとおり `$` 完全一致。 */
export function buildWebpackAlias({ generated, userConfigPath }: LismAliasInput): Record<string, string> {
  const alias: Record<string, string> = { ...generated.aliasMap };
  if (userConfigPath) {
    alias[`${CONFIG_TARGET_ID}$`] = userConfigPath;
  }
  return alias;
}

/** Turbopack `resolveAlias` 形式（`projectRoot` 起点の `./` 始まり相対パス）を返す。 */
export function buildTurbopackAlias({ generated, userConfigPath }: LismAliasInput, projectRoot: string): Record<string, string> {
  const alias: Record<string, string> = {};
  for (const [spec, abs] of Object.entries(generated.aliasMap)) {
    alias[spec] = toProjectRelative(projectRoot, abs);
  }
  if (userConfigPath) {
    alias[CONFIG_TARGET_ID] = toProjectRelative(projectRoot, userConfigPath);
  }
  return alias;
}

/** 絶対パスを projectRoot 起点の posix 相対パス（`./` 始まり）へ変換する。 */
function toProjectRelative(projectRoot: string, abs: string): string {
  const rel = normalizePath(path.relative(projectRoot, abs));
  // 既に `./` / `../` で始まる場合だけそのまま。`.lism-css/...` のような dotfile 始まりは `./` を付ける。
  return rel.startsWith('./') || rel.startsWith('../') ? rel : `./${rel}`;
}
