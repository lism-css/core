/**
 * デザイントークン（キー: 値）。
 *
 * - キーの順序がそのままカタログ順になる（Object.keys）。
 * ユーティリティ生成・prop 受理・型導出はすべてこのキー集合から導出される。
 * - 値はビルド時に生成 SCSS（`base/tokens/_tokens.gen.scss`）へ出力される。
 * - 値 `'-'` は「カタログに登録するがcssの出力はしない」もの。実値はscssで手書き。
 */
export default {
  // 構造変数: 他トークンの計算式から参照される、出力専用のグループ。
  //  - props からは参照されない（ユーティリティ生成・prop 受理の対象外）。
  //  - キーがそのまま CSS 変数名になる（token-var-prefix.ts の空プレフィックス）。
  //  - lism.config の tokens.vars で既存キーの値を上書きする用途（新規キーの追加は想定しない）。
  vars: {
    // パレットカラーの基準の明度・彩度（赤基準。各色は palette 側の計算式で微調整）
    '--L': '60%',
    '--C': '0.2',
    // フォントサイズ倍音列の分母（7~ に対応）
    '--fz-mol': '8',
    // ハーフレディングの計算単位（≒ 2px）。
    '--hl-unit': '0.125rem',
    // 余白の計算単位（≒ 8px）。
    '--s-unit': '0.5rem',
  },
  // セマンティックカラー
  color: {
    // base: 背景色
    base: 'hsl(220 0% 99%)',
    'base-2': 'hsl(220 4% 95%)',
    // text: コンテンツの文字色
    text: 'hsl(220 0% 8%)',
    'text-2': 'hsl(220 4% 32%)',
    // divider: 境界線の色
    divider: 'hsl(220 4% 88%)',
    link: 'oklch(50% 0.3 240)', // ≒ hsl(220, 90%, 48%)
    brand: 'hsl(212, 88%, 50%)',
    accent: 'hsl(347, 65%, 57%)',
    // ライトモード・ダークモードのどちらでもブレンドして使えるようなニュートラルカラー。
    //  Memo: 黒からの変化の方がわかりづらいため、明るめにする。
    neutral: 'hsl(220, 2%, 75%)',
    // shadow: 影色の基準。手書き SCSS の --shc がこれを参照する。
    shadow: 'hsl(220 2% 4% / 8%)',
  },

  // パレットカラー: 基準の明度 --L / 彩度 --C（vars グループの構造変数）を色相ごとに微調整して算出する。
  //  keycolor は :root に実値を持たないカタログ専用キー（prop 側で style 属性へ出力する）。
  palette: {
    red: 'oklch(var(--L) var(--C) 20)',
    blue: 'oklch(calc(var(--L) - 4%) calc(var(--C) + 0.01) 264)',
    green: 'oklch(calc(var(--L) + 4%) calc(var(--C) - 0.02) 152)',
    yellow: 'oklch(calc(var(--L) + 12%) calc(var(--C) - 0.02) 80)',
    purple: 'oklch(calc(var(--L) - 4%) calc(var(--C) + 0.01) 288)',
    orange: 'oklch(calc(var(--L) + 6%) calc(var(--C) - 0.01) 48)',
    pink: 'oklch(calc(var(--L) + 2%) calc(var(--C) + 0.01) 352)',
    gray: 'oklch(calc(var(--L) - 4%) calc(var(--C) / 10) 240)',
    white: '#fff',
    black: '#000',
    keycolor: '-',
  },

  // font-size: 倍音列でのスケーリング（--fz-mol は vars グループの構造変数）。基準は --fz--base。
  fz: {
    base: '1rem',
    '5xl': 'calc(1em * var(--fz-mol) / (var(--fz-mol) - 6))',
    '4xl': 'calc(1em * var(--fz-mol) / (var(--fz-mol) - 5))',
    '3xl': 'calc(1em * var(--fz-mol) / (var(--fz-mol) - 4))',
    '2xl': 'calc(1em * var(--fz-mol) / (var(--fz-mol) - 3))',
    xl: 'calc(1em * var(--fz-mol) / (var(--fz-mol) - 2))',
    l: 'calc(1em * var(--fz-mol) / (var(--fz-mol) - 1))',
    m: '1em',
    s: 'calc(1em * var(--fz-mol) / (var(--fz-mol) + 1))',
    xs: 'calc(1em * var(--fz-mol) / (var(--fz-mol) + 2))',
    '2xs': 'calc(1em * var(--fz-mol) / (var(--fz-mol) + 3))',
  },

  // font-family
  ff: {
    /* Base:
     *   -apple-system/BlinkMacSystemFont → Macで英数字をSan Franciscoに。（前者がSafari/Firefox、後者がChrome用）
     *   'Hiragino Sans' → Macでの和文フォントの指定。ここを省くと、Chromeで sans-serifが Hiragino Kaku Gothic ProN になってしまう
     *   sans-serif: Mac=Hiragino系 / Win=Noto|Meiryo
     *
     *   Note: system-ui は和文に游ゴシックが当たるため使わない。
     */
    base: "-apple-system, 'BlinkMacSystemFont', 'Hiragino Sans', sans-serif",
    // Accent: 装飾用セリフ。初期状態はあくまで一例で実際はカスタマイズしてもらう想定。
    accent: 'Georgia, serif',
    // Mono: ui-monospace=各OSのUI等幅 / SFMono・Menlo→Mac・Consolas→Win のフォールバック
    mono: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
  },

  // font-weight
  fw: { light: '300', normal: '400', bold: '700' },

  // half-leading: --hl-unit は vars グループの構造変数。
  hl: {
    base: 'calc(var(--hl-unit) * 3)',
    xs: 'var(--hl-unit)',
    s: 'calc(var(--hl-unit) * 2)',
    l: 'calc(var(--hl-unit) * 4)',
    xl: 'calc(var(--hl-unit) * 5)',
  },

  // line-height: unitless比率。fz に比例した行送りを維持したい場合に使う（既定の行間管理は hl）。
  //  hl と違い body 等で base 値としてセットしないため、中央キーは base ではなく m。
  lh: { xs: '1.125', s: '1.25', m: '1.5', l: '1.75', xl: '2' },

  // letter-spacing: xs〜xl は base からの相対値。base は calc() に入るため長さで指定する（normal 不可）。
  //  Memo: var() は :root で置換されるため、base の上書きは :root で行う（子孫要素での上書きは xs〜xl に伝わらない）。
  lts: {
    base: '0em',
    xs: 'calc(var(--lts--base) - 0.05em)',
    s: 'calc(var(--lts--base) - 0.025em)',
    l: 'calc(var(--lts--base) + 0.05em)',
    xl: 'calc(var(--lts--base) + 0.1em)',
  },

  // opacity（音楽の強弱記号 piano 系列に由来）
  o: { mp: '0.9', p: '0.8', pp: '0.6', ppp: '0.4' },

  // +0.125 → +0.25 → +0.375 → + 0.5 と 二階等差数列で増えつつ、10~40がフィボナッチ数列。inner は .set--bdrsInner で計算
  bdrs: { '10': '0.25rem', '20': '0.375rem', '30': '0.625rem', '40': '1rem', '50': '1.5rem', '99': '99rem', inner: '-' },

  // box-shadow: 構造変数 --shsz--*（手書き SCSS）と影色 --shc を合成。.set--bxsh で再宣言され影色 --shc を上書きできる。
  bxsh: {
    '10': 'var(--shsz--5) var(--shc--near), var(--shsz--10) var(--shc)',
    '20': 'var(--shsz--10) var(--shc--near), var(--shsz--20) var(--shc)',
    '30': 'var(--shsz--20) var(--shc--near), var(--shsz--30) var(--shc)',
    '40': 'var(--shsz--30) var(--shc--near), var(--shsz--40) var(--shc)',
    '50': 'var(--shsz--40) var(--shc--near), var(--shsz--50) var(--shc)',
  },

  // aspect-ratio
  ar: { og: '1.91/1' },

  // space: 構造変数 --s-unit（vars グループ）の倍数。.set--s で --s-unit を em 化すると再ベースされる。
  //  10 刻みはフィボナッチ数列で縦のリズム用。5 刻みは水平方向の gap / padding 用の中間値で 50 まで。
  space: {
    '5': 'calc(var(--s-unit) * 0.5)', // ≒ 4px
    '10': 'var(--s-unit)', // ≒ 8px
    '15': 'calc(var(--s-unit) * 1.5)', // ≒ 12px
    '20': 'calc(var(--s-unit) * 2)', // ≒ 16px
    '25': 'calc(var(--s-unit) * 2.5)', // ≒ 20px
    '30': 'calc(var(--s-unit) * 3)', // ≒ 24px
    '35': 'calc(var(--s-unit) * 4)', // ≒ 32px
    '40': 'calc(var(--s-unit) * 5)', // ≒ 40px
    '45': 'calc(var(--s-unit) * 6.5)', // ≒ 52px
    '50': 'calc(var(--s-unit) * 8)', // ≒ 64px
    '60': 'calc(var(--s-unit) * 13)', // ≒ 104px
    '70': 'calc(var(--s-unit) * 21)', // ≒ 168px
  },

  // flow: lang スコープ上書きありのため手書き SCSS。
  flow: { s: '-' },

  // content-size
  sz: { xs: '400px', s: '640px', m: '880px', l: '1200px', xl: '1600px' },
} as const;
