#!/usr/bin/env node
// 言語別テンプレ overlay（.lang/<lang>/）を一時的に src へマージしてビルドするヘルパー。
// `lism-cli create --lang <lang>` と同じ overlay マージをローカルで再現する用途。
//
// build 後に src を元へ復元するので作業ツリーは汚れない。dist には指定言語の出力が残る。
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [pkg, lang] = process.argv.slice(2);

if (!pkg || !lang) {
  console.error('Usage: node scripts/build-template-lang.mjs <package-name> <lang>');
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

const overlayDir = path.join(templateDir, '.lang', lang);
if (!existsSync(overlayDir) || !statSync(overlayDir).isDirectory()) {
  console.error(`✗ ${path.relative(process.cwd(), overlayDir)} が見つかりません（"${pkg}" に "${lang}" の overlay がありません）`);
  process.exit(1);
}

// overlay は src 配下のみを差し替える規約。src を丸ごと退避し、build 後に確実に戻す。
const srcDir = path.join(templateDir, 'src');
const backupDir = mkdtempSync(path.join(tmpdir(), 'lism-tpl-src-'));
cpSync(srcDir, backupDir, { recursive: true });

try {
  // .lang/<lang>/ の中身（src/...）を src 側へ上書きマージ（CLI の overlay マージ相当）
  cpSync(overlayDir, templateDir, { recursive: true, force: true });
  console.log(`✓ ${pkg}: .lang/${lang} を src へマージしました`);

  // 通常の build:template と同じく turbo 経由（^build で依存パッケージのビルド順も担保）
  execFileSync('pnpm', ['exec', 'turbo', 'run', 'build', `--filter=${pkg}`], { stdio: 'inherit' });
} finally {
  // src を元の状態へ復元（.lang は build に影響しないので触らない）
  rmSync(srcDir, { recursive: true, force: true });
  cpSync(backupDir, srcDir, { recursive: true });
  rmSync(backupDir, { recursive: true, force: true });
  console.log(`✓ ${pkg}: src を復元しました`);
}

console.log(`\n次のコマンドで ${lang} 版を確認できます:\n  nr preview:template ${pkg}\n`);
