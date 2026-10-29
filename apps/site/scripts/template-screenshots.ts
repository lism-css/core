/**
 * テンプレートのスクリーンショット自動生成スクリプト
 *
 * 各テンプレートディレクトリ配下の screenshots.config.json を参照し、
 * テンプレートを build → preview server 起動 → 指定パスを撮影してテンプレ配下に保存します。
 *
 * config に `langShots`（例: `{ en: [...] }`）があるテンプレは、通常撮影に続けて
 * `build:template:en`（.lang/<lang> を src へマージして再ビルド）で言語別に再撮影し、
 * `screenshots/<lang>/<name>.png` に保存します（blog の overlay 方式 en 用）。
 *
 * 使い方（リポジトリルートまたは apps/site で実行）:
 *   npx tsx apps/site/scripts/template-screenshots.ts                    # 新規のみ撮影
 *   npx tsx apps/site/scripts/template-screenshots.ts --force            # 全テンプレ再撮影
 *   npx tsx apps/site/scripts/template-screenshots.ts --compare          # ベースライン比較（初回はベースライン生成）
 *   npx tsx apps/site/scripts/template-screenshots.ts --update           # 差分テンプレのベースライン更新
 *   npx tsx apps/site/scripts/template-screenshots.ts --target=minimal-astro
 *   npx tsx apps/site/scripts/template-screenshots.ts --target=blog/astro/minimal
 *   npx tsx apps/site/scripts/template-screenshots.ts --no-build         # 既存 dist を使う（ビルドをスキップ）
 *   npx tsx apps/site/scripts/template-screenshots.ts --threshold=0.5    # compare のしきい値（%）
 *   npx tsx apps/site/scripts/template-screenshots.ts --port=4331        # 全テンプレの preview ポートを上書き（既定ポートが使用中のとき）
 */

import { chromium, type Browser, type Page } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { foregroundServerEnv } from './preview-server-env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// apps/site/scripts → リポジトリルートまで3階層遡る
const REPO_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(REPO_ROOT, 'templates');

interface ShotDef {
  name: string;
  path: string;
}
interface TemplateConfig {
  command?: 'preview' | 'dev';
  port: number;
  /**
   * ポートを CLI 引数（`-- --port <port>`）ではなく `PORT` 環境変数で渡す。
   * Next.js の `next start` / `next dev` は `--` 後の `--port` をディレクトリ引数と誤解してエラーになるため、
   * そうしたツールではこのフラグを立てて env 経由で渡す（既定は false = 従来どおり CLI 引数）。
   */
  portViaEnv?: boolean;
  waitAfterLoad?: number;
  /**
   * true なら `prefers-reduced-motion: reduce` を適用して撮影する。
   * 入場アニメーションや背景の常時アニメーションがあるテンプレで、完了後の静止状態を安定して撮るために使う
   * （テンプレ側に reduced-motion 用のスタイル分岐があることが前提）。
   */
  reducedMotion?: boolean;
  shots: ShotDef[];
  /**
   * 言語別 overlay（`.lang/<lang>/`）をマージして撮影する shots。`{ en: [...] }` 形式。
   * 通常 build には出てこず ja と同じ path に重なる overlay 方式（blog）向け。
   * 各 shot は `build:template:en` 等で再ビルドしたうえで撮影し、`screenshots/<lang>/<name>.png` に保存する。
   * （LP のように en が通常 build の実ルートに含まれる場合は、langShots ではなく
   *   `shots` に `{ name: "en/top", path: "/en/" }` のように直接書けばよい。）
   */
  langShots?: Record<string, ShotDef[]>;
}

interface TemplateEntry {
  /** リポジトリルートからの相対パス (例: 'templates/minimal/astro') */
  relPath: string;
  /** 絶対パス */
  absPath: string;
  /** package.json の name (例: 'minimal-astro') */
  pkgName: string;
  config: TemplateConfig;
}

// 引数パース
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const arg = (name: string): string | undefined => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found?.split('=', 2)[1];
};

const MODE: 'new' | 'force' | 'compare' | 'update' = flag('update') ? 'update' : flag('compare') ? 'compare' : flag('force') ? 'force' : 'new';
const SKIP_BUILD = flag('no-build');
const TARGET = arg('target');
const THRESHOLD = arg('threshold') ? parseFloat(arg('threshold')!) : 0.01;
// 全テンプレの preview ポートを上書きする。config の既定ポート（4321 等）を別プロセスが占有しているときに使う
const PORT_OVERRIDE = arg('port') ? parseInt(arg('port')!, 10) : undefined;

const VIEWPORT = { width: 1600, height: 900 } as const;
const SERVER_READY_TIMEOUT_MS = 60_000;

// ───────────────────────────────────────────
// テンプレ列挙
// ───────────────────────────────────────────

/** templates/ 以下を再帰的に走査して screenshots.config.json を持つディレクトリを集める */
function collectTemplates(): TemplateEntry[] {
  const found: TemplateEntry[] = [];
  walk(TEMPLATES_ROOT);
  return found;

  function walk(dir: string) {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    // このディレクトリに config があるか
    if (entries.includes('screenshots.config.json')) {
      const configPath = join(dir, 'screenshots.config.json');
      const pkgPath = join(dir, 'package.json');
      if (!existsSync(pkgPath)) {
        console.warn(`⚠️  package.json が見つかりません: ${relative(REPO_ROOT, dir)}`);
        return;
      }
      const config = JSON.parse(readFileSync(configPath, 'utf-8')) as TemplateConfig;
      if (PORT_OVERRIDE) config.port = PORT_OVERRIDE;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string };
      if (!pkg.name) {
        console.warn(`⚠️  package.json に name がありません: ${relative(REPO_ROOT, dir)}`);
        return;
      }
      found.push({
        relPath: relative(REPO_ROOT, dir),
        absPath: dir,
        pkgName: pkg.name,
        config,
      });
      // テンプレ配下はそれ以上掘らない
      return;
    }
    // サブディレクトリを掘る（node_modules / dist / .* は除外）
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      if (name === 'node_modules' || name === 'dist') continue;
      const sub = join(dir, name);
      try {
        if (statSync(sub).isDirectory()) walk(sub);
      } catch {
        /* noop */
      }
    }
  }
}

function filterTemplates(templates: TemplateEntry[]): TemplateEntry[] {
  if (!TARGET) return templates;
  return templates.filter((t) => t.pkgName === TARGET || t.relPath === TARGET || t.relPath.endsWith(`/${TARGET}`));
}

// ───────────────────────────────────────────
// ビルド & preview server
// ───────────────────────────────────────────

function buildTemplate(pkgName: string): boolean {
  console.log(`🔨 build: ${pkgName}`);
  const r = spawnSync('pnpm', ['--filter', pkgName, 'build'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  return r.status === 0;
}

/**
 * 言語別 overlay（.lang/<lang>/）を src へ一時マージしてビルドする。
 * scripts/build-template-lang.mjs（= `nr build:template:en <pkg>` の実体）を呼び出す。
 * build 後に src は復元されるため、作業ツリーは汚れない。
 */
function buildTemplateLang(pkgName: string, lang: string): boolean {
  console.log(`🔨 build (${lang} overlay): ${pkgName}`);
  const r = spawnSync('node', [join(REPO_ROOT, 'scripts', 'build-template-lang.mjs'), pkgName, lang], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  return r.status === 0;
}

/** host:port へ TCP 接続できるか（listen 中のプロセスがあるか） */
function canConnect(host: string, port: number, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

async function isPortInUse(port: number): Promise<boolean> {
  // Astro 7 の preview は IPv6（::1）側で listen するため、127.0.0.1 だけ見ると使用中を見逃す。
  // HTTP 応答の有無ではなく TCP 接続の可否で判定する（応答が遅いサーバーを未使用と誤判定しないため）
  const [v4, v6] = await Promise.all([canConnect('127.0.0.1', port), canConnect('::1', port)]);
  return v4 || v6;
}

/** ポートが解放されるまで待機（前テンプレの preview server が完全終了するまで） */
async function waitForPortFree(port: number, timeoutMs = 15_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isPortInUse(port))) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function startPreviewServer(entry: TemplateEntry): Promise<ChildProcess> {
  const command = entry.config.command ?? 'preview';
  const port = entry.config.port;
  return new Promise((resolve, reject) => {
    console.log(`📡 ${command} server 起動中 (${entry.pkgName} :${port})`);

    // 各 dev/preview にポートを渡して固定する。portViaEnv のテンプレは PORT 環境変数で渡し（next 等 `--` 後引数 NG 対策）、
    // それ以外は `--port <port>` を渡す。`--` を挟むと pnpm がそのまま script へ渡し、astro は `--` 以降を無視する。
    const usePortEnv = entry.config.portViaEnv ?? false;
    const serverArgs = usePortEnv ? ['--filter', entry.pkgName, command] : ['--filter', entry.pkgName, command, '--port', String(port)];
    const env = foregroundServerEnv();
    if (usePortEnv) env.PORT = String(port);
    const server = spawn('pnpm', serverArgs, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      detached: true,
      env,
    });

    let resolved = false;
    const url = `http://localhost:${port}/`;

    const checkReady = async () => {
      const ok = await waitForServer(url);
      if (resolved) return;
      resolved = true;
      if (ok) {
        console.log(`✅ server ready: ${url}`);
        resolve(server);
      } else {
        try {
          if (server.pid) process.kill(-server.pid, 'SIGTERM');
        } catch {
          /* noop */
        }
        reject(new Error('server が応答しません'));
      }
    };

    // stdout/stderr に "localhost" が出たタイミング、または最初のデータで監視を開始
    let watchStarted = false;
    const onData = (buf: Buffer) => {
      if (watchStarted) return;
      if (buf.toString().includes('localhost') || buf.toString().includes(`:${port}`)) {
        watchStarted = true;
        void checkReady();
      }
    };
    server.stdout?.on('data', onData);
    server.stderr?.on('data', onData);

    server.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      reject(new Error(`server 起動エラー: ${err.message}`));
    });
    server.on('exit', (code, sig) => {
      if (resolved) return;
      resolved = true;
      reject(new Error(`server が起動前に終了しました (${sig ?? `exit ${code}`})`));
    });

    // フォールバック: 一定時間後に強制チェック
    setTimeout(() => {
      if (!watchStarted) {
        watchStarted = true;
        void checkReady();
      }
    }, 2000);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          if (server.pid) process.kill(-server.pid, 'SIGTERM');
        } catch {
          /* noop */
        }
        reject(new Error('server 起動タイムアウト'));
      }
    }, SERVER_READY_TIMEOUT_MS);
  });
}

async function waitForServer(url: string, maxRetries = 60, interval = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      /* noop */
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

function stopServer(server: ChildProcess | null, signal: NodeJS.Signals = 'SIGTERM') {
  if (!server) return;
  try {
    if (server.pid) process.kill(-server.pid, signal);
    else server.kill(signal);
  } catch {
    /* noop */
  }
}

/**
 * 自分が起動した server を止め、ポートが解放されるまで待つ。
 * 停止対象は自分のプロセスグループに限定する（ポートを使う他のプロセスを止めない）。
 * 解放されなければ次のパスで別サーバーを撮ってしまうので、警告ではなくエラーで中止する。
 */
async function stopServerAndFreePort(server: ChildProcess | null, port: number): Promise<void> {
  stopServer(server, 'SIGTERM');
  if (await waitForPortFree(port, 3_000)) return;
  stopServer(server, 'SIGKILL');
  if (await waitForPortFree(port)) return;
  throw new Error(`ポート ${port} が解放されませんでした。占有中のプロセスを確認して停止してください`);
}

// ───────────────────────────────────────────
// 撮影 & 比較
// ───────────────────────────────────────────

function shotsOutputDir(entry: TemplateEntry, kind: 'public' | 'baseline' | 'diff' | 'temp') {
  // すべて screenshots/ 配下に集約。比較系は _baseline / _diff / _temp として
  // アンダースコア接頭辞のサブディレクトリに退避させる（apps/site の glob で除外しやすい）。
  if (kind === 'public') return join(entry.absPath, 'screenshots');
  return join(entry.absPath, 'screenshots', `_${kind}`);
}

/** 1x1 グレー PNG（CDN ランダム画像の代替用） */
function createGrayPixelPng(): Buffer {
  const png = new PNG({ width: 1, height: 1 });
  png.data[0] = 190;
  png.data[1] = 190;
  png.data[2] = 190;
  png.data[3] = 255;
  return PNG.sync.write(png);
}

/**
 * ランダム画像をグレーに差し替えるルートを設定。
 * `cdn.lism-css.com/random/img*`（旧形式）と `cdn.lism-css.com/img/random*`（新形式）を両方カバー。
 * 固定の `img/<category>/<name>.jpg` 等は差し替えない（レイアウト比較に影響しないため）。
 */
async function setupImageInterception(page: Page, grayPng: Buffer): Promise<void> {
  await page.route(/cdn\.lism-css\.com\/(random\/img|img\/random)/, (route) => route.fulfill({ contentType: 'image/png', body: grayPng }));
}

async function takeShot(page: Page, url: string, outputPath: string, waitAfterLoad: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(waitAfterLoad);
    mkdirSync(dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, type: 'png' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function comparePng(baselinePath: string, candidatePath: string, diffPath: string): { diffPercent: number } {
  const a = PNG.sync.read(readFileSync(baselinePath));
  const b = PNG.sync.read(readFileSync(candidatePath));
  if (a.width !== b.width || a.height !== b.height) return { diffPercent: 100 };
  const diff = new PNG({ width: a.width, height: a.height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.3 });
  const diffPercent = (diffPixels / (a.width * a.height)) * 100;
  if (diffPercent >= 0.01) {
    mkdirSync(dirname(diffPath), { recursive: true });
    writeFileSync(diffPath, PNG.sync.write(diff));
  }
  return { diffPercent };
}

// ───────────────────────────────────────────
// 各モードの処理
// ───────────────────────────────────────────

type Stats = { generated: number; skipped: number; changed: number; unchanged: number; newCount: number; failed: number };

/** 1テンプレの撮影単位（デフォルト言語 or 言語別 overlay）。 */
interface Pass {
  /** ログ用ラベル */
  label: string;
  /** 出力サブディレクトリ（'' = デフォルト言語, 'en' = en overlay）。出力名の接頭辞になる */
  subdir: string;
  /** このパスで撮影する shots（name は subdir からの相対） */
  shots: ShotDef[];
  /** ビルド処理。成功で true */
  build: () => boolean;
  /** true の場合 --no-build を無視して必ずビルドする（overlay マージは dist を上書きするため毎回必要） */
  alwaysBuild?: boolean;
}

/** entry を撮影パス（デフォルト＋langShots）に展開する */
function passesFor(entry: TemplateEntry): Pass[] {
  const passes: Pass[] = [
    {
      label: entry.pkgName,
      subdir: '',
      shots: entry.config.shots,
      build: () => buildTemplate(entry.pkgName),
    },
  ];
  const langShots = entry.config.langShots ?? {};
  for (const [lang, shots] of Object.entries(langShots)) {
    if (!shots || shots.length === 0) continue;
    passes.push({
      label: `${entry.pkgName} [${lang}]`,
      subdir: lang,
      shots,
      build: () => buildTemplateLang(entry.pkgName, lang),
      alwaysBuild: true,
    });
  }
  return passes;
}

/** pass の subdir を反映した出力名（screenshots/<outName>.png として保存される） */
function outNameOf(pass: Pass, shot: ShotDef): string {
  return pass.subdir ? `${pass.subdir}/${shot.name}` : shot.name;
}

async function processEntry(entry: TemplateEntry, browser: Browser, stats: Stats): Promise<void> {
  console.log(`\n━━━ ${entry.pkgName} (${entry.relPath}) ━━━`);

  // compare は entry 単位で diff / temp を一度だけクリアする（複数パスで共有するため）
  if (MODE === 'compare') {
    const diffDir = shotsOutputDir(entry, 'diff');
    const tempDir = shotsOutputDir(entry, 'temp');
    if (existsSync(diffDir)) rmSync(diffDir, { recursive: true });
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  }

  for (const pass of passesFor(entry)) {
    await runPass(entry, pass, browser, stats);
  }

  // compare の一時ファイルを破棄
  if (MODE === 'compare') {
    const tempDir = shotsOutputDir(entry, 'temp');
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  }
}

/** 1パス（build → preview → 撮影 → 後始末）を実行する */
async function runPass(entry: TemplateEntry, pass: Pass, browser: Browser, stats: Stats): Promise<void> {
  if (pass.subdir) console.log(`\n  ── lang pass: ${pass.subdir} ──`);

  // new モードでこのパスの公開画像が全て揃っていれば、build/preview ごとスキップ
  // （特に overlay の再ビルドは重いので、不要なら丸ごと省く）
  if (MODE === 'new') {
    const publicDir = shotsOutputDir(entry, 'public');
    const allExist = pass.shots.every((shot) => existsSync(join(publicDir, `${outNameOf(pass, shot)}.png`)));
    if (allExist) {
      stats.skipped += pass.shots.length;
      console.log(`  ⏭️  ${pass.label}: 公開画像が揃っているためスキップ`);
      return;
    }
  }

  // ポートが既に使われていたら中止（誤って別サーバを撮影しないため）
  if (await isPortInUse(entry.config.port)) {
    console.error(
      `❌ ポート ${entry.config.port} は既に使用されています。screenshots.config.json で別ポートを指定するか、占有中のプロセスを停止してください`
    );
    stats.failed += pass.shots.length;
    return;
  }

  // build フェーズ（langShots は alwaysBuild で必ず再ビルド）
  const needsBuild = pass.alwaysBuild || (!SKIP_BUILD && entry.config.command !== 'dev');
  if (needsBuild) {
    if (!pass.build()) {
      console.error(`❌ build に失敗しました: ${pass.label}`);
      stats.failed += pass.shots.length;
      return;
    }
  }

  let server: ChildProcess | null = null;
  try {
    server = await startPreviewServer(entry);

    // 公開用ページ（CDN ランダム画像はそのまま）
    const realPage = await browser.newPage();
    await realPage.setViewportSize(VIEWPORT);
    if (entry.config.reducedMotion) await realPage.emulateMedia({ reducedMotion: 'reduce' });

    // 比較用ページ（CDN ランダム画像 → 1x1 グレー）。force / compare / update で使う
    let grayPage: Page | null = null;
    const needsGrayPage = MODE === 'force' || MODE === 'compare' || MODE === 'update';
    if (needsGrayPage) {
      grayPage = await browser.newPage();
      await grayPage.setViewportSize(VIEWPORT);
      if (entry.config.reducedMotion) await grayPage.emulateMedia({ reducedMotion: 'reduce' });
      await setupImageInterception(grayPage, createGrayPixelPng());
    }

    await captureShotSet(entry, pass, { realPage, grayPage }, stats);

    await realPage.close();
    if (grayPage) await grayPage.close();
  } finally {
    await stopServerAndFreePort(server, entry.config.port);
  }
}

/** 起動済み preview server に対して、pass の shots をモード別に撮影する */
async function captureShotSet(entry: TemplateEntry, pass: Pass, pages: { realPage: Page; grayPage: Page | null }, stats: Stats): Promise<void> {
  const { realPage, grayPage } = pages;
  const waitAfterLoad = entry.config.waitAfterLoad ?? 500;
  const baseUrl = `http://localhost:${entry.config.port}`;

  if (MODE === 'new' || MODE === 'force') {
    const publicDir = shotsOutputDir(entry, 'public');
    const baselineDir = MODE === 'force' ? shotsOutputDir(entry, 'baseline') : null;
    for (const shot of pass.shots) {
      const outName = outNameOf(pass, shot);
      const publicPath = join(publicDir, `${outName}.png`);
      if (MODE === 'new' && existsSync(publicPath)) {
        stats.skipped++;
        process.stdout.write(`  ⏭️  ${outName} (スキップ)\n`);
        continue;
      }
      // 公開用（本物の画像）
      const r1 = await takeShot(realPage, baseUrl + shot.path, publicPath, waitAfterLoad);
      // force のときは baseline（グレー差し替え）も同時に撮り直す
      let r2: { ok: boolean; error?: string } = { ok: true };
      if (MODE === 'force' && baselineDir) {
        const baselinePath = join(baselineDir, `${outName}.png`);
        r2 = await takeShot(grayPage!, baseUrl + shot.path, baselinePath, waitAfterLoad);
      }
      if (r1.ok && r2.ok) {
        stats.generated++;
        process.stdout.write(MODE === 'force' ? `  ✅ ${outName} (public & baseline)\n` : `  ✅ ${outName}\n`);
      } else {
        stats.failed++;
        process.stdout.write(`  ❌ ${outName}: ${r1.error ?? r2.error}\n`);
      }
    }
  } else if (MODE === 'compare') {
    const baselineDir = shotsOutputDir(entry, 'baseline');
    const tempDir = shotsOutputDir(entry, 'temp');
    const diffDir = shotsOutputDir(entry, 'diff');

    for (const shot of pass.shots) {
      const outName = outNameOf(pass, shot);
      const baselinePath = join(baselineDir, `${outName}.png`);
      const tempPath = join(tempDir, `${outName}.png`);
      const diffPath = join(diffDir, `${outName}.png`);

      // baseline 未生成なら（初回 / 新規 shot）グレー差し替えで生成
      if (!existsSync(baselinePath)) {
        const res = await takeShot(grayPage!, baseUrl + shot.path, baselinePath, waitAfterLoad);
        if (res.ok) {
          stats.newCount++;
          process.stdout.write(`  🆕 ${outName} (baseline 生成)\n`);
        } else {
          stats.failed++;
          process.stdout.write(`  ❌ ${outName}: ${res.error}\n`);
        }
        continue;
      }

      const cap = await takeShot(grayPage!, baseUrl + shot.path, tempPath, waitAfterLoad);
      if (!cap.ok) {
        stats.failed++;
        process.stdout.write(`  ❌ ${outName}: ${cap.error}\n`);
        continue;
      }
      const { diffPercent } = comparePng(baselinePath, tempPath, diffPath);
      if (diffPercent <= THRESHOLD) {
        stats.unchanged++;
        process.stdout.write(`  ✅ ${outName} (変更なし)\n`);
      } else {
        stats.changed++;
        process.stdout.write(`  ⚠️  ${outName} (差分: ${diffPercent.toFixed(2)}%)\n`);
      }
    }
  } else if (MODE === 'update') {
    const baselineDir = shotsOutputDir(entry, 'baseline');
    const diffDir = shotsOutputDir(entry, 'diff');
    const publicDir = shotsOutputDir(entry, 'public');

    for (const shot of pass.shots) {
      const outName = outNameOf(pass, shot);
      const diffPath = join(diffDir, `${outName}.png`);
      // 差分が出ている shot だけ更新（直前の compare が生成した diff を参照）
      if (!existsSync(diffPath)) continue;
      // baseline はグレー差し替えあり、public は本物の画像で更新
      const baselinePath = join(baselineDir, `${outName}.png`);
      const publicPath = join(publicDir, `${outName}.png`);
      const r1 = await takeShot(grayPage!, baseUrl + shot.path, baselinePath, waitAfterLoad);
      const r2 = await takeShot(realPage, baseUrl + shot.path, publicPath, waitAfterLoad);
      if (r1.ok && r2.ok) {
        stats.generated++;
        rmSync(diffPath);
        process.stdout.write(`  ✅ ${outName} (baseline & public 更新)\n`);
      } else {
        stats.failed++;
        process.stdout.write(`  ❌ ${outName}: ${r1.error ?? r2.error}\n`);
      }
    }
  }
}

async function main() {
  console.log('🖼️  テンプレートスクリーンショット');
  console.log(`   モード: ${MODE}`);
  if (TARGET) console.log(`   ターゲット: ${TARGET}`);
  if (SKIP_BUILD) console.log('   build スキップ');
  console.log('');

  const all = collectTemplates();
  const templates = filterTemplates(all);
  if (templates.length === 0) {
    console.error('❌ 対象テンプレートがありません');
    process.exit(1);
  }
  console.log(`📋 対象: ${templates.map((t) => t.pkgName).join(', ')}`);

  console.log('🌐 ブラウザを起動...');
  const browser = await chromium.launch({ headless: true });

  const stats: Stats = { generated: 0, skipped: 0, changed: 0, unchanged: 0, newCount: 0, failed: 0 };
  let exitCode = 0;

  try {
    for (const entry of templates) {
      await processEntry(entry, browser, stats);
    }
  } catch (e) {
    console.error('❌ エラー:', e instanceof Error ? (e.stack ?? e.message) : e);
    exitCode = 1;
  } finally {
    await browser.close();
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 結果サマリー');
  if (MODE === 'compare') {
    console.log(`   変更なし: ${stats.unchanged}`);
    console.log(`   変更あり: ${stats.changed}`);
    if (stats.newCount > 0) console.log(`   新規 baseline: ${stats.newCount}`);
  } else {
    console.log(`   生成/更新: ${stats.generated}`);
    if (stats.skipped > 0) console.log(`   スキップ: ${stats.skipped}`);
  }
  if (stats.failed > 0) console.log(`   失敗: ${stats.failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (stats.failed > 0) exitCode = 1;
  if (MODE === 'compare' && stats.changed > 0) {
    console.log('');
    console.log('💡 変更を受け入れるには: pnpm screenshot:templates:update');
    exitCode = 1;
  }
  process.exit(exitCode);
}

main().catch((e) => {
  console.error('❌ エラー:', e);
  process.exit(1);
});
