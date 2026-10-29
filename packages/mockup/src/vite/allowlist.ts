/**
 * ページからimportできる標準・追加パッケージの公開entryを列挙する。
 *
 * パッケージ名の前方一致では許可しない。`@lism-css/ui` はルート `.` を export しておらず
 * `./react/Accordion` 等の個別エントリしか無いため、前方一致だと「許可済みなのに bundle できない
 * specifier」を生むため。許可リストは各パッケージの `exports` マップから実在 specifier へ展開する。
 *
 * 標準パッケージは`@lism-css/mockup`自身から解決する。`lism-css`と`@lism-css/ui`のexportsは
 * `import`条件だけなので、`createRequire()`は使えない。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDataResolveAnchor, MOCKUP_CONFIG_FILENAME } from '../core/data-dir.js';
import { ancestorNodeModules, getMockPackageRoot, getResolveAnchor, isInsideDir, safeRealpath } from '../core/paths.js';
import { MockupContractError, STANDARD_PACKAGES } from '../core/types.js';
import { LUCIDE_PACKAGE_NAME } from './lucide-icons.js';

const ALWAYS_ALLOWED = ['react/jsx-runtime', 'react/jsx-dev-runtime'];

/**
 * node_modules に実体は無く、`lucideIconsPlugin` が仮想モジュールとして供給する。
 * そのためプロジェクト側に同名パッケージがインストールされていても解決先は変えない
 * （vite プラグインが必ず仮想モジュールへ解決するので、許可リストも同じ判断に揃える）。
 *
 * ルート`.`だけをexportすることで、
 * 仮想モジュールが供給しないサブパス（`lucide-react/icons/...` 等）は許可されない。
 */
const VIRTUAL_PACKAGES: ReadonlyMap<string, Record<string, unknown>> = new Map([[LUCIDE_PACKAGE_NAME, { exports: { '.': {} } }]]);

interface WildcardPattern {
  prefix: string;
  suffix: string;
}

export interface PackageResolution {
  name: string;
  origin: 'mockup' | 'data';
  anchor: string;
}

interface WildcardEntry {
  pattern: WildcardPattern;
  resolution: PackageResolution;
  /**
   * ワイルドカード一致時に実ファイルの存在まで確認するか。
   * `import.meta.resolve()` は `@lism-css/mockup` 起点でしか解決できないため、
   * データディレクトリ側のパッケージは bundler の解決に委ねる（失敗すれば契約エラーになる）。
   */
  verify: boolean;
  /**
   * サブパスの解決先をこのディレクトリ（パッケージルートの realpath）配下に制限する。
   * `exports` の無いパッケージは任意サブパスをファイルパスとして解決するため、
   * シンボリックリンク等でパッケージ外のファイルへ届かないことを realpath で確認する。
   */
  confineDir?: string;
}

export interface ImportAllowlist {
  readonly specifiers: ReadonlySet<string>;
  readonly packageRoots: readonly string[];
  readonly dependencyRoots: readonly string[];
  /** 標準パッケージの解決に使った `@lism-css/mockup` 側の node_modules ルート（近い順）。`server.fs.allow` へ同じ一覧を渡すために持つ。 */
  readonly mockupDependencyRoots: readonly string[];
  /**
   * 見つからなかった標準パッケージ名。
   * `dev` / `check` はこれを起動時の警告に使う（CLI のインストール破損の診断用）。
   */
  readonly missingPackages: readonly string[];
  readonly allowedPackages: readonly string[];
  isAllowed(specifier: string): boolean;
  resolutionFor(specifier: string): PackageResolution | null;
}

export interface ImportAllowlistOptions {
  dataDir: string;
  extraPackages?: readonly string[];
}

/**
 * `ancestorNodeModules()` の結果を複数パッケージの検索で使い回す入口。
 * 引数が Node の解決順（近い順）である限り、結果は親方向へ1階層ずつ探すのと同じになる。
 */
export function findPackageDirIn(nodeModulesRoots: readonly string[], pkgName: string): string | null {
  for (const root of nodeModulesRoots) {
    const manifest = path.join(root, ...pkgName.split('/'), 'package.json');
    if (fs.existsSync(manifest)) return path.dirname(manifest);
  }
  return null;
}

export function findPackageDir(pkgName: string, from: string): string | null {
  return findPackageDirIn(ancestorNodeModules(from), pkgName);
}

function isSubpathMap(exportsField: Record<string, unknown>): boolean {
  const keys = Object.keys(exportsField);
  return keys.length > 0 && keys.every((key) => key.startsWith('.'));
}

/** package exportsを完全一致とワイルドカードのspecifierへ分ける。 */
export function collectPackageSpecifiers(pkgName: string, manifest: Record<string, unknown>): { statics: string[]; wildcards: WildcardPattern[] } {
  const statics: string[] = [];
  const wildcards: WildcardPattern[] = [];
  const exportsField = manifest.exports;

  // exports 未定義のパッケージは「実在するファイルへ解決できること」を条件に許可する。
  if (exportsField === undefined || exportsField === null) {
    statics.push(pkgName);
    wildcards.push({ prefix: `${pkgName}/`, suffix: '' });
    return { statics, wildcards };
  }

  if (typeof exportsField === 'string' || Array.isArray(exportsField) || !isSubpathMap(exportsField as Record<string, unknown>)) {
    statics.push(pkgName);
    return { statics, wildcards };
  }

  for (const key of Object.keys(exportsField)) {
    const specifier = key === '.' ? pkgName : key.startsWith('./') ? `${pkgName}${key.slice(1)}` : null;
    if (specifier === null) continue;

    const star = specifier.indexOf('*');
    if (star === -1) {
      statics.push(specifier);
    } else {
      wildcards.push({ prefix: specifier.slice(0, star), suffix: specifier.slice(star + 1) });
    }
  }

  return { statics, wildcards };
}

function matchesWildcard(pattern: WildcardPattern, specifier: string): boolean {
  return (
    specifier.length > pattern.prefix.length + pattern.suffix.length && specifier.startsWith(pattern.prefix) && specifier.endsWith(pattern.suffix)
  );
}

/**
 * bundler はサブパスをファイルパスとして解決するため、`pkg/../target` は宣言していない
 * 同階層パッケージへ、`pkg/../../outside.js` は node_modules 外のファイルへ届いてしまう。
 * Node の ESM 解決も同種の specifier を Invalid Module Specifier として拒否する。
 */
function hasDotPathSegment(specifier: string): boolean {
  return specifier.split(/[\\/]/).some((segment) => segment === '.' || segment === '..');
}

function staysInsideDir(confineDir: string, pattern: WildcardPattern, specifier: string): boolean {
  const subpath = specifier.slice(pattern.prefix.length);
  return isInsideDir(confineDir, safeRealpath(path.resolve(confineDir, subpath)));
}

/**
 * `import.meta.resolve()` は exports のワイルドカード展開でファイルの存在を確認しないため、
 * 存在チェックまで行って初めて「実在 specifier」と言える。
 */
function resolvesToExistingFile(specifier: string): boolean {
  try {
    const url = import.meta.resolve(specifier);
    if (!url.startsWith('file:')) return false;
    return fs.existsSync(fileURLToPath(url));
  } catch {
    return false;
  }
}

function readManifest(pkgDir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** package exportsと解決元を照合し、import許可リストを構築する。 */
export function buildImportAllowlist({ dataDir, extraPackages = [] }: ImportAllowlistOptions): ImportAllowlist {
  const mockRoot = getMockPackageRoot();
  const mockAnchor = getResolveAnchor();
  const dataAnchor = getDataResolveAnchor(dataDir);

  // 祖先方向の node_modules 列挙は起点ごとに1回だけ行う（標準パッケージ4件の検索と fs.allow で共有する）。
  const mockupDependencyRoots = ancestorNodeModules(mockRoot);
  // データディレクトリ側は追加パッケージがある場合しか要らないので、必要になった時点で1回だけ列挙する。
  let dataNodeModules: readonly string[] | null = null;
  const dataDependencyRoots = (): readonly string[] => (dataNodeModules ??= ancestorNodeModules(dataDir));

  const staticSpecifiers = new Map<string, PackageResolution>();
  const wildcards: WildcardEntry[] = [];
  const packageRoots: string[] = [];
  const missingPackages: string[] = [];
  const missingExtraPackages: string[] = [];
  const allowedPackages: string[] = [];
  let hasDataResolvedPackage = false;

  /**
   * 1パッケージ分の specifier を登録する。
   * `pkgDir` が null の場合は仮想パッケージで、ディスク上のルートを持たない
   * （`fs.allow` にも解決先の封じ込め判定にも実ディレクトリが要らない）。
   */
  const register = (pkgDir: string | null, manifest: Record<string, unknown>, resolution: PackageResolution): void => {
    const pkgRoot = pkgDir === null ? null : safeRealpath(pkgDir);
    if (pkgRoot !== null) packageRoots.push(pkgRoot);
    allowedPackages.push(resolution.name);

    const { statics, wildcards: patterns } = collectPackageSpecifiers(resolution.name, manifest);
    // exports の無いパッケージだけが「任意サブパス」のワイルドカードを持つ（collectPackageSpecifiers 参照）。
    const confineDir = pkgRoot !== null && (manifest.exports === undefined || manifest.exports === null) ? pkgRoot : undefined;
    for (const specifier of statics) staticSpecifiers.set(specifier, resolution);
    for (const pattern of patterns) wildcards.push({ pattern, resolution, verify: resolution.origin === 'mockup', confineDir });
  };

  for (const name of STANDARD_PACKAGES) {
    const pkgDir = findPackageDirIn(mockupDependencyRoots, name);
    const manifest = pkgDir === null ? null : readManifest(pkgDir);
    if (pkgDir === null || manifest === null) {
      missingPackages.push(name);
      continue;
    }
    register(pkgDir, manifest, { name, origin: 'mockup', anchor: mockAnchor });
  }

  // JSX runtime は react の exports にも含まれるが、react が見つからない環境でも
  // 「変換が注入した import だけは通る」状態を保つため、パッケージ登録とは別に足す。
  for (const specifier of ALWAYS_ALLOWED) {
    if (!staticSpecifiers.has(specifier)) staticSpecifiers.set(specifier, { name: 'react', origin: 'mockup', anchor: mockAnchor });
  }

  for (const name of extraPackages) {
    // 仮想パッケージ（lucide-react）は node_modules を探さない。CLI 側が必ず供給するため、
    // init 直後（プロジェクト側に未インストール）でもそのまま使える。
    const virtualManifest = VIRTUAL_PACKAGES.get(name);
    if (virtualManifest !== undefined) {
      register(null, virtualManifest, { name, origin: 'mockup', anchor: mockAnchor });
      continue;
    }

    // それ以外はデータディレクトリ側から解決する。CLI の依存ツリーにあってもフォールバックさせない
    // （CLI の依存変更でモックアップの成否が変わらないようにするため）。
    const pkgDir = findPackageDirIn(dataDependencyRoots(), name);
    const manifest = pkgDir === null ? null : readManifest(pkgDir);
    if (pkgDir === null || manifest === null) {
      missingExtraPackages.push(name);
      continue;
    }

    hasDataResolvedPackage = true;
    register(pkgDir, manifest, { name, origin: 'data', anchor: dataAnchor });
  }

  if (missingExtraPackages.length > 0) {
    throw new MockupContractError(
      `${MOCKUP_CONFIG_FILENAME} declares package(s) in "imports" that are not installed: ${missingExtraPackages.map((name) => `"${name}"`).join(', ')}. ` +
        `Install them in the project that contains this data directory (for example \`npm install ${missingExtraPackages.join(' ')}\`), or remove them from "imports".`,
      { file: path.join(dataDir, MOCKUP_CONFIG_FILENAME) }
    );
  }

  // 追加パッケージ自身の依存も bundle 対象になるため、データディレクトリ側の
  // node_modules も fs.allow に載せる（許可パッケージのルートだけでは依存を辿れない）。
  const dependencyRoots = hasDataResolvedPackage ? dataDependencyRoots() : [];

  const wildcardCache = new Map<string, PackageResolution | null>();

  const resolutionFor = (specifier: string): PackageResolution | null => {
    // `pkg/../target` のような specifier は静的エントリに存在せず、ワイルドカードに
    // 通すとパッケージ外へ解決されうるため、照合前に一律拒否する。
    if (hasDotPathSegment(specifier)) return null;

    const exact = staticSpecifiers.get(specifier);
    if (exact) return exact;

    const cached = wildcardCache.get(specifier);
    if (cached !== undefined) return cached;

    let match: PackageResolution | null = null;
    for (const entry of wildcards) {
      if (!matchesWildcard(entry.pattern, specifier)) continue;
      if (entry.confineDir !== undefined && !staysInsideDir(entry.confineDir, entry.pattern, specifier)) continue;
      if (entry.verify && !resolvesToExistingFile(specifier)) continue;
      match = entry.resolution;
      break;
    }
    wildcardCache.set(specifier, match);
    return match;
  };

  return {
    specifiers: new Set(staticSpecifiers.keys()),
    packageRoots,
    dependencyRoots,
    mockupDependencyRoots,
    missingPackages,
    allowedPackages,
    resolutionFor,
    isAllowed(specifier: string): boolean {
      return resolutionFor(specifier) !== null;
    },
  };
}
