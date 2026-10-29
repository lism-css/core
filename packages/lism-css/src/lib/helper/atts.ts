type Primitive = string | number | boolean | null | undefined;
type AttsValue = Primitive | AttsValue[] | Set<string | number> | Record<string, Primitive>;

/**
 * classnames / clsx 互換の軽量版。文字列・数値・配列・Set・オブジェクトを受け取り、重複を除いて結合する。
 * flat() や filter() で書くと処理速度が数倍遅くなるため、素のループで実装している。
 */
export default function atts(...args: AttsValue[]): string {
  let classes: (string | number)[] = [];
  for (let i = 0; i < args.length; i++) {
    const mix = args[i];

    if (!mix) continue;

    if (typeof mix === 'string') {
      classes.push(...mix.trim().split(' '));
    } else if (typeof mix === 'number') {
      classes.push(mix);
    } else if (Array.isArray(mix)) {
      // 0 残す
      classes.push(...mix.filter((v): v is string | number => null != v));
    } else if (mix instanceof Set) {
      classes.push(...mix);
    } else if (typeof mix === 'object') {
      classes.push(...Object.keys(mix).filter((k) => !!mix[k]));
    }
  }

  classes = [...new Set(classes)];
  return classes.join(' ').trim();
}
