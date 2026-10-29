import { siteConfig, type LangCode, type LangConfig } from '@/config/site';
import { translations, type UITranslations } from '@/config/translations';

export type { LangCode } from '@/config/site';

// 言語設定を取得（as const satisfies による narrow 型を LangConfig に戻す）
const langs: Record<LangCode, LangConfig> = siteConfig.langs;

const langCodes = Object.keys(langs) as LangCode[];

export function getRootLang(): LangCode {
  const rootLang = langCodes.find((code) => langs[code].root);
  if (!rootLang) {
    throw new Error('Root language is not defined in siteConfig.langs');
  }
  return rootLang;
}

export function isRootLang(lang: LangCode): boolean {
  return langs[lang]?.root === true;
}

export function getAllLangs(): { code: LangCode; label: string; isRoot: boolean }[] {
  return langCodes.map((code) => ({
    code,
    label: langs[code].label,
    isRoot: langs[code].root === true,
  }));
}

export function getLangFromUrl(url: URL | string): LangCode {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && langCodes.includes(firstSegment as LangCode)) {
    const lang = firstSegment as LangCode;
    if (!isRootLang(lang)) {
      return lang;
    }
  }

  return getRootLang();
}

/**
 * memo: 元のパスの trailing slash の有無はそのまま維持する
 */
export function getPathWithoutLang(url: URL | string): string {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && langCodes.includes(firstSegment as LangCode)) {
    const lang = firstSegment as LangCode;
    if (!isRootLang(lang)) {
      const rest = segments.slice(1).join('/');
      const hasTrailingSlash = pathname.endsWith('/');
      if (!rest) return '/';
      return `/${rest}${hasTrailingSlash ? '/' : ''}`;
    }
  }

  return pathname;
}

export function getLocalizedUrl(path: string, lang: LangCode): string {
  const cleanPath = getPathWithoutLang(path);

  if (isRootLang(lang)) {
    return cleanPath || '/';
  }

  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `/${lang}${normalizedPath}`;
}

export function getAlternateUrls(currentUrl: URL | string): { lang: LangCode; url: string }[] {
  const path = getPathWithoutLang(currentUrl);
  return langCodes.map((lang) => ({
    lang,
    url: getLocalizedUrl(path, lang),
  }));
}

export function isValidLang(lang: string): lang is LangCode {
  return langCodes.includes(lang as LangCode);
}

export function getLangLabel(lang: LangCode): string {
  return langs[lang]?.label ?? lang;
}

export function getTranslations(lang: LangCode): UITranslations {
  return translations[lang] ?? translations[getRootLang()];
}

export function t<K extends keyof UITranslations>(lang: LangCode, category: K): UITranslations[K] {
  const trans = getTranslations(lang);
  return trans[category];
}
