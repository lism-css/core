/**
 * CLI 表示用のメッセージ辞書（ja / en）。
 *
 * 命名規則:
 *   - `cli.*`    … commander の description / argument / option
 *   - `create.*` … `lism-cli create` サブコマンド
 *   - `init.*`   … `lism-cli init` サブコマンド
 *   - `ui.*`     … `lism-cli ui` 配下
 *   - `skill.*`  … `lism-cli skill` 配下
 *   - `mockup.*` … `lism-cli mockup` 配下
 *   - `config.*` … lism.config.* まわりのエラー・警告
 *   - `common.*` … 汎用
 *
 * プレースホルダは `{name}` 形式（`t()` の `vars` で置換）。
 */

interface MessageEntry {
  ja: string;
  en: string;
}

export const messages = {
  // ---------------------------------------------------------------------------
  // Commander description / arguments / options
  // ---------------------------------------------------------------------------
  'cli.description': {
    ja: 'Lism CSS / UI 向け CLI',
    en: 'CLI for Lism CSS / UI',
  },
  'cli.opt.lang': {
    ja: 'CLI 表示と生成テンプレートの言語（ja | en、未指定なら対話時に選択）',
    en: 'Language for the CLI and generated template (ja | en; prompted when omitted)',
  },

  // create
  'cli.create.description': {
    ja: 'templates から新規プロジェクトを生成する',
    en: 'Create a new project from a template',
  },
  'cli.create.arg.targetDir': {
    ja: '出力先ディレクトリ',
    en: 'Target directory',
  },
  'cli.create.opt.template': {
    ja: '使用するテンプレート名またはカテゴリ名（例: minimal-astro / minimal）',
    en: 'Template or category name to use (e.g. minimal-astro / minimal)',
  },
  'cli.create.opt.force': {
    ja: '既存ディレクトリを強制上書き',
    en: 'Overwrite existing directory',
  },
  'cli.create.opt.ref': {
    ja: 'テンプレート取得元の Git ref（ブランチ / タグ / コミット）',
    en: 'Git ref to fetch templates from (branch / tag / commit)',
  },

  // init
  'cli.init.description': {
    ja: 'lism.config ファイルを新規生成する',
    en: 'Generate a new lism.config file',
  },
  'cli.init.opt.uiFramework': {
    ja: 'UI コンポーネントのフレームワーク（ui.framework）',
    en: 'Framework for UI components (ui.framework)',
  },
  'cli.init.opt.uiDir': {
    ja: 'UI コンポーネントの出力先ディレクトリ（ui.dir）',
    en: 'Output directory for UI components (ui.dir)',
  },

  // ui
  'cli.ui.description': {
    ja: 'Lism UI コンポーネントの追加・管理',
    en: 'Manage Lism UI components',
  },
  'cli.ui.add.description': {
    ja: 'コンポーネントを追加する',
    en: 'Add components',
  },
  'cli.ui.add.arg.names': {
    ja: '追加するコンポーネント名',
    en: 'Component names to add',
  },
  'cli.ui.add.opt.overwrite': {
    ja: '既存ファイルを確認なしで上書き',
    en: 'Overwrite existing files without confirmation',
  },
  'cli.ui.add.opt.all': {
    ja: '全コンポーネントを追加',
    en: 'Add all components',
  },
  'cli.ui.list.description': {
    ja: '利用可能なコンポーネント一覧を表示する',
    en: 'List available components',
  },
  'cli.ui.opt.ref': {
    ja: '取得元の Git ref（ブランチ / タグ / コミット）',
    en: 'Git ref to fetch from (branch / tag / commit)',
  },

  // mockup
  'cli.mockup.description': {
    ja: '画面モックアップの案内を表示する（実体は @lism-css/mockup）',
    en: 'Show guidance for mockups (provided by @lism-css/mockup)',
  },

  // skill
  'cli.skill.description': {
    ja: 'AI エージェント向けスキル（SKILL.md）の配置と管理',
    en: 'Manage SKILL.md files for AI agents',
  },
  'cli.skill.add.description': {
    ja: 'スキルを配置する',
    en: 'Deploy skills',
  },
  'cli.skill.add.arg.skill': {
    ja: '配置するスキル名（省略時は全スキル）',
    en: 'Skill name to deploy (all skills if omitted)',
  },
  'cli.skill.add.opt.overwrite': {
    ja: '確認なしで上書き',
    en: 'Overwrite without confirmation',
  },
  'cli.skill.check.description': {
    ja: '配置済みスキルとリモートの差分を確認する',
    en: 'Show the diff between installed skills and the remote',
  },
  'cli.skill.check.opt.verbose': {
    ja: 'ファイル単位の差分を表示',
    en: 'Show per-file diffs',
  },
  'cli.skill.update.description': {
    ja: '配置済みスキルを最新版で上書きする（--overwrite 同等）',
    en: 'Overwrite installed skills with the latest version (same as --overwrite)',
  },
  'cli.skill.opt.ref': {
    ja: 'GitHub の取得元 ref（ブランチ／タグ／コミット）',
    en: 'Git ref to fetch from on GitHub (branch / tag / commit)',
  },
  'cli.skill.opt.all': {
    ja: '全ツールに配置',
    en: 'Deploy to all tools',
  },
  'cli.skill.opt.toolPath': {
    ja: '{path} に配置',
    en: 'Deploy to {path}',
  },

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  'create.templateNotFound': {
    ja: 'テンプレート "{name}" は見つかりません。利用可能: {list}',
    en: 'Template "{name}" not found. Available: {list}',
  },
  'create.promptSelectCategory': {
    ja: 'カテゴリを選択してください:',
    en: 'Select a category:',
  },
  'create.promptSelectVariant': {
    ja: 'バリアントを選択してください（{count}件）:',
    en: 'Select a variant ({count} options):',
  },
  'create.promptSelectVariant.blog': {
    ja: 'タイプを選択してください（{count}件）:',
    en: 'Select a type ({count} options):',
  },
  'create.promptSelectVariant.lp': {
    ja: '業種を選択してください（{count}件）:',
    en: 'Select an industry ({count} options):',
  },
  'create.promptSelectVariant.web': {
    ja: '業種を選択してください（{count}件）:',
    en: 'Select an industry ({count} options):',
  },
  'create.promptSelectStack': {
    ja: 'スタックを選択してください（{count}件）:',
    en: 'Select a stack ({count} options):',
  },
  'create.usingStack': {
    ja: 'スタックは{stack}を使用します（{count}件）。',
    en: 'Using {stack} stack ({count} option).',
  },
  'create.promptTargetDir': {
    ja: '出力先ディレクトリ:',
    en: 'Target directory:',
  },
  'create.confirmOverwrite': {
    ja: '{dir} は既に存在し、空ではありません。上書きしますか？',
    en: '{dir} already exists and is not empty. Overwrite?',
  },
  'create.aborted': {
    ja: '中断しました。',
    en: 'Aborted.',
  },
  'create.fetching': {
    ja: 'テンプレート "{name}" を取得中（ref: {ref}）...',
    en: 'Fetching template "{name}" (ref: {ref})...',
  },
  'create.templatePackageMissing': {
    ja: 'テンプレート"{name}"の取得結果にpackage.jsonがありません。取得元パスを確認してください: {path}',
    en: 'Downloaded template "{name}" does not contain package.json. Check the source path: {path}',
  },
  'create.variantMissing': {
    ja: 'variant "{variant}" のディレクトリが見つかりません。取得元パスを確認してください: {path}',
    en: 'Variant "{variant}" directory not found. Check the source path: {path}',
  },
  'create.created': {
    ja: '{dir} にプロジェクトを生成しました。',
    en: 'Generated project at {dir}.',
  },
  'create.nextSteps': {
    ja: '次のコマンドで開発を開始できます:',
    en: 'Next steps:',
  },
  'create.packageNameRewritten': {
    ja: '  package.jsonのnameを"{name}"に変更しました。',
    en: '  Updated package.json name to "{name}".',
  },
  'create.packageNameFailed': {
    ja: 'package.jsonのname書き換えに失敗しました: {reason}',
    en: 'Failed to rewrite package.json name: {reason}',
  },
  'create.workspaceReplaced': {
    ja: '  package.json の workspace:* を公開バージョンに置換しました。',
    en: '  Replaced workspace:* in package.json with published versions.',
  },
  'create.workspaceFailed': {
    ja: 'package.json の書き換えに失敗しました: {reason}',
    en: 'Failed to rewrite package.json: {reason}',
  },

  // ---------------------------------------------------------------------------
  // init
  // ---------------------------------------------------------------------------
  'init.alreadyExists': {
    ja: '{filename} は既に存在するため、何も変更しませんでした。',
    en: '{filename} already exists; nothing was changed.',
  },
  'init.promptUseUi': {
    ja: 'Lism UI のコンポーネントも使いますか？（ui セクションを追加します）',
    en: 'Will you also use Lism UI components? (adds a ui section)',
  },
  'init.created': {
    ja: '{path} を作成しました。',
    en: 'Created {path}.',
  },
  'init.uiFrameworkRequired': {
    ja: '非対話環境では --ui-dir 単独で ui セクションを生成できません。--ui-framework を指定してください。',
    en: 'Cannot generate the ui section from --ui-dir alone in a non-interactive environment. Specify --ui-framework.',
  },

  // ---------------------------------------------------------------------------
  // ui
  // ---------------------------------------------------------------------------
  // ui 共通（add / init で共有）
  'ui.promptFramework': {
    ja: 'フレームワークを選択してください:',
    en: 'Select a framework:',
  },
  'ui.catalogFailed': {
    ja: 'カタログの取得に失敗しました{refInfo}: {reason}',
    en: 'Failed to fetch catalog{refInfo}: {reason}',
  },

  // ui add
  'ui.add.noConfig': {
    ja: 'ui セクションが見つかりません。いくつか質問します。',
    en: 'No ui section found. A few questions to get you started.',
  },
  'ui.add.addingAll': {
    ja: '全 {count} コンポーネントを追加します...',
    en: 'Adding all {count} components...',
  },
  'ui.add.specifyName': {
    ja: '追加するコンポーネント名を指定してください。',
    en: 'Specify component names to add.',
  },
  'ui.add.notFound': {
    ja: '見つからないコンポーネント: {list}',
    en: 'Components not found: {list}',
  },
  'ui.add.componentFetchFailed': {
    ja: '"{name}" の取得に失敗しました: {reason}',
    en: 'Failed to fetch "{name}": {reason}',
  },
  'ui.add.someFailed': {
    ja: '一部のコンポーネント / helper の追加に失敗しました。',
    en: 'Some components / helpers failed to be added.',
  },
  'ui.add.promptOverwritePolicy': {
    ja: '既存ファイルの上書き方針を選択してください:',
    en: 'Select overwrite policy for existing files:',
  },
  'ui.add.policyAll': {
    ja: '全て上書き',
    en: 'Overwrite all',
  },
  'ui.add.policyNone': {
    ja: '全てスキップ',
    en: 'Skip all',
  },
  'ui.add.policyPerComponent': {
    ja: 'コンポーネントごとに確認',
    en: 'Ask per component',
  },
  'ui.add.created': {
    ja: '  作成: {path}',
    en: '  Created: {path}',
  },
  'ui.add.deploying': {
    ja: '{name} を展開中...',
    en: 'Deploying {name}...',
  },
  'ui.add.confirmOverwriteComponent': {
    ja: '{name} は既に存在します。上書きしますか？',
    en: '{name} already exists. Overwrite?',
  },
  'ui.add.skippedComponent': {
    ja: '  スキップ: {name}',
    en: '  Skipped: {name}',
  },
  'ui.add.helperFetchFailed': {
    ja: '  helper "{name}" の取得に失敗しました: {reason}',
    en: '  Failed to fetch helper "{name}": {reason}',
  },
  'ui.add.confirmOverwriteFile': {
    ja: '{path} は既に存在します。上書きしますか？',
    en: '{path} already exists. Overwrite?',
  },
  'ui.add.skippedFile': {
    ja: '  スキップ: {path}',
    en: '  Skipped: {path}',
  },
  'ui.add.snippetGuide': {
    ja: '次回から同じ質問をされないために、{filename} の export default オブジェクト内に以下を貼り付けてください:\n\n{snippet}\n',
    en: 'To avoid being asked these questions again, paste the following inside the exported config object in {filename}:\n\n{snippet}\n',
  },

  // ui list
  'ui.list.fetching': {
    ja: 'コンポーネント一覧を取得中...',
    en: 'Fetching components list...',
  },
  'ui.list.header': {
    ja: 'コンポーネント:',
    en: 'Components:',
  },
  'ui.list.total': {
    ja: '合計: {count} コンポーネント',
    en: 'Total: {count} components',
  },

  // ---------------------------------------------------------------------------
  // mockup
  // ---------------------------------------------------------------------------
  'mockup.guide': {
    ja:
      '画面モックアップ機能は別パッケージ @lism-css/mockup が提供します。\n\n' +
      '  npx @lism-css/mockup init [dir]   … ひな形＋契約説明書の生成\n' +
      '  npx @lism-css/mockup dev [dir]    … devサーバー起動（ブラウザ確認用）\n' +
      '  npx @lism-css/mockup check [dir]  … 非対話の検証\n\n' +
      'インストール済みの環境では bin の lism-mockup でも実行できます。',
    en:
      'Mockup features are provided by a separate package, @lism-css/mockup.\n\n' +
      '  npx @lism-css/mockup init [dir]   ... Generate scaffolding and a contract document\n' +
      '  npx @lism-css/mockup dev [dir]    ... Start the dev server (for browser preview)\n' +
      '  npx @lism-css/mockup check [dir]  ... Run non-interactive checks\n\n' +
      'If installed, you can also run it via the lism-mockup bin.',
  },

  // ---------------------------------------------------------------------------
  // skill
  // ---------------------------------------------------------------------------
  // skill add
  'skill.add.detected': {
    ja: '検出した AI ツール: {list}',
    en: 'Detected AI tools: {list}',
  },
  'skill.add.promptTools': {
    ja: '配置先のツールを選択してください（スペースで選択、Enter で確定）:',
    en: 'Select target tools (Space to select, Enter to confirm):',
  },
  'skill.add.noTargets': {
    ja: '配置先が選択されませんでした。',
    en: 'No target tools were selected.',
  },
  'skill.add.fetching': {
    ja: 'スキル {skill} を取得中（ref: {ref}）...',
    en: 'Fetching skill {skill} (ref: {ref})...',
  },
  'skill.unknownSkill': {
    ja: 'スキル "{name}" は存在しません。利用可能: {list}',
    en: 'Unknown skill "{name}". Available: {list}',
  },
  'skill.add.skippedSame': {
    ja: '  スキップ（差分なし）: {label}',
    en: '  Skipped (no changes): {label}',
  },
  'skill.add.hasDiff': {
    ja: '  {label} に差分があります:',
    en: '  {label} has changes:',
  },
  'skill.add.modifiedFiles': {
    ja: '    変更: {count} ファイル',
    en: '    Modified: {count} files',
  },
  'skill.add.addedFiles': {
    ja: '    追加: {count} ファイル',
    en: '    Added: {count} files',
  },
  'skill.add.localOnlyFiles': {
    ja: '    削除: {count} ファイル（ローカルのみに存在、上書き時に削除されます）',
    en: '    Deleted: {count} files (local-only, will be removed on overwrite)',
  },
  'skill.add.confirmOverwrite': {
    ja: '{path} を上書きしますか？',
    en: 'Overwrite {path}?',
  },
  'skill.add.skippedTool': {
    ja: '  スキップ: {tool}',
    en: '  Skipped: {tool}',
  },
  'skill.add.deployed': {
    ja: '  配置: {tool} → {path}',
    en: '  Deployed: {tool} → {path}',
  },

  // skill check
  'skill.check.noneInstalled': {
    ja: 'インストール済みのスキルは見つかりませんでした。`{invoke} skill add` で配置できます。',
    en: 'No installed skills found. Run `{invoke} skill add` to deploy them.',
  },
  'skill.check.fetching': {
    ja: 'リモートスキル {skill} を取得中（ref: {ref}）...',
    en: 'Fetching remote skill {skill} (ref: {ref})...',
  },
  'skill.check.upToDate': {
    ja: '  ✓ {label}  (最新)',
    en: '  ✓ {label}  (up to date)',
  },
  'skill.check.allLatest': {
    ja: 'すべてのスキルが最新です。',
    en: 'All skills are up to date.',
  },
  'skill.check.outdated': {
    ja: '{count} 件の配置に差分があります。`{invoke} skill update` で最新に更新できます。',
    en: '{count} deployment(s) differ from the remote. Run `{invoke} skill update` to update them.',
  },
  'skill.check.diffModified': {
    ja: '変更 {count}',
    en: 'modified {count}',
  },
  'skill.check.diffAdded': {
    ja: '追加 {count}',
    en: 'added {count}',
  },
  'skill.check.diffDeleted': {
    ja: '削除 {count}',
    en: 'deleted {count}',
  },

  // ---------------------------------------------------------------------------
  // config
  // ---------------------------------------------------------------------------
  'config.invalidFramework': {
    ja: 'ui.framework は "react" または "astro" を指定してください。',
    en: 'ui.framework must be "react" or "astro".',
  },
  'config.invalidDir': {
    ja: 'ui.dir は文字列で指定してください。',
    en: 'ui.dir must be a string.',
  },
  'config.cliKeyDeprecated': {
    ja: '[deprecated] {filename} の "cli:" キーは "ui:" への変更が推奨されています。',
    en: '[deprecated] The "cli:" key in {filename} is recommended to be renamed to "ui:".',
  },
  'config.loadFailed': {
    ja: '{path} を読み込めませんでした（構文エラー等）。修正してから再実行してください: {reason}',
    en: 'Failed to load {path} (syntax error, etc). Please fix it and retry: {reason}',
  },
  'config.freshConfigExists': {
    ja: '{path} は既に存在するため新規作成できません。',
    en: 'Cannot create {path} because it already exists.',
  },

  // ---------------------------------------------------------------------------
  // common
  // ---------------------------------------------------------------------------
  'common.done': {
    ja: '完了しました。',
    en: 'Done.',
  },
  'common.help': {
    ja: 'ヘルプを表示',
    en: 'Show help',
  },
} as const satisfies Record<string, MessageEntry>;

export type MessageKey = keyof typeof messages;
