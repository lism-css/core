import { confirm } from '@inquirer/prompts';
import { findConfigFile, writeFreshConfig, type LismCliConfig } from '../config.js';
import { promptUiConfig } from './ui/promptUiConfig.js';
import { logger } from '../logger.js';
import { t } from '../i18n.js';

export interface InitOptions {
  uiFramework?: LismCliConfig['framework'];
  uiDir?: string;
}

/**
 * lism.config.js を新規生成する汎用 init コマンド。
 * core 設定（tokens/props 等）のひな形を出力し、`ui:` セクションは resolveUiConfig の
 * 判断に従って含める（lism-ui を使わないユーザーの config に見慣れない `ui:` セクションを
 * 黙って書き込まないため）。
 * 既に lism.config.* が存在する場合はファイルを一切変更しない
 * （`ui:` セクションの後付けは `ui add` 実行時のスニペット案内で対応する）。
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
  const found = findConfigFile();

  if (found) {
    logger.warn(t('init.alreadyExists', { filename: found.filename }));
    return;
  }

  const ui = await resolveUiConfig(options);

  const outPath = writeFreshConfig(ui);
  logger.success(t('init.created', { path: outPath }));
}

/**
 * 生成する `ui:` セクションを決める（null なら core ひな形のみ）。
 * `--ui-*` はすべて ui セクションの値の先渡しなので、どれかの指定を UI 利用の意思とみなし、
 * オプションで埋まっていない質問だけを対話で行う。
 * - --ui-framework あり: 利用確認のみ（意思表示済みなのでデフォルト Yes）
 * - --ui-dir のみ: framework 選択のみ（回答すること自体が利用同意を兼ねる）
 * - 非 TTY: 質問を出せないため --ui-framework があれば同意とみなして生成、
 *   --ui-dir のみは判断不能でエラー、指定なしは core のみに倒す
 */
async function resolveUiConfig(options: InitOptions): Promise<LismCliConfig | null> {
  const hasFramework = options.uiFramework !== undefined;
  const hasDir = options.uiDir !== undefined;
  const uiOptions = { framework: options.uiFramework, dir: options.uiDir };

  if (!process.stdin.isTTY) {
    if (hasFramework) return promptUiConfig(uiOptions);
    if (hasDir) {
      logger.error(t('init.uiFrameworkRequired'));
      process.exit(1);
    }
    return null;
  }

  if (hasFramework) {
    const useUi = await confirm({ message: t('init.promptUseUi'), default: true });
    return useUi ? promptUiConfig(uiOptions) : null;
  }
  if (hasDir) {
    return promptUiConfig(uiOptions);
  }
  const useUi = await confirm({ message: t('init.promptUseUi'), default: false });
  return useUi ? promptUiConfig(uiOptions) : null;
}
