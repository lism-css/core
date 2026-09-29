import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const componentsDir = dirname(fileURLToPath(import.meta.url));

// バンドラがコンポーネントCSSを lism-css/main.css より前に出力しても、lism-block が lism-base より後ろになるよう先頭で順序を固定する
const LAYER_ORDER = '@layer lism-base, lism-block;\n';

const styleFiles = readdirSync(componentsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `${entry.name}/_style.css`)
  .filter((file) => existsSync(resolve(componentsDir, file)));

describe('コンポーネントCSSのレイヤー順序宣言', () => {
  it('検査対象の _style.css が見つかる', () => {
    expect(styleFiles.length).toBeGreaterThan(0);
  });

  it.each(styleFiles)('%s の先頭に順序宣言がある', (file) => {
    const css = readFileSync(resolve(componentsDir, file), 'utf8');
    expect(css.startsWith(LAYER_ORDER)).toBe(true);
  });
});
