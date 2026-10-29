// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, afterAll } from 'vitest';
import {
  extraAdvertisedBpKeys,
  extraCustomPropKeys,
  extraCustomTraitKeys,
  derivePropValueLiterals,
  extraPropValueEntries,
  generateLismEnvDts,
} from './gen-types';
import { writeLismEnvDts, TYPES_FILENAME } from './typegen';

// generateLismEnvDts へ渡すマージ前 default-config のフィクスチャ。
const DEFAULT_CONFIG = {
  props: {
    p: { prop: 'padding', token: 'space' },
    bg: { prop: 'background' },
    fz: { prop: 'fontSize', token: 'fz', presets: ['inherit'] },
  },
  traits: { isContainer: 'is--container', hasGutter: 'has--gutter' },
  tokens: { space: { '10': '8px', '20': '16px' }, fz: { s: '0.8rem', m: '1rem' } },
};

describe('extraAdvertisedBpKeys', () => {
  test('有効化された xs/xl のみを追加解禁キーとして返す', () => {
    expect(extraAdvertisedBpKeys({ xs: '360px', sm: '480px', md: '800px', lg: '1120px', xl: 0 })).toEqual(['xs']);
    expect(extraAdvertisedBpKeys({ xs: '360px', xl: '1400px' })).toEqual(['xs', 'xl']);
  });

  test('デフォルト広告（sm/md/lg）は対象外、サイズ0/未定義は無効', () => {
    expect(extraAdvertisedBpKeys({ sm: '480px', md: '800px', lg: '1120px' })).toEqual([]);
    expect(extraAdvertisedBpKeys({ xs: 0, xl: 0 })).toEqual([]);
    expect(extraAdvertisedBpKeys(undefined)).toEqual([]);
  });
});

describe('extraCustomPropKeys', () => {
  const defaultPropKeys = Object.keys(DEFAULT_CONFIG.props);

  test('default-config に無い prop のみを追加解禁キーとして返す', () => {
    expect(
      extraCustomPropKeys({ p: { prop: 'padding' }, filter: { prop: 'filter' }, 'scroll-m': { prop: 'scrollMargin' } }, defaultPropKeys)
    ).toEqual(['filter', 'scroll-m']);
  });

  test('props が無い場合や既定 prop だけの場合は空配列を返す', () => {
    expect(extraCustomPropKeys({ p: { prop: 'padding' }, bg: { prop: 'background' } }, defaultPropKeys)).toEqual([]);
    expect(extraCustomPropKeys(undefined, defaultPropKeys)).toEqual([]);
  });
});

describe('extraCustomTraitKeys', () => {
  const defaultTraitKeys = Object.keys(DEFAULT_CONFIG.traits);

  test('default-config に無い trait のみを追加解禁キーとして返す', () => {
    expect(extraCustomTraitKeys({ isContainer: 'is--container', isHoge: 'is--hoge' }, defaultTraitKeys)).toEqual(['isHoge']);
  });

  test('traits が無い場合や既定 trait だけの場合は空配列を返す', () => {
    expect(extraCustomTraitKeys({ isContainer: 'is--container', hasGutter: 'has--gutter' }, defaultTraitKeys)).toEqual([]);
    expect(extraCustomTraitKeys(undefined, defaultTraitKeys)).toEqual([]);
  });
});

describe('derivePropValueLiterals', () => {
  test('presets の値・utils のキー・token 参照先カタログのキーを重複なしで返す', () => {
    expect(
      derivePropValueLiterals({ presets: ['auto', 0], utils: { none: 'none' }, token: 'space' }, { space: { '10': '8px', '20': '16px' } })
    ).toEqual(['auto', '0', 'none', '10', '20']);
  });

  test('token が配列カタログの場合は要素を返す', () => {
    expect(derivePropValueLiterals({ token: 'fw' }, { fw: ['light', 'bold'] })).toEqual(['light', 'bold']);
  });

  test('presets / utils / token（または参照先カタログ）が無ければ空配列を返す', () => {
    expect(derivePropValueLiterals({ prop: 'filter' }, { space: { '10': '8px' } })).toEqual([]);
    expect(derivePropValueLiterals({ token: 'unknown' }, { space: { '10': '8px' } })).toEqual([]);
    expect(derivePropValueLiterals({ token: 'space' })).toEqual([]);
  });

  test("token: 'color' は palette カタログのキーも合成する（color ∪ palette の解決規則）", () => {
    expect(derivePropValueLiterals({ token: 'color' }, { color: { main: '#333' }, palette: { red: '#f00' } })).toEqual(['main', 'red']);
  });
});

describe('extraPropValueEntries', () => {
  test('既定 prop への presets / utils 追加分のみを返す', () => {
    const main = {
      props: { ...DEFAULT_CONFIG.props, p: { prop: 'padding', token: 'space', presets: ['auto'], utils: { full: '100%' } } },
      tokens: DEFAULT_CONFIG.tokens,
    };
    expect(extraPropValueEntries(main, DEFAULT_CONFIG)).toEqual([['p', ['auto', 'full']]]);
  });

  test('既定 prop が参照する token カタログへのキー追加も拾う', () => {
    const main = {
      props: DEFAULT_CONFIG.props,
      tokens: { ...DEFAULT_CONFIG.tokens, space: { ...DEFAULT_CONFIG.tokens.space, '99': '99px' } },
    };
    expect(extraPropValueEntries(main, DEFAULT_CONFIG)).toEqual([['p', ['99']]]);
  });

  test('追加値が無ければ空配列を返す（defaults と同一の値は差分にしない）', () => {
    expect(extraPropValueEntries({ props: DEFAULT_CONFIG.props, tokens: DEFAULT_CONFIG.tokens }, DEFAULT_CONFIG)).toEqual([]);
  });

  test("token: 'color' の既定 prop は palette への追加キーも拾う", () => {
    const defaults = { props: { c: { prop: 'color', token: 'color' } }, tokens: { color: { main: '#333' }, palette: { red: '#f00' } } };
    const main = { props: defaults.props, tokens: { color: { main: '#333' }, palette: { red: '#f00', brand: '#00f' } } };
    expect(extraPropValueEntries(main, defaults)).toEqual([['c', ['brand']]]);
  });
});

describe('generateLismEnvDts', () => {
  test('追加解禁キーがあれば BreakpointRegistry 拡張の .d.ts を生成する', () => {
    const dts = generateLismEnvDts({ breakpoints: { xs: '360px', xl: '1400px' }, props: {} }, DEFAULT_CONFIG);
    expect(dts).not.toBeNull();
    expect(dts).toContain("declare module 'lism-css'");
    expect(dts).toContain('interface BreakpointRegistry');
    expect(dts).toContain('xs: true;');
    expect(dts).toContain('xl: true;');
    // 編集禁止の自動生成ヘッダを含む
    expect(dts).toContain('自動生成');
  });

  test('追加 prop があれば CustomPropRegistry 拡張の .d.ts を生成する', () => {
    const dts = generateLismEnvDts({ breakpoints: {}, props: { p: { prop: 'padding' }, filter: { prop: 'filter' } } }, DEFAULT_CONFIG);
    expect(dts).not.toBeNull();
    expect(dts).toContain("import type { CustomPropValue } from 'lism-css';");
    expect(dts).toContain('interface CustomPropRegistry');
    expect(dts).toContain('filter?: CustomPropValue;');
    expect(dts).not.toContain('p?: CustomPropValue;');
  });

  test('追加 trait があれば CustomTraitRegistry 拡張の .d.ts を生成する', () => {
    const dts = generateLismEnvDts({ breakpoints: {}, props: {}, traits: { isContainer: 'is--container', isHoge: 'is--hoge' } }, DEFAULT_CONFIG);
    expect(dts).not.toBeNull();
    expect(dts).toContain("import type { CustomTraitValue } from 'lism-css';");
    expect(dts).toContain('interface CustomTraitRegistry');
    expect(dts).toContain('isHoge?: CustomTraitValue;');
    expect(dts).not.toContain('isContainer?: CustomTraitValue;');
  });

  test('breakpoints / props / traits を同じ declare module に並べ、型 import をまとめる', () => {
    const dts = generateLismEnvDts(
      { breakpoints: { xs: '360px' }, props: { filter: { prop: 'filter' }, 'scroll-m': { prop: 'scrollMargin' } }, traits: { isHoge: 'is--hoge' } },
      DEFAULT_CONFIG
    );
    expect(dts).not.toBeNull();
    expect(dts).toContain('interface BreakpointRegistry');
    expect(dts).toContain('interface CustomPropRegistry');
    expect(dts).toContain('interface CustomTraitRegistry');
    expect(dts).toContain('xs: true;');
    expect(dts).toContain('filter?: CustomPropValue;');
    expect(dts).toContain('"scroll-m"?: CustomPropValue;');
    expect(dts).toContain("import type { CustomPropValue, CustomTraitValue } from 'lism-css';");
    expect(dts?.match(/declare module 'lism-css'/g)).toHaveLength(1);
  });

  test('追加 breakpoints / props / traits がどれも無ければ null（ファイル不要）', () => {
    expect(
      generateLismEnvDts(
        { breakpoints: { sm: '480px', md: '800px', lg: '1120px' }, props: { p: { prop: 'padding' } }, traits: { isContainer: 'is--container' } },
        DEFAULT_CONFIG
      )
    ).toBeNull();
    expect(generateLismEnvDts({ breakpoints: undefined, props: {} }, DEFAULT_CONFIG)).toBeNull();
  });

  test('isFullMode: true なら FullModeRegistry 拡張を生成する（追加キーが他に無くても null にしない）', () => {
    const dts = generateLismEnvDts({ breakpoints: { sm: '480px', md: '800px', lg: '1120px' }, props: {} }, DEFAULT_CONFIG, true);
    expect(dts).not.toBeNull();
    expect(dts).toContain('interface FullModeRegistry');
    expect(dts).toContain('enabled: true;');
    expect(dts?.match(/declare module 'lism-css'/g)).toHaveLength(1);
  });

  test('isFullMode: false（既定）では FullModeRegistry 拡張を含めない', () => {
    const dts = generateLismEnvDts({ breakpoints: { xs: '360px' }, props: {} }, DEFAULT_CONFIG);
    expect(dts).not.toBeNull();
    expect(dts).not.toContain('FullModeRegistry');
  });

  test('追加 prop に utils / presets / token があれば値リテラルを CustomPropValue のジェネリクスへ埋め込む（#450）', () => {
    const dts = generateLismEnvDts(
      {
        breakpoints: {},
        props: { ...DEFAULT_CONFIG.props, filter: { prop: 'filter', presets: ['none'], utils: { blur: 'blur(4px)' }, token: 'space' } },
        tokens: DEFAULT_CONFIG.tokens,
      },
      DEFAULT_CONFIG
    );
    expect(dts).toContain("filter?: CustomPropValue<'none' | 'blur' | '10' | '20'>;");
    expect(dts).toContain("import type { CustomPropValue } from 'lism-css';");
  });

  test('既定 prop への追加値があれば CustomPropValueRegistry 拡張を生成する（#450）', () => {
    const dts = generateLismEnvDts(
      {
        breakpoints: {},
        props: { ...DEFAULT_CONFIG.props, p: { prop: 'padding', token: 'space', utils: { full: '100%' } } },
        tokens: { ...DEFAULT_CONFIG.tokens, space: { ...DEFAULT_CONFIG.tokens.space, '99': '99px' } },
      },
      DEFAULT_CONFIG
    );
    expect(dts).not.toBeNull();
    expect(dts).toContain('interface CustomPropValueRegistry');
    expect(dts).toContain("p: 'full' | '99';");
    // 値レジストリはリテラル型のみで import 不要
    expect(dts).not.toContain('import type');
    expect(dts?.match(/declare module 'lism-css'/g)).toHaveLength(1);
  });

  test("追加 prop の token: 'color' では palette カタログのキーも候補化される", () => {
    const dts = generateLismEnvDts(
      {
        breakpoints: {},
        props: { ...DEFAULT_CONFIG.props, accent: { prop: 'accentColor', token: 'color' } },
        tokens: { ...DEFAULT_CONFIG.tokens, color: { main: '#333' }, palette: { red: '#f00' } },
      },
      DEFAULT_CONFIG
    );
    expect(dts).toContain("accent?: CustomPropValue<'main' | 'red'>;");
  });

  test('値リテラル内のシングルクォート・改行・バックスラッシュをエスケープする', () => {
    const dts = generateLismEnvDts(
      { breakpoints: {}, props: { ...DEFAULT_CONFIG.props, weird: { prop: 'x', utils: { "a'b": '1', 'c\nd': '2', 'e\\f': '3' } } } },
      DEFAULT_CONFIG
    );
    expect(dts).toContain("weird?: CustomPropValue<'a\\'b' | 'c\\nd' | 'e\\\\f'>;");
  });
});

describe('writeLismEnvDts', () => {
  const dirs: string[] = [];
  function tmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lism-typegen-'));
    dirs.push(dir);
    return dir;
  }
  afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

  test('content があれば lism-env.d.ts を書き出す', () => {
    const root = tmpDir();
    writeLismEnvDts(root, generateLismEnvDts({ breakpoints: { xs: '360px' }, props: {} }, DEFAULT_CONFIG));
    const file = path.join(root, TYPES_FILENAME);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toContain('xs: true;');
  });

  test('内容が変わらなければ書き込まない（mtime 不変 = HMR ループ回避）', () => {
    const root = tmpDir();
    const content = generateLismEnvDts({ breakpoints: { xs: '360px' }, props: {} }, DEFAULT_CONFIG);
    writeLismEnvDts(root, content);
    const file = path.join(root, TYPES_FILENAME);
    const mtime1 = fs.statSync(file).mtimeMs;
    writeLismEnvDts(root, content);
    expect(fs.statSync(file).mtimeMs).toBe(mtime1);
  });

  test('追加 breakpoints / props がどちらも無く content が null なら既存の「生成物」を削除する', () => {
    const root = tmpDir();
    const file = path.join(root, TYPES_FILENAME);
    // 自動生成された .d.ts（マーカー付き）を置いておく
    fs.writeFileSync(file, generateLismEnvDts({ breakpoints: { xs: '360px' }, props: {} }, DEFAULT_CONFIG)!, 'utf8');
    writeLismEnvDts(root, generateLismEnvDts({ breakpoints: { sm: '480px' }, props: { p: { prop: 'padding' } } }, DEFAULT_CONFIG)); // null
    expect(fs.existsSync(file)).toBe(false);
  });

  test('追加 breakpoints が無くても追加 props が残れば削除しない', () => {
    const root = tmpDir();
    const file = path.join(root, TYPES_FILENAME);
    const content = generateLismEnvDts({ breakpoints: { xs: '360px' }, props: {} }, DEFAULT_CONFIG)!;
    fs.writeFileSync(file, content, 'utf8');

    writeLismEnvDts(root, generateLismEnvDts({ breakpoints: { sm: '480px' }, props: { filter: { prop: 'filter' } } }, DEFAULT_CONFIG));

    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toContain('filter?: CustomPropValue;');
    expect(fs.readFileSync(file, 'utf8')).not.toContain('xs: true;');
  });

  test('content が null でも、自動生成マーカーの無い手書きファイルは削除しない', () => {
    const root = tmpDir();
    const file = path.join(root, TYPES_FILENAME);
    fs.writeFileSync(file, '// 手書きの型定義\n', 'utf8');
    writeLismEnvDts(root, null);
    expect(fs.existsSync(file)).toBe(true);
  });

  test('自動生成マーカーの無い手書きファイルは上書きしない', () => {
    const root = tmpDir();
    const file = path.join(root, TYPES_FILENAME);
    fs.writeFileSync(file, '// 手書きの型定義\n', 'utf8');

    writeLismEnvDts(root, generateLismEnvDts({ breakpoints: { xs: '360px' }, props: {} }, DEFAULT_CONFIG));

    expect(fs.readFileSync(file, 'utf8')).toBe('// 手書きの型定義\n');
  });
});
