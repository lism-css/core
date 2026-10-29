type PlainObject = Record<string, unknown>;

function isObj(value: unknown): value is PlainObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

type DeepMergeResult<T, U> = T extends PlainObject
  ? U extends PlainObject
    ? {
        [K in keyof T | keyof U]: K extends keyof U ? (K extends keyof T ? DeepMergeResult<T[K], U[K]> : U[K]) : K extends keyof T ? T[K] : never;
      }
    : T
  : U extends PlainObject
    ? U
    : T;

/**
 * 深いマージを行う。origin は変更せず、source の値で上書きした新しいオブジェクトを返す。
 */
export function objDeepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(origin: T, source: U): DeepMergeResult<T, U> {
  const result = { ...origin } as Record<string, unknown>;

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const originValue = result[key];
      const sourceValue = (source as Record<string, unknown>)[key];

      if (!originValue) {
        // origin側に存在しない新たなキーの場合はそのまま追加する
        result[key] = sourceValue;
      } else if (isObj(sourceValue) && isObj(originValue)) {
        result[key] = objDeepMerge(originValue, sourceValue);
      } else {
        result[key] = sourceValue;
      }
    }
  }

  return result as DeepMergeResult<T, U>;
}

type DeepArrayToSet<T> = T extends unknown[] ? Set<T[number]> : T extends PlainObject ? { [K in keyof T]: DeepArrayToSet<T[K]> } : T;

/** オブジェクト内の配列を再帰的に Set へ変換する。 */
export function arrayConvertToSet<T>(obj: T): DeepArrayToSet<T> {
  if (Array.isArray(obj)) {
    return new Set(obj) as DeepArrayToSet<T>;
  }

  if (isObj(obj)) {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        result[key] = arrayConvertToSet(obj[key]);
      }
    }
    return result as DeepArrayToSet<T>;
  }

  return obj as DeepArrayToSet<T>;
}
