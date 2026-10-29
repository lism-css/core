/** Shared by `dev` and `check` so their data contracts cannot diverge. */

/** Supported `mockup.config.json` schema version. Bump when the contract changes. */
export const SCHEMA_VERSION = 2;

/**
 * Packages every page may import without any configuration.
 *
 * These are the standard building blocks of a Lism mockup, so they are resolved
 * from the copies `@lism-css/mockup` owns and can never be turned into an opt-in
 * dependency of the data directory. Anything else goes through the `imports`
 * field of `mockup.config.json`.
 */
export const STANDARD_PACKAGES = ['react', 'react-dom', 'lism-css', '@lism-css/ui'] as const;

/**
 * Whether a parsed JSON value is an object the validators can walk key by key.
 *
 * Shared by every validator so `mockup.config.json` and `tokens.json` can never
 * disagree about what counts as an object.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface MockupConfigPageMeta {
  label?: string;
  category?: string;
  order?: number;
}

/**
 * Parsed shape of `mockup.config.json`.
 *
 * Page discovery is file-system based (`pages/` is the source of truth);
 * this file only overrides display metadata. Referencing a page id that does
 * not exist on disk is a contract violation. Unknown top-level keys are
 * rejected so that future schema additions always go through a
 * `schemaVersion` bump.
 */
export interface MockupConfigFile {
  schemaVersion: number;
  title?: string;
  /**
   * Extra packages pages may import, on top of {@link STANDARD_PACKAGES}.
   * Resolved from the project that contains the data directory.
   */
  imports?: string[];
  pages?: Record<string, MockupConfigPageMeta>;
}

export interface PageEntry {
  id: string;
  file: string;
  label: string;
  category?: string;
  order?: number;
}

/** `tokens.json` / `tokens.dark.json` content: lism.config-compatible `tokens` object. */
export type MockupTokens = Record<string, Record<string, string | number>>;

/**
 * One resolved design token for the viewer's tokens view.
 * Mirrors `ViewerToken` in `viewer/src/virtual-modules.d.ts` — keep both in sync.
 */
export interface TokenEntry {
  key: string;
  varName: string;
  value: string;
  source: 'default' | 'overridden' | 'custom';
}

/**
 * A token group section in merged-config order (`virtual:lism-mockup/tokens`).
 *
 * A dark section is a section of its own, listed right after the light one it
 * mirrors, so `id` / `label` / `group` cannot be collapsed into a single field:
 * two sections share a `group` but never an `id`.
 *
 * Mirrors `ViewerTokenGroup` in `viewer/src/virtual-modules.d.ts` — keep both in sync.
 */
export interface TokenGroupEntry {
  id: string;
  group: string;
  label: string;
  isDark?: boolean;
  /**
   * CSS 変数名のプレフィックス（`--fz--`・space は `--s`・color / palette は `--`）。
   * 行ごとに変数名を並べる代わりに、見出しの横に1回だけ出す。
   * キー自体が変数名のグループ（`vars` の残余）は空文字で、見出しには何も出さない。
   */
  varPrefix: string;
  /**
   * このグループのトークン値が参照している構造変数（`vars` グループからの振り分け）。
   * キー自体が CSS 変数名（`--L` 等）。ビューアは表には入れず、見出し下の1行にまとめて出す。
   */
  structuralVars?: TokenEntry[];
  tokens: TokenEntry[];
}

export interface MockupData {
  dataDir: string;
  config: MockupConfigFile;
  pages: PageEntry[];
  tokens: MockupTokens;
  darkTokens: MockupTokens;
}

/**
 * A data-contract violation (invalid schema, forbidden import, etc.).
 * Commands catch this, print `file` + `message`, and exit non-zero.
 */
export class MockupContractError extends Error {
  file?: string;

  constructor(message: string, options: { file?: string } = {}) {
    super(message);
    this.name = 'MockupContractError';
    this.file = options.file;
  }
}
