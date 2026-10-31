const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * 画像のセクション境界を自動検出し、分割して保存するスクリプト
 *
 * screenshot-to-lism-html Skill の Phase 0（画像のセクション分割）で使用する汎用スクリプト。
 * 入力画像に依存しない仕組みで、任意の LP スクリーンショットに対して利用可能。
 * npm scripts 経由の呼び出し（推奨）:
 *   npm run split -- <input_image_path> <output_dir>
 *
 * 使い方（直接実行時）:
 *   node split_image.js <input_image_path> [output_dir]
 *
 * 動作:
 * 1. 画像の各行のピクセルを解析し、背景色の変化や色の分散が極端に低い部分（空白行）をセクションの境界候補として検出。
 * 2. 検出された境界（Y座標）に基づいて画像を複数のセクション画像に分割。
 * 3. output_dir に section_01.png, section_02.png... として保存。
 *
 * 制約:
 * - 単色の背景変化が少ないデザインでは境界検出が難しい場合があります。うまくいかない場合は SKILL.md の Phase 0
 *   の指示に従い、VLM 自身が推測した Y 座標での手動分割やユーザーへの確認にフォールバックしてください。
 */

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node split_image.js <input_image_path> [output_dir]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputDir = args[1] || path.join(path.dirname(inputPath), 'sections');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input image not found at ${inputPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log(`Analyzing image: ${inputPath}...`);
    const image = sharp(inputPath);
    const { width, height } = await image.metadata();

    // 画像の生ピクセルバッファを取得 (RGB)
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });

    const boundaries = [0]; // 最初は0
    const MIN_SECTION_HEIGHT = 400; // セクションの最小高さ
    let lastBoundary = 0;

    // 行ごとの色分散を計算して境界を探す簡易ロジック
    // （実際にはより高度なエッジ検出やVLM連携が必要な場合もあります）
    for (let y = 0; y < height; y++) {
      let rowR = 0,
        rowG = 0,
        rowB = 0;

      // 行の平均色を計算
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        rowR += data[idx];
        rowG += data[idx + 1];
        rowB += data[idx + 2];
      }
      rowR /= width;
      rowG /= width;
      rowB /= width;

      // 行の分散（単色かどうか）を計算
      let variance = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        variance += Math.pow(data[idx] - rowR, 2) + Math.pow(data[idx + 1] - rowG, 2) + Math.pow(data[idx + 2] - rowB, 2);
      }
      variance /= width;

      // 分散が非常に低い（＝横一線の無地）かつ、前の境界から一定の距離がある場合、境界とする
      // ※ より精度を上げる場合は、前後の行との色の変化（エッジ）を検出します。
      const isSolidLine = variance < 50;

      if (isSolidLine && y - lastBoundary > MIN_SECTION_HEIGHT) {
        // 色の急激な変化があるかどうか（前の行の平均色と比較）など、
        // さらに条件を絞り込むことができますが、ここではシンプルな無地行を境界とします。

        // 境界として登録
        boundaries.push(y);
        lastBoundary = y;
        console.log(`Found boundary at Y: ${y}`);
      }
    }

    boundaries.push(height);

    console.log(`Total sections found: ${boundaries.length - 1}`);

    // 分割処理
    for (let i = 0; i < boundaries.length - 1; i++) {
      const top = boundaries[i];
      const bottom = boundaries[i + 1];
      const sectionHeight = bottom - top;

      const outputPath = path.join(outputDir, `section_${String(i + 1).padStart(2, '0')}.png`);

      await sharp(inputPath).extract({ left: 0, top: top, width: width, height: sectionHeight }).toFile(outputPath);

      console.log(`Saved: ${outputPath} (Height: ${sectionHeight}px)`);
    }

    console.log('Image splitting complete.');
  } catch (error) {
    console.error('Error processing image:', error);
    process.exit(1);
  }
}

main();
