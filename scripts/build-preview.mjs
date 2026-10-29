#!/usr/bin/env node
// 単一テンプレを「サブパス配信用」にビルドするヘルパー（build-template-lang.mjs の一般化）。
//
// テンプレプレビュー集約サイト（templates.lism-css.com）では、各テンプレを
// `/<prefix>/` のサブパスに畳むため、ビルド時に base / site を上書きする必要がある。
// Astro / Vite はともに CLI フラグ（--base / --site）で config 値を上書きできるため、
// config ファイルを書き換えず CLI フラグで注入する（既存 `site:` キーとの競合や
// JS 正規表現置換の脆さを避けるための選択）。
//
// --base は Astro/Vite が生成するバンドル資産（/_astro/・/assets/）しか書き換えない。
// 手書きの絶対参照は rebase-html.mjs で別途 prefix を付与する。
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pagefind') {
      opts.pagefind = true;
    } else if (a.startsWith('--')) {
      const key = a.slice(2);
      opts[key] = argv[++i];
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const { pkg, stack, base, site, lang, out, pagefind } = opts;

if (!pkg || !stack || !base) {
  console.error(
    'Usage: node scripts/build-preview.mjs --pkg <name> --stack <astro|vite> --base </prefix/> [--site <url>] [--lang <lang>] [--pagefind] [--out <dir>]'
  );
  process.exit(1);
}

// 対象テンプレのディレクトリを解決（package.json の name でフィルタ）
let templateDir;
try {
  templateDir = execFileSync('pnpm', ['--filter', pkg, 'exec', 'pwd'], { encoding: 'utf-8' }).trim().split('\n').filter(Boolean).pop();
} catch {
  templateDir = undefined;
}
if (!templateDir || !existsSync(templateDir)) {
  console.error(`✗ パッケージ "${pkg}" のディレクトリを解決できませんでした`);
  process.exit(1);
}

// --lang 指定時のみ overlay を src へマージ（build 後に finally で確実に復元）
const srcDir = path.join(templateDir, 'src');
let backupDir;
if (lang) {
  const overlayDir = path.join(templateDir, '.lang', lang);
  if (!existsSync(overlayDir) || !statSync(overlayDir).isDirectory()) {
    console.error(`✗ ${path.relative(process.cwd(), overlayDir)} が見つかりません（"${pkg}" に "${lang}" の overlay がありません）`);
    process.exit(1);
  }
  backupDir = mkdtempSync(path.join(tmpdir(), 'lism-tpl-src-'));
  cpSync(srcDir, backupDir, { recursive: true });
  cpSync(overlayDir, templateDir, { recursive: true, force: true });
  console.log(`✓ ${pkg}: .lang/${lang} を src へマージしました`);
}

try {
  // base / site を CLI フラグで注入してビルド（cwd はテンプレディレクトリ）
  if (stack === 'astro') {
    const args = ['--filter', pkg, 'exec', 'astro', 'build', '--base', base];
    if (site) args.push('--site', site);
    execFileSync('pnpm', args, { stdio: 'inherit' });
    // techlog 等の検索用 Pagefind インデックスは astro build 後に dist を対象に生成する
    if (pagefind) {
      execFileSync('pnpm', ['--filter', pkg, 'exec', 'pagefind', '--site', 'dist'], { stdio: 'inherit' });
    }
  } else if (stack === 'vite') {
    execFileSync('pnpm', ['--filter', pkg, 'exec', 'vite', 'build', '--base', base], { stdio: 'inherit' });
  } else {
    throw new Error(`未対応の stack: ${stack}`);
  }
  console.log(`✓ ${pkg}: base=${base} でビルドしました`);

  // dist を --out へ取り出す（集約サイトの配置先は呼び出し側が決める）
  if (out) {
    const distDir = path.join(templateDir, 'dist');
    if (!existsSync(distDir)) {
      throw new Error(`dist が見つかりません: ${distDir}`);
    }
    rmSync(out, { recursive: true, force: true });
    mkdirSync(path.dirname(out), { recursive: true });
    cpSync(distDir, out, { recursive: true });
    console.log(`✓ ${pkg}: dist → ${out}`);
  }
} finally {
  if (backupDir) {
    // overlay マージした src を元の状態へ復元
    rmSync(srcDir, { recursive: true, force: true });
    cpSync(backupDir, srcDir, { recursive: true });
    rmSync(backupDir, { recursive: true, force: true });
    console.log(`✓ ${pkg}: src を復元しました`);
  }
}
