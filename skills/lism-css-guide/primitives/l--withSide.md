# l--withSide / `<WithSide>`

メディアクエリ・コンテナクエリに依存せず、**維持したいコンテンツ幅を基準にして横並び・縦並びが自動で切り替わる2カラムレイアウト**。「画像 + コンテンツ」「メインエリア + サイドバー」などに活用できる。

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/primitives/l--withSide.md

## 動作の仕組み

- サイド側の横幅を `--sideW` で、メイン側で維持したい最小横幅を `--mainW` で指定
- メイン側が `--mainW` を維持できる範囲内では横並びを保ち、下回ると自動で縦並びに切り替わる
- 子要素の**一方に `is--side` を付ける必要がある**（コンポーネントでは `isSide` prop）

## 既定の挙動

- `display:flex`。
- `flex-wrap:wrap`で折り返しを有効化済み。
- `--sideW:auto`、`--mainW:max(20rem, 50%)`を初期値にします。
- 直下の`.is--side`をサイド側、それ以外をメイン側としてflex比率・basis・`min-width:0`を設定します。通常`fxw="wrap"`は足しません。

## 専用Props

| Prop | 出力 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `sideW` | `--sideW` | `auto` | サイド要素の横幅。`sz` トークンが使える |
| `mainW` | `--mainW` | `max(20rem, 50%)` | メイン要素で維持したい最小幅。`sz` トークンが使える |

## HTML構造

```html
<div class="l--withSide">
  <div>Main Content</div>
  <div class="is--side">Side Content</div>
</div>
```

## `l--grid` との使い分け

- **`l--withSide`**: ブレイクポイントに依存せず、コンテンツ幅で自動切り替え
- **`l--grid`** (`<Grid gta={[...]} gtc={[...]} />`): ブレイクポイント（`sm`/`md`）で明示的に切り替えたい場合

```jsx
// ブレイクポイント依存で似たレイアウトを構築する例
<Grid gta={[`'.' 'side'`, `'. side'`]} gtc={[null, '1fr 10rem']} g="20">
  <Box>メインコンテンツ</Box>
  <Box ga="side">サイドコンテンツ</Box>
</Grid>
```

## 関連プリミティブ

- [l--grid](./l--grid.md) — ブレイクポイント切り替え型の2カラム構築に使用
- [l--autoColumns](./l--autoColumns.md) — カラム幅ベースの自動段組
- [l--switchColumns](./l--switchColumns.md) — ブレイクポイント一括切り替え型カラム
- [is--container](../trait-class/is--container.md) — レスポンシブ Property Class 利用時に必要
