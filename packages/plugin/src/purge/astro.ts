import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { extractLismClasses } from './extract';
import { purgeLismCss, type KnownSelectorSet, type SafelistEntry } from './core';
import type { LismPurgeOptions } from './options';
import { LISM_CSS_SIGNATURE, formatReport, hasCssSourceMappingUrl, resolveKnownSelectors, stripCssSourceMappingUrl } from './shared';

export type { LismPurgeOptions } from './options';
export type { KnownSelectorSet } from './core';

const SCAN_EXT = /\.(html?|js|mjs|cjs)$/;
const CLIENT_ONLY_ISLAND = /<astro-island(?=[\s>])(?:[^"'<>]|"[^"]*"|'[^']*')*?\sclient\s*=\s*(?:"only"|'only'|only(?=[\s>]))/i;
const CSS_EXT = /\.css$/;
// 参照更新の対象拡張子: HTML / JS / JSON manifest / sourcemap / RSS など、文字列で参照を持ち得るもの
const REF_EXT = /\.(html?|js|mjs|cjs|json|txt|xml|map)$/;
// `theme.mobile.css`などを誤認しないよう、Astro/Viteのhashを8文字に限定する（#496）。
const HASHED_CSS_NAME = /^(.+)\.([A-Za-z0-9_-]{8})\.css$/;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      try {
        const st = await stat(full);
        if (st.isDirectory()) yield* walk(full);
        else if (st.isFile()) yield full;
      } catch {
        // broken symlink: skip
      }
    } else if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function shortContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function isNoEntryError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

async function deleteStaleCssMap(file: string): Promise<void> {
  try {
    await unlink(`${file}.map`);
  } catch (error) {
    if (!isNoEntryError(error)) throw error;
  }
}

interface RenameInfo {
  oldBase: string;
  newBase: string;
}

async function purgeCssFiles(
  cssFiles: string[],
  used: Set<string>,
  safelist: SafelistEntry[] | undefined,
  known: KnownSelectorSet | undefined
): Promise<{ renames: RenameInfo[]; beforeBytes: number; afterBytes: number }> {
  const renames: RenameInfo[] = [];
  let beforeBytes = 0;
  let afterBytes = 0;

  for (const file of cssFiles) {
    const source = await readFile(file, 'utf8');
    if (!LISM_CSS_SIGNATURE.test(source)) continue;
    const purged = purgeLismCss(source, { used, safelist, known });
    // purge差分もsourcemap参照も無ければ、末尾空白だけでrenameやhash再計算が走らないよう素通しする。
    if (purged === source && !hasCssSourceMappingUrl(source)) continue;
    const output = stripCssSourceMappingUrl(purged);

    beforeBytes += Buffer.byteLength(source);
    afterBytes += Buffer.byteLength(output);

    const oldBase = basename(file);
    const match = HASHED_CSS_NAME.exec(oldBase);
    if (match) {
      // 参照側 (HTML/JS/manifest) も後段で同期して書き換える。
      const newHash = shortContentHash(output);
      const newBase = `${match[1]}.${newHash}.css`;
      if (newBase !== oldBase) {
        const newPath = join(dirname(file), newBase);
        await writeFile(newPath, output, 'utf8');
        await unlink(file);
        renames.push({ oldBase, newBase });
      } else {
        await writeFile(file, output, 'utf8');
      }
    } else {
      await writeFile(file, output, 'utf8');
    }
    await deleteStaleCssMap(file);
  }
  return { renames, beforeBytes, afterBytes };
}

async function updateReferences(distPaths: string[], renames: RenameInfo[]): Promise<void> {
  if (renames.length === 0) return;
  for (const distPath of distPaths) {
    for await (const file of walk(distPath)) {
      if (!REF_EXT.test(file)) continue;
      let content = await readFile(file, 'utf8');
      let changed = false;
      for (const { oldBase, newBase } of renames) {
        if (content.includes(oldBase)) {
          content = content.split(oldBase).join(newBase);
          changed = true;
        }
      }
      if (changed) await writeFile(file, content, 'utf8');
    }
  }
}

export function lismPurgeAstro(options: LismPurgeOptions = {}): AstroIntegration {
  const safelist: SafelistEntry[] | undefined = options.safelist;
  const report = options.report ?? false;
  // server ビルド時の server 出力ディレクトリ。`astro:config:done` で確定する。
  let serverDir: URL | undefined;

  return {
    name: 'lism-css:purge',
    hooks: {
      'astro:config:done': ({ config, buildOutput }) => {
        // SSR用classとmanifestを拾うため、serverビルドではserver出力も走査する（#492）。
        if (buildOutput === 'server') serverDir = config.build.server;
      },
      // SSGの最終HTMLを拾うため、build完了後にdistをpurgeしてhashと参照を同期する。
      'astro:build:done': async ({ dir, logger }) => {
        // known は build 実行時に解決する（関数形式の遅延解決にも対応）。
        const known = resolveKnownSelectors(options.known);
        const distPaths = [fileURLToPath(dir)];
        if (serverDir) {
          const serverPath = fileURLToPath(serverDir);
          if (!distPaths.includes(serverPath)) distPaths.push(serverPath);
        }
        const used = new Set<string>();
        const cssFiles: string[] = [];
        let hasClientOnly = false;

        for (const distPath of distPaths) {
          for await (const file of walk(distPath)) {
            if (SCAN_EXT.test(file)) {
              const source = await readFile(file, 'utf8');
              extractLismClasses(source, used);
              if (/\.html?$/.test(file) && CLIENT_ONLY_ISLAND.test(source)) hasClientOnly = true;
            } else if (CSS_EXT.test(file)) {
              cssFiles.push(file);
            }
          }
        }

        if (hasClientOnly) {
          logger.warn(
            'CSS Purge detected client:only islands. Classes generated from Lism props at runtime cannot be detected, even with static prop values. Keep all required classes with safelist or disable purge. See https://lism-css.com/en/docs/customize/purge/'
          );
        }

        const { renames, beforeBytes, afterBytes } = await purgeCssFiles(cssFiles, used, safelist, known);
        await updateReferences(distPaths, renames);

        if (report && beforeBytes > 0) {
          logger.info(formatReport(beforeBytes, afterBytes));
        }
      },
    },
  };
}
