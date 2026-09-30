import { type StyleWithCustomProps } from './types';

/** getLayoutProps / getAtomicProps が共通で受け渡す props。 */
export interface PrimitiveBaseProps {
  primitiveClass?: string[];
  style?: StyleWithCustomProps;
}

// primitiveClass への安全な push（常に新しい配列を返して非破壊に扱う）
export function pushPrimitive(existing: string[] | undefined, ...classes: string[]): string[] {
  return [...(existing ?? []), ...classes];
}
