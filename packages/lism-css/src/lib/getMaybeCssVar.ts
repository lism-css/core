import { TOKENS } from '../../config/index';
import isNumStr from './helper/isNumStr';
import getMaybeTokenValue from './getMaybeTokenValue';

type CssValue = string | number;

// 対応するCSS変数があれば返す
export default function getMaybeCssVar(value: CssValue, tokenKey: string | null | undefined | false): string {
  if (!tokenKey) return String(value);

  switch (tokenKey) {
    case 'space':
      return getMaybeSpaceVar(value);
    case 'color':
      return getMaybeColorVar(value);
    case 'bxsh':
      // 0 は none
      if (value === '0' || value === 0) return 'none';
      return getMaybeTokenValue(tokenKey, value, TOKENS);

    default:
      return getMaybeTokenValue(tokenKey, value, TOKENS);
  }
}

export function getMaybeSpaceVar(value: CssValue): string {
  if (0 === value || '0' === value) return '0';

  // spaceが 整数 or 整数を示す文字列 の場合
  if (typeof value === 'number' || isNumStr(value)) {
    const numValue = typeof value === 'number' ? value : Number(value);

    // 負の値: calc(-1 * var(--s{absValue})) に変換
    if (numValue < 0) {
      return `calc(-1 * var(--s${Math.abs(numValue)}))`;
    }

    return `var(--s${value})`;
  }

  // スペース区切りで一括指定されている場合
  if (typeof value === 'string' && value.includes(' ')) {
    // calc(), var() 等 があれば対象外
    if (!value.includes('calc(') && !value.includes('var(') && !value.includes(',')) {
      // spaceを' 'で配列化して、数値なら変数化する
      const spaceArr = value.split(' ');
      return spaceArr.map((_s) => getMaybeSpaceVar(_s)).join(' ');
    }
  }

  // それ以外はそのまま返す
  return String(value);
}

export function getMaybeColorVar(value: CssValue): string {
  // COLOR:数値% で指定された場合
  if (typeof value === 'string' && value.endsWith('%')) {
    const mixColors = value.split(':');
    if (mixColors.length === 3) {
      const [color1, color2, alpha] = mixColors;
      return `color-mix(in srgb, ${getMaybeTokenValue('color', color1, TOKENS)}, ${getMaybeTokenValue('color', color2, TOKENS)} ${alpha})`;
    } else if (mixColors.length === 2) {
      const [color, alpha] = mixColors;
      return `color-mix(in srgb, ${getMaybeTokenValue('color', color, TOKENS)} ${alpha}, transparent)`;
    }
  }

  return getMaybeTokenValue('color', value, TOKENS);
}
