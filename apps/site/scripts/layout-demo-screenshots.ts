/**
 * Layout Demos のスクリーンショット自動生成スクリプト
 *
 * ビルド後の dist ディレクトリからプレビューサーバーを起動し、
 * 各 layout-demo プレビューページのスクリーンショットを撮影して保存します。
 *
 * - ビューポートは 1600x900 固定
 * - 多言語別の出力は行わない（ja/en で同じ画像を使う想定）
 * - 出力パスは public/screenshots/layout-demos/{category}/{id}.png
 *
 * 使い方:
 *   pnpm screenshot:layout-demos                            # 新規のみ生成（ビルド後に実行）
 *   pnpm screenshot:layout-demos:force                      # 既存も含めて全て再生成
 *   npx tsx scripts/layout-demo-screenshots.ts article                 # カテゴリ指定
 *   npx tsx scripts/layout-demo-screenshots.ts article/one-column      # カテゴリ/ID 指定
 *   npx tsx scripts/layout-demo-screenshots.ts article others
 */

import { chromium, type Browser, type Page } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';

// 現在のディレクトリを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// 設定
const CONFIG = {
  // スクリーンショットの保存先（{category}/{id}.png 階層）
  outputDir: join(ROOT_DIR, 'public', 'screenshots', 'layout-demos'),
  // ビューポートサイズ（16:9）
  viewport: { width: 1600, height: 900 },
  // 開発・パターン撮影サーバーとの衝突を避けるため専用ポートを使う
  port: 4001,
  // ページ読み込み後の待機時間（ミリ秒）
  waitAfterLoad: 500,
};

// コマンドライン引数をパース
const args = process.argv.slice(2);
const forceRegenerate = args.includes('--force');
// --force 以外の引数を ID フィルタとして使用
const filters = args.filter((a) => !a.startsWith('--'));

/**
 * Layout Demos 設定からパス一覧を取得（draft 除外）
 */
async function getLayoutPaths(): Promise<Array<{ category: string; id: string }>> {
  const { layoutDemos } = await import('../src/config/layout-demos.ts');
  const paths: Array<{ category: string; id: string }> = [];
  for (const [categoryId, category] of Object.entries(layoutDemos)) {
    for (const item of category.items as Array<{ id: string; draft?: boolean }>) {
      if (!item.draft) {
        paths.push({ category: categoryId, id: item.id });
      }
    }
  }
  return paths;
}

/**
 * フィルタ引数で対象を絞り込む
 * "article" → カテゴリ全体, "article/one-column" → 特定レイアウト
 */
function filterPaths(paths: Array<{ category: string; id: string }>): Array<{ category: string; id: string }> {
  if (filters.length === 0) return paths;
  return paths.filter(({ category, id }) =>
    filters.some((f) => {
      if (f.includes('/')) {
        return `${category}/${id}` === f;
      }
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

    const handleOutput = (output: string) => {
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
    };

    server.stdout?.on('data', (data: Buffer) => handleOutput(data.toString()));
    server.stderr?.on('data', (data: Buffer) => handleOutput(data.toString()));

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
 * スクリーンショットを撮影
 */
async function takeScreenshot(page: Page, category: string, id: string): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const outputPath = join(CONFIG.outputDir, category, `${id}.png`);

  // 強制再生成でない場合、既存ファイルをスキップ
  if (!forceRegenerate && existsSync(outputPath)) {
    return { success: true, skipped: true };
  }

  const url = `http://localhost:${CONFIG.port}/preview/layout-demos/${category}/${id}/`;

  try {
    const outDir = dirname(outputPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(CONFIG.waitAfterLoad);
    // 固定ビューポートで撮影（fullPage:false がデフォルト）
    await page.screenshot({ path: outputPath, type: 'png' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🖼️  Layout Demos スクリーンショット生成');
  console.log(`   モード: ${forceRegenerate ? '全て再生成' : '新規のみ'}`);
  console.log('');

  // distディレクトリの存在確認
  const distDir = join(ROOT_DIR, 'dist');
  if (!existsSync(distDir)) {
    console.error('❌ distディレクトリが見つかりません。先にビルドを実行してください。');
    console.error('   npm run build:astro');
    process.exit(1);
  }

  // パスを取得・フィルタ
  const allPaths = await getLayoutPaths();
  const targetPaths = filterPaths(allPaths);
  if (filters.length > 0) {
    console.log(`   フィルタ: ${filters.join(', ')}`);
  }
  console.log(`📋 対象レイアウト数: ${targetPaths.length}`);
  console.log('');

  if (targetPaths.length === 0) {
    console.log('⚠️  対象が0件のため終了します。');
    process.exit(0);
  }

  // プレビューサーバーを起動
  let server: ChildProcess | null = null;
  let browser: Browser | null = null;
  let exitCode = 0;

  try {
    server = await startPreviewServer();

    // Playwrightブラウザを起動
    console.log('🌐 ブラウザを起動中...');
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage();
    await page.setViewportSize(CONFIG.viewport);

    console.log('✅ ブラウザ起動完了');
    console.log('');

    // 統計
    let generated = 0;
    let skipped = 0;
    let failed = 0;

    console.log('📸 スクリーンショット撮影開始...');
    for (const { category, id } of targetPaths) {
      const result = await takeScreenshot(page, category, id);

      if (result.skipped) {
        skipped++;
        process.stdout.write(`  ⏭️  ${category}/${id} (スキップ)\n`);
      } else if (result.success) {
        generated++;
        process.stdout.write(`  ✅ ${category}/${id}\n`);
      } else {
        failed++;
        process.stdout.write(`  ❌ ${category}/${id}: ${result.error}\n`);
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

main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
