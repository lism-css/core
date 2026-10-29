/**
 * サイトマップ lastmod 用ユーティリティ
 * 事前生成された lastmod-map.json を読み込み、URL→ISO日時文字列 のマップを返す
 *
 * JSON の生成: pnpm generate:lastmod（scripts/generate-lastmod-map.ts）
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JSON_PATH = resolve(DOCS_ROOT, 'lastmod-map.json');

export function loadLastmodMap(): Map<string, string> {
  try {
    const raw = readFileSync(JSON_PATH, 'utf-8');
    const data = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(data));
  } catch {
    console.warn('[sitemap-lastmod] lastmod-map.json が見つかりません。lastmod はスキップされます。');
    return new Map();
  }
}
