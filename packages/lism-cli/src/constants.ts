/** CLI 全体で参照する内部定数（取得元リポジトリ・レジストリ URL・giget の既定 ref）。ユーザー設定 `lism.config.js` は config.ts を参照。 */

/** 配信元の GitHub リポジトリ（owner/repo） */
export const SOURCE_REPO = 'lism-css/core';

/** raw GitHub の base URL（生ファイル fetch に使用） */
export const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com';

/** npm レジストリの base URL（`lism-cli create` の workspace:* 置換時に公開最新版を解決するのに使用） */
export const NPM_REGISTRY_BASE = 'https://registry.npmjs.org';

// 常に'main'固定。PRブランチ名にしない（削除で公開済みCLIが壊れる）。詳細は documents/cli-guide.md「既定ref」

/** `lism-cli ui add` / `lism-cli ui list` が参照する lism-ui ソースの ref */
export const DEFAULT_UI_REF = 'main';

/** `lism-cli skill add` / `check` / `update` が参照するスキルディレクトリの ref */
export const DEFAULT_SKILL_REF = 'main';

/** `lism-cli create` が参照する templates の ref */
export const DEFAULT_TEMPLATES_REF = 'main';

/** lism-ui のコンポーネントソース（giget で個別ディレクトリを取得） */
export const UI_COMPONENTS_PATH = 'packages/lism-ui/src/components';

/** lism-ui の helper ソース */
export const UI_HELPER_PATH = 'packages/lism-ui/src/helper';

/** lism-ui のカタログ JSON（raw GitHub から fetch） */
export const UI_REGISTRY_INDEX_PATH = 'packages/lism-ui/registry-index.json';

/** 配信元リポジトリ内で各スキルディレクトリを束ねるベースディレクトリ（実体は `skills/{name}`） */
export const SKILL_SOURCE_BASE = 'skills';

/**
 * 配布対象のスキル名レジストリ。
 *
 * 引数なしの `lism-cli skill add` / `lism-cli skill update` はここに並ぶ全スキルを一括導入し、
 * `lism-cli skill check` も全スキルを対象に差分確認する。`lism-cli skill add [name]` で個別指定も可。
 * リポジトリ内の実体は `skills/{name}`、配置先は `.{tool}/skills/{name}`。
 */
export const SKILL_NAMES = ['lism-css-guide', 'lism-css-refactor', 'lism-mockup-guide'] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

export const TEMPLATES_PATH = 'templates';
