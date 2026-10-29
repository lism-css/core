基準日: 2026-10-29・コミット71ab76a77（作業ツリーを含む）

# 非推奨と互換処理

互換のために残している古い書き方と、それを消すときの作業の一覧。互換処理を足すPRで項目を足し、消したPRで項目を消す。

パッケージごとにバージョンが違う。消す時期の目安は、1.0以上のパッケージ（lism-css等）は次のメジャー、0.xのパッケージ（@lism-css/ui・lism-cli）は次の破壊的変更のリリース。

## lism-css

### `--gutter--base`と`.has--gutter`の`--gutter`

- 代わりに使うもの: `--gutter-px`
- 1.xでの扱い: `--gutter-px`の既定値が`--gutter--base`を参照するので、`--gutter--base`の上書きは`:root`でだけ効く。`.has--gutter`は`--gutter`に`--gutter-px`の値を入れ、`padding-inline`は`--gutter`を読むので、要素での`--gutter`の上書きと、内側からの`var(--gutter)`の参照も効く。
- v2で行う作業:
  - `packages/lism-css/src/scss/base/tokens/_tokens.scss`の`--gutter--base`と、`packages/lism-css/src/scss/trait/has/_gutter.scss`の`--gutter`を消し、`.has--gutter`の`padding-inline`を`var(--gutter-px)`にする
  - `.set--bleed`・`-max-sz:full`・`--sz--bleed`（`.is--container.has--gutter > *`）が読む変数を`--gutter-px`にする
  - apps/siteのdocs・`skills/lism-css-guide`・MCP索引から旧変数の説明を消す
- 経緯: [decisions.md](./decisions.md)の「2026-10-29: `.has--gutter`の余白量の変数を`--gutter-px`にし…」

### `tt="upper"` / `tt="lower"`

- 代わりに使うもの: `tt="uppercase"` / `tt="lowercase"`
- 1.xでの扱い: `packages/lism-css/config/defaults/props.ts`の`tt`の`shorthands`で、新しいクラス名に解決している。
- v2で行う作業: 残すか消すかを決める。
- 経緯: [decisions.md](./decisions.md)の「2026-09-10: text-transform のクラス値は省略せず uppercase / lowercase にする」

### `set`・`util`・`hov`の値のカンマ区切り

- 代わりに使うもの: スペース区切り（`hov="-c -bxsh"`等）
- 1.xでの扱い: `packages/lism-css/src/lib/helper/splitValues.ts`の`splitValues`で、カンマも区切りとして受け付ける。
- v2で行う作業: 残すか消すかを決める。

### uiが使わなくなった深いパス

- 1.xでの扱い: `packages/lism-ui/src/components/lismCssDeepImports.test.ts`の一覧にある深いパスと名前は、uiが使わなくなっても残す。
- v2で行う作業: 一覧のうちuiが使っていないものを消し、一覧からも外す。
- 経緯: [decisions.md](./decisions.md)の「2026-10-01: lism-cssの深いパスは`getLismProps`だけを公開APIにし…」

## @lism-css/ui

### `@lism-css/ui/react`・`@lism-css/ui/astro`からの一括import

- 代わりに使うもの: コンポーネントごとのパス（`@lism-css/ui/react/Accordion`等）
- 今の扱い: 互換のため使える。docs・サンプルコードでは使わない。
- 次の破壊的変更で行う作業: 残すか消すかを決める。

## lism-cli

### `lism.config`のUI設定の旧形式

- 代わりに使うもの: `ui`セクションの`dir`
- 今の扱い: 旧`cli`セクション（警告あり）、`ui.componentsDir`、`ui`/`cli`キーを使わず設定全体にUI設定を書く旧形式を読み込む。実装は`packages/lism-cli/src/config.ts`の`readConfig`。
- 次の破壊的変更で行う作業: 残すか消すかを決める。
