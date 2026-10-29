/**
 * isVar: 1 → クラス出力はせずstyle属性での変数出力のみ (--bdw, --keycolor など)
 * bp: 0（= bp 省略時のデフォルト）→ Prop-valユーティリティクラス化されなければ、style属性で出力するだけ。
 * bp: 1 → .-prop と --prop の セットがベースにあり、.-prop_bp と .--prop_bp で ブレイクポイント指定できる。
 *       .-prop{property:var(--prop)} が基本で、ユーティリティクラスは .-prop:val{property:value} となる。
 *
 * ↓コンポーネント処理で使用される
 * tokenClass: 1 → 対応するトークン値がそのまま全てユーティリティクラス化されるもの。
 * shorthands: → コンポーネント側で短く書くための設定
 *
 * ↓SCSS出力で使用される
 * alwaysVar: 1 → state変数扱い。 .-prop,[class*=-prop:] {property:var(--prop)} の base 出力となり、
 *   ユーティリティクラスは --prop をセットする形になる。
 *   加えて BPクラスも .-prop_$bp { property: var(--prop); --prop: var(--prop_$bp) !important; } を出力し、
 *   常に --prop が当該要素の現在値になるよう上書きされる（consumer が --prop を参照できる）。
 * important: 1 → !important を付けて最終的に出力する
 */

const PLACE_PRESETS = ['start', 'center', 'end'] as const;
const PLACE_FX_PRESETS = ['flex-start', 'flex-end'] as const;
const PLACE_SHORTHANDS = { s: 'start', e: 'end', c: 'center', fs: 'flex-start', fe: 'flex-end' } as const;

export default {
  f: { prop: 'font', presets: ['inherit'] },
  fz: { prop: 'fontSize', token: 'fz', tokenClass: 1, bp: 1 },
  fw: {
    prop: 'fontWeight',
    token: 'fw',
    tokenClass: 1,
    presets: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },
  ff: { prop: 'fontFamily', token: 'ff', tokenClass: 1 },
  fs: { prop: 'fontStyle', presets: ['italic'], shorthands: { i: 'italic' } },
  // 実 line-height（unitless比率）を --lh で管理する。既定の行間管理は hl（half-leading）。
  // トークン値も任意数値も --lh 経由で出力する（素の line-height 出力だと * ルールに阻まれ子要素へ継承されないため）。
  lh: {
    prop: 'lineHeight',
    token: 'lh',
    tokenClass: 1,
    utils: { '1': '1' },
    alwaysVar: 1,
  },
  hl: {
    prop: '--hl',
    isVar: 1,
    token: 'hl',
    tokenClass: 1,
    bp: 1,
    // hl="0" で half-leading なし (--hl:0px) を表現できるようにするユーティリティ。
    utils: { '0': '0px' },
  },
  lts: { prop: 'letterSpacing', token: 'lts', tokenClass: 1 },
  ta: { prop: 'textAlign', presets: ['center', 'left', 'right'] },
  td: { prop: 'textDecoration', utils: { none: 'none' } },
  tt: {
    prop: 'textTransform',
    presets: ['uppercase', 'lowercase'],
    // 旧クラス名 -tt:upper / -tt:lower との互換。props の upper / lower を -tt:uppercase / -tt:lowercase に解決する。
    shorthands: { upper: 'uppercase', lower: 'lowercase' },
  },

  d: {
    prop: 'display',
    presets: ['none', 'block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'inline', 'inline-block'],
    bp: 1,
  },
  o: { prop: 'opacity', presets: ['0'], token: 'o', tokenClass: 1 },
  v: { prop: 'visibility', presets: ['hidden'] },
  ov: { prop: 'overflow', presets: ['hidden', 'auto', 'clip'] },
  'ov-x': { prop: 'overflowX', presets: ['clip', 'auto', 'scroll'] },
  'ov-y': { prop: 'overflowY', presets: ['clip', 'auto', 'scroll'] },
  // overflow-clip-margin → safariで使えない
  ar: {
    prop: 'aspectRatio',
    presets: ['21/9', '16/9', '3/2', '1/1'],
    token: 'ar',
    tokenClass: 1,
    bp: 1,
  },

  // size
  w: { prop: 'width', utils: { fit: 'fit-content' }, presets: ['100%'], token: 'sz', bp: 1 },
  h: { prop: 'height', utils: { fit: 'fit-content' }, presets: ['100%'], token: 'sz', bp: 1 },
  'min-w': { prop: 'minWidth', presets: ['100%'], token: 'sz', bp: 1 },
  'max-w': { prop: 'maxWidth', presets: ['100%'], token: 'sz', bp: 1 },
  'min-h': { prop: 'minHeight', presets: ['100%'], token: 'sz', bp: 1 },
  'max-h': { prop: 'maxHeight', presets: ['100%'], token: 'sz', bp: 1 },

  contentSize: { isVar: 1, presets: ['s', 'm', 'l', 'xl'], token: 'sz' },
  sz: { prop: 'inlineSize', token: 'sz', bp: 1 },
  'min-sz': { prop: 'minInlineSize', token: 'sz', bp: 1 },
  'max-sz': {
    prop: 'maxInlineSize',
    token: 'sz',
    tokenClass: 1,
    // full / bleed は inline-size / margin-inline も書き換える複合ルール（_size.scss）なので、BP 値（--max-sz_{bp}）としては使えない。
    bp: 1,
    presets: ['full', 'bleed'],
    exUtility: {
      full: '',
      bleed: '',
    },
  },
  bsz: { prop: 'blockSize', token: 'sz' },
  'min-bsz': { prop: 'minBlockSize', token: 'sz' },
  'max-bsz': { prop: 'maxBlockSize', token: 'sz' },

  // bg
  bg: { prop: 'background' },
  bgi: { prop: 'backgroundImage' },
  bgr: { prop: 'backgroundRepeat', presets: ['no-repeat'] },
  bgp: { prop: 'backgroundPosition', presets: ['center'] },
  bgsz: { prop: 'backgroundSize', presets: ['cover', 'contain'] },
  bgc: {
    prop: 'backgroundColor',
    // keycolor は palette カタログ経由で var(--keycolor) に解決される（#479）。
    presets: ['base', 'base-2', 'text', 'brand', 'accent', 'keycolor', 'inherit', 'transparent'],
    // bdc と同様に currentColor を短く書けるようにする（-bgc:current）。
    utils: { current: 'currentColor' },
    token: 'color',
    exUtility: { inherit: { 'background-color': 'inherit' } },
    alwaysVar: 1,
  },

  c: {
    prop: 'color',
    presets: ['base', 'text', 'text-2', 'brand', 'accent', 'keycolor', 'inherit'],
    token: 'color',
    exUtility: {
      inherit: { color: 'inherit' }, // --c ではなく color で出力したい
    },
    alwaysVar: 1,
  },
  keycolor: { isVar: 1, token: 'color' },
  bd: { prop: 'border', presets: ['none'] },
  bds: { isVar: 1, presets: ['dashed', 'dotted', 'double'] },
  bdc: {
    isVar: 1,
    presets: ['brand', 'accent', 'divider', 'keycolor', 'inherit', 'transparent'],
    utils: { current: 'currentColor' },
    token: 'color',
  },
  bdw: { isVar: 1, bp: 1 }, // --bdw のみ
  'bd-x': { prop: 'borderInline' },
  'bd-y': { prop: 'borderBlock' },
  'bd-s': { prop: 'borderInlineStart' },
  'bd-e': { prop: 'borderInlineEnd' },
  'bd-bs': { prop: 'borderBlockStart' },
  'bd-be': { prop: 'borderBlockEnd' },
  'bd-t': { prop: 'borderTop' },
  'bd-b': { prop: 'borderBottom' },
  'bd-l': { prop: 'borderLeft' },
  'bd-r': { prop: 'borderRight' },

  bdrs: {
    prop: 'borderRadius',
    presets: ['0'],
    token: 'bdrs',
    tokenClass: 1,
    bp: 1,
    alwaysVar: 1,
  },
  'bdrs-tl': { prop: 'borderTopLeftRadius', token: 'bdrs' },
  'bdrs-tr': { prop: 'borderTopRightRadius', token: 'bdrs' },
  'bdrs-br': { prop: 'borderBottomRightRadius', token: 'bdrs' },
  'bdrs-bl': { prop: 'borderBottomLeftRadius', token: 'bdrs' },
  'bdrs-ss': { prop: 'borderStartStartRadius', token: 'bdrs' },
  'bdrs-se': { prop: 'borderStartEndRadius', token: 'bdrs' },
  'bdrs-es': { prop: 'borderEndStartRadius', token: 'bdrs' },
  'bdrs-ee': { prop: 'borderEndEndRadius', token: 'bdrs' },

  bxsh: { prop: 'boxShadow', utils: { 0: 'none' }, token: 'bxsh', tokenClass: 1, bp: 1 },

  // position
  pos: {
    prop: 'position',
    presets: ['static', 'fixed', 'sticky', 'relative', 'absolute'],
    bp: 1,
  },
  z: { prop: 'zIndex', presets: ['-1', '0', '1', '99'] },
  t: { prop: 'top', utils: { 0: '0%' }, presets: ['50%', '100%'], token: 'space' },
  l: { prop: 'left', utils: { 0: '0%' }, presets: ['50%', '100%'], token: 'space' },
  r: { prop: 'right', utils: { 0: '0%' }, presets: ['50%', '100%'], token: 'space' },
  b: { prop: 'bottom', utils: { 0: '0%' }, presets: ['50%', '100%'], token: 'space' },
  i: { prop: 'inset', utils: { 0: '0%' }, token: 'space' },
  'i-x': { prop: 'insetInline', token: 'space' },
  'i-y': { prop: 'insetBlock', token: 'space' },
  'i-s': { prop: 'insetInlineStart', token: 'space' },
  'i-e': { prop: 'insetInlineEnd', token: 'space' },
  'i-bs': { prop: 'insetBlockStart', token: 'space' },
  'i-be': { prop: 'insetBlockEnd', token: 'space' },

  // space
  p: {
    prop: 'padding',
    presets: ['0'],
    token: 'space',
    tokenClass: 1,
    alwaysVar: 1,
    bp: 1,
  },
  px: { prop: 'paddingInline', presets: ['0'], token: 'space', tokenClass: 1, bp: 1 },
  py: { prop: 'paddingBlock', presets: ['0'], token: 'space', tokenClass: 1, bp: 1 },
  ps: { prop: 'paddingInlineStart', token: 'space', tokenClass: 1, bp: 1 },
  pe: { prop: 'paddingInlineEnd', token: 'space', tokenClass: 1, bp: 1 },
  pbs: { prop: 'paddingBlockStart', token: 'space', tokenClass: 1, bp: 1 },
  pbe: { prop: 'paddingBlockEnd', token: 'space', tokenClass: 1, bp: 1 },
  pl: { prop: 'paddingLeft', token: 'space', tokenClass: 1, bp: 1 },
  pr: { prop: 'paddingRight', token: 'space', tokenClass: 1, bp: 1 },
  pt: { prop: 'paddingTop', token: 'space', tokenClass: 1, bp: 1 },
  pb: { prop: 'paddingBottom', token: 'space', tokenClass: 1, bp: 1 },
  m: {
    prop: 'margin',
    presets: ['auto', '0'],
    token: 'space',
    tokenClass: 1,
    alwaysVar: 1,
    bp: 1,
  },
  mx: { prop: 'marginInline', presets: ['auto', '0'], token: 'space', tokenClass: 1, bp: 1 },
  my: { prop: 'marginBlock', presets: ['auto', '0'], token: 'space', tokenClass: 1, bp: 1 },
  ms: { prop: 'marginInlineStart', presets: ['auto'], token: 'space', tokenClass: 1, bp: 1 },
  me: { prop: 'marginInlineEnd', presets: ['auto'], token: 'space', tokenClass: 1, bp: 1 },
  mbs: { prop: 'marginBlockStart', presets: ['auto', '0'], token: 'space', tokenClass: 1, bp: 1 },
  mbe: { prop: 'marginBlockEnd', presets: ['auto'], token: 'space', tokenClass: 1, bp: 1 },
  ml: { prop: 'marginLeft', token: 'space', tokenClass: 1, bp: 1 },
  mr: { prop: 'marginRight', token: 'space', tokenClass: 1, bp: 1 },
  mt: { prop: 'marginTop', token: 'space', tokenClass: 1, bp: 1 },
  mb: { prop: 'marginBottom', token: 'space', tokenClass: 1, bp: 1 },

  g: {
    prop: 'gap',
    presets: ['0', 'inherit'],
    exUtility: { inherit: { gap: 'inherit' } },
    token: 'space',
    tokenClass: 1,
    bp: 1,
  },
  cg: { prop: 'columnGap', token: 'space', tokenClass: 1, bp: 1 },
  rg: { prop: 'rowGap', token: 'space', tokenClass: 1, bp: 1 },
  cols: { isVar: 1, bp: 1 },
  rows: { isVar: 1, bp: 1 },

  // flex
  fxf: { prop: 'flexFlow' },
  fxw: { prop: 'flexWrap', presets: ['wrap'], bp: 1 },
  fxd: { prop: 'flexDirection', presets: ['column', 'column-reverse', 'row-reverse'], bp: 1 },
  fx: { prop: 'flex', presets: ['1'], bp: 1 },
  fxg: { prop: 'flexGrow', presets: ['1'] },
  fxsh: { prop: 'flexShrink', presets: ['0'] },
  fxb: { prop: 'flexBasis', bp: 1 },

  // grid
  gt: {
    prop: 'gridTemplate',
    bp: 1,
  },
  gta: { prop: 'gridTemplateAreas', bp: 1 },
  gtc: {
    prop: 'gridTemplateColumns',
    presets: ['subgrid'],
    bp: 1,
  },
  gtr: {
    prop: 'gridTemplateRows',
    presets: ['subgrid'],
    bp: 1,
  },
  gaf: { prop: 'gridAutoFlow', presets: ['row', 'column'], bp: 1 },
  gac: { prop: 'gridAutoColumns' },
  gar: { prop: 'gridAutoRows' },

  // grid item
  ga: { prop: 'gridArea', utils: { '1/1': '1 / 1' }, bp: 1 },
  gc: { prop: 'gridColumn', utils: { '1/-1': '1 / -1' }, bp: 1 },
  gr: { prop: 'gridRow', utils: { '1/-1': '1 / -1' }, bp: 1 },
  gcs: { prop: 'gridColumnStart' },
  gce: { prop: 'gridColumnEnd' },
  grs: { prop: 'gridRowStart' },
  gre: { prop: 'gridRowEnd' },

  // places
  ai: {
    prop: 'alignItems',
    presets: [...PLACE_PRESETS, 'stretch', ...PLACE_FX_PRESETS],
    shorthands: PLACE_SHORTHANDS,
    bp: 1,
  },
  ac: {
    prop: 'alignContent',
    presets: [...PLACE_PRESETS, ...PLACE_FX_PRESETS],
    utils: { between: 'space-between' },
    shorthands: PLACE_SHORTHANDS,
    bp: 1,
  },
  ji: {
    prop: 'justifyItems',
    presets: [...PLACE_PRESETS, 'stretch', ...PLACE_FX_PRESETS],
    shorthands: PLACE_SHORTHANDS,
    bp: 1,
  },
  jc: {
    prop: 'justifyContent',
    presets: [...PLACE_PRESETS, ...PLACE_FX_PRESETS],
    utils: { between: 'space-between' },
    shorthands: PLACE_SHORTHANDS,
    bp: 1,
  },
  pi: { prop: 'placeItems', presets: PLACE_PRESETS },
  pc: { prop: 'placeContent', presets: PLACE_PRESETS },
  aslf: {
    prop: 'alignSelf',
    presets: [...PLACE_PRESETS, 'stretch'],
    shorthands: PLACE_SHORTHANDS,
  },
  jslf: {
    prop: 'justifySelf',
    presets: [...PLACE_PRESETS, 'stretch'],
    shorthands: PLACE_SHORTHANDS,
  },
  pslf: { prop: 'placeSelf', presets: PLACE_PRESETS },
  order: { prop: 'order', presets: ['0', '-1', '1'], bp: 1 },

  // others
  ovw: { prop: 'overflowWrap', presets: ['anywhere'] },
  whs: { prop: 'whiteSpace', presets: ['nowrap'] },
  float: { prop: 'float', presets: ['left', 'right'] },
  clear: { prop: 'clear', presets: ['both'] },
  iso: { prop: 'isolation', presets: ['isolate'] },
  wm: { prop: 'writingMode', presets: ['vertical-rl'], bp: 1 },
} as const;
