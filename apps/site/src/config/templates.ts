/**
 * テンプレート定義の SSOT は `templates/manifest.ts`。
 * docs 専用の thumb は `templates/{sourcePath}/screenshots/` から解決する。
 */

import type { LangCode } from '@/config/site';
import type { ImageMetadata } from 'astro';

import { TEMPLATES as manifestTemplates, type CategoryId, type Stack, type TemplateDef } from '@templates/manifest';

/**
 * templates/ 配下の screenshots 画像を一括取得。
 * `screenshots/*.png`（ja）に加え `screenshots/en/*.png`（言語別）も拾う。
 * 比較用の `_baseline/` `_diff/` `_temp/` 配下はビルドに含めない。
 */
const screenshotModules = import.meta.glob<{ default: ImageMetadata }>(
  [
    '../../../../templates/**/screenshots/**/*.png',
    '!../../../../templates/**/screenshots/_baseline/**',
    '!../../../../templates/**/screenshots/_diff/**',
    '!../../../../templates/**/screenshots/_temp/**',
  ],
  { eager: true }
);

export type { CategoryId, Stack };

export interface TemplateItem {
  slug: string;
  category: CategoryId;
  stack: Stack;
  title: Record<LangCode, string>;
  /** 短い説明（一覧カードの抜粋） */
  description: Record<LangCode, string>;
  /** 長い説明（詳細ページ）。未指定なら description を使う（getIntro） */
  intro?: Record<LangCode, string>;
  thumb: ImageMetadata;
  /** en 用 thumb（`screenshots/en/` に撮影済みの場合のみ）。無い場合は thumb にフォールバック */
  thumbEn?: ImageMetadata;
  /** プレビューサイトの URL（無い場合は undefined → ボタン非表示 or 無効化） */
  previewUrl?: string;
  /** en 用プレビュー URL（集約サイトで en を配信している場合のみ）。無い場合は previewUrl にフォールバック */
  previewUrlEn?: string;
  /** true の場合、本番ビルドでは一覧・詳細ページ・パス生成から除外する（dev では表示） */
  draft?: boolean;
  /** 紹介カードに表示する機能リスト（任意） */
  features?: Record<LangCode, string[]>;
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  /** 短い説明（一覧ページのセクション見出し） */
  description: Record<LangCode, string>;
  /** 長い説明（カテゴリページのリード）。未指定なら description を使う（getCategoryIntro） */
  intro?: Record<LangCode, string>;
  /**
   * true の場合、カテゴリ内の複数テンプレートを「中身共通・stack 違い」として
   * 1枚のカードに集約表示し、カテゴリページも stack 別コマンド＋代表プレビュー1枚の構成にする。
   * 一覧カードは `npm create lism@latest -- --template {category.id} --lang {lang}` で生成できるカテゴリ slug を案内する。
   */
  aggregateView?: boolean;
  /** 集約カードで代表サムネとして使う template slug（aggregateView 時のみ参照） */
  aggregateRepresentativeSlug?: string;
}

export const categories: CategoryDef[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    aggregateView: true,
    aggregateRepresentativeSlug: 'minimal-vite',
    description: {
      ja: 'Lism CSS を導入した最小構成。検証や独自構成のベースに最適です。',
      en: 'Minimal configuration with Lism CSS. Ideal for testing or as a base for your own custom setup.',
    },
    intro: {
      ja: 'Lism CSS の読み込みと最小限のページだけを用意した雛形です。中身はどの stack でも同じで、使いたいツールに合わせて選べます。動作検証や、ゼロから独自の構成を組みたいときのベースに向いています。',
      en: 'Starters with only Lism CSS set up and a minimal page. The content is the same across stacks, so pick the tooling you want to use. Suited for quick experiments or as a base for building your own setup from scratch.',
    },
  },
  {
    id: 'blog',
    label: 'Blog',
    description: {
      ja: 'Lism CSSで構築したブログサイト用のテンプレート。',
      en: 'Blog site templates built with Lism CSS.',
    },
    intro: {
      ja: 'Lism CSS で構築した Astro ブログのテンプレートです。最小構成から機能を揃えた技術ブログまで、必要な機能の量に合わせて選べます。どれも記事は Markdown / MDX で書け、日本語・英語のどちらでも生成できます。',
      en: 'Astro blog templates built with Lism CSS. Pick one based on how many features you need, from a bare-bones setup to a fully equipped tech blog. All of them use Markdown / MDX for posts and can be generated in Japanese or English.',
    },
  },
  {
    id: 'lp',
    label: 'LP',
    description: {
      ja: 'Lism CSSで構築したLPページ用のテンプレート。',
      en: 'Landing page templates built with Lism CSS.',
    },
    intro: {
      ja: 'Lism CSS で構築した Astro のランディングページテンプレートです。業種ごとにデザインとセクション構成を変えたバリアントから選べます。日本語・英語それぞれのデザインを同梱しています。',
      en: 'Astro landing page templates built with Lism CSS. Each variant has its own design and section structure tailored to a type of business, with Japanese and English versions included.',
    },
  },
  {
    id: 'web',
    label: 'Web',
    description: {
      ja: '汎用的な Web サイト向けテンプレート。',
      en: 'General-purpose website templates.',
    },
  },
];

/** Stack 表示ラベル（CLI 側の STACK_LABELS と揃える） */
export const stackLabels: Record<Stack, string> = {
  astro: 'Astro',
  next: 'Next.js',
  vite: 'Vite + React',
};

export const stackOrder: Stack[] = ['astro', 'vite', 'next'];

function thumbFileName(tpl: TemplateDef): string {
  return tpl.kind === 'single-project-variant' ? `${tpl.variant}.png` : 'top.png';
}

/** 規約ベースで thumb を解決（解決できなければビルド時に失敗させる） */
function resolveThumb(tpl: TemplateDef): ImageMetadata {
  const key = `../../../../templates/${tpl.sourcePath}/screenshots/${thumbFileName(tpl)}`;
  const mod = screenshotModules[key];
  if (!mod) {
    throw new Error(`[templates] thumb not found for slug "${tpl.slug}" at ${key}`);
  }
  return mod.default;
}

/** en 用 thumb を解決（`screenshots/en/` 未撮影なら undefined → 呼び出し側で ja にフォールバック） */
function resolveThumbEn(tpl: TemplateDef): ImageMetadata | undefined {
  const key = `../../../../templates/${tpl.sourcePath}/screenshots/en/${thumbFileName(tpl)}`;
  return screenshotModules[key]?.default;
}

// manifestにdocs用サムネイルを加えて一覧を組み立てる
export const templates: TemplateItem[] = manifestTemplates.map((tpl: TemplateDef): TemplateItem => {
  const thumbEn = resolveThumbEn(tpl);
  return {
    slug: tpl.slug,
    category: tpl.category,
    stack: tpl.stack,
    title: tpl.title,
    description: tpl.description,
    thumb: resolveThumb(tpl),
    ...(thumbEn ? { thumbEn } : {}),
    ...(tpl.intro ? { intro: tpl.intro } : {}),
    ...(tpl.previewUrl ? { previewUrl: tpl.previewUrl } : {}),
    ...(tpl.previewUrlEn ? { previewUrlEn: tpl.previewUrlEn } : {}),
    ...(tpl.draft ? { draft: tpl.draft } : {}),
    ...(tpl.features ? { features: tpl.features } : {}),
  };
});

/** 言語に応じた thumb を返す（en は en スクショ優先・未撮影なら ja にフォールバック） */
export function getThumb(tpl: TemplateItem, lang: LangCode): ImageMetadata {
  return lang === 'en' ? (tpl.thumbEn ?? tpl.thumb) : tpl.thumb;
}

/** 長い説明を返す（intro 未指定なら description にフォールバック） */
export function getIntro(tpl: TemplateItem, lang: LangCode): string {
  return tpl.intro?.[lang] ?? tpl.description[lang];
}

/** カテゴリの長い説明を返す（intro 未指定なら description にフォールバック） */
export function getCategoryIntro(category: CategoryDef, lang: LangCode): string {
  return category.intro?.[lang] ?? category.description[lang];
}

/** 言語に応じたプレビュー URL を返す（en は en 用 URL 優先・無ければ ja にフォールバック） */
export function getPreviewUrl(tpl: TemplateItem, lang: LangCode): string | undefined {
  return lang === 'en' ? (tpl.previewUrlEn ?? tpl.previewUrl) : tpl.previewUrl;
}

/**
 * 本番ビルドで実際に公開されるテンプレートのみを含む派生リスト。
 * dev/preview では draft:true も含めて全件返す。
 * 一覧・詳細ページ・getStaticPaths はすべてこのリストを参照する。
 */
export const visibleTemplates: TemplateItem[] = import.meta.env.PROD ? templates.filter((tpl) => !tpl.draft) : templates;

export function groupByCategory(items: TemplateItem[] = visibleTemplates): Array<{ category: CategoryDef; items: TemplateItem[] }> {
  return categories
    .map((category) => ({
      category,
      items: items.filter((tpl) => tpl.category === category.id),
    }))
    .filter(({ items }) => items.length > 0);
}

/**
 * 集約表示対象カテゴリ（aggregateView: true）の代表 template を返す。
 * 一覧カードのサムネ・タイトル・description のベースに使う。
 */
export function getAggregateRepresentative(category: CategoryDef, items: TemplateItem[] = visibleTemplates): TemplateItem | undefined {
  if (!category.aggregateView) return undefined;
  const slug = category.aggregateRepresentativeSlug;
  if (slug) {
    const found = items.find((tpl) => tpl.slug === slug);
    if (found) return found;
  }
  return items.find((tpl) => tpl.category === category.id);
}

/** カテゴリ内の全 template を返す（stack 表示順） */
export function getCategoryTemplates(categoryId: CategoryId, items: TemplateItem[] = visibleTemplates): TemplateItem[] {
  const filtered = items.filter((tpl) => tpl.category === categoryId);
  return [...filtered].sort((a, b) => stackOrder.indexOf(a.stack) - stackOrder.indexOf(b.stack));
}

/** templates 内に存在する stack の一覧（フィルタ chips 用） */
export function getAvailableStacks(items: TemplateItem[] = visibleTemplates): Stack[] {
  return stackOrder.filter((stack) => items.some((tpl) => tpl.stack === stack));
}

/** stack ごとの件数を返す */
export function countByStack(items: TemplateItem[] = visibleTemplates): Record<Stack, number> {
  return stackOrder.reduce(
    (acc, stack) => {
      acc[stack] = items.filter((tpl) => tpl.stack === stack).length;
      return acc;
    },
    {} as Record<Stack, number>
  );
}
