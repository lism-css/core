// @vitest-environment jsdom
// convert.ts は <template> と DOMParser を使うため DOM 環境で実行する。
import { describe, it, expect } from 'vitest';
import { htmlToJsx, jsxToHtml } from './convert';
import { INITIAL_HTML_BY_LANG, type DemoLang } from '../initial-code';
import { SCENARIO_BY_LANG } from '../scenario';

/** HTML → JSX → HTML が元の文字列と一致すること（＝プリンタの正準形になっていること） */
const expectRoundTrip = (html: string): void => {
  expect(jsxToHtml(htmlToJsx(html))).toBe(html);
};

// エディターに最初から入っているコードが正準形でないと、
// 訪問者が JSX タブを押した瞬間に表示中のコードが書き換わってしまう
describe('初期コード・シナリオの正準形', () => {
  const langs = Object.keys(INITIAL_HTML_BY_LANG) as DemoLang[];

  it.each(langs)('[%s] 初期コードが HTML ⇔ JSX で往復する', (lang) => {
    expectRoundTrip(INITIAL_HTML_BY_LANG[lang]);
  });

  it.each(langs)('[%s] 全シナリオステップの resultCode が往復する', (lang) => {
    for (const step of SCENARIO_BY_LANG[lang]) expectRoundTrip(step.resultCode);
  });
});

describe('レイアウトコンポーネント', () => {
  const cases: [string, string][] = [
    ['Box', 'l--box'],
    ['Center', 'l--center'],
    ['Cluster', 'l--cluster'],
    ['Columns', 'l--columns'],
    ['Flex', 'l--flex'],
    ['Frame', 'l--frame'],
    ['Grid', 'l--grid'],
    ['Stack', 'l--stack'],
    ['TileGrid', 'l--tileGrid'],
  ];

  it.each(cases)('%s ⇔ .%s', (component, layoutClass) => {
    const html = `<div class="${layoutClass}">x</div>`;
    expect(htmlToJsx(html)).toBe(`<${component}>x</${component}>`);
    expect(jsxToHtml(`<${component}>x</${component}>`)).toBe(html);
  });

  it('div 以外のタグは as で表す', () => {
    expect(htmlToJsx('<section class="l--grid">x</section>')).toBe('<Grid as="section">x</Grid>');
  });

  it('固有 prop を持つレイアウトは対象外（クラスのまま保持され往復する）', () => {
    expect(jsxToHtml('<Flow>x</Flow>')).toBeNull();
    expectRoundTrip('<div class="l--flow">x</div>');
  });
});

describe('スペース区切りの prop 値', () => {
  it('本物と同じ `-p` クラス + `--p` 変数へ展開される', () => {
    expect(jsxToHtml('<Box p="10 20">x</Box>')).toBe('<div class="l--box -p" style="--p: var(--s10) var(--s20)">x</div>');
  });

  it('HTML から prop へ戻る', () => {
    expect(htmlToJsx('<div class="l--box -p" style="--p: var(--s10) var(--s20)">x</div>')).toBe('<Box p="10 20">x</Box>');
    expectRoundTrip('<div class="l--box -p" style="--p: var(--s10) var(--s20)">x</div>');
  });

  it('3 値・0 を含む指定も往復する', () => {
    expectRoundTrip('<div class="l--box -py" style="--py: 0 var(--s10) var(--s20)">x</div>');
  });

  it('`--{prop}` を伴わない bare クラスは boolean prop のまま', () => {
    expect(htmlToJsx('<div class="l--box -bd">x</div>')).toBe('<Box bd>x</Box>');
  });

  it('変数形式を持たない prop のスペース値は変換不能（本物は生のスタイル宣言を書く）', () => {
    expect(jsxToHtml('<Box bd="1px solid red">x</Box>')).toBeNull();
  });

  it('hov の空白区切りは複数の -hov クラスと往復する', () => {
    expect(jsxToHtml('<Box hov="-c -bdc">x</Box>')).toBe('<div class="l--box -hov:-c -hov:-bdc">x</div>');
    expectRoundTrip('<div class="l--box -hov:-c -hov:-bdc">x</div>');
  });

  it('スペースなしの値は従来どおりプロパティクラス', () => {
    expect(jsxToHtml('<Box p="10">x</Box>')).toBe('<div class="l--box -p:10">x</div>');
  });
});

describe('util prop（u-- クラス）', () => {
  it('u--{name} クラスは util prop と往復する', () => {
    expect(htmlToJsx('<h1 class="u--trim -fw:900">x</h1>')).toBe('<Heading level="1" util="trim" fw="900">x</Heading>');
    expectRoundTrip('<h1 class="u--trim -fw:900">x</h1>');
  });

  it('u-- クラスの正準位置はレイアウトクラスの直後（prop クラスの前）', () => {
    expect(jsxToHtml('<Box p="10" util="trim">x</Box>')).toBe('<div class="l--box u--trim -p:10">x</div>');
    expectRoundTrip('<div class="l--box u--trim -p:10">x</div>');
  });

  it('複数の u-- クラスは空白区切りの util 値に集約される', () => {
    expect(htmlToJsx('<div class="u--a u--b">x</div>')).toBe('<Lism util="a b">x</Lism>');
    expectRoundTrip('<div class="u--a u--b">x</div>');
  });

  it('除外指定（- prefix）の util 値は変換不能', () => {
    expect(jsxToHtml('<Box util="-trim">x</Box>')).toBeNull();
  });
});

describe('set prop（set-- クラス）', () => {
  it('set--{name} クラスは set prop と往復する', () => {
    expect(htmlToJsx('<button class="l--flex set--plain -p:10" type="button">x</button>')).toBe(
      '<Flex as="button" set="plain" p="10" type="button">x</Flex>'
    );
    expect(jsxToHtml('<Flex as="button" set="plain" p="10" type="button">x</Flex>')).toBe(
      '<button class="l--flex set--plain -p:10" type="button">x</button>'
    );
    expectRoundTrip('<button class="l--flex set--plain -p:10" type="button">x</button>');
  });

  it('set-- クラスの正準位置はレイアウトクラスの直後（u-- クラスの前）', () => {
    expect(jsxToHtml('<Box set="plain" util="trim" p="10">x</Box>')).toBe('<div class="l--box set--plain u--trim -p:10">x</div>');
    expectRoundTrip('<div class="l--box set--plain u--trim -p:10">x</div>');
  });

  it('複数の set-- クラスは空白区切りの set 値に集約される', () => {
    expect(htmlToJsx('<div class="set--a set--b">x</div>')).toBe('<Lism set="a b">x</Lism>');
    expectRoundTrip('<div class="set--a set--b">x</div>');
  });

  it('除外指定（- prefix）の set 値は変換不能', () => {
    expect(jsxToHtml('<Box set="-plain">x</Box>')).toBeNull();
  });
});

describe('レスポンシブ配列 prop', () => {
  it('全 BP キーが往復する', () => {
    const jsx = '<Box p={[10, 20, 30, 40, 50]}>x</Box>';
    expect(htmlToJsx(jsxToHtml(jsx)!)).toBe(jsx);
  });

  it('空きスロット（null）も往復する', () => {
    const jsx = '<Box p={[10, null, 30]}>x</Box>';
    expect(htmlToJsx(jsxToHtml(jsx)!)).toBe(jsx);
  });

  it('BP キーでない接尾辞は className として保持される', () => {
    expect(htmlToJsx('<div class="l--box -p_xs">x</div>')).toBe('<Box className="-p_xs">x</Box>');
  });
});

describe('その他の要素', () => {
  it('見出し・段落がコンポーネントへ対応する', () => {
    expect(htmlToJsx('<h2 class="-fz:l">x</h2>')).toBe('<Heading level="2" fz="l">x</Heading>');
    expect(htmlToJsx('<p class="-fz:s">x</p>')).toBe('<Text fz="s">x</Text>');
  });

  it('prop クラスを持つ span は <Inline> と往復する', () => {
    expect(htmlToJsx('<span class="-px:10">x</span>')).toBe('<Inline px="10">x</Inline>');
    expect(jsxToHtml('<Inline px="10">x</Inline>')).toBe('<span class="-px:10">x</span>');
    expectRoundTrip('<span class="-px:10">x</span>');
  });

  it('prop クラスを持たない span はそのまま', () => {
    expectRoundTrip('<span>x</span>');
  });

  it('as 付き Inline / Lism as="span" も HTML へ戻る（正準形はそれぞれ Lism as / Inline）', () => {
    expect(jsxToHtml('<Inline as="i" fz="s">x</Inline>')).toBe('<i class="-fz:s">x</i>');
    expect(jsxToHtml('<Lism as="span" px="10">x</Lism>')).toBe('<span class="-px:10">x</span>');
  });

  it('void 要素は自己終了で出力される', () => {
    expect(htmlToJsx('<div class="l--box">a<br />b</div>')).toBe('<Box>\n  a\n  <br />\n  b\n</Box>');
    expect(jsxToHtml('<img src="a.png" alt="" />')).toBe('<img src="a.png" alt="" />');
  });

  it('壊れた JSX は null（last-good 維持）', () => {
    expect(jsxToHtml('<Box>x')).toBeNull();
  });
});
