# Trait クラス

Lism CSS では、要素に対して宣言的に「役割」や「機能」を付与するクラス群を **Trait クラス**（`is--` / `has--`）として定義します。これらは `@layer lism-trait` に属します。


## TOC

- [プレフィックス一覧](#プレフィックス一覧)
- [`is--` Trait（役割宣言）](#is---trait役割宣言)
- [`has--` Trait（機能付与）](#has---trait機能付与)

[詳細](https://lism-css.com/docs/trait-class.md)

---

## プレフィックス一覧

| プレフィックス | 種類 | レイヤー | 役割 |
| --- | --- | --- | --- |
| `is--` | Trait（役割宣言） | `lism-trait` | 要素に「〜である」という役割・存在を宣言する |
| `has--` | Trait（機能付与） | `lism-trait` | 要素に「〜を持つ」という単一機能を付与する。CSS 変数でカスタマイズ可能 |

併用ルールおよび `is--` / `has--` の判定軸は [css-rules.md](./css-rules.md#クラス分類とプレフィックス) を参照してください。


## `is--` Trait（役割宣言）

要素に**役割・存在の宣言**を付与するクラスです。他の Primitive / Component と自由に組み合わせられます。

| クラス | 用途 |
| --- | --- |
| `is--container` | コンテナクエリの基準要素を定義する（`container-type: inline-size`を付与する）。Lism のレスポンシブ機能の判定基準となるラッパーに付与する |
| `is--wrapper` | 直下の子要素のコンテンツ幅を一括で制限する。`-contentSize:s` / `-contentSize:m` / `-contentSize:l` / `-contentSize:xl` で事前定義したプリセットサイズを指定可能（デフォルト: `--sz--m`）。セクション・ヘッダー・フッター・記事コンテンツなどで、共通したコンテンツ幅を使用する |
| `is--layer` | 親要素全体に被さる絶対配置レイヤー（`position: absolute; inset: 0;`）。背景画像・カラーオーバーレイ・フィルターレイヤー・コンテンツ等を重ねて表示する |
| `is--boxLink` | ボックス全体をクリッカブルなリンク領域にする。自身を`a`タグにして利用するか、もしくは自身を`div`にして内部の`a`タグに`is--coverLink`を付与して使う |
| `is--coverLink` | 親要素全体に被さるクリック領域を持つリンク（`::before` を `inset: 0` で広げる）。`is--boxLink` と併用する |
| `is--skipFlow` | `l--flow` 直下で使用し、次の兄弟要素のフロー余白をゼロにする。`l--flow`の中にあるが`position:absolute`にしたい要素などに使用する |
| `is--side` | `l--withSide` 直下で使用し、サイド側の要素であることを示す |

Lism コンポーネントでは `isContainer`, `isLayer` 等の Props として利用できます（例: `<Lism isContainer>`）。

詳細は以下の個別ドキュメントを参照してください:
- [is--container](./trait-class/is--container.md)
- [is--wrapper](./trait-class/is--wrapper.md)
- [is--layer](./trait-class/is--layer.md)
- [is--boxLink](./trait-class/is--boxLink.md)


## `has--` Trait（機能付与）

要素に**単一機能の trait を付与**するクラスです。CSS 変数によりカスタマイズポイントを提供します。

| クラス | 用途 | 主な CSS 変数 |
| --- | --- | --- |
| `has--transition` | transition プロパティをまとめてセット。主に hoverクラス（`-hov:*`）と組み合わせて使用。対象プロパティは `--transitionProps` で明示指定する（初期値は `all` ではなく色・影・透明度・transform 系・filter 系に限定） | `--transitionProps`, `--duration`, `--ease`, `--delay`（グローバル上書きは `--transition-duration`） |
| `has--gutter` | コンテンツの左右に統一した余白（gutter）を設定する | `--gutter-px`（初期値 `var(--s30)`） |
| `has--snap` | `scroll-snap-` 系プロパティを CSS 変数経由でセットできるようにする | `--snapType`, `--snapAlign` 等 |
| `has--mask` | `--maskImg` 変数と組み合わせて、要素自身にマスクを適用する | `--maskImg`, `--maskPos`（`50%`）, `--maskSize`（`contain`）, `--maskRepeat`（`no-repeat`） |

Lism コンポーネントでは `hasTransition`, `hasGutter`, `hasSnap`, `hasMask` という Props として利用できます（例: `<Lism hasTransition>`）。`hasTransition` は文字列も受け付け、`--transitionProps` として出力されます（例: `<Lism hasTransition="color, opacity">`）。

詳細は以下の個別ドキュメントを参照してください:
- [has--transition](./trait-class/has--transition.md)
- [has--gutter](./trait-class/has--gutter.md)
- [has--snap](./trait-class/has--snap.md)
- [has--mask](./trait-class/has--mask.md)
