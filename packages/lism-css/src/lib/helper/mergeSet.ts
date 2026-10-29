import splitValues from './splitValues';

/**
 * base / value を合成し、最終的なクラス識別子の配列を返す。
 * 値内の `-` prefix は除外マーカーとして扱われ、その識別子は base + value から除外される。
 *
 * `set` / `util` のいずれの prop でも共用できる汎用処理。
 */
export default function mergeSet(base: unknown, value: unknown): string[] {
  const tokens = [...splitValues(base), ...splitValues(value)];
  if (tokens.length === 0) return [];

  const include: string[] = [];
  const exclude = new Set<string>();
  for (const token of tokens) {
    if (token.startsWith('-')) {
      exclude.add(token.slice(1));
    } else if (!include.includes(token)) {
      include.push(token);
    }
  }
  return include.filter((v) => !exclude.has(v));
}
