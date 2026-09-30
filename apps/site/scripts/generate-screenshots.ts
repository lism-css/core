/**
 * パターンのスクリーンショット自動生成スクリプト
 *
 * ビルド後のdistディレクトリからプレビューサーバーを起動し、
 * 各パターンページのスクリーンショットを撮影して保存します。
 *
 * --force 時は公開用（本番画像）に加え、比較用ベースライン
 * （CDNランダム画像をグレーに差し替え）も同時に再撮影します。
 *
 * 使い方:
 *   pnpm screenshot:patterns:new       # 新規のみ生成（全言語、ビルド後に実行）
 *   pnpm screenshot:patterns:force     # 全て再生成（public + baseline、全言語）
 *   npx tsx scripts/generate-screenshots.ts cta            # カテゴリ指定（全言語）
 *   npx tsx scripts/generate-screenshots.ts cta/cta01     # パターン指定（全言語）
 *   npx tsx scripts/generate-screenshots.ts cta section    # 複数指定
 *   npx tsx scripts/generate-screenshots.ts --lang=en      # 英語版のみ生成
 *   npx tsx scripts/generate-screenshots.ts --lang=ja      # 日本語版のみ生成
 *   npx tsx scripts/generate-screenshots.ts cta/cta01 --lang=en --force  # 特定パターンの英語版を再生成
 */

import { chromium, type Browser, type Page } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { PNG } from 'pngjs';
import { capturePatternScreenshot } from './capture-pattern-screenshot';

// 現在のディレクトリを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// 設定
const CONFIG = {
  // 公開用スクリーンショット（本番画像）の保存先
  outputDir: join(ROOT_DIR, 'public', 'screenshots', 'patterns'),
  // 比較用ベースライン（CDNランダム画像をグレーに差し替え）の保存先
  // ※ compare-screenshots.ts / update-screenshots.ts と同じパス
  baselineDir: join(ROOT_DIR, '_screenshots', 'baseline'),
  viewport: { width: 1440, height: 810 },
  // プレビューサーバーのポート
  port: 4002,
  // ページ読み込み後の待機時間（ミリ秒）
  waitAfterLoad: 500,
};

// 対応言語（ja はデフォルト＝パスプレフィックスなし）
const ALL_LANGS = ['ja', 'en'] as const;
type Lang = (typeof ALL_LANGS)[number];

// コマンドライン引数をパース
const args = process.argv.slice(2);
const forceRegenerate = args.includes('--force');
// --lang オプション: 指定言語のみ生成（省略時は全言語）
const langValue = args.find((a) => a.startsWith('--lang='))?.split('=')[1];
const targetLangs: readonly Lang[] = langValue ? [langValue as Lang] : ALL_LANGS;
// --force, --lang 以外の引数をフィルタとして使用（例: "cta", "cta/cta01"）
const filters = args.filter((a) => !a.startsWith('--'));

/**
 * パターン設定からパス一覧を取得（draft除外）
 */
async function getPatternPaths(lang: Lang): Promise<Array<{ category: string; id: string }>> {
  const { patterns, isPatternAvailable } = await import('../src/config/patterns.ts');
  const paths: Array<{ category: string; id: string }> = [];
  for (const [categoryId, category] of Object.entries(patterns)) {
    for (const item of category.items as Array<{ id: string; draft?: boolean; languages?: Lang[] }>) {
      if (!item.draft && isPatternAvailable(item, lang)) {
        paths.push({ category: categoryId, id: item.id });
      }
    }
  }
  return paths;
}

/**
 * フィルタ引数でパターンを絞り込む
 * "cta" → カテゴリ全体, "cta/cta01" → 特定パターン
 */
function filterPatternPaths(paths: Array<{ category: string; id: string }>): Array<{ category: string; id: string }> {
  if (filters.length === 0) return paths;
  return paths.filter(({ category, id }) =>
    filters.some((f) => {
      if (f.includes('/')) {
        // "cta/cta01" 形式: 完全一致
        return `${category}/${id}` === f;
      }
      // "cta" 形式: カテゴリ一致
      return category === f;
    })
  );
}

/**
 * URLにアクセスしてサーバーが応答するか確認
 */
async function waitForServer(url: string, maxRetries = 30, interval = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // サーバーがまだ起動していない
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

/**
 * プレビューサーバーを起動
 */
function startPreviewServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log('📡 プレビューサーバーを起動中...');

    const server = spawn('npx', ['astro', 'preview', '--port', String(CONFIG.port)], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: true,
    });

    let started = false;

    // サーバー起動を検出
    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('localhost') && !started) {
        started = true;
        // サーバーが本当に応答可能になるまで待機
        void waitForServer(`http://localhost:${CONFIG.port}/`).then((ready) => {
          if (ready) {
            console.log(`✅ プレビューサーバー起動完了 (port: ${CONFIG.port})`);
            resolve(server);
          } else {
            server.kill();
            reject(new Error('サーバーが応答しません'));
          }
        });
      }
    });

    server.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      // エラーではなく情報メッセージの場合もあるので、起動検出に使う
      if (output.includes('localhost') && !started) {
        started = true;
        void waitForServer(`http://localhost:${CONFIG.port}/`).then((ready) => {
          if (ready) {
            console.log(`✅ プレビューサーバー起動完了 (port: ${CONFIG.port})`);
            resolve(server);
          } else {
            server.kill();
            reject(new Error('サーバーが応答しません'));
          }
        });
      }
    });

    server.on('error', (err) => {
      reject(new Error(`サーバー起動エラー: ${err.message}`));
    });

    // タイムアウト処理
    setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error('サーバー起動タイムアウト'));
      }
    }, 30000);
  });
}

/**
 * 1x1 グレーPNGバッファ（CDNランダム画像の代替用）
 */
function createGrayPixelPng(): Buffer {
  const png = new PNG({ width: 1, height: 1 });
  png.data[0] = 190;
  png.data[1] = 190;
  png.data[2] = 190;
  png.data[3] = 255;
  return PNG.sync.write(png);
}

/**
 * ランダム画像をグレーに差し替えるルートを設定（baseline 撮影用）
 */
async function setupImageInterception(page: Page, grayPng: Buffer): Promise<void> {
  await page.route('**/cdn.lism-css.com/random/img*', (route) => {
    return route.fulfill({
      contentType: 'image/png',
      body: grayPng,
    });
  });
}

/**
 * 指定パスにスクリーンショットを保存
 */
async function captureTo(page: Page, url: string, outputPath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    await capturePatternScreenshot(page, url, outputPath, CONFIG.waitAfterLoad);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * スクリーンショットを撮影（force 時は baseline も同時撮影）
 */
async function takeScreenshot(
  realPage: Page,
  grayPage: Page | null,
  category: string,
  id: string,
  lang: Lang
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  // ja はプレフィックスなし、それ以外は lang/ サブディレクトリに保存
  const langPrefix = lang === 'ja' ? '' : lang;
  const publicPath = join(CONFIG.outputDir, langPrefix, category, `${id}.webp`);
  const baselinePath = join(CONFIG.baselineDir, langPrefix, category, `${id}.png`);

  // 強制再生成でない場合、既存ファイルをスキップ
  if (!forceRegenerate && existsSync(publicPath)) {
    return { success: true, skipped: true };
  }

  // ja はデフォルトURL、それ以外は言語別プレビューページ
  const url =
    lang === 'ja'
      ? `http://localhost:${CONFIG.port}/preview/patterns/${category}/${id}/`
      : `http://localhost:${CONFIG.port}/preview/patterns/${category}/${id}/${lang}/`;

  // 公開用（本番画像）
  const r1 = await captureTo(realPage, url, publicPath);
  if (!r1.ok) return { success: false, error: r1.error };

  // force のときは baseline（CDNランダム画像をグレー差し替え）も同時更新
  if (forceRegenerate && grayPage) {
    const r2 = await captureTo(grayPage, url, baselinePath);
    if (!r2.ok) return { success: false, error: r2.error };
  }

  return { success: true };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🖼️  パターンスクリーンショット生成');
  console.log(`   モード: ${forceRegenerate ? '全て再生成' : '新規のみ'}`);
  console.log(`   言語: ${targetLangs.join(', ')}`);
  console.log('');

  // distディレクトリの存在確認
  const distDir = join(ROOT_DIR, 'dist');
  if (!existsSync(distDir)) {
    console.error('❌ distディレクトリが見つかりません。先にビルドを実行してください。');
    console.error('   npm run build:astro');
    process.exit(1);
  }

  // パターンパスを取得・フィルタ
  const pathsByLang = new Map(await Promise.all(targetLangs.map(async (lang) => [lang, filterPatternPaths(await getPatternPaths(lang))] as const)));
  if (filters.length > 0) {
    console.log(`   フィルタ: ${filters.join(', ')}`);
  }
  console.log(`📋 対象パターン数: ${Array.from(pathsByLang.values()).reduce((count, paths) => count + paths.length, 0)}`);
  console.log('');

  // プレビューサーバーを起動
  let server: ChildProcess | null = null;
  let browser: Browser | null = null;
  let exitCode = 0;

  try {
    server = await startPreviewServer();

    // Playwrightブラウザを起動
    console.log('🌐 ブラウザを起動中...');
    browser = await chromium.launch({ headless: true });

    // 公開用ページ（本番画像のまま）
    const realPage = await browser.newPage();
    await realPage.setViewportSize(CONFIG.viewport);

    // 比較用ページ（CDNランダム画像 → グレーに差し替え）。force のときだけ用意
    let grayPage: Page | null = null;
    if (forceRegenerate) {
      grayPage = await browser.newPage();
      await grayPage.setViewportSize(CONFIG.viewport);
      await setupImageInterception(grayPage, createGrayPixelPng());
    }

    console.log(forceRegenerate ? '✅ ブラウザ起動完了（force: public + baseline 同時撮影）' : '✅ ブラウザ起動完了');
    console.log('');

    // 統計
    let generated = 0;
    let skipped = 0;
    let failed = 0;

    // 各パターンのスクリーンショットを言語ごとに撮影
    console.log('📸 スクリーンショット撮影開始...');
    for (const lang of targetLangs) {
      const patternPaths = pathsByLang.get(lang)!;
      if (targetLangs.length > 1) {
        console.log(`\n🌐 [${lang}]`);
      }
      for (const { category, id } of patternPaths) {
        const result = await takeScreenshot(realPage, grayPage, category, id, lang);

        if (result.skipped) {
          skipped++;
          process.stdout.write(`  ⏭️  ${category}/${id} (スキップ)\n`);
        } else if (result.success) {
          generated++;
          process.stdout.write(forceRegenerate ? `  ✅ ${category}/${id} (public & baseline)\n` : `  ✅ ${category}/${id}\n`);
        } else {
          failed++;
          process.stdout.write(`  ❌ ${category}/${id}: ${result.error}\n`);
        }
      }
    }

    // 結果サマリー
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 結果サマリー');
    console.log(`   生成: ${generated}`);
    console.log(`   スキップ: ${skipped}`);
    console.log(`   失敗: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (failed > 0) {
      exitCode = 1;
    }
  } catch (error) {
    console.error('❌ エラー:', error instanceof Error ? (error.stack ?? error.message) : error);
    exitCode = 1;
  } finally {
    // クリーンアップ
    if (browser) {
      await browser.close();
      console.log('🌐 ブラウザを終了');
    }
    if (server) {
      if (server.pid) process.kill(-server.pid, 'SIGTERM');
      else server.kill();
      console.log('📡 プレビューサーバーを停止');
    }
    process.exit(exitCode);
  }
}

// 実行
main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
