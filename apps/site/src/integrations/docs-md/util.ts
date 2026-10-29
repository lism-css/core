import fs from 'node:fs/promises';
import path from 'node:path';
import type { Element } from 'hast';

export function hasClass(node: Element, cls: string): boolean {
  // @types/hast 3.0.5 は className を string[] に限定するが、実行時の揺れに備えて string も受ける
  const c: unknown = node.properties?.className;
  if (Array.isArray(c)) return c.includes(cls);
  if (typeof c === 'string') return c.split(/\s+/).includes(cls);
  return false;
}

/**
 * 指定ディレクトリ配下の `.mdx` ファイルを再帰的に列挙する。
 * 返り値は `dir` からの相対 path（POSIX 区切り）。
 * `skipUnderscore: true` の時、`_` 始まりのエントリ（ファイル/ディレクトリ）を除外する。
 */
export async function walkMdx(dir: string, opts: { skipUnderscore?: boolean } = {}): Promise<string[]> {
  const out: string[] = [];
  const walk = async (cur: string, prefix: string) => {
    const entries = await fs.readdir(cur, { withFileTypes: true });
    for (const e of entries) {
      if (opts.skipUnderscore && e.name.startsWith('_')) continue;
      const full = path.join(cur, e.name);
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(full, rel);
      else if (e.name.endsWith('.mdx')) out.push(rel);
    }
  };
  await walk(dir, '');
  return out;
}
