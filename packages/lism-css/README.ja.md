# lism-css

[English](./README.md) | [日本語](./README.ja.md)

[![npm version](https://img.shields.io/npm/v/lism-css.svg)](https://www.npmjs.com/package/lism-css)
[![License: MIT](https://img.shields.io/npm/l/lism-css.svg)](https://github.com/lism-css/core/blob/main/LICENSE)

## lism-cssとは？

Lism CSSは、Webサイトのレイアウトを素早く、かつ美しく構築するための軽量な **CSS設計フレームワーク**です。

[Every Layout](https://every-layout.dev/) のレイアウトプリミティブやハーモニックモジュラースケーリング、[Tailwind CSS](https://tailwindcss.com/) のCSSプロパティ単位でのユーティリティファーストなアプローチから着想を得て、独自のCSS設計を組み立てました。

ビルドステップや設定は不要です。CDN経由でCSSファイルを読み込むか、npmからインポートするだけですぐに使い始められます。  
React / Astro向けのコンポーネントも提供しており、propsを通じてCSSクラスとカスタムプロパティに変換されるため、ランタイムでのスタイル生成なしにコンポーネントベースの開発が可能です。

## 特徴

- **軽量** - CSSバンドル全体で約30 KB（gzip圧縮時約8 KB）と、軽量です。
- **ゼロビルドフレームワーク** — CSSファイルを読み込むだけで、プレーンHTMLでも動作します。ビルドツール、プリプロセッサ、設定は不要。CDNまたはnpmで利用可能。
- **レイアウト優先のプリミティブアーキテクチャ** — レイアウトプリミティブ（`l--flex`、`l--stack`、`l--grid`、`l--columns`、`l--center`、`l--withSide` など）で、カスタムCSSを書かずに一般的なレイアウトパターンを組み立てられます。
- **CSSレイヤー構造** — `@layer`（lism-base → lism-block → lism-trait → lism-primitive → lism-custom → lism-utility）を使用した明確な詳細度管理。`lism-block` はベーススタイルをCSS側で管理する基礎部品（`b--`）用レイヤーで、明示的に付与したクラス（`is--` / `has--` / `l--` など）が勝つように弱い位置へ配置されています。`lism-trait` は `is--` / `has--` のTraitクラス用レイヤー、`lism-primitive` の内部は `layout` / `atomic` のサブレイヤーに分かれています。`lism-custom` はユーザーの独自クラスや上書き用のレイヤーです。詳細度の衝突を最小限に抑えます。
- **デザイントークン** — カラー、余白、フォントサイズ、シャドウ、ボーダー半径をCSSカスタムプロパティで管理。変数を上書きするだけで簡単にカスタマイズできます。
- **柔軟なProperty Class** — `-{prop}:{value}` の命名規則（例: `-p:20`、`-bgc:base-2`、`-fz:l`）でCSSプロパティをユーティリティクラスにマッピングし、素早く読みやすいスタイリングを実現します。
- **レスポンシブシステム** — ブレークポイント固有のクラスとCSS変数（例: `-p_sm`、`-p_md`）にデフォルトでコンテナクエリを採用し、親要素ベースのレスポンシブデザインを実現。メディアクエリへの切り替えも可能。
- **React & Astroコンポーネント** — ReactとAstroの両方に対応した専用コンポーネントが、propsをLism CSSのクラスと変数に自動変換します。`class="l--stack -g:20"` の代わりに `<Stack g="20">` と書けます。

## インストール

### CDN（ビルド不要）

```html
<link href="https://cdn.jsdelivr.net/npm/lism-css@0.31.0/dist/css/main.css" rel="stylesheet" />
```

### npm

```bash
npm i lism-css
```

または

```bash
pnpm add lism-css
```

## セットアップ

グローバルスタイルとしてCSSをインポートします:

```js
import 'lism-css/main.css';
```

**Next.js**の場合は、`layout.js`（App Router）または `_app.js`（Pages Router）で読み込みます。

## 使い方

### React

```jsx
import { Box, Flex, Stack, Grid, Text, Heading } from 'lism-css/react';

<Stack g="20">
  <Heading tag="h2" fz="xl">Welcome</Heading>
  <Flex g="20" ai="center">
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card A</Text>
    </Box>
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card B</Text>
    </Box>
  </Flex>
</Stack>
```

### Astro

```astro
---
import { Box, Flex, Stack, Text, Heading } from 'lism-css/astro';
---

<Stack g="20">
  <Heading tag="h2" fz="xl">Welcome</Heading>
  <Flex g="20" ai="center">
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card A</Text>
    </Box>
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card B</Text>
    </Box>
  </Flex>
</Stack>
```

### HTML（CSSのみ）

```html
<div class="l--stack -g:20">
  <h2 class="-fz:xl">Welcome</h2>
  <div class="l--flex -g:20 -ai:center">
    <div class="-p:20 -bgc:base-2 -bdrs:20">
      <p class="-fz:l">Card A</p>
    </div>
    <div class="-p:20 -bgc:base-2 -bdrs:20">
      <p class="-fz:l">Card B</p>
    </div>
  </div>
</div>
```

## コアコンポーネント

Lism CSSは以下の React / Astroコンポーネントを提供します:

**レイアウトコンポーネント:**
Lism, Box, Flow, Flex, Cluster, Stack, Grid, AutoColumns, SwitchColumns, WithSide, Center, Columns, Frame, TileGrid

**構造コンポーネント:**
Container, Wrapper, Layer, BoxLink

**コンテンツコンポーネント:**
Text, Heading, Inline, Link, Group, List, Media

**アトミックコンポーネント:**
Icon, Decorator, Divider, Spacer

すべてのコンポーネントはLism props（例: `p`、`m`、`g`、`fz`、`bgc`、`bdrs`）を受け取り、CSSクラスと変数に自動的にマッピングされます。

## CSSクラスシステム

Lism CSSは構造化された命名規則をCSSクラスに使用しています:

| タイプ | パターン | 例 |
|--------|---------|-----|
| レイアウトプリミティブ | `l--{name}` | `l--flex`, `l--grid`, `l--stack`, `l--center`, `l--columns`, `l--withSide` |
| Trait Class（役割） | `is--{name}` | `is--wrapper`, `is--container`, `is--layer`, `is--boxLink` |
| Trait Class（機能） | `has--{name}` | `has--transition`, `has--gutter`, `has--snap` |
| Block Class | `b--{name}` | `b--btn`, `b--badge` |
| Custom Class | `c--{name}` | `c--siteHeader`, `c--pricing` |
| Property Class | `-{prop}:{value}` | `-p:20`, `-m:auto`, `-bgc:base-2`, `-fz:l`, `-ta:center` |
| ブレークポイント | `-{prop}_{bp}` | `-p_sm`, `-g_md`, `-fz_lg` |
| ユーティリティクラス | `u--{name}` | `u--cbox` |

## レスポンシブシステム

レスポンシブ値は、ブレークポイント固有のクラスとCSS変数を使って設定します:

**HTML:**

```html
<div class="-p:20 -p_sm -p_md" style="--p_sm:var(--s30);--p_md:var(--s40)">
  <p>sm (480px) と md (800px) のブレークポイントでパディングが変化</p>
</div>
```

**JSX (React / Astro):**

```jsx
<Lism p={['20', '30', '40']}>
  <p>sm (480px) と md (800px) のブレークポイントでパディングが変化</p>
</Lism>
```

デフォルトブレークポイント: `sm` = 480px、`md` = 800px、`lg` = 1120px（デフォルトでコンテナクエリを使用）。

## デザイントークン

Lism CSSは一貫したデザインのためのCSSカスタムプロパティを提供します:

- **カラー:** `--base`、`--base-2`、`--text`、`--text-2`、`--link`、`--divider`、`--brand`、`--accent`、`--neutral`、パレットカラー（`--red`、`--blue`、`--green` など）
- **余白:** `--s5`, `--s10`, `--s15` … `--s45`, `--s50`, `--s60`, `--s70`（rem値にマッピング）
- **フォントサイズ:** `--fz--2xs` 〜 `--fz--5xl`
- **ボーダー半径:** `--bdrs--10`（0.25rem）〜 `--bdrs--99`（99rem）
- **シャドウ:** `--bxsh--10` 〜 `--bxsh--50`（シャドウカラー設定可能）
- **コンテナサイズ:** `--sz--xs`（400px）、`--sz--s`（640px）、`--sz--m`（880px）、`--sz--l`（1200px）、`--sz--xl`（1600px）

## UIコンポーネント

インタラクティブなUIコンポーネント（Accordion、Modal、Tabs、Alert、Avatar、Badge、Buttonなど）については、別パッケージの [@lism-css/ui](https://www.npmjs.com/package/@lism-css/ui) を参照してください。

```bash
npm i @lism-css/ui
```

## AIツール連携

### llms.txt

AIアシスタントやLLMベースのツール向けに、機械可読なドキュメントインデックスを提供しています:

```
https://lism-css.com/llms.txt
```

### MCPサーバー

AIコーディングツール向けのMCP（Model Context Protocol）サーバーが利用可能です:

**Claude Code:**

```bash
claude mcp add lism-css -- npx -y @lism-css/mcp
```

**Cursor:**

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "lism-css": {
      "command": "npx",
      "args": ["-y", "@lism-css/mcp"]
    }
  }
}
```

**VS Code (GitHub Copilot):**

```json
// .vscode/mcp.json
{
  "servers": {
    "lism-css": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@lism-css/mcp"]
    }
  }
}
```

## ドキュメント

詳細なドキュメントは [lism-css.com](https://lism-css.com) をご覧ください。

## コミュニティ

フィードバックや質問は、[Lism CSS Discordサーバー](https://discord.gg/6PMcFHvc4h)までお気軽にどうぞ。

## ライセンス

MIT
