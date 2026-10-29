/** devとcheckが共有するデータ契約の検証。 */
import fs from 'node:fs';
import path from 'node:path';

import { safeRealpath } from './paths.js';
import { isPlainObject, MockupContractError, SCHEMA_VERSION, STANDARD_PACKAGES, type MockupConfigFile, type MockupConfigPageMeta } from './types.js';

export const MOCKUP_CONFIG_FILENAME = 'mockup.config.json';

/**
 * `mockup.config.json` の許可トップレベルキー。
 * 未知キーはエラーにして、項目追加が必ず `schemaVersion` の更新を伴うようにする
 */
const CONFIG_KEYS = ['schemaVersion', 'title', 'imports', 'pages'] as const;
const PAGE_META_KEYS = ['label', 'category', 'order'] as const;

/**
 * npm のパッケージ名（`@scope/name` 含む）。
 * `imports` はパッケージ単位の宣言なので、サブパス・相対パス・絶対パス・URL・`node:` は弾く。
 */
const PACKAGE_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(value).filter((key) => !allowed.includes(key));
}

/**
 * `imports` の追加パッケージを、データディレクトリを含むプロジェクトから解決するための
 * importer パス（`getResolveAnchor()` のデータディレクトリ版）。
 * 実在する `mockup.config.json` を使う理由も `getResolveAnchor()` と同じ。
 */
export function getDataResolveAnchor(dataDir: string): string {
  return path.join(dataDir, MOCKUP_CONFIG_FILENAME);
}

export function resolveDataDir(dir: string): string {
  const abs = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(abs)) {
    throw new MockupContractError(`Data directory not found: ${abs}`);
  }
  if (!fs.statSync(abs).isDirectory()) {
    throw new MockupContractError(`Data directory is not a directory: ${abs}`);
  }
  return safeRealpath(abs);
}

export function readMockConfig(dataDir: string): MockupConfigFile {
  const file = path.join(dataDir, MOCKUP_CONFIG_FILENAME);

  // `readTokensFile`と同じ理由で、ENOENT以外は投げ直す。
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME} not found. Run \`lism-mockup init\` to scaffold a mockup data directory.`, {
        file,
      });
    }
    throw error;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME} is not valid JSON: ${(error as Error).message}`, { file });
  }

  if (!isPlainObject(raw)) {
    throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME} must contain a JSON object.`, { file });
  }

  const extra = unknownKeys(raw, CONFIG_KEYS);
  if (extra.length > 0) {
    throw new MockupContractError(
      `${MOCKUP_CONFIG_FILENAME} has unknown key(s): ${extra.map((key) => `"${key}"`).join(', ')}. Allowed keys: ${CONFIG_KEYS.join(', ')}.`,
      { file }
    );
  }

  if (!Object.hasOwn(raw, 'schemaVersion')) {
    throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME} is missing "schemaVersion". Add \`"schemaVersion": ${SCHEMA_VERSION}\`.`, {
      file,
    });
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new MockupContractError(
      `${MOCKUP_CONFIG_FILENAME} has "schemaVersion": ${JSON.stringify(raw.schemaVersion)}, but this version of @lism-css/mockup only supports ${SCHEMA_VERSION}. Update it to ${SCHEMA_VERSION}.`,
      { file }
    );
  }

  if (raw.title !== undefined && typeof raw.title !== 'string') {
    throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "title" must be a string.`, { file });
  }

  const config: MockupConfigFile = { schemaVersion: SCHEMA_VERSION };
  if (typeof raw.title === 'string') config.title = raw.title;
  if (raw.imports !== undefined) config.imports = readImports(raw.imports, file);
  if (raw.pages !== undefined) config.pages = readPagesMeta(raw.pages, file);

  return config;
}

/**
 * `imports`（ページが追加で import してよいパッケージ）を検証して読み込む。
 *
 * 標準パッケージは設定不要で常時許可されるため、ここに書くのは重複宣言として弾く
 * （「書かないと使えない」と誤解させないため）。
 */
function readImports(value: unknown, file: string): string[] {
  if (!Array.isArray(value)) {
    throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "imports" must be an array of package names.`, { file });
  }

  const packages: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry === '') {
      throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "imports" must only contain non-empty package names.`, { file });
    }
    if ((STANDARD_PACKAGES as readonly string[]).includes(entry)) {
      throw new MockupContractError(
        `${MOCKUP_CONFIG_FILENAME}: "imports" must not contain "${entry}". ${STANDARD_PACKAGES.join(', ')} are always available.`,
        { file }
      );
    }
    if (!PACKAGE_NAME_RE.test(entry)) {
      throw new MockupContractError(
        `${MOCKUP_CONFIG_FILENAME}: "imports" entry "${entry}" is not a package name. Declare the package itself (e.g. "lucide-react"), not a subpath or a file path.`,
        { file }
      );
    }
    if (packages.includes(entry)) {
      throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "imports" lists "${entry}" more than once.`, { file });
    }
    packages.push(entry);
  }

  return packages;
}

function readPagesMeta(value: unknown, file: string): Record<string, MockupConfigPageMeta> {
  if (!isPlainObject(value)) {
    throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "pages" must be an object keyed by page id.`, { file });
  }

  // `__proto__`による存在検証のすり抜けを防ぐため、ページ情報はnullプロトタイプへ格納する。
  const pages = Object.create(null) as Record<string, MockupConfigPageMeta>;
  for (const [pageId, meta] of Object.entries(value)) {
    if (!isPlainObject(meta)) {
      throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "pages.${pageId}" must be an object.`, { file });
    }

    const extra = unknownKeys(meta, PAGE_META_KEYS);
    if (extra.length > 0) {
      throw new MockupContractError(
        `${MOCKUP_CONFIG_FILENAME}: "pages.${pageId}" has unknown key(s): ${extra.map((key) => `"${key}"`).join(', ')}. Allowed keys: ${PAGE_META_KEYS.join(', ')}.`,
        { file }
      );
    }
    if (meta.label !== undefined && typeof meta.label !== 'string') {
      throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "pages.${pageId}.label" must be a string.`, { file });
    }
    if (meta.category !== undefined && typeof meta.category !== 'string') {
      throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "pages.${pageId}.category" must be a string.`, { file });
    }
    if (meta.order !== undefined && (typeof meta.order !== 'number' || !Number.isFinite(meta.order))) {
      throw new MockupContractError(`${MOCKUP_CONFIG_FILENAME}: "pages.${pageId}.order" must be a number.`, { file });
    }

    const entry: MockupConfigPageMeta = {};
    if (typeof meta.label === 'string') entry.label = meta.label;
    if (typeof meta.category === 'string') entry.category = meta.category;
    if (typeof meta.order === 'number') entry.order = meta.order;
    pages[pageId] = entry;
  }
  return pages;
}
