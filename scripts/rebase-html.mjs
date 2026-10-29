#!/usr/bin/env node
// サブパス配信用に、dist 内 HTML/CSS の「手書き絶対参照」へ prefix を付与するヘルパー。
//
// Astro/Vite の `--base` は自分が生成するバンドル資産（/_astro/・/assets/）しか書き換えない。
// テンプレ側に手書きされた絶対リンク（<a href="/posts/">）や public 資産参照（/favicon.svg・
// /logo-black.svg 等）はそのまま残るため、ビルド後に prefix を付けてサブパスへ寄せる。
//
// 対象は HTML / CSS のみ。JS は実行時に URL を組むため静的置換の対象外（実行時に組む絶対 URL は
// 低リスクとして、デプロイ後に目視確認する）。
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const [distDir, prefixArg] = process.argv.slice(2);

if (!distDir || !prefixArg) {
  console.error('Usage: node scripts/rebase-html.mjs <distDir> <prefix>');
  process.exit(1);
}
if (!prefixArg.startsWith('/') || prefixArg.endsWith('/')) {
  console.error(`✗ prefix は先頭 "/" あり・末尾 "/" 無しで指定してください（受領: "${prefixArg}"）`);
  process.exit(1);
}

const prefix = prefixArg;

// 絶対パス1個を prefix 付きへ書き換える。既に prefix 配下・プロトコル相対(//)・
// データURI 等は対象外（ここに来る p は必ず単一 "/" 始まりのものだけ）。
function rebasePath(p) {
  if (p === '/') return `${prefix}/`;
  if (p === prefix || p.startsWith(`${prefix}/`)) return p; // base で既に書き換え済み（/_astro/ 等）
  return `${prefix}${p}`;
}

// href/src 属性（"/..." または '/...'。"//" は除外）
function rewriteHrefSrc(html) {
  return html.replace(/\b(href|src)=(["'])(\/(?!\/)[^"']*)\2/g, (_m, attr, q, val) => `${attr}=${q}${rebasePath(val)}${q}`);
}

// srcset 属性（"url descriptor, url descriptor, ..."）
function rewriteSrcset(html) {
  return html.replace(/\bsrcset=(["'])([^"']*)\1/g, (m, q, list) => {
    const rebased = list
      .split(',')
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return entry;
        const [url, ...rest] = trimmed.split(/\s+/);
        if (!url.startsWith('/') || url.startsWith('//')) return entry;
        return [rebasePath(url), ...rest].join(' ');
      })
      .join(', ');
    return `srcset=${q}${rebased}${q}`;
  });
}

// CSS / インラインスタイルの url(/...)（クォート有無どちらも）
function rewriteCssUrls(text) {
  return text.replace(/url\(\s*(['"]?)(\/(?!\/)[^"')]*)\1\s*\)/g, (_m, q, val) => `url(${q}${rebasePath(val)}${q})`);
}

function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  const original = readFileSync(file, 'utf-8');
  let next = original;
  if (ext === '.html') {
    next = rewriteHrefSrc(next);
    next = rewriteSrcset(next);
    next = rewriteCssUrls(next); // インライン <style> / style="" 内の url()
  } else if (ext === '.css') {
    next = rewriteCssUrls(next);
  } else {
    return false;
  }
  if (next !== original) {
    writeFileSync(file, next, 'utf-8');
    return true;
  }
  return false;
}

function walk(dir) {
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      count += walk(full);
    } else if (st.isFile()) {
      if (processFile(full)) count++;
    }
  }
  return count;
}

const changed = walk(distDir);
console.log(`✓ rebase-html: ${path.relative(process.cwd(), distDir)} を prefix "${prefix}" で書き換え（${changed} ファイル更新）`);
