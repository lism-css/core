/**
 * テンプレート定義の Single Source of Truth (SSOT)。
 *
 * このファイルから:
 * - `packages/lism-cli/src/commands/create.ts` の TEMPLATES
 * - `apps/site/src/config/templates.ts` の templates
 * の両方を組み立てる。CLI 側からも import されるため Astro / Vite 専用の型
 * （ImageMetadata 等）には依存しない。サムネ画像（ImageMetadata）は docs 側で
 * `templates/{sourcePath}/screenshots/{top または variant}.png` の規約から解決する。
 */

export type Stack = 'astro' | 'next' | 'vite';
export type CategoryId = 'minimal' | 'blog' | 'lp' | 'web';

export interface LocalizedText {
  ja: string;
  en: string;
}

interface LocalizedTextList {
  ja: string[];
  en: string[];
}

interface TemplateMetaBase {
  slug: string;
  category: CategoryId;
  stack: Stack;
  variant?: string;
  variantLabel?: LocalizedText;
  title: LocalizedText;
  /** 短い説明。CLI の選択肢と docs 一覧カードの抜粋に使うため 1 文に収める */
  description: LocalizedText;
  /** 長い説明（docs 専用 / 任意）。カテゴリページ・詳細ページで使う。未指定なら description を表示する */
  intro?: LocalizedText;
  /** プレビューサイトの URL（無い場合は docs でボタン非表示） */
  previewUrl?: string;
  /**
   * 英語版プレビューの URL（集約サイトで en を配信しているテンプレのみ）。
   * docs の en 表示でプレビューボタンの遷移先に使う。未指定なら ja の `previewUrl` に
   * フォールバックする（getPreviewUrl）。
   */
  previewUrlEn?: string;
  /** true の場合、CLI の一覧・選択・slug 解決から除外、docs でも本番ビルドで非表示 */
  draft?: boolean;
  /**
   * 紹介カードに表示する機能リスト（docs 専用 / 任意）。
   * 各テンプレを差別化する機能だけを並べる。共通機能（sitemap 等）は
   * カード群外のリード文で別途案内するため、ここには含めない方針。
   */
  features?: LocalizedTextList;
}

export interface ProjectTemplateDef extends TemplateMetaBase {
  kind: 'project';
  /** `templates/` 配下のプロジェクトディレクトリ（例: 'minimal/astro'） */
  sourcePath: string;
  /**
   * 言語別 overlay の `templates/` 配下パス（giget の source path）。
   * 要求言語に対応する overlay があれば、`sourcePath` 取得後に差分をマージする。
   * overlay は差分ファイルのみを置く（フル複製しない）。base 言語（多くは `ja`）は
   * `sourcePath` 自体が対応言語なので、ここに含めない。
   * 例: `{ en: 'blog/astro/minimal/.lang/en' }`
   */
  langOverlays?: Partial<Record<'ja' | 'en', string>>;
}

/**
 * 単一の Astro / Vite プロジェクト内に複数 variant（src/pages/{variant}/）を同居させた構成。
 * CLI 抽出時に選択 variant の index.astro を src/pages/index.astro に持ち上げ、
 * 他 variant ディレクトリを削除して単独プロジェクトとして仕上げる。
 *
 * 言語別展開: 文章量が多くデザインごと差し替えたい LP 等では、英語版を `.lang/` overlay ではなく
 * `src/pages/{lang}/{variant}/`（+ `src/components/{lang}/{variant}/` 等）に同梱する。置くのは base と
 * 違うファイルだけでよく、base 側は `@/{dir}/{variant}/...` の alias で参照する（CLI が抽出時に
 * `{variant}/` → `{lang}/{variant}/` の順で持ち上げ、同名ファイルは lang 側が上書きする）。
 * `--lang en` 等で `src/pages/{lang}/{variant}/index.astro` があるときだけ lang 側を重ね、
 * 無ければ base（`variant`）だけを使う（manifest 側の追加定義は不要）。
 */
export interface SingleProjectVariantTemplateDef extends TemplateMetaBase {
  kind: 'single-project-variant';
  /** `templates/` 配下のプロジェクト全体パス（例: 'lp/astro'） */
  sourcePath: string;
  /** `src/pages/{variant}/` のディレクトリ名 */
  variant: string;
  /** 生成プロジェクトの package.json の name に書き換える値。未指定時は `slug` を使う */
  packageName?: string;
}

export type TemplateDef = ProjectTemplateDef | SingleProjectVariantTemplateDef;

/**
 * テンプレプレビュー集約サイトのオリジン。全 previewUrl をこの 1 箇所で束ねる。
 * 配信は単一 Cloudflare Pages（lism-templates）にサブパスで集約しており、
 * パス設計は build-previews.mjs と対になっている:
 *   - project           : /{slug}/        （en があれば /{slug}/en/）
 *   - single-project-variant（lp/astro）: /lp-astro/{variant}/（en は /lp-astro/en/{variant}/）
 */
const PREVIEW_ORIGIN = 'https://templates.lism-css.com';

/** 配信対象の templates 一覧 */
export const TEMPLATES: TemplateDef[] = [
  {
    slug: 'minimal-astro',
    kind: 'project',
    category: 'minimal',
    stack: 'astro',
    sourcePath: 'minimal/astro',
    title: { ja: 'Minimal Astro', en: 'Minimal Astro' },
    description: { ja: 'Astro ベースの最小構成', en: 'Minimal Astro setup' },
  },
  {
    slug: 'minimal-vite',
    kind: 'project',
    category: 'minimal',
    stack: 'vite',
    sourcePath: 'minimal/vite',
    title: { ja: 'Minimal Vite', en: 'Minimal Vite' },
    description: { ja: 'Vite + React ベースの最小構成', en: 'Minimal Vite + React setup' },
    previewUrl: `${PREVIEW_ORIGIN}/minimal-vite/`,
  },
  {
    slug: 'minimal-next',
    kind: 'project',
    category: 'minimal',
    stack: 'next',
    sourcePath: 'minimal/next',
    title: { ja: 'Minimal Next', en: 'Minimal Next' },
    description: { ja: 'Next.js (App Router) ベースの最小構成', en: 'Minimal Next.js (App Router) setup' },
    // preview サイト未配信・docs カード未整備のため draft（CLI 一覧・docs 本番ビルドから除外）
    draft: true,
  },
  {
    slug: 'blog-astro-minimal',
    kind: 'project',
    category: 'blog',
    variant: 'minimal',
    variantLabel: { ja: 'Minimal', en: 'Minimal' },
    stack: 'astro',
    sourcePath: 'blog/astro/minimal',
    langOverlays: {
      en: 'blog/astro/minimal/.lang/en',
    },
    title: { ja: 'Blog Minimal', en: 'Blog Minimal' },
    description: { ja: '記事一覧 / 詳細 / Tags のみの最小構成の Astro ブログ', en: 'Minimal Astro blog with posts and tags only' },
    intro: {
      ja: '記事一覧・記事詳細・タグページだけで構成した、いちばん小さな Astro ブログです。余計な機能を持たないので、Lism CSS でブログを組む手順を最短で追えます。独自の機能を足していく土台にもおすすめです。',
      en: 'The smallest Astro blog, made up of only a post list, post pages, and tag pages. With no extra features, it is the quickest way to see how a blog is built with Lism CSS, and a good base to add your own features to.',
    },
    previewUrl: `${PREVIEW_ORIGIN}/blog-astro-minimal/`,
    previewUrlEn: `${PREVIEW_ORIGIN}/blog-astro-minimal/en/`,
    features: {
      ja: ['タグ', 'sitemap'],
      en: ['Tags', 'sitemap'],
    },
  },
  {
    slug: 'blog-astro-personal',
    kind: 'project',
    category: 'blog',
    variant: 'personal',
    variantLabel: { ja: 'Personal', en: 'Personal' },
    stack: 'astro',
    sourcePath: 'blog/astro/personal',
    langOverlays: {
      en: 'blog/astro/personal/.lang/en',
    },
    title: { ja: 'Blog Personal', en: 'Blog Personal' },
    description: {
      ja: '個人ブログ・エッセイ向け。年月アーカイブつきの落ち着いた Astro ブログ',
      en: 'Personal / essay-style Astro blog with monthly archives',
    },
    intro: {
      ja: '個人ブログやエッセイ向けの、落ち着いた読み物系デザインの Astro ブログです。タグと年月アーカイブで過去記事をたどれ、シェアボタンと OGP 画像の自動生成も備えています。文章を主役にしたサイトをすぐ始められます。',
      en: 'A calm, reading-focused Astro blog for personal sites and essays. Tags and monthly archives make older posts easy to find, and share buttons and auto-generated OG images are included. Ideal for a site where the writing comes first.',
    },
    previewUrl: `${PREVIEW_ORIGIN}/blog-astro-personal/`,
    previewUrlEn: `${PREVIEW_ORIGIN}/blog-astro-personal/en/`,
    features: {
      ja: ['タグ', '年月アーカイブ', 'シェアボタン', 'OGP画像自動生成', 'sitemap（lastmod 対応）'],
      en: ['Tags', 'Monthly archives', 'Share buttons', 'Auto-generated OG images', 'sitemap (with lastmod)'],
    },
  },
  {
    slug: 'blog-astro-techlog',
    kind: 'project',
    category: 'blog',
    variant: 'techlog',
    variantLabel: { ja: 'Tech Log', en: 'Tech Log' },
    stack: 'astro',
    sourcePath: 'blog/astro/techlog',
    langOverlays: {
      en: 'blog/astro/techlog/.lang/en',
    },
    title: { ja: 'Blog Tech Log', en: 'Blog Tech Log' },
    description: {
      ja: '技術ブログ向け。コードハイライト・カテゴリ・タグ・TOC・年月アーカイブ・検索を装備した Astro ブログ',
      en: 'Tech blog with code highlighting, categories, tags, TOC, monthly archives and search',
    },
    intro: {
      ja: '技術ブログ向けに機能を揃えた Astro ブログです。コードハイライトと目次、カテゴリとタグ、年月アーカイブに加え、Pagefind による全文検索とダークモードも備えています。記事数が増えても探しやすい、本格運用向けの構成です。',
      en: 'A fully equipped Astro blog for technical writing. It includes code highlighting, a table of contents, categories and tags, monthly archives, full-text search with Pagefind, and dark mode. Built for blogs that keep growing and need to stay easy to navigate.',
    },
    previewUrl: `${PREVIEW_ORIGIN}/blog-astro-techlog/`,
    previewUrlEn: `${PREVIEW_ORIGIN}/blog-astro-techlog/en/`,
    features: {
      ja: [
        'カテゴリ / タグ',
        '年月アーカイブ',
        '検索（Pagefind）',
        '目次',
        'コードハイライト',
        'ダークモード',
        'シェアボタン',
        'OGP画像自動生成',
        'sitemap（lastmod 対応）',
      ],
      en: [
        'Categories / Tags',
        'Monthly archives',
        'Search (Pagefind)',
        'Table of contents',
        'Code highlighting',
        'Dark mode',
        'Share buttons',
        'Auto-generated OG images',
        'sitemap (with lastmod)',
      ],
    },
  },
  {
    slug: 'lp-astro-corporate',
    kind: 'single-project-variant',
    category: 'lp',
    stack: 'astro',
    variant: 'corporate',
    variantLabel: { ja: 'Corporate', en: 'Corporate' },
    sourcePath: 'lp/astro',
    title: { ja: 'LP Corporate', en: 'LP Corporate' },
    description: { ja: 'コーポレートサイト向けの Astro ランディングページ', en: 'Astro landing page for corporate sites' },
    intro: {
      ja: '企業サイト向けの1ページ構成の Astro ランディングページです。会社紹介・特徴・制作実績・お知らせ・FAQ・お客様の声・企業情報・お問い合わせと、コーポレートサイトに必要なセクションを一通り含みます。',
      en: 'A one-page Astro landing page for corporate sites. It covers the sections a company site needs: about, features, works, news, FAQ, testimonials, company information, and contact.',
    },
    previewUrl: `${PREVIEW_ORIGIN}/lp-astro/corporate/`,
    previewUrlEn: `${PREVIEW_ORIGIN}/lp-astro/en/corporate/`,
  },
  {
    slug: 'lp-astro-interior',
    kind: 'single-project-variant',
    category: 'lp',
    stack: 'astro',
    variant: 'interior',
    variantLabel: { ja: 'Interior', en: 'Interior' },
    sourcePath: 'lp/astro',
    title: { ja: 'LP Interior', en: 'LP Interior' },
    description: { ja: 'インテリア・暮らし系サービス向けの Astro ランディングページ', en: 'Astro landing page for interior / lifestyle services' },
    intro: {
      ja: 'インテリアや暮らしに関わるサービス向けの、写真を大きく見せる Astro ランディングページです。ミッション・メッセージ・特長・サービス・ご依頼の流れ・お客様の声・FAQ・お問い合わせのセクションで構成しています。',
      en: 'A photo-forward Astro landing page for interior and lifestyle services. It is made up of mission, message, features, services, process, customer voices, FAQ, and contact sections.',
    },
    previewUrl: `${PREVIEW_ORIGIN}/lp-astro/interior/`,
    previewUrlEn: `${PREVIEW_ORIGIN}/lp-astro/en/interior/`,
  },
  {
    slug: 'lp-astro-ryokan',
    kind: 'single-project-variant',
    category: 'lp',
    stack: 'astro',
    variant: 'ryokan',
    variantLabel: { ja: 'Ryokan', en: 'Ryokan' },
    sourcePath: 'lp/astro',
    title: { ja: 'LP Ryokan', en: 'LP Ryokan' },
    description: { ja: '旅館・宿泊業向けの Astro ランディングページ', en: 'Astro landing page for ryokan / lodging' },
    previewUrl: `${PREVIEW_ORIGIN}/lp-astro/ryokan/`,
    previewUrlEn: `${PREVIEW_ORIGIN}/lp-astro/en/ryokan/`,
  },
];
