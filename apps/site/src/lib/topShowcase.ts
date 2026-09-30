import path from 'node:path';
import sharp from 'sharp';
import type { LangCode } from '@/lib/i18n';
import { getPatternThumbSrc } from '@/lib/patterns';
import { patterns, isPatternAvailable, type PatternCategoryId } from '@/config/patterns';

// トップページのテンプレート欄に並べるパターン。3列それぞれ上から順に並ぶ
const showcaseColumns: Array<Array<[PatternCategoryId, string]>> = [
  [
    ['general', 'general02'],
    ['about', 'about01'],
    ['general', 'general07'],
    ['general', 'general04'],
    ['about', 'about08'],
  ],
  [
    ['hero', 'hero02'],
    ['pricing', 'pricing01'],
    ['about', 'about06'],
    ['general', 'general06'],
    ['posts', 'posts04'],
  ],
  [
    ['general', 'general03'],
    ['general', 'general10'],
    ['page-links', 'page-links04'],
    ['posts', 'posts03'],
    ['member', 'member02'],
  ],
];

export interface ShowcaseImage {
  src: string;
  width: number;
  height: number;
}

// draft と、その言語で公開していないパターンは出さない
function isShowcasePattern(categoryId: PatternCategoryId, patternId: string, lang: LangCode): boolean {
  const item = patterns[categoryId].items.find(({ id }) => id === patternId);
  return !!item && !item.draft && isPatternAvailable(item, lang);
}

export async function getTopShowcaseColumns(lang: LangCode): Promise<ShowcaseImage[][]> {
  return Promise.all(
    showcaseColumns.map((column) =>
      Promise.all(
        column
          .filter(([categoryId, patternId]) => isShowcasePattern(categoryId, patternId, lang))
          .map(async ([categoryId, patternId]) => {
            const src = getPatternThumbSrc(lang, categoryId, patternId);
            // スクショは撮り直しで高さが変わるため、width/heightは画像から読む
            const { width, height } = await sharp(path.join(process.cwd(), 'public', src)).metadata();
            return { src, width, height };
          })
      )
    )
  );
}
