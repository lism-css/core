/**
 * Schema.org JSON-LD 構造化データ生成
 * - 検索エンジン・LLM がページの種類と内容を正確に理解するために使用
 */

import { siteConfig } from '@/config/site';

export type SchemaType = 'HomePage' | 'SoftwareSourceCode' | 'TechArticle';

const organization = {
  '@type': 'Organization',
  name: 'Lism CSS',
  url: 'https://github.com/lism-css',
} as const;

/** site name の補助シグナル用 */
export function generateWebSiteSchema(params: { url: string; lang: string }) {
  return {
    '@type': 'WebSite',
    name: siteConfig.name,
    url: params.url,
    inLanguage: params.lang,
    publisher: organization,
  };
}

export function generateSoftwareSourceCodeSchema(params: { url: string; lang: string; description?: string }) {
  return {
    '@type': 'SoftwareSourceCode',
    name: siteConfig.name,
    ...(params.description && { description: params.description }),
    url: params.url,
    codeRepository: siteConfig.author.github,
    programmingLanguage: 'CSS',
    author: organization,
    inLanguage: params.lang,
  };
}

export function generateHomePageSchema(params: { url: string; lang: string; description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@graph': [generateWebSiteSchema(params), generateSoftwareSourceCodeSchema(params)],
  };
}

/** ローカライズ版トップ用。WebSite は root のみ */
export function generateLocalizedHomePageSchema(params: { url: string; lang: string; description?: string }) {
  return {
    '@context': 'https://schema.org',
    ...generateSoftwareSourceCodeSchema(params),
  };
}

export function generateTechArticleSchema(params: { url: string; title: string; description?: string; lang: string; datePublished?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: params.title,
    ...(params.description && { description: params.description }),
    url: params.url,
    author: organization,
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: 'https://lism-css.com',
    },
    ...(params.datePublished && { datePublished: params.datePublished }),
    inLanguage: params.lang,
  };
}

export function generateJsonLd(
  schemaType: SchemaType,
  params: {
    url: string;
    title: string;
    description?: string;
    lang: string;
    datePublished?: string;
  }
) {
  switch (schemaType) {
    case 'HomePage':
      return generateHomePageSchema(params);
    case 'SoftwareSourceCode':
      return generateLocalizedHomePageSchema(params);
    case 'TechArticle':
      return generateTechArticleSchema(params);
  }
}
