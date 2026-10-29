/**
 * ページのimportを許可済みパッケージとデータディレクトリ内の相対パスへ制限する。
 *
 * `server.fs.allow` は「許可済みファイルから import されたファイル」を allow 外でも扱えるため、
 * 単独では境界を保証できない。そこで `resolveId` で importer（誰が import しているか）を分類して規則を適用する。
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

import { MOCKUP_CONFIG_FILENAME } from '../core/data-dir.js';
import { hasNodeModulesSegment, isInsideDir, safeRealpath, splitQuery, toImportSpecifier } from '../core/paths.js';
import { MockupContractError } from '../core/types.js';
import { type ImportAllowlist, type PackageResolution } from './allowlist.js';
import { isPageImporterId } from './virtual-modules.js';

export const RELATIVE_IMPORT_EXTENSIONS = ['.jsx', '.tsx', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] as const;

const IMPLICIT_EXTENSIONS = ['.jsx', '.tsx'] as const;
const IMPLICIT_INDEX_FILES = ['/index.jsx', '/index.tsx'] as const;

/** vite が dev で使う「root 外ファイル」プレフィックス。ユーザーファイルからの直書きは拒否する。 */
const FS_PREFIX = '/@fs/';
/** `http:` `data:` などの外部 URL 判定（`virtual:` は先に処理済み）。 */
const EXTERNAL_URL_RE = /^[a-z][a-z0-9+.-]*:/i;

export interface ImportBoundaryContext {
  dataDir: string;
  getPageSpecifiers: () => ReadonlySet<string>;
  allowlist: ImportAllowlist;
  /**
   * vite の生成物を置く一時ディレクトリ（realpath）。
   * dev の依存最適化はここへ書き出した bundle へ解決するため、解決結果の封じ込め判定で許可する。
   */
  generatedDir?: string;
  /**
   * importer ファイルの realpath キャッシュ（`importerFile` → realpath）。
   * `importBoundaryPlugin` がプラグインインスタンス単位で作り、watcher イベントで無効化する
   * （`importBoundaryPlugin` 参照）。テストから直接 `classifyImport` を呼ぶ場合など、
   * 未指定ならキャッシュせず毎回 `safeRealpath` を実行する。
   */
  realpathCache?: Map<string, string>;
}

export type ImportDecision =
  { kind: 'passthrough' } | { kind: 'resolved'; id: string } | { kind: 'bare'; specifier: string; resolution: PackageResolution };

/**
 * `\0`（rollup の仮想 id）・`virtual:`・`/@react-refresh` や `/@vite/client` などの内部名前空間。
 * `/@fs/` だけは「root 外ファイルへの直アクセス」なので内部扱いにしない。
 */
function isViteInternalId(pathname: string): boolean {
  if (pathname.startsWith('\0') || pathname.startsWith('virtual:')) return true;
  return pathname.startsWith('/@') && !pathname.startsWith(FS_PREFIX);
}

function violation(dataDir: string, importerFile: string, source: string, reason: string): MockupContractError {
  const where = isInsideDir(dataDir, importerFile) ? path.relative(dataDir, importerFile) : importerFile;
  return new MockupContractError(`Forbidden import ${JSON.stringify(source)} in ${where}: ${reason}`, { file: importerFile });
}

function cachedRealpath(target: string, cache: Map<string, string> | undefined): string {
  if (!cache) return safeRealpath(target);
  const key = path.resolve(target);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const real = safeRealpath(target);
  cache.set(key, real);
  return real;
}

function resolveRelativeTarget(target: string): string | null {
  const ext = path.extname(target);
  if (ext !== '') return fs.existsSync(target) ? target : null;

  for (const candidate of [...IMPLICIT_EXTENSIONS.map((e) => target + e), ...IMPLICIT_INDEX_FILES.map((e) => target + e)]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** importerとsourceを分類し、許可した解決方法だけを返す。 */
export function classifyImport(source: string, importer: string | undefined, ctx: ImportBoundaryContext): ImportDecision {
  if (!importer) return { kind: 'passthrough' };

  const { pathname: importerFile } = splitQuery(importer);

  if (isPageImporterId(importerFile)) {
    const target = splitQuery(source).pathname;
    // build 時の `\0vite/preload-helper.js` 等、vite 自身が注入するモジュールは対象外。
    if (isViteInternalId(target)) return { kind: 'passthrough' };
    if (ctx.getPageSpecifiers().has(toImportSpecifier(target))) return { kind: 'passthrough' };
    throw new MockupContractError(`Unexpected import ${JSON.stringify(source)} from the generated page list.`);
  }

  // シンボリックリンク経由の抜けを作らないため、realpathで判定する。
  const realImporter = cachedRealpath(importerFile, ctx.realpathCache);
  if (!isInsideDir(ctx.dataDir, realImporter)) return { kind: 'passthrough' };
  // データディレクトリ配下でも node_modules の中は「解決済みパッケージ本体とその依存」であり、
  // ページの契約対象ではない。データディレクトリをプロジェクト直下に置くとこの構成になる。
  if (hasNodeModulesSegment(path.relative(ctx.dataDir, realImporter))) return { kind: 'passthrough' };

  const { pathname, query } = splitQuery(source);

  if (pathname.startsWith(FS_PREFIX)) {
    throw violation(ctx.dataDir, realImporter, source, `"${FS_PREFIX}" paths are not allowed. Use a relative path inside the data directory.`);
  }
  // vite / plugin が注入する内部モジュール（`/@react-refresh`・`/@vite/client`・仮想モジュール）は誤拒否しない。
  if (isViteInternalId(pathname)) return { kind: 'passthrough' };

  if (pathname === '.' || pathname === '..' || pathname.startsWith('./') || pathname.startsWith('../')) {
    return resolveUserRelativeImport(source, pathname, query, realImporter, ctx);
  }

  if (path.isAbsolute(pathname)) {
    throw violation(ctx.dataDir, realImporter, source, 'absolute paths are not allowed. Use a relative path inside the data directory.');
  }
  if (EXTERNAL_URL_RE.test(pathname)) {
    throw violation(ctx.dataDir, realImporter, source, 'external URLs cannot be imported.');
  }

  const resolution = ctx.allowlist.resolutionFor(pathname);
  if (!resolution) {
    throw violation(
      ctx.dataDir,
      realImporter,
      source,
      `it is not an allowed package entry. Only published entries of ${ctx.allowlist.allowedPackages.join(', ')} can be imported. ` +
        `To use another package, add it to "imports" in mockup.config.json and install it in this project.`
    );
  }
  return { kind: 'bare', specifier: source, resolution };
}

function resolveUserRelativeImport(
  source: string,
  pathname: string,
  query: string,
  importerFile: string,
  ctx: ImportBoundaryContext
): ImportDecision {
  const requested = path.resolve(path.dirname(importerFile), pathname);
  const ext = path.extname(requested);

  if (ext !== '' && !(RELATIVE_IMPORT_EXTENSIONS as readonly string[]).includes(ext)) {
    throw violation(ctx.dataDir, importerFile, source, `only ${RELATIVE_IMPORT_EXTENSIONS.join(', ')} files can be imported with a relative path.`);
  }

  const target = resolveRelativeTarget(requested);
  if (!target) {
    throw violation(ctx.dataDir, importerFile, source, `file not found (${requested}).`);
  }

  const real = safeRealpath(target);
  if (!isInsideDir(ctx.dataDir, real)) {
    throw violation(ctx.dataDir, importerFile, source, `it resolves outside the data directory (${real}).`);
  }
  // 未許可パッケージを相対importできないよう、node_modulesへの相対経路を拒否する。
  if (hasNodeModulesSegment(path.relative(ctx.dataDir, real))) {
    throw violation(
      ctx.dataDir,
      importerFile,
      source,
      `relative imports into node_modules are not allowed. Add the package to "imports" in ${MOCKUP_CONFIG_FILENAME} and import it by name.`
    );
  }

  return { kind: 'resolved', id: real + query };
}

export type ImportBoundaryOptions = ImportBoundaryContext;

/**
 * 許可リストの照合は specifier の文字列に対して行うため、`exports` を持たないパッケージの
 * 任意サブパスでは「拡張子を補ったら実体はパッケージ外のシンボリックリンクだった」という
 * 抜け道が残る（`pkg/escape` → `pkg/escape.js` → 外部ファイル）。
 * 最終的な解決結果の realpath で判定して、その経路を塞ぐ。
 *
 * 判定は許可パッケージのルート全体に対して行う（宣言済みパッケージ同士の行き来までは禁じない）。
 * 防ぎたいのは「許可していないパッケージや node_modules 外のファイルへ届くこと」のため。
 */
function assertResolvedInsideAllowedRoots(resolvedId: string, source: string, importer: string, ctx: ImportBoundaryContext): void {
  const { pathname } = splitQuery(resolvedId);
  // 仮想モジュール・相対 URL 形式の id はファイルパスではないので対象外。
  if (pathname.startsWith('\0') || !path.isAbsolute(pathname)) return;

  const real = safeRealpath(pathname);
  const roots = ctx.generatedDir === undefined ? ctx.allowlist.packageRoots : [...ctx.allowlist.packageRoots, ctx.generatedDir];
  if (roots.some((root) => isInsideDir(root, real))) return;

  throw violation(ctx.dataDir, splitQuery(importer).pathname, source, `it resolves outside the allowed packages (${real}).`);
}

function unresolvedMessage(specifier: string, resolution: PackageResolution): string {
  return resolution.origin === 'data'
    ? `Cannot resolve ${JSON.stringify(specifier)}. "${resolution.name}" is declared in "imports" but this entry does not exist in the installed version.`
    : `Cannot resolve ${JSON.stringify(specifier)} from @lism-css/mockup. Reinstall @lism-css/mockup and try again.`;
}

export function importBoundaryPlugin(ctx: ImportBoundaryOptions): Plugin {
  // ファイル差し替え後の古いrealpath判定を使わないため、キャッシュはプラグイン単位に閉じwatcherで破棄する。
  const realpathCache = new Map<string, string>();
  const cachedCtx: ImportBoundaryContext = { ...ctx, realpathCache };

  return {
    name: 'lism-mockup:import-boundary',
    enforce: 'pre',

    configureServer(server) {
      const invalidate = (file: string) => realpathCache.delete(path.resolve(file));
      server.watcher.on('add', invalidate);
      server.watcher.on('change', invalidate);
      server.watcher.on('unlink', invalidate);
    },

    async resolveId(source, importer) {
      const decision = classifyImport(source, importer, cachedCtx);
      if (decision.kind === 'passthrough') return null;
      if (decision.kind === 'resolved') return decision.id;

      // 同名パッケージの差し替えを防ぐため、標準パッケージはCLI同梱側、追加分はデータ側から解決する。
      const resolved = await this.resolve(decision.specifier, decision.resolution.anchor, { skipSelf: true });
      if (!resolved) {
        throw new MockupContractError(unresolvedMessage(decision.specifier, decision.resolution), { file: importer });
      }
      assertResolvedInsideAllowedRoots(resolved.id, source, importer ?? '', ctx);
      return resolved;
    },
  };
}
