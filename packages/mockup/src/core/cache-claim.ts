/**
 * vite の依存最適化は、キャッシュの commit を「既存 deps を退避 → 新しい deps を rename」という
 * 連続の `fs.renameSync` で行い、そこにプロセス間の排他は無い（リトライ付き rename は Windows 専用）。
 * 同じ cacheDir へ複数プロセスが同時に書くと ENOTEMPTY / ENOENT で commit に失敗し、vite は
 * エラーログ1行で続行するため、負けた側は依存最適化を失ったままブラウザ表示が壊れる。
 *
 * 共有パスを`<共有パス>.inuse.<pid>`へrenameして原子的に占有し、死んだpidの残骸は次の起動で回収する。
 *
 * 占有できなかった場合は `null` を返し、呼び出し側がプロセス固有のディレクトリへ退避する
 * （キャッシュの再利用を諦めて毎回事前バンドルするだけで、動作は変わらない）。
 * 起動を止めないため、この関数は例外を投げずにあらゆる失敗を `null` へ収束させる。
 */
import fs from 'node:fs';
import path from 'node:path';

const INUSE_SUFFIX = '.inuse.';

export interface ViteCacheClaim {
  readonly dir: string;
  /** 占有を返却する。2回以上呼んでも無害。 */
  release(): void;
}

interface InuseEntry {
  path: string;
  pid: number;
}

/** pid の生存確認。EPERM は「存在するが他ユーザー所有」なので生存として扱う。 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * `String(pid)` と完全に一致する形（先頭ゼロなし・正の整数）だけを受け付ける。
 * 0 以下を `process.kill()` に渡すとプロセスグループへのシグナルになるため。
 */
function parseInusePid(name: string, prefix: string): number | null {
  if (!name.startsWith(prefix)) return null;
  const suffix = name.slice(prefix.length);
  if (!/^[1-9][0-9]*$/.test(suffix)) return null;
  const pid = Number.parseInt(suffix, 10);
  return Number.isSafeInteger(pid) ? pid : null;
}

function readInuseEntries(sharedPath: string): InuseEntry[] | null {
  const parent = path.dirname(sharedPath);
  const prefix = `${path.basename(sharedPath)}${INUSE_SUFFIX}`;
  let names: string[];
  try {
    names = fs.readdirSync(parent);
  } catch {
    return null;
  }
  const entries: InuseEntry[] = [];
  for (const name of names) {
    const pid = parseInusePid(name, prefix);
    if (pid !== null) entries.push({ path: path.join(parent, name), pid });
  }
  return entries;
}

function tryRename(from: string, to: string): NodeJS.ErrnoException | null {
  try {
    fs.renameSync(from, to);
    return null;
  } catch (error) {
    return error as NodeJS.ErrnoException;
  }
}

/**
 * 共有cacheDirを自プロセス用の占有ディレクトリへ移す。
 *
 * 失敗の扱いは「次の手を試す」か「諦めて false（＝呼び出し側が退避）」のどちらかに必ず収束させる。
 */
function acquire(sharedPath: string, inuse: string): boolean {
  // 同じPID名のclaimをPOSIX renameで上書きしないため、既存なら取得しない。
  if (fs.existsSync(inuse)) return false;

  // 共有パスを丸ごと自分のものにする（rename は原子的なので同時に来ても1者しか成功しない）。
  // 成功すれば前回の温まったキャッシュをそのまま引き継げる。
  if (tryRename(sharedPath, inuse) === null) return true;

  // 共有パスを取れなかった（誰かが使用中か、まだキャッシュが無いか）。占有中のディレクトリを調べる。
  const entries = readInuseEntries(sharedPath);
  if (entries === null) return false;

  const stale: string[] = [];
  for (const entry of entries) {
    // 生きたプロセスが使っているなら、共有キャッシュは諦めて退避する。
    if (isProcessAlive(entry.pid)) return false;
    stale.push(entry.path);
  }

  // クラッシュで残った残骸を回収する。同じ残骸を複数プロセスが見つけても、rename に成功した1つだけが取れる。
  for (const candidate of stale) {
    const error = tryRename(candidate, inuse);
    if (error === null) return true;
    // ENOENT は別プロセスが先に回収した＝今は生きた占有者がいるので、退避する。
    if (error.code === 'ENOENT') return false;
    // それ以外（他ユーザー所有で EPERM 等）はこの残骸を諦めて次の候補へ。
  }

  // スキャン中に誰かが返却した共有パスを拾えることがあるので、もう一度だけ試す。
  if (tryRename(sharedPath, inuse) === null) return true;
  try {
    // 共有キャッシュがまだどこにも無い場合（フレッシュ起動）はここで新規作成する。
    // 同時に起動した他プロセスとは pid が違うので、それぞれ別のディレクトリを持つ。
    fs.mkdirSync(inuse, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/** 死んだ pid の残骸を捨てる（best-effort。失敗しても占有の成否には影響しない）。 */
function sweepStaleClaims(sharedPath: string, inuse: string): void {
  try {
    for (const entry of readInuseEntries(sharedPath) ?? []) {
      if (entry.path === inuse || isProcessAlive(entry.pid)) continue;
      try {
        fs.rmSync(entry.path, { recursive: true, force: true });
      } catch {
        // 消せなくても害はない（次に起動したプロセスが回収するか、OS の一時ディレクトリ掃除に任せる）。
      }
    }
  } catch {
    // 掃除は付随作業なので、失敗しても占有はそのまま使う。
  }
}

/**
 * 共有 `cacheDir` を自分の pid 名のディレクトリへ rename して占有する。
 * 占有できなければ null（呼び出し側がプロセス固有の退避先を使う）。
 *
 * 返却はプロセスの終了経路（`MockupRuntime.cleanup()`）から `release()` を呼ぶ。
 * 返却されないまま死んだ場合も、次に取得を試みるプロセスが残骸として回収する。
 */
export function claimViteCacheDir(sharedPath: string): ViteCacheClaim | null {
  const inuse = `${sharedPath}${INUSE_SUFFIX}${process.pid}`;

  try {
    if (!acquire(sharedPath, inuse)) return null;
  } catch {
    // 想定外の失敗も「占有できなかった」に倒す（占有の失敗で起動を止めない）。
    return null;
  }
  sweepStaleClaims(sharedPath, inuse);

  let released = false;
  return {
    dir: inuse,
    release() {
      if (released) return;
      released = true;
      // 共有パスへ戻せば、次の起動が温まったキャッシュを引き継げる。
      if (tryRename(inuse, sharedPath) === null) return;
      try {
        // 戻せない理由（他プロセスが先に返却した ENOTEMPTY / EEXIST、自分のディレクトリの消失、
        // 権限や I/O のエラー）は問わず、自分のディレクトリを捨てる。
        fs.rmSync(inuse, { recursive: true, force: true });
      } catch {
        // 消せなくても、プロセス終了後は死んだ pid の残骸として次回起動が回収する。
      }
    },
  };
}
