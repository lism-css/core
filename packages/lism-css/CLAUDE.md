# CLAUDE.md

このファイルは Claude Code および サブエージェント向けのガイドです。


## パッケージ概要

軽量な CSS フレームワーク。React コンポーネントと CSS を npm パッケージ `lism-css` として公開。

| 項目 | 内容 |
|------|------|
| ソース | `/src` |
| 出力 | `/dist`（編集禁止） |
| ビルド | Vite（React） + tsx カスタムスクリプト（CSS） |


## 開発コマンド

```bash
pnpm dev         # 開発サーバー
pnpm build       # フルビルド（React + CSS）
pnpm build:js    # React のみ（Vite + tsc）
pnpm build:css   # CSS のみ
pnpm lint:style  # SCSS/CSS リント
```


## 主要ディレクトリ

| パス | 説明 |
|------|------|
| `src/components/` | React コンポーネント |
| `astro/` | Astro コンポーネント（ビルドせずそのまま配布。パッケージルート直下） |
| `src/scss/` | SCSS ソース |
| `config/` | 設定・トークン定義（パッケージルート直下） |
| `src/lib/` | ユーティリティ関数 |


## コンポーネント構造

各コンポーネントは以下のパターンに従う：

```
components/ComponentName/
├── ComponentName.jsx  # メインコンポーネント
├── getProps.js        # Props 処理ロジック（一部コンポーネントのみ）
└── index.js           # エクスポート
```

- `layout/` サブディレクトリに Box, Flow, Flex, Cluster, Stack, Grid, AutoColumns, SwitchColumns, WithSide, Center, Columns, Frame がある
- `state/` サブディレクトリに Container, Wrapper, Layer, BoxLink がある
- `atomic/` サブディレクトリに Icon, Divider, Spacer, Decorator がある
- `Lism` コアコンポーネントは `.tsx` / `.ts` で実装されている
- `Icon` など一部を除き、全コンポーネントは基本的に `Lism` を継承し、`getLismProps()` で Props を処理


## Props システム

React の props を CSS クラス・スタイルに変換：

| 種類 | 例 |
|------|-----|
| レスポンシブ | `p={{base: '20', md: '30'}}` または `p={['20', null, '30']}`（ユーザーが使うのは後者で、前者はシステム処理用） |
| Property Class | `-p:20`, `-bgc:base-2` |
| ブレークポイント | `-p_sm`, `-g_md` |
| 処理が特殊な props | `hov`（hover）, `bd`（border） |


## SCSS アーキテクチャ

CSS Layers による詳細度管理：

```
lism-base → lism-block → lism-trait → lism-primitive → lism-custom → lism-utility
```

`lism-trait` レイヤーには `is--`（役割宣言）と `has--`（機能付与）が含まれる。`lism-primitive` 内には `layout` / `atomic` のサブレイヤーがあり、それぞれ `l--` / `a--` を含む。`lism-trait` を `lism-primitive` より弱く配置することで、`is--boxLink` の `display: block` 等の初期化的な宣言が `l--stack` 等のレイアウトプリミティブに負けるようにしている。`lism-block` レイヤーは、ベーススタイルを CSS 側で管理する基礎部品（`b--`）用で、コアでは空。`lism-base` 直後（trait / primitive より弱い位置）に置くことで、`b--` のベーススタイルに利用者が明示的に足したクラス（`is--*` / `has--*` / `l--*` 等）が常に勝つ。`lism-custom` レイヤーはユーザーの独自クラス（`c--`）用。

※ Props クラスは `@layer` を付けない

### 出力ファイル

| ファイル | 用途 |
|----------|------|
| `main.css` | モダンブラウザ（@layer 対応） |
| `main_no_layer.css` | `@layer` なし。既存サイト・WP テーマ等カスケードを制御できない環境向け（Property Class は常に `!important`、`u--` はセレクタ二重化で 0-2-0） |

### 設定ファイル

| ファイル | 説明 |
|----------|------|
| `_prop-config.gen.scss` | Property Class の定義（生成物。full 版は `_prop-config-full.gen.scss`） |
| `_query.scss` | ブレークポイント定義 |
| `_auto_output.scss` | 自動出力処理 |
| `_mixin.scss` | `$layer_mode` による出力切替（`maybe_double` / `maybe_where` / `in_base_layer`）と `!important` 既定値の解決 |


## Astro コンポーネントの注意点

`astro/` 配下の `.astro` ファイルでは、タグと `<slot />` の間に改行やスペースを入れないこと。Astro はテンプレート内のホワイトスペースをそのまま HTML に出力するため、`<span>` 等のインライン要素で不要なスペースが挿入されてしまう。

```astro
<!-- NG: スペースが入る -->
<Tag {...attrs}>
  <slot />
</Tag>

<!-- OK -->
<Tag {...attrs}><slot /></Tag>
```


## 主要ファイル

| ファイル | 説明 |
|----------|------|
| `src/lib/getLismProps.ts` | Props → CSS 変換のコアロジック |
| `src/scss/base/tokens/_tokens.scss` | デザイントークン（SCSS。生成部分は同ディレクトリの `_tokens.gen.scss`） |
| `config/defaults/tokens.ts` | デザイントークン（JS/TS） |


## 深いパスの互換

`lism-css/lib/*`・`react/*`・`astro/*` の深いパスのうち、公開 API は `getLismProps` だけ。ただし `@lism-css/ui` のソースが一度でも import したものは、1.x の間はできれば互換を保つ。一覧は `packages/lism-ui/src/components/lismCssDeepImports.test.ts`、経緯は `docs/decisions.md`。

