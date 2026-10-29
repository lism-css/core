import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { toContentSlug } from './lib/contentSlug';

const postSchema = z.object({
  title: z.string(),
  navtitle: z.string().optional(), // サイドバー表示用。省略時はtitleを使う
  eyebrow: z.string().optional(),
  description: z.string(),
  date: z.date().optional(),
  tags: z.array(z.string()).default([]).optional(),
  draft: z.boolean().default(false),
  hero: z.string().optional(),
  order: z.number().optional(), // ナビゲーション・一覧の表示順。未指定は999扱い
});

// `_` 付きディレクトリ内の MDX（部分テンプレート等）はコレクション対象外にする
const mdMdxWithUnderscoreExcludes = ['**/*.{md,mdx}', '!**/_*/**'] as const;

// CSSクラス名とURLを一致させるため、primitives/とtrait-class/はケースを保持し、他は既存URL互換のため小文字化する。
const generateId = ({ entry }: { entry: string }) => {
  const withoutExt = entry.replace(/\.(md|mdx)$/, '');
  return toContentSlug(withoutExt);
};

/**
 * 言語別コレクション定義
 * - ja: 日本語（root言語）
 * - en: 英語
 * memo: Astro 5 の Content Layer では各コレクションに loader が必須（legacy.collections 併用だと同期がスキップされる）
 */
const ja = defineCollection({
  loader: glob({
    base: './src/content/ja',
    pattern: [...mdMdxWithUnderscoreExcludes],
    generateId,
  }),
  schema: postSchema,
});

const en = defineCollection({
  loader: glob({
    base: './src/content/en',
    pattern: [...mdMdxWithUnderscoreExcludes],
    generateId,
  }),
  schema: postSchema,
});

export const collections = {
  ja,
  en,
};

export type PostSchema = z.infer<typeof postSchema>;
