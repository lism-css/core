#!/usr/bin/env tsx
// テンプレプレビューを単一 Cloudflare Pages（lism-templates）へ集約するための
// merged ツリーを構築するオーケストレーター。
//
// templates/manifest.ts の TEMPLATES を Single Source of Truth として「ビルド単位」へ展開し、
// 各単位を build-preview.mjs（base/site 注入ビルド）→ rebase-html.mjs（手書き絶対参照の prefix 付与）
// に通して `.preview/merged/<dest>/` へ配置する。最後に全体 noindex の `_headers` を出力する。
//
// 配信パス設計（PR の決定事項どおり）:
//   - project                           : /{slug}/        （en overlay があれば /{slug}/en/ も）
//   - single-project-variant（lp/astro）: /{prefix}/      （en は dist 同梱の /{prefix}/en/...）
//     prefix = sourcePath.replace('/', '-')（lp/astro → lp-astro）
//   - draft variant は merged から除外する
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, mkdirSync, existsSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// ルートに "type": "module" が無く tsx は manifest.ts を CommonJS として読み込むため、
// named import (TEMPLATES) は ESM 名前空間に展開されない。default(= module.exports)経由で取得する。
import manifestModule from '../templates/manifest.ts';

const TEMPLATES = manifestModule.TEMPLATES;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const MERGED = path.join(ROOT, '.preview', 'merged');

// 集約サイトのホスト名。sitemap / canonical に使われる（noindex なので実害は無いが正しく付与する）
const SITE = 'https://templates.lism-css.com';

// ランディング（merged/index.html）は Lism CSS 本体を使って組む。
// packages/lism-css の dist を merged ルートへコピーし、この相対パスで配信する。
const LISM_CSS_SRC = path.join(ROOT, 'packages', 'lism-css', 'dist', 'css', 'main.css');
const LISM_CSS_HREF = '/lism.css';

// --landing-only: 既存の merged を再利用し、各テンプレのビルドをスキップして
// ランディング（index.html + lism.css）だけを高速に再生成するモード。
// 一度フルビルドで merged を作っていれば、以降のランディング調整はこれで一瞬で反映できる。
const landingOnly = process.argv.includes('--landing-only');

// テンプレの package.json から name と build スクリプトを読む（pagefind 有無の判定に使う）
function readPkg(sourcePath) {
  const pkg = JSON.parse(readFileSync(path.join(TEMPLATES_DIR, sourcePath, 'package.json'), 'utf-8'));
  return { name: pkg.name, build: pkg.scripts?.build ?? '' };
}

// --- ランディング（merged/index.html）生成 ---------------------------------

// カテゴリの表示順とラベル（docs の categories と揃える）
const CATEGORY_ORDER = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'blog', label: 'Blog' },
  { id: 'lp', label: 'LP' },
  { id: 'web', label: 'Web' },
];

// stack 表示ラベル（docs の stackLabels と揃える）
const STACK_LABELS = { astro: 'Astro', next: 'Next.js', vite: 'Vite + React' };

// テンプレ定義から ja / en の配信パスを導出（build-previews のパス設計と対）。
function previewPaths(t) {
  if (t.kind === 'single-project-variant') {
    const prefix = t.sourcePath.replace(/\//g, '-');
    return { jaPath: `/${prefix}/${t.variant}/`, enPath: `/${prefix}/en/${t.variant}/` };
  }
  return { jaPath: `/${t.slug}/`, enPath: `/${t.slug}/en/` };
}

// 実際に merged へ出力された index.html の有無で掲載カードを集める（カテゴリ別）。
function collectLandingCards() {
  const byCat = new Map();
  for (const t of TEMPLATES) {
    if (t.draft) continue;
    const paths = previewPaths(t);
    if (!existsSync(path.join(MERGED, paths.jaPath, 'index.html'))) continue; // 未配信は載せない
    const enExists = existsSync(path.join(MERGED, paths.enPath, 'index.html'));
    const card = { title: t.title.ja, stack: t.stack, jaPath: paths.jaPath, ...(enExists ? { enPath: paths.enPath } : {}) };
    const arr = byCat.get(t.category) ?? [];
    arr.push(card);
    byCat.set(t.category, arr);
  }
  return byCat;
}

function renderLandingHtml(byCat) {
  const sections = CATEGORY_ORDER.filter((c) => byCat.has(c.id)).map((c) => {
    const cards = byCat
      .get(c.id)
      .map((card) => {
        const stack = STACK_LABELS[card.stack] ?? card.stack;
        // EN ボタン（副）: 枠線 + ブランド文字。en 配信がある時だけ出す
        const enLink = card.enPath
          ? `<a class="-c:brand -fz:s -fw:bold -ta:center -td:none -bd -bdc:brand -bdrs:10 -fx:1 -px:20 -py:10 has--transition -hov:-bgc" href="${card.enPath}">EN</a>`
          : '';
        const jaLink = `<a class="-c:base -bgc:brand -fz:s -fw:bold -ta:center -td:none -bdrs:10 -fx:1 -px:20 -py:10 has--transition -hov:-bgc" href="${card.jaPath}">JA</a>`;
        return `<li class="l--stack -g:20 -p:20 -bgc:base -bd -bdrs:20">
            <div class="l--cluster -jc:between -g:15">
              <span class="-fw:bold">${card.title}</span>
              <span class="-fxsh:0 -whs:nowrap -fz:2xs -hl:xs -c:text-2 -bd -bdrs:99 -px:10 -py:5">${stack}</span>
            </div>
            <div class="l--cluster -g:15">
              ${jaLink}${enLink}
            </div>
          </li>`;
      })
      .join('\n');
    return `<section class="l--stack -g:20">
        <h2 class="-fz:l -fw:bold -bd-b -pbe" style="--pbe: var(--s15)">${c.label}</h2>
        <ul class="l--autoColumns -g:20" style="--cols: 16em">
${cards}
        </ul>
      </section>`;
  });
  const total = [...byCat.values()].reduce((n, arr) => n + arr.length, 0);

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Lism CSS Templates — Preview</title>
<link rel="stylesheet" href="${LISM_CSS_HREF}">
</head>
<body>
  <div class="l--stack -mx:auto -max-sz:m -g:50 -px:30 -py:50">
    <header class="l--stack -g:15">
      <p class="-c:brand -fz:s -fw:bold -lts:xl -tt:uppercase">Lism CSS</p>
      <h1 class="-fz:4xl -fw:bold">Templates Preview</h1>
      <p class="-c:text-2">Lism CSS で構築したテンプレートのライブプレビュー集。各テンプレートは <code class="-ff:mono -fz:s -px:5 -bdrs:10 -bgc:base-2">npm create lism@latest</code> から生成できます。</p>
    </header>
    <main class="l--stack -g:50">
${sections.join('\n')}
    </main>
    <footer class="l--cluster -g:20 -c:text-2 -fz:s -bd-t -pbs" style="--pbs: var(--s30)">
      <a class="-c:brand -td:none -hov:underline" href="https://lism-css.com/">lism-css.com →</a>
    </footer>
  </div>
</body>
</html>
`;
}

// merged/index.html を出力する。Lism CSS 本体（main.css）も merged ルートへコピーする。
function writeLanding() {
  // ランディングは Lism CSS で組んでいるため、本体 CSS を /lism.css として同梱する。
  if (!existsSync(LISM_CSS_SRC)) {
    throw new Error(`lism-css の main.css が見つかりません: ${path.relative(ROOT, LISM_CSS_SRC)}（先に pnpm build:core を実行してください）`);
  }
  copyFileSync(LISM_CSS_SRC, path.join(MERGED, 'lism.css'));

  const byCat = collectLandingCards();
  const html = renderLandingHtml(byCat);
  writeFileSync(path.join(MERGED, 'index.html'), html, 'utf-8');
  const total = [...byCat.values()].reduce((n, arr) => n + arr.length, 0);
  console.log(`✓ ランディングを生成: index.html + lism.css（${total} テンプレを掲載）`);
}

const units = [];

// --- project: slug ごとに 1 ユニット（en overlay があれば en も） ---
for (const t of TEMPLATES) {
  if (t.kind === 'single-project-variant') continue;
  if (t.draft) continue; // 単独 draft は配信しない
  if (t.stack !== 'astro' && t.stack !== 'vite') {
    console.warn(`⚠ skip ${t.slug}: stack="${t.stack}" は build-previews 未対応`);
    continue;
  }
  const { name, build } = readPkg(t.sourcePath);
  const pagefind = /pagefind/.test(build);
  units.push({ pkg: name, stack: t.stack, base: `/${t.slug}/`, rebasePrefix: `/${t.slug}`, dest: t.slug, pagefind });
  const enOverlay = 'langOverlays' in t ? t.langOverlays?.en : undefined;
  if (enOverlay) {
    units.push({ pkg: name, stack: t.stack, base: `/${t.slug}/en/`, rebasePrefix: `/${t.slug}/en`, dest: `${t.slug}/en`, lang: 'en', pagefind });
  }
}

// --- single-project-variant: sourcePath で dedupe して 1 ビルド（en は dist 同梱） ---
const variantGroups = new Map();
for (const t of TEMPLATES) {
  if (t.kind !== 'single-project-variant') continue;
  const stack = t.stack === 'vite' ? 'vite' : 'astro';
  let g = variantGroups.get(t.sourcePath);
  if (!g) {
    g = { stack, draftVariants: [] };
    variantGroups.set(t.sourcePath, g);
  }
  if (t.draft) g.draftVariants.push(t.variant);
}
for (const [sourcePath, g] of variantGroups) {
  const { name, build } = readPkg(sourcePath);
  const prefix = sourcePath.replace(/\//g, '-');
  units.push({
    pkg: name,
    stack: g.stack,
    base: `/${prefix}/`,
    rebasePrefix: `/${prefix}`,
    dest: prefix,
    pagefind: /pagefind/.test(build),
    draftVariants: g.draftVariants,
  });
}

// --- merged を作り直して各ユニットを構築（--landing-only 時はスキップ）---
if (landingOnly) {
  // 既存 merged を前提にランディングだけ差し替える。merged が無ければ案内して中断。
  if (!existsSync(MERGED)) {
    throw new Error(
      '.preview/merged が見つかりません。先に通常の `tsx scripts/build-previews.mjs` を実行してください（--landing-only は既存 merged の再利用が前提です）。'
    );
  }
  console.log(`\n=== build-previews --landing-only: 既存 merged のランディングのみ再生成 → ${path.relative(ROOT, MERGED)} ===\n`);
} else {
  rmSync(MERGED, { recursive: true, force: true });
  mkdirSync(MERGED, { recursive: true });

  console.log(`\n=== build-previews: ${units.length} ユニットを構築 → ${path.relative(ROOT, MERGED)} ===\n`);

  for (const u of units) {
    const out = path.join(MERGED, u.dest);
    console.log(`\n──────── ${u.dest} (pkg=${u.pkg}, base=${u.base}) ────────`);

    const buildArgs = ['scripts/build-preview.mjs', '--pkg', u.pkg, '--stack', u.stack, '--base', u.base, '--site', SITE, '--out', out];
    if (u.lang) buildArgs.push('--lang', u.lang);
    if (u.pagefind) buildArgs.push('--pagefind');
    execFileSync('node', buildArgs, { stdio: 'inherit', cwd: ROOT });

    execFileSync('node', ['scripts/rebase-html.mjs', out, u.rebasePrefix], { stdio: 'inherit', cwd: ROOT });

    // draft variant を merged から除外（ja / en 両方を対象に。存在しなくても無害）
    for (const v of u.draftVariants ?? []) {
      rmSync(path.join(out, v), { recursive: true, force: true });
      rmSync(path.join(out, 'en', v), { recursive: true, force: true });
      console.log(`✓ draft variant を除外: ${u.dest}/${v}`);
    }
  }
}

// --- ルートランディング（全テンプレ一覧）を merged ルートへ出力 ---
// `/` の 404 を解消し、各テンプレの ja / en プレビューへの入口を 1 枚にまとめる。
// manifest を SSOT にしつつ、実際に merged へ出力された index.html の有無で掲載可否を判定するため、
// draft 除外や en 未配信のテンプレを取りこぼさず正確に反映できる。
writeLanding();

// --- 全体 noindex の _headers を merged ルートへ出力 ---
execFileSync('node', ['scripts/write-noindex-headers.mjs', MERGED], { stdio: 'inherit', cwd: ROOT });

console.log(
  landingOnly
    ? `\n✓ 完了: ${path.relative(ROOT, MERGED)} のランディングを再生成しました（--landing-only）\n`
    : `\n✓ 完了: ${path.relative(ROOT, MERGED)} に ${units.length} ユニットを集約しました\n`
);
