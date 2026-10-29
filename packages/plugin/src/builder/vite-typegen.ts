/**
 * 起動時とconfig変更時に`.d.ts`を同期するViteラッパー。
 * 実処理はbundler非依存の`./typegen`が担う。
 * Astro の `astro check`（型チェック）は本プラグインを動かさないため、コミット済み生成ファイルが型チェックの拠り所になる。
 */
import type { Plugin } from 'vite';

import { findUserConfigPath } from './load-config';
import { syncLismEnvDts } from './typegen';
import { normalizePath } from './normalize-path';

export interface LismTypegenOptions {
  disabled?: boolean;
  configPath?: string;
}

/** dev・build起動時に型を同期し、dev中のconfig変更にも追従する。 */
export function lismTypegen(options: LismTypegenOptions = {}): Plugin {
  let root = '';
  let userConfigPath: string | null = null;
  return {
    name: 'lism-css:typegen',
    enforce: 'pre',
    configResolved(c) {
      root = c.root;
    },
    async buildStart() {
      if (options.disabled) return;
      userConfigPath = findUserConfigPath(root || process.cwd(), options.configPath);
      await syncLismEnvDts(root || process.cwd(), { configPath: options.configPath });
    },
    // dynamic-css / config-aliasのfull-reloadとは別に型生成を追従させる必要がある。
    // writeLismEnvDtsは内容不変なら書かないためHMRループにはならない。
    async handleHotUpdate(ctx) {
      if (options.disabled || !userConfigPath) return;
      if (normalizePath(ctx.file) !== normalizePath(userConfigPath)) return;
      await syncLismEnvDts(root || process.cwd(), { configPath: options.configPath });
    },
  };
}

export default lismTypegen;
