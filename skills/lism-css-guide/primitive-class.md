# Primitive クラス

Lism CSS では、レイアウトを組み立てる小さな積み木として **Primitive クラス**（`l--` / `a--`）を提供します。
これらは `@layer lism-primitive` に属します（サブレイヤーは `layout` / `atomic`）。


## TOC

- [プレフィックス一覧](#プレフィックス一覧)
- [Layout Primitive（`l--`）](#layout-primitivel--)
  - [カラムレイアウト Primitive の使い分けガイド](#カラムレイアウト-primitive-の使い分けガイド)
- [Atomic Primitive（`a--`）](#atomic-primitivea--)

[詳細](https://lism-css.com/docs/primitives.md)

---

## プレフィックス一覧

| プレフィックス | 種類 | サブレイヤー | 役割 |
| --- | --- | --- | --- |
| `l--` | Layout Primitive | `lism-primitive.layout` | レイアウトの構成単位となる Primitive |
| `a--` | Atomic Primitive | `lism-primitive.atomic` | レイアウトの最小単位（アイコン・区切り線等） |

併用ルールは [css-rules.md](./css-rules.md#クラス分類とプレフィックス) を参照してください。


## Layout Primitive（`l--`）

レイアウト構造を定義するメインの Primitive 群です。

| クラス | 用途 |
| --- | --- |
| `l--box` | 汎用ボックス |
| `l--flex` | 横方向の基本的なFlexboxレイアウト |
| `l--stack` | 縦方向の縦積みFlexboxレイアウト（`flex-direction: column`）。 |
| `l--cluster` | タグの表示UIなど、複数要素を水平に並べて配置し、数が多ければ折り返すようなレイアウト。（`flex-wrap: wrap; align-items: center`） |
| `l--grid` | 基本的なGridレイアウト。 |
| `l--center` | 要素を縦横中央に配置するレイアウト（`place-content: center; place-items: center`） |
| `l--flow` | 記事コンテンツなどのフローレイアウト。子要素間の余白を `margin-block-start` で管理する。 |
| `l--frame` | アスペクト比や高さが固定されたメディア要素を配置する。直下のメディア要素に `object-fit: cover` を付与する。 |
| `l--columns` | `repeat`と`minmax(0, 1fr)`を使ったカラムレイアウト。レスポンシブ対応の`--cols`用のProperty Classでカラム数の切り替え可能。 |
| `l--tileGrid` | `--cols`だけではなく`--rows`も組み合わせた均等タイルグリッド（`grid-template: repeat(var(--rows,1), minmax(0, 1fr)) / repeat(var(--cols,1), minmax(0, 1fr))`） |
| `l--autoColumns` | ブレイクポイントに依存せず、自動段組のできる流動カラムレイアウト。`--cols: 16em`のようにして最小維持幅を指定できる。 |
| `l--withSide` | 画像とコンテンツ、メインエリアとサイドバーなどの「"Side" + "Main"」に分かれ、横並びと縦並びが切り替わるレイアウト。"Main"が`--mainW`で指定したサイズ以上の横幅を維持できる範囲内で横並びを維持し、下回る場合は縦並びへ自動で切り替わる。横並びの間の"Side"の横幅は`--sideW`で指定する。 |
| `l--switchColumns` | 任意のサイズで一括カラム切り替えができるカラムレイアウト。`--breakSize` で制御 |

それぞれ対応するLismコンポーネント（`<Flex>`, `<Stack>`, `<Cluster>` 等）があります。


### カラムレイアウト Primitive の使い分けガイド

「カラムを並べる」用途で使える Primitive は複数あります。意図に応じて使い分けます。

#### 比較表

各 Primitive がどの用途に向いているか：

| やりたいこと | `l--columns` | `l--autoColumns` | `l--switchColumns` | `l--withSide` | `l--grid` |
| --- | --- | --- | --- | --- | --- |
| 等幅 N 列 | ◯ | ◯ | ✗ | ✗ | △ |
| 横並び ↔ 1 列の一括切替 | ◯ | ✗ | ◯ | ✗ | △ |
| カラム最小幅で自動折返し | ✗ | ◯ | ✗ | ✗ | △ |
| サイド + メイン（非対称 2 カラム） | △ | ✗ | ✗ | ◯ | △ |
| BP で列数切替 | ◯ | ✗ | ✗ | ✗ | △ |
| 非BPでのレスポンシブ | ✗ | ◯ | ◯ | ◯ | ✗ |

凡例: ◯ 適している / △ 可能だが冗長 / ✗ 不向き

#### 選び方

##### 1. 等幅 N 列、または列数を BP で切り替えたい

- **推奨**: `l--columns` (`<Columns cols={[1, 2, 3]} />`)
- **理由**: `cols={3}` で固定列数、`cols` 配列で BP ごとの列数を宣言的に書ける
- **代替**:
  - `l--grid`: `gtc="repeat(3, 1fr)"` で書けるが、等幅 N 列や列数切替だけなら Columns のほうが簡潔
  - `l--tileGrid`: 行も指定したい時はこちら
- **要件**: BP 値を使うため祖先に `is--container` が必要

##### 2. カラム幅が指定値を下回ったら自動で折り返したい

- **推奨**: `l--autoColumns` (`<AutoColumns cols="20rem" />`)
- **理由**: BP に依存せず、カラム最小幅基準で `auto-fill` / `auto-fit` の挙動を簡潔に書ける
- **典型例**: カード一覧、商品リスト、ロゴ並び等
- **代替**:
  - `l--grid`: `gtc="repeat(auto-fill, minmax(20rem, 1fr))"` を直書きできるが冗長

##### 3. 「横並び」と「縦 1 列」を一括で切り替えたい（多段階の列数変化が不要）

- **推奨**: `l--switchColumns` (`<SwitchColumns breakSize="s" />`)
- **理由**: 自身の利用可能幅が `breakSize` を下回ったら一気に縦並びに切り替わる。BP / CQ 設計は不要だが、`breakSize` で切り替え幅を指定する
- **代替**:
  - `l--columns cols={[1, 2]}`: BP で切り替える場合
  - `l--autoColumns`: 段階的に列数が変わってよい場合

##### 4. サイド + メイン（非対称 2 カラム）で、コンテンツ幅で自動切替したい

- **推奨**: `l--withSide` (`<WithSide sideW="..." mainW="..." />`)
- **理由**: メイン側が `mainW` を維持できなくなったら自動で縦並びに。BP 設計不要
- **典型例**: 画像 + テキスト、メインエリア + サイドバー、メディアとテキストが交互に並ぶ繰り返しブロック（メディア側を `isSide` として先に置き、`fxd="row-reverse"` で交互配置すると、縦並び時はメディア側を上に統一できる）
- **代替**:
  - `l--grid` + `gta` 配列: BP で明示的に切替したい場合は Grid + `gta` のテンプレ切替で同じ見た目を実現可能（withSide のほうが宣言的でシンプル）

##### 5. 行 × 列を指定した固定タイルレイアウト

- **推奨**: `l--tileGrid` (`<TileGrid cols="3" rows="2" />`)
- **理由**: カラムレイアウトというより、行数も固定したい場合の Grid 派生。`cols` / `rows` で `repeat(rows, minmax(0, 1fr)) / repeat(cols, minmax(0, 1fr))` を簡潔に書ける
- **代替**:
  - `l--columns`: 列だけでよい（行は内容で自動決定）場合
  - `l--grid`: トラックを個別に細かく制御したい場合

##### 6. Grid テンプレートを主目的にした複雑な配置

- **推奨**: `l--grid` (`<Grid gtc="..." gta="..." />`)
- **理由**: `gta` / `gtc` 自体は Property Class として他の Primitive にも指定できるが、Grid テンプレートを主軸にするなら `l--grid` が素直
- **典型例**: 名前付きエリア配置、要素の重ね合わせ（`ga="1/1"`）、subgrid

#### 補足

- 各 Primitive の詳細・使用例は [primitives/](./primitives/) 配下の個別ファイルを参照
- レスポンシブな値（配列指定）を使う場合は祖先要素に `is--container` が必須（[responsive.md](./responsive.md)）


## Atomic Primitive（`a--`）

レイアウト構成物の最小単位となる Primitive です。

| クラス | 用途 |
| --- | --- |
| `a--icon` | SVG アイコン。`flex-shrink: 0`, デフォルトサイズ `1em` |
| `a--divider` | 区切り線。`--bdc`, `--bds`, `--bdw` 変数でカスタマイズ |
| `a--spacer` | 空白要素（`min-height: 1px; min-width: 1px`） |
| `a--decorator` | 装飾用要素（SCSS定義なし、クラス名のみ出力） |

それぞれ対応するコンポーネント（`<Icon>`, `<Divider>`, `<Spacer>`, `<Decorator>`）があります。
