# has--gutter

要素の左右に、サイト共通の gutter（余白）を適用する Trait クラス。`padding` 系ユーティリティとは別に、「サイト全体で統一した左右余白」を確保したい時に使う。

- Lism props: `hasGutter`（`<Lism hasGutter>` 等）

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/trait-class.md#has--gutter

## SCSS 定義

```scss
.has--gutter {
  // --gutter は 1.x の互換用（非推奨）。要素での --gutter の上書きと、内側からの var(--gutter) の参照を保つ。
  --gutter: var(--gutter-px);
  padding-inline: var(--gutter);
}
```

## CSS 変数

| 変数 | 役割 | デフォルト |
| --- | --- | --- |
| `--gutter-px` | `.has--gutter` の左右余白の量（`:root` 定義） | `var(--s30)` |

- サイト全体の余白を変えたい場合は `:root` で `--gutter-px` を上書きする
- 特定のセクションや要素だけ変えたい場合は、その要素で `style="--gutter-px: 20px"` のように上書きする。内側の `.has--gutter` にも引き継がれる
- `.has--gutter` の外でガターと同じ幅を使いたい場合も `var(--gutter-px)` を参照する
- `--gutter--base` と `--gutter` は1.xの互換用の非推奨変数。新しく書くコードでは使わない

## 関連

- `-px:*` プロパティクラス — その要素ごとに任意の左右 padding を付けたい場合はこちら
- `is--wrapper` — コンテンツ幅制御。gutter と組み合わせてセクションラッパーを構成することが多い
