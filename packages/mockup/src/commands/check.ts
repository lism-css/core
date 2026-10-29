/**
 * `lism-mockup check` … 非対話の検証（エージェントの自己確認用）。
 *
 * 保証するのは3点まで。
 * 1. `mockup.config.json` / `tokens.json` のスキーマ検証
 * 2. import 境界検証（`dev` と同一のプラグイン）
 * 3. 全ページの bundle 成功（`build.write: false` でファイルは書き出さない）
 *
 * render 時エラー（default export が React コンポーネントでない・初回 render の例外等）は対象外で、
 * 人間の `dev` ブラウザ確認に残す。
 */
import pc from 'picocolors';
import { build } from 'vite';

import { getViewerDir } from '../core/paths.js';
import { prepareMockRuntime } from '../core/runtime.js';
import { MockupContractError, type MockupData } from '../core/types.js';
import { createImportAllowlist, createMockViteConfig } from '../vite/config.js';
import { describeMissingLucideExport } from '../vite/lucide-icons.js';
import { warnMissingStandardPackages } from './diagnostics.js';

export interface CheckCommandOptions {
  viewerDir?: string;
}

function toCheckError(error: unknown): MockupContractError {
  if (error instanceof MockupContractError) return error;

  const err = error as { message?: string; id?: string; frame?: string; loc?: { file?: string; line?: number; column?: number } };
  const file = err.loc?.file ?? err.id;
  const position = err.loc?.line !== undefined ? `:${err.loc.line}${err.loc.column !== undefined ? `:${err.loc.column}` : ''}` : '';
  const parts = [describeMissingLucideExport(error) ?? err.message ?? String(error)];
  if (err.frame) parts.push(err.frame);

  return new MockupContractError(parts.join('\n'), { file: file ? `${file}${position}` : undefined });
}

function countTokens(tokens: MockupData['tokens']): number {
  return Object.values(tokens).reduce((total, group) => total + Object.keys(group).length, 0);
}

function printSummary(data: MockupData): void {
  const darkCount = countTokens(data.darkTokens);

  console.log(pc.green('[lism-mockup] check passed'));
  console.log(pc.dim(`  data directory: ${data.dataDir}`));
  console.log(pc.dim(`  pages: ${data.pages.length} (${data.pages.map((page) => page.id).join(', ')})`));
  console.log(pc.dim(`  tokens: ${countTokens(data.tokens)} override(s)`));
  if (darkCount > 0) console.log(pc.dim(`  dark tokens: ${darkCount} override(s)`));
}

export async function checkCommand(dir: string, options: CheckCommandOptions = {}): Promise<void> {
  const runtime = await prepareMockRuntime(dir);
  try {
    // node_modules走査を重ねないため、許可リストはVite設定と共有する。
    const allowlist = createImportAllowlist(runtime);
    warnMissingStandardPackages(allowlist.missingPackages);

    await build(createMockViteConfig({ runtime, viewerDir: options.viewerDir ?? getViewerDir(), mode: 'build', allowlist }));
  } catch (error) {
    throw toCheckError(error);
  } finally {
    runtime.cleanup();
  }

  printSummary(runtime.data);
}
