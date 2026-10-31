/**
 * ⚠️ 検証時専用スクリプト（一般用途では使用しないこと）
 *
 * このスクリプトは、本 Skill の検証時に **`input/sample-lp.png`** の
 * ヘッダー・ヒーロー領域の再現差分を分析するために書き下ろされた **一回限りの検証用ツール**です。
 *
 * ▼ 汎用スクリプトではない理由:
 * - 比較幅を **1512px 固定**（sample-lp.png のデザイン幅）でハードコード
 * - ヒーロー画像のエッジ検出に **Y=400 の 1 行のみ**をサンプルする決め打ち
 * - タイトル「Simple」「LP Design」の位置を **Y=195-246 / Y=287-339 の固定範囲**で走査
 * - CTA ボタンを **Y=48 の 1 行の黒ピクセル連続**として検出（sample-lp.png のヘッダーレイアウト前提）
 * - 出力先の `sample-lp-header-hero-v2` ／ 参照する viewer HTML パス
 *   （`../../../../output/sample-lp-header-hero/comparison/index.html`）を含めて、
 *   検証時の作業ディレクトリ構成にべったり依存
 *
 * ▼ 位置づけ:
 * - Skill のワークフロー（Phase 0〜4）からは呼ばれない
 * - Skill 完成度の初期検証で「差分の出方を可視化する叩き台」として作成した
 *   使い捨てスクリプトを、参考情報として残しているだけ
 *
 * ▼ 他の入力画像で同種の分析をしたい場合:
 * - 本スクリプトはそのままでは動かない（少なくとも幅 / Y 座標 / 出力パスの全書き換えが必要）
 * - 汎用の Visual Critique 用途には `capture_preview.js` を使い、
 *   差分の観察は LLM による「間違い探し」（Phase 4）に任せるのが Skill の想定運用
 *
 * 汎用の Phase 4 スクリプトについては capture_preview.js を参照。
 */

const sharp = require('sharp');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(process.argv[2] || '../../../../output/sample-lp-header-hero-v2');
const COMP = path.join(ROOT, 'comparison');
const REF = path.join(ROOT, 'reference.png');
const PREV = path.join(ROOT, 'preview.png');
const HTML = path.join(ROOT, 'index.html');
const W = 1512;
const THRESHOLD = 28;

async function capturePreview() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 800, deviceScaleFactor: 1 });
  await page.goto(`file://${HTML}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)));
  await page.screenshot({ path: PREV, fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await browser.close();
  return h;
}

async function normalizeToCanvas(src, H) {
  return sharp(src)
    .resize({ width: W, height: H, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
}

async function findButtonRight(buf, width) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;
  const y = 48;
  let run = [];
  for (let x = width - 1; x >= 0; x--) {
    const i = (y * width + x) * C;
    const black = data[i] < 40 && data[i + 1] < 40 && data[i + 2] < 40;
    if (black) run.unshift(x);
    else if (run.length > 20) break;
  }
  return { left: run[0], right: run[run.length - 1], width: run.length, marginR: width - 1 - run[run.length - 1] };
}

async function findHeroEdges(buf, width) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;
  let l = 0;
  let r = 0;
  for (let x = 0; x < width; x++) {
    const i = (400 * width + x) * C;
    const v = data[i] + data[i + 1] + data[i + 2];
    const chroma = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    if (v < 720 && chroma > 15) {
      l = x;
      break;
    }
  }
  for (let x = width - 1; x >= 0; x--) {
    const i = (400 * width + x) * C;
    const v = data[i] + data[i + 1] + data[i + 2];
    const chroma = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    if (v < 720 && chroma > 15) {
      r = x;
      break;
    }
  }
  return { left: l, right: r, width: r - l, marginL: l, marginR: width - 1 - r };
}

async function titleLineWidths(buf, width) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;
  const lines = [
    [195, 246, 'Simple'],
    [287, 339, 'LP Design'],
  ];
  return lines.map(([y1, y2, name]) => {
    let l = width;
    let r = 0;
    for (let y = y1; y <= y2; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * C;
        if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
          l = Math.min(l, x);
          r = Math.max(r, x);
        }
      }
    }
    return { name, left: l, right: r, width: r - l };
  });
}

async function main() {
  fs.mkdirSync(COMP, { recursive: true });
  const previewHeight = await capturePreview();
  const refMeta = await sharp(REF).metadata();
  const H = Math.max(refMeta.height, previewHeight);

  const refBuf = await normalizeToCanvas(REF, H);
  const prevBuf = await normalizeToCanvas(PREV, H);
  await sharp(refBuf).toFile(path.join(COMP, 'ref-normalized.png'));
  await sharp(prevBuf).toFile(path.join(COMP, 'preview-normalized.png'));

  const refRaw = await sharp(refBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const prevRaw = await sharp(prevBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = refRaw.info;
  const diff = Buffer.alloc(width * height * 4);
  let diffPixels = 0;
  for (let i = 0; i < width * height; i++) {
    const ri = i * channels;
    const di = i * 4;
    const d = (Math.abs(refRaw.data[ri] - prevRaw.data[ri]) + Math.abs(refRaw.data[ri + 1] - prevRaw.data[ri + 1]) + Math.abs(refRaw.data[ri + 2] - prevRaw.data[ri + 2])) / 3;
    if (d > THRESHOLD) {
      diffPixels++;
      diff[di] = 255;
      diff[di + 1] = 0;
      diff[di + 2] = 0;
      diff[di + 3] = 180;
    }
  }
  await sharp(diff, { raw: { width, height, channels: 4 } }).png().toFile(path.join(COMP, 'diff-overlay.png'));
  const diffPct = ((diffPixels / (width * height)) * 100).toFixed(2);

  const refBtn = await findButtonRight(refBuf, W);
  const prevBtn = await findButtonRight(prevBuf, W);
  const refHero = await findHeroEdges(refBuf, W);
  const prevHero = await findHeroEdges(prevBuf, W);
  const refTitle = await titleLineWidths(refBuf, W);
  const prevTitle = await titleLineWidths(prevBuf, W);

  const v1DiffPct = process.argv[3] || '29.19';
  const improved = (parseFloat(v1DiffPct) - parseFloat(diffPct)).toFixed(2);

  const md = `# Header + Hero 差分分析（reference vs preview）

**比較条件**
- 入力: \`reference.png\`（1512×900）
- 出力: \`preview.png\`（1512×${previewHeight}）
- 正規化キャンバス: ${W}×${H}px
- 差分閾値: RGB 平均差 > ${THRESHOLD}
- **不一致: ${diffPct}%**${process.argv[3] ? `（前版: ${process.argv[3]}% → **${(parseFloat(process.argv[3]) - parseFloat(diffPct)).toFixed(2)}pt 改善**）` : ''}

重ね合わせ UI: [comparison/index.html](./index.html)

---

## v2 で実施した修正

| 項目 | v1 | v2 |
|---|---|---|
| Header 幅 | \`is--wrapper\` 72rem 制限 | **フル幅** + \`padding-inline: 1.625rem\` |
| Hero タイトル | \`4.5rem\` | **\`6.75rem\`** |
| タイトル行間 | \`0.06em\` | **\`0.38em\`** |
| Hero 画像幅 | \`66rem\` | **\`68.5rem\`（1096px）** |
| Hero 下余白 | \`11.5rem\`（ページ 822px） | **\`6.5rem\`（ページ ${previewHeight}px）** |
| CTA padding | \`s25\` | **\`s30\`** |

---

## 計測サマリー（1512px 基準）

| 要素 | reference | v2 preview | v1 preview（参考） |
|---|---|---|---|
| ページ高さ | 900px | **${previewHeight}px** | 822px |
| CTA 右端余白 | ${refBtn.marginR}px | **${prevBtn.marginR}px** | 301px |
| CTA 幅 | ${refBtn.width}px | **${prevBtn.width}px** | 90px |
| Hero 画像左余白 | ${refHero.marginL}px | **${prevHero.marginL}px** | 232px |
| Hero 画像右余白 | ${refHero.marginR}px | **${prevHero.marginR}px** | 228px |
| Hero 画像幅 | ${refHero.width}px | **${prevHero.width}px** | 1051px |
| 「Simple」幅 | ${refTitle[0].width}px | **${prevTitle[0].width}px** | 232px |
| 「LP Design」幅 | ${refTitle[1].width}px | **${prevTitle[1].width}px** | 341px |

---

## 残差（${diffPct}% 不一致の内訳）

1. **タイポグラフィ** — フォントメトリクス差（Web フォント vs デザイン画像）による文字幅・行間の微差
2. **Hero 画像** — 切り出し素材と reference のスケール・トリミング差
3. **text-shadow / グラデーション境界** — 抗锯齿・影のブレンド差
4. **CTA・ナビ** — 右端位置は大幅改善。ボタン形状・文字詰めに数 px 級の差が残る可能性
5. **タイトル** — サイズは reference に近づいたが、完全なピクセル一致には至らない

---

## 生成ファイル

| ファイル | 内容 |
|---|---|
| \`ref-normalized.png\` | reference 正規化 |
| \`preview-normalized.png\` | preview 正規化 |
| \`diff-overlay.png\` | 差分マスク（赤） |
| \`index.html\` | 重ね合わせビューア |
| \`analysis.md\` | 本レポート |
`;

  fs.writeFileSync(path.join(COMP, 'analysis.md'), md);

  const viewer = fs.readFileSync(path.resolve(__dirname, '../../../../output/sample-lp-header-hero/comparison/index.html'), 'utf8')
    .replace('sample-lp-header-hero/comparison', 'sample-lp-header-hero-v2/comparison');
  fs.writeFileSync(path.join(COMP, 'index.html'), viewer);

  console.log(JSON.stringify({
    previewHeight,
    canvas: `${W}x${H}`,
    diffPct,
    improved,
    ctaMarginR: { ref: refBtn.marginR, v2: prevBtn.marginR },
    titleSimple: { ref: refTitle[0].width, v2: prevTitle[0].width },
    titleLp: { ref: refTitle[1].width, v2: prevTitle[1].width },
    heroWidth: { ref: refHero.width, v2: prevHero.width },
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
