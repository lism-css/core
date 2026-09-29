import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// P1 で bin/build-css.js（compileSCSS）は共有コアへ統合された。
// compileCssTree が同等（`**/*.scss` を `_*` 除外で glob し autoprefixer + cssnano でコンパイル）。
import { compileCssTree } from '@lism-css/plugin/builder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LAYER_ORDER_PATTERN = /@layer\s+lism-base\s*,\s*lism-block\s*;/g;

// style.css は全コンポーネントの _style.css を結合するため、同じ順序宣言が重複する。先頭の1つだけ残す。
function dedupeLayerOrder(cssPath) {
  const css = fs.readFileSync(cssPath, 'utf8');

  let count = 0;
  const deduped = css.replace(LAYER_ORDER_PATTERN, (match) => (count++ === 0 ? match : ''));
  if (count === 0) {
    throw new Error(`[build-css] ${path.relative(__dirname, cssPath)} にレイヤー順序宣言が見つかりません`);
  }

  fs.writeFileSync(cssPath, deduped);
}

// デフォルトエクスポート（他から await 可能）
async function buildCSS() {
  // パス（絶対パスに変換）
  const scssDir = path.resolve(__dirname, './src');
  const distDir = path.resolve(__dirname, './dist/');

  await compileCssTree({ scssDir, distDir });
  dedupeLayerOrder(path.resolve(distDir, 'style.css'));
}

buildCSS();
