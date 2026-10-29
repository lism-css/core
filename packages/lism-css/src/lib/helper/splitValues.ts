/**
 * 空白区切りの値を配列に分割する。カンマ区切りも互換のため受け付ける。
 * `set` / `util` / `hov` で区切りのルールをそろえるため、分割はこの関数に集約する。
 */
export default function splitValues(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => splitValues(item));
  if (typeof value !== 'string') return [];
  return value.split(/[,\s]+/).filter(Boolean);
}
