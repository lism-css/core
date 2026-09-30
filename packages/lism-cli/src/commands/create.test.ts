import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadTemplate } from 'giget';
import { confirm, input, select } from '@inquirer/prompts';
import { setLang } from '../i18n';
import { runCreate, runCreateWithTemplates } from './create';

vi.mock('giget', () => ({
  downloadTemplate: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../version.js', () => ({
  CLI_VERSION: '0.0.0-test',
  LISM_CSS_VERSION: '1.2.3',
  LISM_PACKAGE_VERSIONS: {
    'lism-css': '1.2.3',
    '@lism-css/ui': '2.3.4',
    '@lism-css/plugin': '3.4.5',
    '@lism-css/icons': '0.1.0',
  },
}));

const cwd = process.cwd();
let tmpDir: string;
const originalIsTTY = process.stdin.isTTY;

function setStdinTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });
}

/** langOverlays(en) を持つ project 型テンプレ（言語プロンプト系テスト共通） */
const LANG_OVERLAY_TEMPLATE: Parameters<typeof runCreateWithTemplates>[1] = [
  {
    slug: 'blog-astro-minimal',
    kind: 'project',
    category: 'blog',
    stack: 'astro',
    variant: 'minimal',
    sourcePath: 'blog/astro/minimal',
    langOverlays: { en: 'blog/astro/minimal/.lang/en' },
    title: { ja: 'Blog Minimal', en: 'Blog Minimal' },
    description: { ja: 'Minimal blog', en: 'Minimal blog' },
  },
];

/** base（ja + .lang/en 同梱）と en overlay（差分のみ）を返す downloadTemplate モック */
function mockBaseWithEnOverlay(): void {
  vi.mocked(downloadTemplate).mockImplementation((source, options) => {
    const dir = (options as { dir: string }).dir;
    fs.mkdirSync(dir, { recursive: true });
    if (String(source).includes('/.lang/en#')) {
      writeFile(path.join(dir, 'src/config/site.ts'), 'export const lang = "en";');
    } else {
      writePackageJson(dir, { name: 'blog-astro-minimal', dependencies: {} });
      writeFile(path.join(dir, 'src/config/site.ts'), 'export const lang = "ja";');
      writeFile(path.join(dir, '.lang/en/src/config/site.ts'), 'export const lang = "en";');
    }
    return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
  });
}

function writePackageJson(dir: string, pkg: Record<string, unknown>): void {
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/** registry の <pkg>/latest を引く URL（スコープ名はスラッシュのみ %2F にエンコード） */
function registryLatestUrl(name: string): string {
  return `https://registry.npmjs.org/${name.replace(/\//g, '%2F')}/latest`;
}

/** fetch モック用の最小 Response。コード側は res.ok と res.json() のみ参照する */
function fetchResponse(ok: boolean, body: unknown): Response {
  return { ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) } as unknown as Response;
}

/** 公開Lismパッケージを workspace:* で持つテンプレ */
function mockTemplateWithWorkspaceDeps(): void {
  vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
    const dir = (options as { dir: string }).dir;
    fs.mkdirSync(dir, { recursive: true });
    writePackageJson(dir, {
      name: 'lp-astro',
      dependencies: {
        'lism-css': 'workspace:*',
        '@lism-css/ui': 'workspace:*',
        '@lism-css/icons': 'workspace:*',
      },
      devDependencies: {
        '@lism-css/plugin': 'workspace:*',
      },
    });
    return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
  });
}

describe('runCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLang('en');
    // 既定は非対話端末として扱い、言語選択プロンプトを出さない（en フォールバック）。
    // 対話プロンプトを検証するテストでは個別に setStdinTTY(true) する。
    setStdinTTY(false);
    tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lism-create-')));
    process.chdir(tmpDir);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // レジストリ取得は既定でオフライン扱い（焼き込み値フォールバック）。テストはネットワークへ出ない。
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'minimal-astro', dependencies: { 'lism-css': 'workspace:*' } });
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    setStdinTTY(originalIsTTY);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('--template指定時は選択UIを呼ばずに対象テンプレートを取得する', async () => {
    await runCreate({ template: 'minimal-astro', targetDir: 'my-app', force: true });

    expect(select).not.toHaveBeenCalled();
    expect(input).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(downloadTemplate).toHaveBeenCalledWith('github:lism-css/core/templates/minimal/astro#main', {
      dir: path.join(tmpDir, 'my-app'),
      force: true,
      forceClean: true,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'my-app', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['lism-css']).not.toBe('workspace:*');
  });

  it('ref指定時はそのrefのテンプレートを取得する', async () => {
    await runCreate({ template: 'minimal-astro', targetDir: 'my-app', force: true, ref: 'dev' });

    expect(downloadTemplate).toHaveBeenCalledWith('github:lism-css/core/templates/minimal/astro#dev', {
      dir: path.join(tmpDir, 'my-app'),
      force: true,
      forceClean: true,
    });
  });

  it('workspace依存をnpmレジストリのlatestへ置換する', async () => {
    mockTemplateWithWorkspaceDeps();
    const latest: Record<string, string> = {
      'lism-css': '9.1.0',
      '@lism-css/ui': '9.2.0',
      '@lism-css/plugin': '9.3.0',
      '@lism-css/icons': '0.2.0',
    };
    // dist-tag latest（= 安定版）を引くので prerelease は誤って選ばれない
    const fetchMock = vi.fn((url: string | URL) => {
      const name = Object.keys(latest).find((n) => String(url) === registryLatestUrl(n));
      return Promise.resolve(fetchResponse(Boolean(name), name ? { version: latest[name] } : {}));
    });
    vi.stubGlobal('fetch', fetchMock);

    await runCreate({ template: 'minimal-astro', targetDir: 'my-app', force: true });

    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'my-app', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies['lism-css']).toBe('^9.1.0');
    expect(pkg.dependencies['@lism-css/ui']).toBe('^9.2.0');
    expect(pkg.dependencies['@lism-css/icons']).toBe('^0.2.0');
    expect(pkg.devDependencies['@lism-css/plugin']).toBe('^9.3.0');
    // スコープ付きはスラッシュのみ %2F にエンコードして /latest を引く
    expect(fetchMock).toHaveBeenCalledWith('https://registry.npmjs.org/@lism-css%2Fui/latest', expect.anything());
    expect(fetchMock).toHaveBeenCalledWith('https://registry.npmjs.org/@lism-css%2Ficons/latest', expect.anything());
  });

  it('レジストリ到達不可時はCLI焼き込み版へフォールバックする', async () => {
    mockTemplateWithWorkspaceDeps();
    // fetch は beforeEach の既定（offline 拒否）のまま

    await runCreate({ template: 'minimal-astro', targetDir: 'my-app', force: true });

    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'my-app', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies['lism-css']).toBe('^1.2.3');
    expect(pkg.dependencies['@lism-css/ui']).toBe('^2.3.4');
    expect(pkg.dependencies['@lism-css/icons']).toBe('^0.1.0');
    expect(pkg.devDependencies['@lism-css/plugin']).toBe('^3.4.5');
  });

  it('一部依存がレジストリで取得できない場合、その依存だけ焼き込み版へフォールバックする', async () => {
    mockTemplateWithWorkspaceDeps();
    const fetchMock = vi.fn((url: string | URL) => {
      // lism-css は取得成功、それ以外は 404
      if (String(url) === registryLatestUrl('lism-css')) return Promise.resolve(fetchResponse(true, { version: '9.9.9' }));
      return Promise.resolve(fetchResponse(false, {}));
    });
    vi.stubGlobal('fetch', fetchMock);

    await runCreate({ template: 'minimal-astro', targetDir: 'my-app', force: true });

    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'my-app', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies['lism-css']).toBe('^9.9.9'); // registry latest
    expect(pkg.dependencies['@lism-css/ui']).toBe('^2.3.4'); // 404 → 焼き込み値
    expect(pkg.dependencies['@lism-css/icons']).toBe('^0.1.0');
    expect(pkg.devDependencies['@lism-css/plugin']).toBe('^3.4.5'); // 404 → 焼き込み値
  });

  it('stackが1件だけなら選択をスキップして自動確定する', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'minimal-astro',
        kind: 'project',
        category: 'minimal',
        stack: 'astro',
        sourcePath: 'minimal/astro',
        title: { ja: 'Minimal Astro', en: 'Minimal Astro' },
        description: { ja: 'Astro minimal', en: 'Astro minimal' },
      },
    ];
    vi.mocked(select).mockResolvedValue('minimal');
    vi.mocked(input).mockResolvedValue('picked-app');

    await runCreateWithTemplates({ force: true }, templates);

    expect(select).toHaveBeenCalledTimes(1);
    expect(input).toHaveBeenCalledTimes(1);
    expect(downloadTemplate).toHaveBeenCalledWith('github:lism-css/core/templates/minimal/astro#main', {
      dir: path.join(tmpDir, 'picked-app'),
      force: true,
      forceClean: true,
    });
  });

  it('variantが複数ある場合はstack自動確定後に件数付きvariant選択を出す', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'blog-astro-minimal',
        kind: 'project',
        category: 'blog',
        stack: 'astro',
        variant: 'minimal',
        variantLabel: { ja: 'Minimal', en: 'Minimal' },
        sourcePath: 'blog/astro/minimal',
        title: { ja: 'Blog Minimal', en: 'Blog Minimal' },
        description: { ja: 'Minimal blog', en: 'Minimal blog' },
      },
      {
        slug: 'blog-astro-techlog',
        kind: 'project',
        category: 'blog',
        stack: 'astro',
        variant: 'techlog',
        variantLabel: { ja: 'Tech Log', en: 'Tech Log' },
        sourcePath: 'blog/astro/techlog',
        title: { ja: 'Blog Tech Log', en: 'Blog Tech Log' },
        description: { ja: 'Tech blog', en: 'Tech blog' },
      },
    ];
    vi.mocked(select).mockResolvedValueOnce('blog').mockResolvedValueOnce('minimal');
    vi.mocked(input).mockResolvedValue('blog-app');

    await runCreateWithTemplates({ force: true }, templates);

    expect(select).toHaveBeenCalledTimes(2);
    expect((vi.mocked(select).mock.calls[1][0] as { message: string }).message).toBe('Select a type (2 options):');
    expect(downloadTemplate).toHaveBeenCalledWith('github:lism-css/core/templates/blog/astro/minimal#main', {
      dir: path.join(tmpDir, 'blog-app'),
      force: true,
      forceClean: true,
    });
  });

  it('base-overlay型はbase取得後にoverlayをmergeし、package.json.nameをslugにする', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'lp-astro-saas',
        kind: 'base-overlay',
        category: 'lp',
        stack: 'astro',
        variant: 'saas',
        variantLabel: { ja: 'SaaS', en: 'SaaS' },
        basePath: 'lp/astro/_base',
        overlayPath: 'lp/astro/_variants/saas',
        title: { ja: 'LP SaaS', en: 'LP SaaS' },
        description: { ja: 'SaaS LP', en: 'SaaS landing page' },
      },
    ];
    vi.mocked(downloadTemplate).mockImplementation((source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      if (String(source).includes('/_base#')) {
        writePackageJson(dir, { name: 'lp-astro-base', dependencies: { 'lism-css': 'workspace:*' } });
        writeFile(path.join(dir, 'src/pages/index.astro'), 'base');
      } else {
        writeFile(path.join(dir, 'src/pages/index.astro'), 'overlay');
        writeFile(path.join(dir, 'src/styles/variant.css'), '.hero{}');
      }
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'lp-astro-saas', targetDir: 'lp-app', force: true }, templates);

    const outDir = path.join(tmpDir, 'lp-app');
    expect(downloadTemplate).toHaveBeenCalledTimes(2);
    expect(downloadTemplate).toHaveBeenNthCalledWith(1, 'github:lism-css/core/templates/lp/astro/_base#main', {
      dir: outDir,
      force: true,
      forceClean: true,
    });
    expect(downloadTemplate).toHaveBeenNthCalledWith(2, 'github:lism-css/core/templates/lp/astro/_variants/saas#main', {
      dir: expect.any(String),
      force: true,
      forceClean: true,
    });
    expect(fs.readFileSync(path.join(outDir, 'src/pages/index.astro'), 'utf-8')).toBe('overlay');
    expect(fs.existsSync(path.join(outDir, 'src/styles/variant.css'))).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(outDir, 'package.json'), 'utf-8')) as { name: string };
    expect(pkg.name).toBe('lp-astro-saas');
  });

  it('project型はlangOverlaysに要求言語があればbase取得後にoverlayをmergeし、.langを除去する', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'blog-astro-minimal',
        kind: 'project',
        category: 'blog',
        stack: 'astro',
        variant: 'minimal',
        sourcePath: 'blog/astro/minimal',
        langOverlays: { en: 'blog/astro/minimal/.lang/en' },
        title: { ja: 'Blog Minimal', en: 'Blog Minimal' },
        description: { ja: 'Minimal blog', en: 'Minimal blog' },
      },
    ];
    vi.mocked(downloadTemplate).mockImplementation((source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      if (String(source).includes('/.lang/en#')) {
        // 英語 overlay（差分のみ）
        writeFile(path.join(dir, 'src/config/site.ts'), 'export const lang = "en";');
        writeFile(path.join(dir, 'src/posts/first-blog.md'), 'EN post');
      } else {
        // base（日本語 + .lang 同梱）
        writePackageJson(dir, { name: 'blog-astro-minimal', dependencies: { 'lism-css': 'workspace:*' } });
        writeFile(path.join(dir, 'src/config/site.ts'), 'export const lang = "ja";');
        writeFile(path.join(dir, 'src/posts/first-blog.md'), 'JA post');
        writeFile(path.join(dir, '.lang/en/src/config/site.ts'), 'export const lang = "en";');
      }
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'blog-astro-minimal', targetDir: 'blog-app', force: true, lang: 'en' }, templates);

    const outDir = path.join(tmpDir, 'blog-app');
    // base + overlay の 2 回取得
    expect(downloadTemplate).toHaveBeenCalledTimes(2);
    expect(downloadTemplate).toHaveBeenNthCalledWith(1, 'github:lism-css/core/templates/blog/astro/minimal#main', {
      dir: outDir,
      force: true,
      forceClean: true,
    });
    expect(downloadTemplate).toHaveBeenNthCalledWith(2, 'github:lism-css/core/templates/blog/astro/minimal/.lang/en#main', {
      dir: expect.any(String),
      force: true,
      forceClean: true,
    });
    // overlay が base を上書きしている
    expect(fs.readFileSync(path.join(outDir, 'src/config/site.ts'), 'utf-8')).toBe('export const lang = "en";');
    expect(fs.readFileSync(path.join(outDir, 'src/posts/first-blog.md'), 'utf-8')).toBe('EN post');
    // 言語 overlay 配信元（.lang）は生成プロジェクトに残らない
    expect(fs.existsSync(path.join(outDir, '.lang'))).toBe(false);
  });

  it('project型でも要求言語にoverlayが無ければoverlayを取得せず、.langは除去する', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'blog-astro-minimal',
        kind: 'project',
        category: 'blog',
        stack: 'astro',
        variant: 'minimal',
        sourcePath: 'blog/astro/minimal',
        langOverlays: { en: 'blog/astro/minimal/.lang/en' },
        title: { ja: 'Blog Minimal', en: 'Blog Minimal' },
        description: { ja: 'Minimal blog', en: 'Minimal blog' },
      },
    ];
    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'blog-astro-minimal', dependencies: {} });
      writeFile(path.join(dir, 'src/config/site.ts'), 'export const lang = "ja";');
      writeFile(path.join(dir, '.lang/en/src/config/site.ts'), 'export const lang = "en";');
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'blog-astro-minimal', targetDir: 'blog-ja', force: true, lang: 'ja' }, templates);

    const outDir = path.join(tmpDir, 'blog-ja');
    // base のみ（ja overlay は未定義なので overlay 取得は走らない）
    expect(downloadTemplate).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(path.join(outDir, 'src/config/site.ts'), 'utf-8')).toBe('export const lang = "ja";');
    expect(fs.existsSync(path.join(outDir, '.lang'))).toBe(false);
  });

  it('langOverlays未定義のproject型は--lang enでもoverlayを取得しない', async () => {
    // beforeEach の mock（langOverlays 無しの minimal-astro 相当）をそのまま使う
    await runCreate({ template: 'minimal-astro', targetDir: 'my-app', force: true, lang: 'en' });

    expect(downloadTemplate).toHaveBeenCalledTimes(1);
  });

  it('--lang未指定+非TTYは言語プロンプトを出さずenにフォールバックし、enのoverlayを適用する', async () => {
    setStdinTTY(false);
    mockBaseWithEnOverlay();

    await runCreateWithTemplates({ template: 'blog-astro-minimal', targetDir: 'blog-app', force: true }, LANG_OVERLAY_TEMPLATE);

    expect(select).not.toHaveBeenCalled();
    // base + en overlay の 2 回取得（en にフォールバック）
    expect(downloadTemplate).toHaveBeenCalledTimes(2);
    expect(fs.readFileSync(path.join(tmpDir, 'blog-app', 'src/config/site.ts'), 'utf-8')).toBe('export const lang = "en";');
  });

  it('--lang未指定+TTYは最初に言語選択を出し、選択言語(en)のoverlayを適用する', async () => {
    setStdinTTY(true);
    mockBaseWithEnOverlay();
    vi.mocked(select).mockResolvedValueOnce('en');

    await runCreateWithTemplates({ template: 'blog-astro-minimal', targetDir: 'blog-app', force: true }, LANG_OVERLAY_TEMPLATE);

    // template/targetDir 指定済みなので select は言語選択の1回だけ
    expect(select).toHaveBeenCalledTimes(1);
    expect((vi.mocked(select).mock.calls[0][0] as { message: string }).message).toBe('Select language / 言語を選択:');
    // 選択した en の overlay が適用される
    expect(downloadTemplate).toHaveBeenCalledTimes(2);
    expect(fs.readFileSync(path.join(tmpDir, 'blog-app', 'src/config/site.ts'), 'utf-8')).toBe('export const lang = "en";');
  });

  it('--lang未指定+TTYで言語にjaを選ぶと、enのoverlayは適用されずjaベースになる', async () => {
    setStdinTTY(true);
    mockBaseWithEnOverlay();
    vi.mocked(select).mockResolvedValueOnce('ja');

    await runCreateWithTemplates({ template: 'blog-astro-minimal', targetDir: 'blog-ja', force: true }, LANG_OVERLAY_TEMPLATE);

    expect(select).toHaveBeenCalledTimes(1);
    expect(downloadTemplate).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(path.join(tmpDir, 'blog-ja', 'src/config/site.ts'), 'utf-8')).toBe('export const lang = "ja";');
  });

  it('--lang ja明示時はTTYでも言語プロンプトを出さずjaベースを生成する', async () => {
    setStdinTTY(true);
    mockBaseWithEnOverlay();

    await runCreateWithTemplates({ template: 'blog-astro-minimal', targetDir: 'blog-ja', force: true, lang: 'ja' }, LANG_OVERLAY_TEMPLATE);

    expect(select).not.toHaveBeenCalled();
    expect(downloadTemplate).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(path.join(tmpDir, 'blog-ja', 'src/config/site.ts'), 'utf-8')).toBe('export const lang = "ja";');
  });

  it('--lang未指定+TTYで対話が必要な場合、言語選択を一番最初に出す', async () => {
    setStdinTTY(true);
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'blog-astro-minimal',
        kind: 'project',
        category: 'blog',
        stack: 'astro',
        variant: 'minimal',
        variantLabel: { ja: 'Minimal', en: 'Minimal' },
        sourcePath: 'blog/astro/minimal',
        title: { ja: 'Blog Minimal', en: 'Blog Minimal' },
        description: { ja: 'Minimal blog', en: 'Minimal blog' },
      },
      {
        slug: 'blog-astro-techlog',
        kind: 'project',
        category: 'blog',
        stack: 'astro',
        variant: 'techlog',
        variantLabel: { ja: 'Tech Log', en: 'Tech Log' },
        sourcePath: 'blog/astro/techlog',
        title: { ja: 'Blog Tech Log', en: 'Blog Tech Log' },
        description: { ja: 'Tech blog', en: 'Tech blog' },
      },
    ];
    vi.mocked(select)
      .mockResolvedValueOnce('en') // 言語
      .mockResolvedValueOnce('blog') // カテゴリ
      .mockResolvedValueOnce('minimal'); // タイプ（variant）
    vi.mocked(input).mockResolvedValue('blog-app');

    await runCreateWithTemplates({ force: true }, templates);

    // 言語 → カテゴリ → タイプ の 3 回。1 回目が言語選択であること
    expect(select).toHaveBeenCalledTimes(3);
    expect((vi.mocked(select).mock.calls[0][0] as { message: string }).message).toBe('Select language / 言語を選択:');
  });

  it('single-project-variant型は選択variantのindex.astroをsrc/pages/index.astroに持ち上げ、他variantを削除しpackage.json.nameを書き換える', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'lp-astro-interior',
        kind: 'single-project-variant',
        category: 'lp',
        stack: 'astro',
        variant: 'interior',
        variantLabel: { ja: 'Interior', en: 'Interior' },
        sourcePath: 'lp/astro',
        packageName: 'lp-astro-interior',
        title: { ja: 'LP Interior', en: 'LP Interior' },
        description: { ja: 'Interior LP', en: 'Interior landing page' },
      },
    ];

    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'lp-astro', dependencies: { 'lism-css': 'workspace:*' } });
      writeFile(path.join(dir, 'src/pages/index.astro'), 'list');
      writeFile(path.join(dir, 'src/pages/corporate/index.astro'), 'corporate');
      writeFile(path.join(dir, 'src/pages/interior/index.astro'), 'interior');
      writeFile(path.join(dir, 'src/pages/interior/_style.css'), '.interior{}');
      writeFile(path.join(dir, 'src/pages/ryokan/index.astro'), 'ryokan');
      writeFile(path.join(dir, 'src/pages/ryokan/_style.css'), '.ryokan{}');
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'lp-astro-interior', targetDir: 'lp-app', force: true }, templates);

    const outDir = path.join(tmpDir, 'lp-app');

    // 選択 variant の index.astro が src/pages/index.astro に持ち上がっている
    expect(fs.readFileSync(path.join(outDir, 'src/pages/index.astro'), 'utf-8')).toBe('interior');

    // 選択 variant の付随ファイル（_style.css）も src/pages/ に持ち上がっている
    expect(fs.readFileSync(path.join(outDir, 'src/pages/_style.css'), 'utf-8')).toBe('.interior{}');

    // 他 variant ディレクトリ + 自分の variant ディレクトリも残らない
    expect(fs.existsSync(path.join(outDir, 'src/pages/corporate'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/pages/interior'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/pages/ryokan'))).toBe(false);

    // src/pages 直下に残るのは index.astro と _style.css のみ
    const remaining = fs.readdirSync(path.join(outDir, 'src/pages')).sort();
    expect(remaining).toEqual(['_style.css', 'index.astro']);

    // テンプレートに無い components ディレクトリを勝手に作らない
    expect(fs.existsSync(path.join(outDir, 'src/components'))).toBe(false);

    // package.json の name が packageName に書き換わる
    const pkg = JSON.parse(fs.readFileSync(path.join(outDir, 'package.json'), 'utf-8')) as {
      name: string;
      dependencies: Record<string, string>;
    };
    expect(pkg.name).toBe('lp-astro-interior');
    // workspace:* も同時に置換される
    expect(pkg.dependencies['lism-css']).not.toBe('workspace:*');
  });

  it('single-project-variant型はsrc/配下の任意のサブディレクトリの{variant}/も持ち上げ、@/{dir}/{variant}/形式のimportを書き換える', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'lp-astro-corporate',
        kind: 'single-project-variant',
        category: 'lp',
        stack: 'astro',
        variant: 'corporate',
        variantLabel: { ja: 'Corporate', en: 'Corporate' },
        sourcePath: 'lp/astro',
        packageName: 'lp-astro-corporate',
        title: { ja: 'LP Corporate', en: 'LP Corporate' },
        description: { ja: 'Corporate LP', en: 'Corporate landing page' },
      },
    ];

    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'lp-astro', dependencies: { 'lism-css': 'workspace:*' } });

      // pages: index は corporate のみ持ち上がる想定
      writeFile(
        path.join(dir, 'src/pages/corporate/index.astro'),
        [
          '---',
          "import Hero from '@/components/corporate/Hero.astro';",
          "import Heading from '@/components/corporate/Heading.astro';",
          "import '@/styles/corporate/main.css';",
          '---',
          '<Hero /> <Heading />',
        ].join('\n')
      );
      writeFile(path.join(dir, 'src/pages/corporate/_style.css'), '.corporate{}');
      writeFile(path.join(dir, 'src/pages/interior/index.astro'), 'interior');

      // components: variant ディレクトリ規約
      writeFile(path.join(dir, 'src/components/corporate/Hero.astro'), '<div>corp hero</div>');
      writeFile(path.join(dir, 'src/components/corporate/Heading.astro'), '<h1>corp</h1>');
      writeFile(path.join(dir, 'src/components/interior/Hero.astro'), '<div>nat hero</div>');

      // styles: variant ディレクトリ規約
      writeFile(path.join(dir, 'src/styles/corporate/main.css'), '.corp-main{}');
      writeFile(path.join(dir, 'src/styles/interior/main.css'), '.nat-main{}');

      // lib: 共通ファイル + variant 規約は存在しない（このディレクトリは触らない）
      writeFile(path.join(dir, 'src/lib/util.ts'), 'export const x = 1;');

      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'lp-astro-corporate', targetDir: 'lp-app', force: true }, templates);

    const outDir = path.join(tmpDir, 'lp-app');

    // pages: corporate が持ち上がり、他 variant + 自 variant ディレクトリは消える
    expect(fs.existsSync(path.join(outDir, 'src/pages/corporate'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/pages/interior'))).toBe(false);
    expect(fs.readFileSync(path.join(outDir, 'src/pages/_style.css'), 'utf-8')).toBe('.corporate{}');

    // pages/index.astro 内の @/components/corporate/ → @/components/ に書き換え
    const indexContent = fs.readFileSync(path.join(outDir, 'src/pages/index.astro'), 'utf-8');
    expect(indexContent).toContain("import Hero from '@/components/Hero.astro';");
    expect(indexContent).toContain("import Heading from '@/components/Heading.astro';");
    expect(indexContent).toContain("import '@/styles/main.css';");
    expect(indexContent).not.toContain('/corporate/');

    // components: corporate の中身が持ち上がり、他 variant は消える
    expect(fs.existsSync(path.join(outDir, 'src/components/corporate'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/components/interior'))).toBe(false);
    expect(fs.readFileSync(path.join(outDir, 'src/components/Hero.astro'), 'utf-8')).toBe('<div>corp hero</div>');
    expect(fs.readFileSync(path.join(outDir, 'src/components/Heading.astro'), 'utf-8')).toBe('<h1>corp</h1>');

    // styles: 同様
    expect(fs.existsSync(path.join(outDir, 'src/styles/corporate'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/styles/interior'))).toBe(false);
    expect(fs.readFileSync(path.join(outDir, 'src/styles/main.css'), 'utf-8')).toBe('.corp-main{}');

    // lib: variant 規約のディレクトリではないので既存ファイルはそのまま
    expect(fs.readFileSync(path.join(outDir, 'src/lib/util.ts'), 'utf-8')).toBe('export const x = 1;');
  });

  it('single-project-variant型でvariantディレクトリが空でもエラーにならず、他variantを掃除する', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'lp-astro-corp-empty',
        kind: 'single-project-variant',
        category: 'lp',
        stack: 'astro',
        variant: 'corporate',
        sourcePath: 'lp/astro',
        packageName: 'lp-astro-corp-empty',
        title: { ja: 'LP Corp Empty', en: 'LP Corp Empty' },
        description: { ja: 'corp empty', en: 'corp empty' },
      },
    ];

    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'lp-astro', dependencies: {} });
      writeFile(path.join(dir, 'src/pages/corporate/index.astro'), 'corp');
      // components/corporate/ は空ディレクトリだが、他 variant には中身がある
      fs.mkdirSync(path.join(dir, 'src/components/corporate'), { recursive: true });
      writeFile(path.join(dir, 'src/components/interior/Hero.astro'), '<div>nat</div>');
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'lp-astro-corp-empty', targetDir: 'lp-corp-empty', force: true }, templates);

    const outDir = path.join(tmpDir, 'lp-corp-empty');
    // corporate ディレクトリは空でもエラーにならず、interior は掃除される
    expect(fs.existsSync(path.join(outDir, 'src/components/corporate'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/components/interior'))).toBe(false);
    // 持ち上げる中身が無いので components 直下に追加ファイルは無いが、ディレクトリ自体は残る
    expect(fs.existsSync(path.join(outDir, 'src/components'))).toBe(true);
    expect(fs.readdirSync(path.join(outDir, 'src/components'))).toEqual([]);
  });

  it('single-project-variant型で対象variantが存在しない場合はvariantMissingを返す', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'lp-astro-missing',
        kind: 'single-project-variant',
        category: 'lp',
        stack: 'astro',
        variant: 'missing',
        sourcePath: 'lp/astro',
        packageName: 'lp-astro-missing',
        title: { ja: 'LP Missing', en: 'LP Missing' },
        description: { ja: 'missing', en: 'missing' },
      },
    ];

    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'lp-astro', dependencies: {} });
      writeFile(path.join(dir, 'src/pages/index.astro'), 'list');
      writeFile(path.join(dir, 'src/pages/corporate/index.astro'), 'corporate');
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await expect(runCreateWithTemplates({ template: 'lp-astro-missing', targetDir: 'lp-missing', force: true }, templates)).rejects.toThrow(
      'Variant "missing"'
    );
  });

  it('single-project-variant型はlang=enで{variant}/を持ち上げた上にen/{variant}/を上書きし、両形式のalias importを書き換え、他variant・enディレクトリを掃除する', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'lp-astro-corporate',
        kind: 'single-project-variant',
        category: 'lp',
        stack: 'astro',
        variant: 'corporate',
        sourcePath: 'lp/astro',
        packageName: 'lp-astro-corporate',
        title: { ja: 'LP Corporate', en: 'LP Corporate' },
        description: { ja: 'Corporate LP', en: 'Corporate landing page' },
      },
    ];

    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'lp-astro', dependencies: { 'lism-css': 'workspace:*' } });
      // ja base（各 variant）。_style.css と Footer は en に無く、base から持ち上がる
      writeFile(path.join(dir, 'src/pages/index.astro'), 'gallery');
      writeFile(path.join(dir, 'src/pages/corporate/index.astro'), 'ja corporate');
      writeFile(path.join(dir, 'src/pages/corporate/_style.css'), '.corp{}');
      writeFile(path.join(dir, 'src/pages/interior/index.astro'), 'ja interior');
      writeFile(path.join(dir, 'src/components/corporate/Header.astro'), '<div>ja corp header</div>');
      writeFile(path.join(dir, 'src/components/corporate/Footer.astro'), '<div>shared footer</div>');
      writeFile(path.join(dir, 'src/components/interior/Header.astro'), '<div>ja interior header</div>');
      // en 差分（src/pages/en/{variant}/ + src/components/en/{variant}/）。base 側は @/{dir}/{variant}/ の alias で参照する
      writeFile(
        path.join(dir, 'src/pages/en/corporate/index.astro'),
        [
          "import Header from '@/components/en/corporate/Header.astro';",
          "import Footer from '@/components/corporate/Footer.astro';",
          "import '@/pages/corporate/_style.css';",
          '<Header /> en corporate <Footer />',
        ].join('\n')
      );
      writeFile(path.join(dir, 'src/pages/en/index.astro'), 'en gallery');
      writeFile(path.join(dir, 'src/pages/en/interior/index.astro'), 'en interior');
      writeFile(path.join(dir, 'src/components/en/corporate/Header.astro'), '<div>en corp header</div>');
      writeFile(path.join(dir, 'src/components/en/interior/Header.astro'), '<div>en interior header</div>');
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'lp-astro-corporate', targetDir: 'lp-en', force: true, lang: 'en' }, templates);

    const outDir = path.join(tmpDir, 'lp-en');

    // en/corporate の index.astro が ja の index.astro を上書きして src/pages/index.astro になる
    const indexContent = fs.readFileSync(path.join(outDir, 'src/pages/index.astro'), 'utf-8');
    expect(indexContent).toContain('en corporate');
    // en に無い base の付随ファイルは base から持ち上がる
    expect(fs.readFileSync(path.join(outDir, 'src/pages/_style.css'), 'utf-8')).toBe('.corp{}');
    // @/{dir}/en/corporate/ と @/{dir}/corporate/ の両形式が @/{dir}/ に書き換わる
    expect(indexContent).toContain("import Header from '@/components/Header.astro';");
    expect(indexContent).toContain("import Footer from '@/components/Footer.astro';");
    expect(indexContent).toContain("import '@/pages/_style.css';");
    expect(indexContent).not.toContain('/en/corporate/');
    expect(indexContent).not.toContain('/corporate/');

    // ja variant・他 variant・en ディレクトリは生成物に残らない
    expect(fs.existsSync(path.join(outDir, 'src/pages/corporate'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/pages/interior'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/pages/en'))).toBe(false);
    expect(fs.readdirSync(path.join(outDir, 'src/pages')).sort()).toEqual(['_style.css', 'index.astro']);

    // components は base を持ち上げた上に en/corporate が上書きされ、ja・他 variant・en は消える
    expect(fs.readFileSync(path.join(outDir, 'src/components/Header.astro'), 'utf-8')).toBe('<div>en corp header</div>');
    expect(fs.readFileSync(path.join(outDir, 'src/components/Footer.astro'), 'utf-8')).toBe('<div>shared footer</div>');
    expect(fs.existsSync(path.join(outDir, 'src/components/corporate'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/components/interior'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'src/components/en'))).toBe(false);
  });

  it('single-project-variant型はlang=enでも対象variantのen版が無ければjaベースにフォールバックし、無関係なenは掃除する', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'lp-astro-ryokan',
        kind: 'single-project-variant',
        category: 'lp',
        stack: 'astro',
        variant: 'ryokan',
        sourcePath: 'lp/astro',
        packageName: 'lp-astro-ryokan',
        title: { ja: 'LP Ryokan', en: 'LP Ryokan' },
        description: { ja: 'Ryokan LP', en: 'Ryokan landing page' },
      },
    ];

    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      const dir = (options as { dir: string }).dir;
      fs.mkdirSync(dir, { recursive: true });
      writePackageJson(dir, { name: 'lp-astro', dependencies: {} });
      // 対象 ryokan の en 版は無い。ja base と、別 variant の en だけが存在する
      writeFile(path.join(dir, 'src/pages/ryokan/index.astro'), 'ja ryokan');
      writeFile(path.join(dir, 'src/pages/en/corporate/index.astro'), 'en corporate');
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await runCreateWithTemplates({ template: 'lp-astro-ryokan', targetDir: 'lp-ryokan-en', force: true, lang: 'en' }, templates);

    const outDir = path.join(tmpDir, 'lp-ryokan-en');
    // en/ryokan が無いので ja の ryokan にフォールバックして持ち上がる
    expect(fs.readFileSync(path.join(outDir, 'src/pages/index.astro'), 'utf-8')).toBe('ja ryokan');
    // 別 variant の en ディレクトリも生成物には残らない
    expect(fs.existsSync(path.join(outDir, 'src/pages/en'))).toBe(false);
  });

  it('--templateにカテゴリslugを指定するとstack選択へ降りる', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'minimal-astro',
        kind: 'project',
        category: 'minimal',
        stack: 'astro',
        sourcePath: 'minimal/astro',
        title: { ja: 'Minimal Astro', en: 'Minimal Astro' },
        description: { ja: 'Astro minimal', en: 'Astro minimal' },
      },
      {
        slug: 'minimal-vite',
        kind: 'project',
        category: 'minimal',
        stack: 'vite',
        sourcePath: 'minimal/vite',
        title: { ja: 'Minimal Vite', en: 'Minimal Vite' },
        description: { ja: 'Vite minimal', en: 'Vite minimal' },
      },
    ];
    vi.mocked(select).mockResolvedValueOnce('vite');

    await runCreateWithTemplates({ template: 'minimal', targetDir: 'cat-app', force: true }, templates);

    expect(select).toHaveBeenCalledTimes(1);
    expect((vi.mocked(select).mock.calls[0][0] as { message: string }).message).toBe('Select a stack (2 options):');
    expect(downloadTemplate).toHaveBeenCalledWith('github:lism-css/core/templates/minimal/vite#main', {
      dir: path.join(tmpDir, 'cat-app'),
      force: true,
      forceClean: true,
    });
  });

  it('--templateにカテゴリslugを指定し対象テンプレートが0件なら従来通りエラーを返す', async () => {
    const templates: Parameters<typeof runCreateWithTemplates>[1] = [
      {
        slug: 'minimal-astro',
        kind: 'project',
        category: 'minimal',
        stack: 'astro',
        sourcePath: 'minimal/astro',
        title: { ja: 'Minimal Astro', en: 'Minimal Astro' },
        description: { ja: 'Astro minimal', en: 'Astro minimal' },
      },
    ];

    await expect(runCreateWithTemplates({ template: 'blog', targetDir: 'x', force: true }, templates)).rejects.toThrow('Template "blog" not found');
  });

  it('templateNotFoundを返す', async () => {
    await expect(runCreateWithTemplates({ template: 'missing', targetDir: 'x', force: true }, [])).rejects.toThrow('Template "missing" not found');
  });

  it('project型でpackage.jsonがない場合はtemplatePackageMissingを返す', async () => {
    vi.mocked(downloadTemplate).mockImplementation((_source, options) => {
      fs.mkdirSync((options as { dir: string }).dir, { recursive: true });
      return Promise.resolve({} as Awaited<ReturnType<typeof downloadTemplate>>);
    });

    await expect(runCreate({ template: 'minimal-astro', targetDir: 'broken', force: true })).rejects.toThrow('package.json');
  });

  it('上書き確認でnoなら中断してdownloadしない', async () => {
    const outDir = path.join(tmpDir, 'occupied');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'keep.txt'), 'keep');
    vi.mocked(confirm).mockResolvedValue(false);

    await runCreate({ template: 'minimal-astro', targetDir: 'occupied' });

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(downloadTemplate).not.toHaveBeenCalled();
  });
});
