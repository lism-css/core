import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { downloadTemplate } from 'giget';
import { select, input, confirm } from '@inquirer/prompts';
import { logger } from '../logger.js';
import { LISM_PACKAGE_VERSIONS } from '../version.js';
import { DEFAULT_TEMPLATES_REF, NPM_REGISTRY_BASE, SOURCE_REPO, TEMPLATES_PATH } from '../constants.js';
import { setLang, t, tOf, type Lang } from '../i18n.js';
import type { MessageKey } from '../messages.js';
import {
  TEMPLATES,
  type CategoryId,
  type LocalizedText,
  type SingleProjectVariantTemplateDef,
  type Stack as TemplateStack,
  type TemplateDef,
} from '@templates/manifest.js';

interface CategoryDef {
  id: CategoryId;
  label: LocalizedText;
  variantPromptKey?: MessageKey;
}

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
};

const STACK_LABELS: Record<TemplateStack, LocalizedText> = {
  astro: { ja: 'Astro', en: 'Astro' },
  next: { ja: 'Next.js', en: 'Next.js' },
  vite: { ja: 'Vite + React', en: 'Vite + React' },
};

const CATEGORIES: CategoryDef[] = [
  {
    id: 'minimal',
    label: { ja: 'Minimal', en: 'Minimal' },
  },
  {
    id: 'blog',
    label: { ja: 'Blog', en: 'Blog' },
    variantPromptKey: 'create.promptSelectVariant.blog',
  },
  {
    id: 'lp',
    label: { ja: 'LP', en: 'LP' },
    variantPromptKey: 'create.promptSelectVariant.lp',
  },
  {
    id: 'web',
    label: { ja: 'Web', en: 'Web' },
    variantPromptKey: 'create.promptSelectVariant.web',
  },
];

interface CreateOptions {
  template?: string;
  force?: boolean;
  ref?: string;
}

/** commander の action 第3引数（グローバル --lang を読むために最小限の構造だけ受ける） */
interface CommandLike {
  optsWithGlobals(): Record<string, unknown>;
}

export interface RunCreateArgs {
  template?: string;
  targetDir?: string;
  force?: boolean;
  /** テンプレ取得元の Git ref。未指定なら `DEFAULT_TEMPLATES_REF`。 */
  ref?: string;
  /**
   * 明示指定された言語（`--lang`）。`ja` / `en` のときその言語で CLI 表示・テンプレ生成を確定する。
   * 未指定（undefined / 不正値）の場合は、対話端末では最初に言語選択プロンプトを出し、
   * 非対話端末（CI・パイプ等）では `en` にフォールバックする。
   */
  lang?: string;
}

export async function runCreate({ template, targetDir, force = false, lang, ref }: RunCreateArgs): Promise<void> {
  await runCreateWithTemplates({ template, targetDir, force, lang, ref }, TEMPLATES);
}

/** 言語とテンプレートを解決し、取得したテンプレートへ生成後の変換を適用する。 */
export async function runCreateWithTemplates(
  { template, targetDir, force = false, lang, ref = DEFAULT_TEMPLATES_REF }: RunCreateArgs,
  templates: TemplateDef[]
): Promise<void> {
  const resolvedLang = await resolveLang(lang);
  setLang(resolvedLang);

  // draft:true は CLI からは完全に隠す（一覧・選択・slug 直接指定すべて unknown 扱い）
  const availableTemplates = templates.filter((tpl) => !tpl.draft);
  const tpl = await resolveTemplate(template, availableTemplates);
  const outDir = path.resolve(process.cwd(), await resolveTargetDir(targetDir, tpl.slug));

  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0 && !force) {
    const ok = await confirm({
      message: t('create.confirmOverwrite', { dir: outDir }),
      default: false,
    });
    if (!ok) {
      logger.warn(t('create.aborted'));
      return;
    }
  }

  logger.info(t('create.fetching', { name: tpl.slug, ref }));
  await downloadTemplateSource(tpl, outDir, ref, force);

  await applyLangOverlay(tpl, outDir, ref, resolvedLang);

  ensureTemplateDownloaded(outDir, tpl);

  await postProcessTemplate(outDir, tpl, resolvedLang);

  logger.success(t('create.created', { dir: outDir }));
  printNextSteps(outDir);
}

export async function createCommand(targetDir: string | undefined, options: CreateOptions, command?: CommandLike): Promise<void> {
  // ルートプログラムの `--lang` はグローバルオプションなので optsWithGlobals() で取得する。
  const langOpt = command?.optsWithGlobals().lang;
  const lang = typeof langOpt === 'string' ? langOpt : undefined;
  await runCreate({ template: options.template, targetDir, force: options.force, lang, ref: options.ref });
}

// 非対話端末はenへフォールバックし、言語選択は現在の言語に依存しない固定表示にする。
async function resolveLang(explicit: string | undefined): Promise<Lang> {
  if (explicit === 'ja' || explicit === 'en') return explicit;
  if (!process.stdin.isTTY) return 'en';

  return select<Lang>({
    message: 'Select language / 言語を選択:',
    choices: [
      { name: 'English', value: 'en' },
      { name: '日本語', value: 'ja' },
    ],
  });
}

async function resolveTemplate(requested: string | undefined, templates: TemplateDef[]): Promise<TemplateDef> {
  if (requested) {
    const found = templates.find((t) => t.slug === requested);
    if (found) return found;

    const matchedCategory = CATEGORIES.find((category) => category.id === requested);
    const categoryTemplates = matchedCategory ? templates.filter((tpl) => tpl.category === matchedCategory.id) : [];
    if (matchedCategory && categoryTemplates.length > 0) {
      return resolveFromCategory(matchedCategory.id, categoryTemplates);
    }

    throw new Error(t('create.templateNotFound', { name: requested, list: templates.map((x) => x.slug).join(', ') }));
  }

  const category = await select<CategoryId>({
    message: t('create.promptSelectCategory'),
    choices: CATEGORIES.filter((category) => templates.some((tpl) => tpl.category === category.id)).map((category) => ({
      name: tOf(category.label),
      value: category.id,
    })),
  });

  return resolveFromCategory(
    category,
    templates.filter((tpl) => tpl.category === category)
  );
}

async function resolveFromCategory(category: CategoryId, categoryTemplates: TemplateDef[]): Promise<TemplateDef> {
  const stack = await resolveStack(categoryTemplates);
  const stackTemplates = categoryTemplates.filter((tpl) => tpl.stack === stack);
  const variant = await resolveVariant(category, stackTemplates);
  const variantTemplates = variant === undefined ? stackTemplates : stackTemplates.filter((tpl) => tpl.variant === variant);

  return variantTemplates[0];
}

async function resolveVariant(category: CategoryId, templates: TemplateDef[]): Promise<string | undefined> {
  const variants = uniqueDefined(templates.map((tpl) => tpl.variant));
  if (variants.length <= 1) return variants[0];

  const categoryDef = CATEGORIES.find((item) => item.id === category);
  const messageKey = categoryDef?.variantPromptKey ?? 'create.promptSelectVariant';

  return select<string>({
    message: t(messageKey, { count: variants.length }),
    choices: variants.map((variant) => {
      const tpl = templates.find((item) => item.variant === variant)!;
      return {
        name: `${tOf(tpl.variantLabel ?? { ja: variant ?? '', en: variant ?? '' })} — ${tOf(tpl.description)}`,
        value: variant,
      };
    }),
  });
}

async function resolveStack(templates: TemplateDef[]): Promise<TemplateStack> {
  const stacks = uniqueDefined(templates.map((tpl) => tpl.stack));
  if (stacks.length === 1) {
    const stack = stacks[0];
    logger.info(t('create.usingStack', { stack: tOf(STACK_LABELS[stack]), count: stacks.length }));
    return stack;
  }

  return select<TemplateStack>({
    message: t('create.promptSelectStack', { count: stacks.length }),
    choices: stacks.map((stack) => ({
      name: tOf(STACK_LABELS[stack]),
      value: stack,
    })),
  });
}

async function resolveTargetDir(provided: string | undefined, templateName: string): Promise<string> {
  if (provided) return provided;
  return input({
    message: t('create.promptTargetDir'),
    default: `./${templateName}`,
  });
}

function ensureTemplateDownloaded(projectDir: string, tpl: TemplateDef): void {
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) return;
  throw new Error(t('create.templatePackageMissing', { name: tpl.slug, path: getTemplateSourcePath(tpl) }));
}

async function downloadTemplateSource(tpl: TemplateDef, outDir: string, ref: string, forceClean: boolean): Promise<void> {
  if (tpl.kind === 'base-overlay') {
    await downloadTemplatePath(tpl.basePath, outDir, ref, forceClean);

    const overlayDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lism-template-overlay-'));
    try {
      await downloadTemplatePath(tpl.overlayPath, overlayDir, ref, true);
      mergeDirectory(overlayDir, outDir);
    } finally {
      fs.rmSync(overlayDir, { recursive: true, force: true });
    }
    return;
  }

  await downloadTemplatePath(tpl.sourcePath, outDir, ref, forceClean);
}

async function downloadTemplatePath(sourcePath: string, outDir: string, ref: string, forceClean: boolean): Promise<void> {
  await downloadTemplate(`github:${SOURCE_REPO}/${TEMPLATES_PATH}/${sourcePath}#${ref}`, {
    dir: outDir,
    force: true,
    forceClean,
  });
}

// base言語にはoverlayを持たせず、指定言語の差分だけをbaseへマージする。
async function applyLangOverlay(tpl: TemplateDef, outDir: string, ref: string, lang: Lang): Promise<void> {
  if (tpl.kind !== 'project') return;
  const overlayPath = tpl.langOverlays?.[lang];
  if (!overlayPath) return;

  const overlayDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lism-template-lang-'));
  try {
    await downloadTemplatePath(overlayPath, overlayDir, ref, true);
    mergeDirectory(overlayDir, outDir);
  } finally {
    fs.rmSync(overlayDir, { recursive: true, force: true });
  }
}

/** テンプレート種別固有の変換後、配布不要ファイルとworkspace依存を整理する。 */
async function postProcessTemplate(projectDir: string, tpl: TemplateDef, lang: Lang): Promise<void> {
  if (tpl.kind === 'base-overlay' && tpl.rewritePackageName !== false) {
    rewritePackageName(projectDir, tpl.slug);
  }

  if (tpl.kind === 'single-project-variant') {
    extractVariantFiles(projectDir, tpl, lang);
    rewritePackageName(projectDir, tpl.packageName ?? tpl.slug);
  }

  cleanupDevArtifacts(projectDir);

  await rewriteWorkspaceDeps(projectDir);
}

/** 生成物からdocs用素材と言語overlayの配信元を取り除く。 */
function cleanupDevArtifacts(projectDir: string): void {
  const screenshotsDir = path.join(projectDir, 'screenshots');
  if (fs.existsSync(screenshotsDir)) {
    fs.rmSync(screenshotsDir, { recursive: true, force: true });
  }

  const screenshotsConfig = path.join(projectDir, 'screenshots.config.json');
  if (fs.existsSync(screenshotsConfig)) {
    fs.rmSync(screenshotsConfig, { force: true });
  }

  const langDir = path.join(projectDir, '.lang');
  if (fs.existsSync(langDir)) {
    fs.rmSync(langDir, { recursive: true, force: true });
  }
}

/**
 * 言語別 variant（`src/{dir}/{lang}/{variant}/`）を base に重ねるか判定する。
 * `src/pages/{lang}/{variant}/index.astro` があるときだけ lang 層を適用し、無ければ base のみを使う。
 */
function resolveLangVariantDir(srcDir: string, variant: string, lang: Lang): string | undefined {
  const langVariant = `${lang}/${variant}`;
  const hasLangVariant = fs.existsSync(path.join(srcDir, 'pages', langVariant, 'index.astro'));
  return hasLangVariant ? langVariant : undefined;
}

/**
 * single-project-variant 用の後処理。
 *
 * `src/` 直下のサブディレクトリ（`src/pages/`, `src/components/`, `src/styles/`, ...）について、
 * その中に対象 variant のディレクトリ（例: `src/components/{variant}/`）か言語別 variant のディレクトリ
 * （例: `src/components/{lang}/{variant}/`）が存在するものを「variant 規約のディレクトリ」とみなす。
 * （variant ディレクトリ直下はファイルのみを想定。ネストしたサブディレクトリ構成は非対応）
 *
 * `src/pages/{variant}/index.astro` の存在だけは必須（無ければエラー）。
 * 対象 variant を持つディレクトリでは base（`{variant}/`）→ lang（`{lang}/{variant}/`）の順に中身を親へ
 * マージし（同名ファイルは lang が上書き）、直下の全サブディレクトリを削除する。
 * lang 側には差分ファイルだけを置けばよく、base 側のファイルは `@/{dir}/{variant}/...` の alias で参照できる。
 */
function extractVariantFiles(projectDir: string, tpl: SingleProjectVariantTemplateDef, lang: Lang): void {
  const srcDir = path.join(projectDir, 'src');
  const { variant } = tpl;

  const pagesVariantIndex = path.join(srcDir, 'pages', variant, 'index.astro');
  if (!fs.existsSync(pagesVariantIndex)) {
    throw new Error(
      t('create.variantMissing', {
        variant,
        path: `${formatTemplatePath(tpl.sourcePath)}/src/pages/${variant}/index.astro`,
      })
    );
  }

  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) return;

  // マージ順が優先順位。後の lang 側が base の同名ファイルを上書きする。
  const langVariant = resolveLangVariantDir(srcDir, variant, lang);
  const variantDirs = langVariant ? [variant, langVariant] : [variant];

  // variant配下を親へ持ち上げ、他variantもまとめて取り除く。
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const parentDir = path.join(srcDir, entry.name);
    const variantDirsInside = variantDirs
      .map((dir) => path.join(parentDir, dir))
      .filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());

    if (variantDirsInside.length === 0) continue;

    for (const variantDirInside of variantDirsInside) {
      mergeDirectory(variantDirInside, parentDir);
    }

    for (const child of fs.readdirSync(parentDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      fs.rmSync(path.join(parentDir, child.name), { recursive: true, force: true });
    }
  }

  // 持ち上げ後の構成に合わせてalias importを直す。
  rewriteVariantAliasImports(srcDir, variantDirs);
}

/**
 * 配布後のファイル群に対して、path alias 経由の `@/{dir}/{variant}/...` 形式の参照を
 * `@/{dir}/...` に置換する。`variantDirs` には base（`{variant}`）と lang（`{lang}/{variant}`）の
 * 両方を渡し、どちらの形式も置換する。variant 名にメタ文字が含まれても安全なように escape する。
 *
 * 対象拡張子はテキスト系のソース/スタイルのみ。マッチしないファイルはそのまま。
 */
const ALIAS_REWRITE_EXTENSIONS = new Set([
  '.astro',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.md',
  '.mdx',
  '.vue',
  '.svelte',
  '.html',
]);

function rewriteVariantAliasImports(srcDir: string, variantDirs: string[]): void {
  if (!fs.existsSync(srcDir)) return;

  const patterns = variantDirs.map((dir) => new RegExp(`(@/[^/'"\\s\`]+)/${escapeRegExp(dir)}/`, 'g'));

  walkFiles(srcDir, (filePath) => {
    const ext = path.extname(filePath);
    if (!ALIAS_REWRITE_EXTENSIONS.has(ext)) return;

    let original: string;
    try {
      original = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return; // バイナリ等は無視
    }
    if (!variantDirs.some((dir) => original.includes(`/${dir}/`))) return;

    let replaced = original;
    for (const pattern of patterns) {
      replaced = replaced.replace(pattern, '$1/');
    }
    if (replaced !== original) {
      fs.writeFileSync(filePath, replaced);
    }
  });
}

function walkFiles(dir: string, callback: (filePath: string) => void): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fp, callback);
    } else if (entry.isFile()) {
      callback(fp);
    }
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printNextSteps(projectDir: string): void {
  logger.heading(t('create.nextSteps'));
  const rel = path.relative(process.cwd(), projectDir) || '.';
  logger.log(`  cd ${rel}`);
  logger.log('  npm install   # or pnpm install / yarn');
  logger.log('  npm run dev');
  logger.log('');
}

function getTemplateSourcePath(tpl: TemplateDef): string {
  if (tpl.kind === 'base-overlay') return `${formatTemplatePath(tpl.basePath)} + ${formatTemplatePath(tpl.overlayPath)}`;
  return formatTemplatePath(tpl.sourcePath);
}

function formatTemplatePath(sourcePath: string): string {
  return `${TEMPLATES_PATH}/${sourcePath}`;
}

function uniqueDefined<T extends string>(values: Array<T | undefined>): T[] {
  return [...new Set(values.filter((value): value is T => value !== undefined))];
}

function mergeDirectory(fromDir: string, toDir: string): void {
  fs.mkdirSync(toDir, { recursive: true });
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const fromPath = path.join(fromDir, entry.name);
    const toPath = path.join(toDir, entry.name);

    if (entry.isDirectory()) {
      if (fs.existsSync(toPath) && !fs.statSync(toPath).isDirectory()) {
        fs.rmSync(toPath, { recursive: true, force: true });
      }
      mergeDirectory(fromPath, toPath);
      continue;
    }

    if (fs.existsSync(toPath)) {
      fs.rmSync(toPath, { recursive: true, force: true });
    }

    if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(fromPath), toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

function rewritePackageName(projectDir: string, name: string): void {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as PackageJson;
    if (pkg.name === name) return;

    pkg.name = name;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    logger.log(t('create.packageNameRewritten', { name }));
  } catch (err) {
    logger.warn(t('create.packageNameFailed', { reason: String(err) }));
  }
}

/** package.json 内で `workspace:*` 依存が現れ得るセクション */
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

/** npm レジストリへの問い合わせタイムアウト（ms）。生成体験を遅くしないための保険。 */
const REGISTRY_TIMEOUT_MS = 5000;

/**
 * 取得後の package.json 内の `workspace:*` 依存を、依存パッケージごとの公開バージョンに書き換える。
 *
 * バージョンは npm レジストリの dist-tag `latest`（＝安定版）を解決して使う。これにより `lism-css` 等を
 * publish するだけで `lism-cli create` が最新版を取得でき、CLI 自体を再公開する必要がなくなる。
 * レジストリへ到達できない場合（オフライン / 障害 / 404 / タイムアウト）は、CLI ビルド時に焼き込んだ
 * `LISM_PACKAGE_VERSIONS` へ依存ごとに個別フォールバックする。いずれも書式は `^x.y.z`。
 *
 * 失敗しても警告に留め、生成自体は続行する（Best Effort）。
 */
async function rewriteWorkspaceDeps(projectDir: string): Promise<void> {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as PackageJson;

    const names = new Set<string>();
    for (const section of DEP_SECTIONS) {
      const deps = pkg[section];
      if (!deps) continue;
      for (const [name, value] of Object.entries(deps)) {
        if (typeof value === 'string' && value.startsWith('workspace:')) names.add(name);
      }
    }
    if (names.size === 0) return;

    const versions = await resolveWorkspaceVersions([...names]);

    let touched = false;
    for (const section of DEP_SECTIONS) {
      const deps = pkg[section];
      if (!deps) continue;
      for (const [name, value] of Object.entries(deps)) {
        if (typeof value === 'string' && value.startsWith('workspace:')) {
          deps[name] = `^${versions[name]}`;
          touched = true;
        }
      }
    }

    if (touched) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      logger.log(t('create.workspaceReplaced'));
    }
  } catch (err) {
    logger.warn(t('create.workspaceFailed', { reason: String(err) }));
  }
}

async function resolveWorkspaceVersions(names: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(names.map(async (name) => [name, await resolveDepVersion(name)] as const));
  return Object.fromEntries(entries);
}

/** CLIビルド時に焼き込んだフォールバック版数。未知依存はlism-cssの版へフォールバックする。 */
function bakedVersion(name: string): string {
  return LISM_PACKAGE_VERSIONS[name] ?? LISM_PACKAGE_VERSIONS['lism-css'] ?? 'unknown';
}

/**
 * 単一依存の公開バージョンを解決する。
 *
 * CLI が把握している公開 Lism パッケージ（＝焼き込み済み）のみレジストリへ問い合わせ、latest を採用する。
 * 未知の workspace 依存は、無関係な npm パッケージを誤って引かないようレジストリへ問い合わせず焼き込み値を返す。
 * レジストリ取得に失敗した場合も焼き込み値へフォールバックする。
 */
async function resolveDepVersion(name: string): Promise<string> {
  const baked = bakedVersion(name);
  if (!LISM_PACKAGE_VERSIONS[name]) return baked;
  const latest = await fetchLatestVersion(name);
  return latest ?? baked;
}

/**
 * npm レジストリの `<pkg>/latest`（dist-tag latest ＝ 安定版）から version を取得する。
 *
 * パッケージ全体の最新 version を見ると prerelease を拾う恐れがあるため、必ず `/latest` を使う。
 * スコープ名はスラッシュのみ `%2F` にエンコードする（`@lism-css/ui` → `@lism-css%2Fui`）。
 * 失敗（オフライン / タイムアウト / 非 2xx / 不正レスポンス）時は null を返し、呼び出し側でフォールバックする。
 */
async function fetchLatestVersion(name: string): Promise<string | null> {
  const url = `${NPM_REGISTRY_BASE}/${name.replace(/\//g, '%2F')}/latest`;
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}
