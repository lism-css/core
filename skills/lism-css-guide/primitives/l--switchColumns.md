# l--switchColumns / `<SwitchColumns>`

複数列 ↔ 1列の切り替えをコンテナクエリやメディアクエリを使わずに実装するクラス。Flexbox ベースで、親コンテナ幅に応じて自動的に折り返します。

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/primitives/l--switchColumns.md

## 既定の挙動

- `display:flex`。
- `flex-wrap:wrap`で折り返しを有効化済み。
- `--breakSize:var(--sz--xs)`を初期値にし、直下子要素の`flex-grow:1`と`flex-basis`で親幅に応じた縦横切替を行います。
- 通常`fxw="wrap"`は足しません。

## 専用Props

| Prop | CSS変数 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `breakSize` | `--breakSize` | `var(--sz--xs)` | 横並びを維持するのに必要な親コンテナ幅を指定。`sz` トークンが使える |

## 関連プリミティブ

- [l--autoColumns](./l--autoColumns.md) — 最小幅ベースの自動段組
- [l--columns](./l--columns.md) — ブレイクポイント指定の等幅カラム
- [l--withSide](./l--withSide.md) — コンテンツ幅基準の2カラム切り替え
