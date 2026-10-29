// パッケージ自身の CSS ビルド（tsx 実行）。
// 同梱デフォルトの prop-config を更新しつつ src/scss → dist/css をコンパイルする。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @lism-css/plugin/builder は plugin の dist ビルドを要求するため、core CSS ビルドではモノレポ内ソースを直接読む。
import { writePropConfigFiles, compileCssTree, computeBuildConfigs } from '../../plugin/src/builder/index.ts';
import { CONFIG } from '../config/index.ts';
import { objDeepMerge } from '../config/helper.ts';
import propsFull from '../config/presets/props-full.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scssDir = path.resolve(__dirname, '../src/scss');
const distDir = path.resolve(__dirname, '../dist/css');

const { mainConfig, fullConfig } = computeBuildConfigs({
  defaultConfig: CONFIG,
  propsFull,
  userConfig: {},
  objDeepMerge,
});

// 同梱デフォルトの _prop-config.gen.scss / _prop-config-full.gen.scss を更新する。
// これらは素の sass 利用（@use 'lism-css/scss/setting' 等）が `@use './prop-config.gen'` で読む実ファイル。
// main/full のマージ順は CLI/Vite と同じ computeBuildConfigs に揃える。
writePropConfigFiles({
  scssDir,
  mainConfig,
  fullConfig,
});

// src/scss を直接コンパイル（prop-config はディスク実ファイルを参照）。
await compileCssTree({ scssDir, distDir });
