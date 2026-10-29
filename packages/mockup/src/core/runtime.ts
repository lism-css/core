/** devのwatchで差し替わる状態をdev/checkとviteプラグインで共有する。 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { claimViteCacheDir, type ViteCacheClaim } from './cache-claim.js';
import { readMockConfig, resolveDataDir } from './data-dir.js';
import { discoverPages } from './pages.js';
import { getMockPackageRoot, safeRealpath, toImportSpecifier, walkAncestorDirs } from './paths.js';
import { buildTokensArtifacts, loadTokens, writeConfigModule } from './tokens.js';
import type { MockupData, TokenGroupEntry } from './types.js';

export interface MockupRuntime {
  data: MockupData;
  readonly configPath: string;
  readonly configDir: string;
  /** vite の `cacheDir`（依存の事前バンドル先。同じ入力なら起動をまたいで使い回す。dev では占有した `.inuse.<pid>` パス）。 */
  readonly cacheDir: string;
  readonly tempDir: string;
  tokensCss: string;
  tokensData: TokenGroupEntry[];
  getPageSpecifiers(): ReadonlySet<string>;
  refreshPages(): void;
  refreshTokens(): Promise<void>;
  /** 一時ディレクトリを削除し、占有した cacheDir を共有パスへ返す（キャッシュの中身と `configDir` は次回起動のために残す）。 */
  cleanup(): void;
}

/** 読めない場合も安定したキャッシュキーを作るため既定値を返す。 */
function readMockPackageVersion(packageRoot: string): string {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8')) as { version?: unknown };
    return typeof manifest.version === 'string' ? manifest.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** 別インストールや異なる入力の生成configを共有しないためのキー。 */
function generatedDirKey(dataDir: string, imports: readonly string[]): string {
  const packageRoot = safeRealpath(getMockPackageRoot());
  return (
    createHash('sha256')
      // `imports` は宣言順を変えても中身が同じなら同じキャッシュでよいので並べ替えてから混ぜる。
      .update(JSON.stringify([readMockPackageVersion(packageRoot), packageRoot, dataDir, [...imports].sort()]))
      .digest('hex')
      .slice(0, 16)
  );
}

const LOCKFILE_NAMES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock'] as const;

function findNearestLockfile(dataDir: string): [string, string] | null {
  for (const dir of walkAncestorDirs(dataDir)) {
    for (const name of LOCKFILE_NAMES) {
      const candidate = path.join(dir, name);
      try {
        return [safeRealpath(candidate), fs.readFileSync(candidate, 'utf-8')];
      } catch {
        // 見つからない、または読めない lockfile はキャッシュキーに使わない。
      }
    }
  }
  return null;
}

function viteCacheDirKey(dataDir: string, imports: readonly string[]): string {
  const key = generatedDirKey(dataDir, imports);
  if (imports.length === 0) return key;

  const lockfile = findNearestLockfile(dataDir);
  if (!lockfile) return key;
  const [lockfilePath, lockfileContent] = lockfile;
  return createHash('sha256').update(key).update('\0').update(lockfilePath).update('\0').update(lockfileContent).digest('hex').slice(0, 16);
}

/** 共有ディレクトリの置き場所（macOS の os.tmpdir() はシンボリックリンクなので realpath 化して使う）。 */
function sharedDirRoot(): string {
  return safeRealpath(os.tmpdir());
}

/**
 * プロセス固有の一時ディレクトリに置くと毎回ゼロから事前バンドルし直しになるため、
 * `os.tmpdir()` 配下の安定した場所へ置いて起動間で使い回す（データディレクトリ側には書かないので、
 * 読み取り専用の配布物（npx キャッシュ等）から実行しても動く、という設計は維持できる）。
 *
 * 同じ入力で2つ同時に起動すると同じディレクトリを指す。vite の依存最適化は同時書き込みで壊れるため
 * （理由は `cache-claim.ts` 冒頭）、書き込みを行う dev はこのパスをそのまま使わず、
 * `claimViteCacheDir()` で `<このパス>.inuse.<pid>` へ rename して占有してから使う
 * （`prepareViteCacheDir()` 参照）。このパスが存在するのは「誰も使っていない」ときだけ。
 */
export function resolveViteCacheDir(dataDir: string, imports: readonly string[] = []): string {
  return path.join(sharedDirRoot(), `lism-mockup-cache-${viteCacheDirKey(dataDir, imports)}`);
}

/**
 * ここは lockfile に影響されない安定パスにする。`lismConfigAlias()` はこのファイルのパスを
 * `resolve.alias` に入れ、vite は `resolve` をまるごと依存キャッシュのキーに含めるため、
 * パスが起動ごとに変わると毎回「vite config has changed」で事前バンドルをやり直してしまい、
 * `cacheDir` を共有した意味が無くなる。
 *
 * ただし `cacheDir` の中には置かない。vite の watcher は `<cacheDir>/**` を監視対象から外すため、
 * 中に置くと `tokens.json` の変更でこのモジュールを書き換えても invalidate されず、
 * ブラウザに古い config が残ってしまう。そのため兄弟ディレクトリにする。
 *
 * 同じデータディレクトリで2つ同時に起動すると同じファイルを共有するが、内容は
 * そのデータディレクトリの `tokens.json` だけから決まる（キーにデータディレクトリを含むため、
 * 共有する2プロセスは必ず同じ `tokens.json` を読む）ので、書き込む中身は常に同一になる。
 * 書き込み自体も `writeConfigModule()` が rename で原子的に置き換えるため、
 * 相手プロセスの vite が書き込み途中の状態を読むことはない。
 */
export function resolveGeneratedConfigDir(dataDir: string, imports: readonly string[] = []): string {
  return path.join(sharedDirRoot(), `lism-mockup-config-${generatedDirKey(dataDir, imports)}`);
}

interface PreparedViteCacheDir {
  cacheDir: string;
  claim: ViteCacheClaim | null;
}

/**
 * ディレクトリ自体は作らない（占有した場合を除く）。事前バンドルを行う `dev` では vite が
 * 必要になった時点で作るため、キャッシュを使わない `check`（build）が空ディレクトリを残さずに済む。
 *
 * `exclusive`（依存の事前バンドルを書き込む dev）では `claimViteCacheDir()` で共有パスを占有し、
 * そこを cacheDir にする（競合の理由は `cache-claim.ts` 冒頭）。占有できなければプロセス固有の
 * 一時ディレクトリへ退避し、起動は止めない。
 *
 * `exclusive` でない `check` は cacheDir へ読み書きしないため、占有せず共有パスを指すだけにする。
 */
function prepareViteCacheDir(dataDir: string, imports: readonly string[] | undefined, tempDir: string, exclusive: boolean): PreparedViteCacheDir {
  const shared = resolveViteCacheDir(dataDir, imports ?? []);
  // 既にある場合に備えて realpath 化する（fs.allow の比較が realpath 基準のため）。
  // 未作成なら safeRealpath はパスをそのまま返す。
  if (!exclusive) return { cacheDir: safeRealpath(shared), claim: null };

  const claim = claimViteCacheDir(shared);
  if (claim) return { cacheDir: safeRealpath(claim.dir), claim };

  const fallback = path.join(tempDir, 'vite-cache');
  fs.mkdirSync(fallback, { recursive: true });
  return { cacheDir: fallback, claim: null };
}

/**
 * `cacheDir`と違い、生成configは起動直後に書くためディレクトリを作る。
 * 書き込めない場合はプロセス固有の一時ディレクトリへ退避する（キャッシュ再利用を諦めるだけ）。
 */
function prepareGeneratedConfigDir(dataDir: string, imports: readonly string[] | undefined, tempDir: string): string {
  const shared = resolveGeneratedConfigDir(dataDir, imports ?? []);
  try {
    fs.mkdirSync(shared, { recursive: true });
    fs.accessSync(shared, fs.constants.W_OK);
    return safeRealpath(shared);
  } catch {
    return tempDir;
  }
}

export async function loadMockData(dir: string): Promise<MockupData> {
  const dataDir = resolveDataDir(dir);
  const config = readMockConfig(dataDir);
  const pages = discoverPages(dataDir, config);
  const { tokens, darkTokens } = await loadTokens(dataDir);
  return { dataDir, config, pages, tokens, darkTokens };
}

export interface PrepareMockRuntimeOptions {
  /** dev 用。共有 cacheDir を占有して使う（理由は `cache-claim.ts`）。check（build）は cacheDir へ書き込まないので不要。 */
  exclusiveViteCache?: boolean;
}

export async function prepareMockRuntime(dir: string, options: PrepareMockRuntimeOptions = {}): Promise<MockupRuntime> {
  const data = await loadMockData(dir);

  // 読み取り専用の配布物（npx キャッシュ等）でも動くよう、生成物はすべて os.tmpdir() 配下へ置く。
  // macOS の os.tmpdir() はシンボリックリンクのため、realpath 化してから使う（fs.allow の比較が realpath 基準）。
  const tempDir = safeRealpath(fs.mkdtempSync(path.join(os.tmpdir(), 'lism-mockup-')));
  // 依存の事前バンドルと生成 config だけは起動間で同じ場所に置く
  // （tempDir とは別。理由は resolveViteCacheDir / resolveGeneratedConfigDir 参照）。
  const { cacheDir, claim } = prepareViteCacheDir(data.dataDir, data.config.imports, tempDir, options.exclusiveViteCache ?? false);

  let configDir: string;
  let configPath: string;
  let tokensCss: string;
  let tokensData: TokenGroupEntry[];
  try {
    configDir = prepareGeneratedConfigDir(data.dataDir, data.config.imports, tempDir);
    configPath = writeConfigModule(configDir, data.tokens);
    const artifacts = await buildTokensArtifacts(data.dataDir, configPath, data.tokens, data.darkTokens);
    tokensCss = artifacts.css;
    tokensData = artifacts.groups;
  } catch (error) {
    // ここで失敗すると runtime を返せず `cleanup()` も呼ばれないため、占有と一時ディレクトリを自分で片付ける
    // （占有を返しておけば、エラー直後に起動し直しても共有キャッシュをそのまま使える）。
    claim?.release();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // 削除できなくても致命的ではない（OS の一時ディレクトリ掃除に任せる）。
    }
    throw error;
  }

  let specifierSource: MockupData['pages'] | null = null;
  let specifiers: ReadonlySet<string> = new Set();

  const runtime: MockupRuntime = {
    data,
    configPath,
    configDir,
    cacheDir,
    tempDir,
    tokensCss,
    tokensData,

    getPageSpecifiers() {
      if (specifierSource !== runtime.data.pages) {
        specifierSource = runtime.data.pages;
        specifiers = new Set(specifierSource.map((page) => toImportSpecifier(page.file)));
      }
      return specifiers;
    },

    refreshPages() {
      const config = readMockConfig(runtime.data.dataDir);
      const pages = discoverPages(runtime.data.dataDir, config);
      runtime.data = { ...runtime.data, config, pages };
    },

    async refreshTokens() {
      const { tokens, darkTokens } = await loadTokens(runtime.data.dataDir);
      // 同じパスへ書き直す（vite の watcher がこのファイルの変更を拾ってモジュールを invalidate する）。
      writeConfigModule(configDir, tokens);
      runtime.data = { ...runtime.data, tokens, darkTokens };
      const { css, groups } = await buildTokensArtifacts(runtime.data.dataDir, configPath, tokens, darkTokens);
      runtime.tokensCss = css;
      runtime.tokensData = groups;
    },

    cleanup() {
      // 占有した cacheDir を共有パスへ返し、次の起動が温まったキャッシュを使えるようにする。
      claim?.release();
      try {
        // 次回起動の事前バンドルと同時起動中のconfigを保つため、生成物の一時ディレクトリだけ削除する。
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // 削除できなくても致命的ではない（OS の一時ディレクトリ掃除に任せる）。
      }
    },
  };

  return runtime;
}
