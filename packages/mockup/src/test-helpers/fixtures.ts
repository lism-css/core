/**
 * テスト用のデータディレクトリ生成ヘルパー。
 *
 * 同梱ビューアの実装に依存させないため、ここに最小 fixture（`viewer/`）を置く。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCHEMA_VERSION } from '../core/types.js';

const createdDirs: string[] = [];

/** 一時ディレクトリを作る（`cleanupTempDirs()` でまとめて削除する）。 */
export function createTempDir(prefix = 'lism-mockup-test-'): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  createdDirs.push(dir);
  return dir;
}

/** 相対パス → 内容 のマップからファイルを書き出す。 */
export function writeFiles(dir: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(dir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf-8');
  }
}

/** 一時データディレクトリを作ってファイルを書き出す。 */
export function createDataDir(files: Record<string, string>): string {
  const dir = createTempDir();
  writeFiles(dir, files);
  return dir;
}

/**
 * プロジェクト側にインストール済みのパッケージを模して `node_modules/<name>/` を作る
 * （`mockup.config.json` の `imports` で宣言する追加パッケージのテスト用）。
 */
export function installFakePackage(projectDir: string, name: string, files: Record<string, string>): void {
  writeFiles(
    projectDir,
    Object.fromEntries(Object.entries(files).map(([relative, content]) => [path.join('node_modules', ...name.split('/'), relative), content]))
  );
}

/** 作成した一時ディレクトリをすべて削除する。 */
export function cleanupTempDirs(): void {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (!dir) continue;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // 後片付けの失敗はテスト結果に影響させない。
    }
  }
}

/** テスト用の最小ビューア（vite root）。 */
export function getFixtureViewerDir(): string {
  return path.join(path.resolve(fileURLToPath(new URL('.', import.meta.url))), 'viewer');
}

export const MOCKUP_CONFIG = `${JSON.stringify({ schemaVersion: SCHEMA_VERSION }, null, 2)}\n`;

/** import を持たない最小ページ（bundle 検証を速く済ませたいテスト用）。 */
export const PLAIN_PAGE = `export default function Page() {\n  return <div className="p-4">hello</div>;\n}\n`;
