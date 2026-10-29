/**
 * CDN URL のバージョン番号を packages/lism-css/package.json の version に同期するスクリプト
 *
 * Usage: pnpm sync:cdn-versions
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const pkgJsonPath = resolve(ROOT, 'packages/lism-css/package.json');
const { version } = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

const targets = [
  'apps/site/src/content/ja/installation.mdx',
  'apps/site/src/content/ja/base-styles.mdx',
  'apps/site/src/content/ja/overview.mdx',
  'apps/site/src/content/en/installation.mdx',
  'apps/site/src/content/en/base-styles.mdx',
  'apps/site/src/content/en/overview.mdx',
  'README.md',
  'README.ja.md',
  'packages/lism-css/README.md',
  'packages/lism-css/README.ja.md',
];

// cdn.jsdelivr.net/npm/lism-css or lism-css@x.y.z → lism-css@{version}
const pattern = /(cdn\.jsdelivr\.net\/npm\/lism-css)(@[^/]+)?(\/dist\/)/g;
const replacement = `$1@${version}$3`;

let updatedCount = 0;

for (const rel of targets) {
  const filePath = resolve(ROOT, rel);
  const original = readFileSync(filePath, 'utf-8');
  const updated = original.replace(pattern, replacement);

  if (original !== updated) {
    writeFileSync(filePath, updated, 'utf-8');
    updatedCount++;
    console.log(`Updated: ${rel}`);
  } else {
    console.log(`No change: ${rel}`);
  }
}

console.log(`\nDone. ${updatedCount} file(s) updated to lism-css@${version}`);
