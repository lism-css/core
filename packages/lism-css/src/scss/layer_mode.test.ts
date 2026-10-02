import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass';
import { describe, expect, test } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

const silentLogger = { warn: () => {}, debug: () => {} };

function compileString(source: string): string {
  return sass.compileString(source, {
    url: pathToFileURL(resolve(currentDir, '__layer_mode_test.scss')),
    logger: silentLogger,
  }).css;
}

// 同じエントリは1回だけコンパイルして共有する
const entryCache = new Map<string, string>();
function compileEntry(entry: string): string {
  let css = entryCache.get(entry);
  if (css === undefined) {
    css = sass.compile(resolve(currentDir, entry), { logger: silentLogger }).css;
    entryCache.set(entry, css);
  }
  return css;
}

const testProp = `
  $props: (
    'zztest': (
      prop: 'padding',
      utilities: (
        '10': '10px',
      ),
    ),
  )
`;

describe('mixin: maybe_double / maybe_where / in_base_layer', () => {
  const body = `
#{mixin.maybe_double('.u--a', '[data-x]')} { color: red; }
#{mixin.maybe_double('.u--b')} > * { color: red; }
#{mixin.maybe_where('.-bd, [data-bd]')} { color: red; }
@include mixin.in_base_layer { .zz { color: red; } }
`;

  test('$layer_mode: 1 はセレクタをそのまま出力し、@layer lism-base に包む', () => {
    const css = compileString(`@use './mixin' as mixin;\n${body}`);

    expect(css).toContain('.u--a, [data-x] {');
    expect(css).toContain('.u--b > * {');
    expect(css).toContain('.-bd, [data-bd] {');
    expect(css).toContain('@layer lism-base {');
  });

  test('$layer_mode: 0 はセレクタを二重化し、:where() で包み、@layer を出力しない', () => {
    const css = compileString(`@use './mixin' with ($layer_mode: 0);\n${body}`);

    expect(css).toContain('.u--a.u--a, [data-x][data-x] {');
    expect(css).toContain('.u--b.u--b > * {');
    expect(css).toContain(':where(.-bd, [data-bd]) {');
    expect(css).not.toContain('@layer');
  });
});

const testPropWithImportant = (important: 0 | 1) => `
  $props: (
    'zztest': (
      prop: 'padding',
      bp: 1,
      important: ${important},
      utilities: (
        '10': '10px',
      ),
    ),
  )
`;

describe('$default_important の解決', () => {
  const autoOutput = (settingWith: string, mixinWith: string) =>
    compileString(`
@use './setting' with (${settingWith});
@use './mixin' with (${mixinWith});
@use './auto_output';
`);

  test('$layer_mode: 1 は setting.$default_important に従う', () => {
    expect(autoOutput(`${testProp}, $default_important: 0`, '$layer_mode: 1')).toMatch(/padding: 10px;/);
    expect(autoOutput(`${testProp}, $default_important: 1`, '$layer_mode: 1')).toMatch(/padding: 10px\s+!important;/);
  });

  test('$layer_mode: 0 は setting.$default_important が 0 でも !important を付ける', () => {
    expect(autoOutput(`${testProp}, $default_important: 0`, '$layer_mode: 0')).toMatch(/padding: 10px\s+!important;/);
  });

  test('$layer_mode: 0 でも mixin.$default_important: 0 を明示すれば外せる', () => {
    expect(autoOutput(`${testProp}, $default_important: 0`, '$layer_mode: 0, $default_important: 0')).toMatch(/padding: 10px;/);
  });

  test('$layer_mode: 0 は $props の important: 0 より !important を優先する（BPクラスも含む）', () => {
    const css = autoOutput(`${testPropWithImportant(0)}, $default_important: 0`, '$layer_mode: 0');

    expect(css).toMatch(/\.-zztest \{\s*padding: var\(--zztest\)\s+!important;/);
    expect(css).toMatch(/padding: 10px\s+!important;/);
    expect(css).toMatch(/\.-zztest_sm \{\s*padding: var\(--zztest_sm\)\s+!important;/);
  });

  test('$layer_mode: 1 は $props の important: 0 が既定より優先される', () => {
    const css = autoOutput(`${testPropWithImportant(0)}, $default_important: 1`, '$layer_mode: 1');

    expect(css).toMatch(/\.-zztest \{\s*padding: var\(--zztest\);/);
    expect(css).toMatch(/padding: 10px;/);
    expect(css).toMatch(/\.-zztest_sm \{\s*padding: var\(--zztest_sm\);/);
  });

  test('$layer_mode: 0 かつ mixin.$default_important: 0 なら $props の important: 1 が効く', () => {
    const css = autoOutput(`${testPropWithImportant(1)}, $default_important: 0`, '$layer_mode: 0, $default_important: 0');

    expect(css).toMatch(/\.-zztest \{\s*padding: var\(--zztest\)\s+!important;/);
    expect(css).toMatch(/padding: 10px\s+!important;/);
  });

  test('alwaysVar のプリセットクラスは変数にも同じ解決結果を付け、BPクラスより前に出力する', () => {
    const alwaysVarProp = `
  $props: (
    'zztest': (
      prop: 'padding',
      bp: 1,
      alwaysVar: 1,
      utilities: (
        '10': '10px',
      ),
    ),
  )
`;
    const withImportant = autoOutput(`${alwaysVarProp}, $default_important: 1`, '$layer_mode: 1');
    const withoutImportant = autoOutput(`${alwaysVarProp}, $default_important: 0`, '$layer_mode: 0, $default_important: 0');

    expect(withImportant).toMatch(/\.-zztest\\:10 \{\s*--zztest: 10px !important;/);
    // どちらも !important のため、BPクラスが後勝ちできる順序であること
    expect(withImportant.indexOf('.-zztest\\:10 {')).toBeLessThan(withImportant.indexOf('.-zztest_sm {'));
    expect(withoutImportant).toMatch(/\.-zztest\\:10 \{\s*--zztest: 10px;/);
  });
});

describe('no_layer エントリ', () => {
  test('main_no_layer は Property Class に !important を付け、u-- をセレクタ二重化する', () => {
    const css = compileEntry('main_no_layer.scss');

    expect(css).toMatch(/\.-ta\\:center \{\s*text-align: center\s+!important;/);
    expect(css).toContain('.u--trim.u--trim {');
    expect(css).toContain('.u--trimAll.u--trimAll > :not(');
    expect(css).toContain('.u--cbox.u--cbox {');
    expect(css).toContain(':where(.-bd, [class*=" -bd-"], [class^=-bd-]) {');
    // 二重化対象外
    expect(css).toContain('.u--srOnly:not(#_) {');
    expect(css).toContain('.u--clipText {');
  });

  test('main_no_layer は -hov 系の preset クラスにも !important を付ける', () => {
    const css = compileEntry('main_no_layer.scss');

    expect(css).toMatch(/\.-hov\\:underline:hover \{\s*text-decoration: underline\s+!important;/);
    expect(css).toMatch(/\.-hov\\:in\\:zoom \{[^}]*scale: var\(--_isHov, 1\.1\)\s+!important;/);
  });

  test('main は -hov 系の preset クラスに !important を付けない', () => {
    const css = compileEntry('main.scss');

    expect(css).toMatch(/\.-hov\\:underline:hover \{\s*text-decoration: underline;/);
    expect(css).toMatch(/\.-hov\\:in\\:zoom \{[^}]*scale: var\(--_isHov, 1\.1\);/);
  });

  test('main_no_layer は変数をセットするプリセットクラス（alwaysVar）の変数にも !important を付ける', () => {
    const css = compileEntry('main_no_layer.scss');

    expect(css).toMatch(/\.-c\\:brand \{\s*--c: var\(--brand\) !important;/);
    // u--cbox（0-2-0）側の --c は !important なしなので、プリセットが勝つ
    expect(css).toMatch(/\.u--cbox\.u--cbox \{[^}]*--c: color-mix\([^;]*\);/);
  });

  test('main は変数をセットするプリセットクラスに !important を付けない', () => {
    const css = compileEntry('main.scss');

    expect(css).toMatch(/\.-c\\:brand \{\s*--c: var\(--brand\);/);
  });

  test('main（@layer あり）は setting の既定どおり !important なし・二重化なし', () => {
    const css = compileEntry('main.scss');

    expect(css).toMatch(/\.-ta\\:center \{\s*text-align: center;/);
    expect(css).toContain('.u--trim {');
    expect(css).not.toContain('.u--trim.u--trim');
    expect(css).toMatch(/@layer lism-base \{\s*\.-bd, \[class\*=" -bd-"\], \[class\^=-bd-\] \{/);
  });

  test('-bd は変数の初期値だけを lism-base に置き、border-width / border-color は unlayered に出す', () => {
    const css = compileEntry('main.scss');

    // lism-base 側は変数3つだけで閉じる（border-* を含めると上位レイヤーの border ショートハンドに負ける）
    expect(css).toMatch(
      /@layer lism-base \{\s*\.-bd, \[class\*=" -bd-"\], \[class\^=-bd-\] \{\s*--bds: solid;\s*--bdw: 1px;\s*--bdc: var\(--divider\);\s*\}\s*\}/
    );
    expect(css).toMatch(/\n\.-bd,\s*\[class\*=" -bd-"\],\s*\[class\^=-bd-\] \{\s*border-width: var\(--bdw\);\s*border-color: var\(--bdc\);\s*\}/);
  });

  test('単体エントリ utility/index.scss は $layer_mode 既定のため二重化しない', () => {
    const css = compileEntry('utility/index.scss');

    expect(css).toContain('.u--trim {');
    expect(css).not.toContain('.u--trim.u--trim');
  });

  test('setting を先に設定済みでも main_no_layer を読み込める（SCSS bridge 経路）', () => {
    // $default_important: 0 を渡しても no_layer では !important が付く
    const css = compileString(`
@use './setting' with ($default_important: 0);
@use './main_no_layer';
`);

    expect(css).toMatch(/\.-ta\\:center \{\s*text-align: center\s+!important;/);
  });
});
