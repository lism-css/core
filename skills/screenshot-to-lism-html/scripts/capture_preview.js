const puppeteer = require('puppeteer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * 生成された HTML のプレビュー画像を撮影するスクリプト
 *
 * screenshot-to-lism-html Skill の Phase 4（Visual Critique）で使用する汎用スクリプト。
 * 撮影したプレビュー画像を元のデザイン画像と並べ、LLM に「間違い探し」させて Lism CSS の
 * Property Class ／カスタム CSS を修正するループの入力になる。
 *
 * npm scripts 経由の呼び出し（推奨）:
 *   npm run capture -- <html_file_path> <output_image_path>
 *
 * 使い方（直接実行時）:
 *   node capture_preview.js <html_file_path> [output_image_path] [width]
 *
 * 動作:
 * 1. 指定された HTML ファイルを Puppeteer（ヘッドレス Chrome）で開く。
 * 2. Puppeteer の fullPage 撮影は長大 LP（8000px 超）でページ上部が繰り返し
 *    描画されるバグに当たることがあるため、ビューポート高ごとにスクロール＋
 *    撮影 → sharp で 1 枚に stitch する方式を採用する。
 * 3. 撮影した画像を output_image_path に保存する。
 *
 * 補足:
 * - 幅のデフォルト 1280px は先行研究の VRT 比較幅に合わせた値。デザインの基準幅が異なる場合は
 *   第 3 引数で上書きする。
 */

const SEGMENT_HEIGHT = 1600;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node capture_preview.js <html_file_path> [output_image_path] [width]');
    process.exit(1);
  }

  const htmlPath = path.resolve(args[0]);

  if (!fs.existsSync(htmlPath)) {
    console.error(`Error: HTML file not found at ${htmlPath}`);
    process.exit(1);
  }

  const outputImagePath = args[1] ? path.resolve(args[1]) : htmlPath.replace('.html', '_preview.png');
  const viewportWidth = args[2] ? parseInt(args[2], 10) : 1280;

  console.log(`Starting Puppeteer to capture: ${htmlPath}`);
  console.log(`Viewport width: ${viewportWidth}px`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewportWidth, height: SEGMENT_HEIGHT, deviceScaleFactor: 1 });

    const fileUrl = `file://${htmlPath}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)));

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`Full page height: ${pageHeight}px. Capturing in ${Math.ceil(pageHeight / SEGMENT_HEIGHT)} segments...`);

    const segments = [];
    for (let y = 0; y < pageHeight; y += SEGMENT_HEIGHT) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
      const buf = await page.screenshot({ fullPage: false });
      segments.push({ top: y, buffer: buf });
    }

    const composite = [];
    for (let i = 0; i < segments.length; i++) {
      const meta = await sharp(segments[i].buffer).metadata();
      const desiredTop = segments[i].top;
      const excess = desiredTop + meta.height - pageHeight;
      let inBuf = segments[i].buffer;
      let placeTop = desiredTop;
      if (excess > 0 && i > 0) {
        inBuf = await sharp(segments[i].buffer)
          .extract({ left: 0, top: excess, width: viewportWidth, height: meta.height - excess })
          .png()
          .toBuffer();
      }
      composite.push({ input: inBuf, top: placeTop, left: 0 });
    }

    await sharp({
      create: {
        width: viewportWidth,
        height: pageHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite(composite)
      .png()
      .toFile(outputImagePath);

    console.log(`Screenshot saved to: ${outputImagePath}`);
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
