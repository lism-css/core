<h1 align="center">
  <a href="https://lism-css.com" target="_blank">
    Lism CSS
  </a>
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/lism-css"><img src="https://img.shields.io/npm/v/lism-css.svg" alt="Latest Release"></a>
  <a href="https://github.com/lism-css/core/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/lism-css.svg" alt="License"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README.ja.md">日本語</a>
</p>

## Lism CSSとは？

Lism CSSは、Webサイトのレイアウトを素早く、かつ美しく構築するための軽量な**CSS設計フレームワーク**です。

[Every Layout](https://every-layout.dev/) のレイアウトプリミティブやハーモニックモジュラースケーリング、[Tailwind CSS](https://tailwindcss.com/) のCSSプロパティ単位でのユーティリティファーストなアプローチから着想を得て、独自のCSS設計を組み立てました。

ビルドステップや設定は不要です。CDN経由でCSSファイルを読み込むか、npmからインポートするだけですぐに使い始められます。React / Astro向けのコンポーネントも提供しており、propsを通じてCSSクラスとカスタムプロパティに変換されるため、ランタイムでのスタイル生成なしにコンポーネントベースの開発が可能です。

## 特徴

- **軽量** — CSSバンドル全体で約30 KB（gzip圧縮時約8 KB）。
- **ゼロビルドフレームワーク** — CDNまたはnpmでプレーンHTMLでも動作。ビルドツールや設定は不要。
- **レイアウト優先プリミティブ** — プリビルトのレイアウトパターン: `l--flex`、`l--stack`、`l--grid`、`l--columns`、`l--center`、`l--withSide` など。
- **CSSレイヤー構造** — `@layer`（lism-base → lism-block → lism-trait → lism-primitive → lism-custom → lism-utility）を使用した明確な詳細度管理。`lism-block` はベーススタイルをCSS側で管理する基礎部品（`b--`）用レイヤーで、明示的に付与したクラス（`is--` / `has--` / `l--` など）が勝つように弱い位置へ配置されています。`lism-trait` は `is--` / `has--` のTraitクラス用レイヤー、`lism-primitive` の内部は `layout` / `atomic` のサブレイヤーに分かれています。`lism-custom` はユーザーの独自クラスや上書き用のレイヤーです。詳細度の衝突を最小限に抑えます。
- **デザイントークン** — カラー、余白、フォントサイズ、シャドウをCSSカスタムプロパティで管理。
- **柔軟なProperty Class** — `-{prop}:{value}` 構文（例: `-p:20`、`-bgc:base-2`、`-fz:l`）。
- **レスポンシブシステム** — ブレークポイントクラスとCSS変数（例: `-p_sm`、`-p_md`）にデフォルトでコンテナクエリを採用し、親要素ベースのレスポンシブデザインを実現。メディアクエリへの切り替えも可能。
- **React & Astroコンポーネント** — `class="l--stack -g:20"` の代わりに `<Stack g="20">` と書ける。

## パッケージ

| パッケージ | 説明 |
|-----------|------|
| [lism-css](https://www.npmjs.com/package/lism-css) | コアCSSフレームワーク + React / Astroレイアウトコンポーネント |
| [@lism-css/ui](https://www.npmjs.com/package/@lism-css/ui) | インタラクティブUIコンポーネント（Accordion、Modal、Tabsなど） |
| [@lism-css/mcp](https://www.npmjs.com/package/@lism-css/mcp) | AIコーディングツール向けMCPサーバー |
| [lism-cli](https://www.npmjs.com/package/lism-cli) | プロジェクト生成・UIコンポーネント追加・AIスキル配置を行うCLI |
| [create-lism](https://www.npmjs.com/package/create-lism) | `pnpm create lism` / `npm create lism` 用のラッパー（`lism-cli` を内包） |
| [@lism-css/mockup](https://www.npmjs.com/package/@lism-css/mockup) | Lism CSSで画面モックアップを作成・検証・プレビューするためのCLI |
| [@lism-css/plugin](https://www.npmjs.com/package/@lism-css/plugin) | Lism CSS向けのBuild / Vite / Astro / purgeプラグイン |

## クイックスタート

### CDN（ビルド不要）

```html
<link href="https://cdn.jsdelivr.net/npm/lism-css@1.0.0/dist/css/main.css" rel="stylesheet" />
```

### npm

```bash
npm i lism-css
```

```js
import 'lism-css/main.css';
```

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
import { Box, Flex, Stack, Grid, Text, Heading } from 'lism-css/astro';
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

## CSSクラスの例

| タイプ | 例 |
|--------|-----|
| レイアウトプリミティブ | `l--flex`, `l--grid`, `l--stack`, `l--center`, `l--columns`, `l--withSide` |
| Trait Class | `is--wrapper`, `is--container`, `is--layer`, `has--transition`, `has--gutter` |
| Block Class | `b--btn`, `b--badge` |
| Custom Class | `c--siteHeader`, `c--pricing` |
| Property Class | `-p:20`, `-bgc:base-2`, `-fz:l`, `-ta:center` |
| ブレークポイント | `-p_sm`, `-g_md`, `-fz_lg` |
| ユーティリティ | `u--cbox` |

## レスポンシブの例

**HTML:**

```html
<div class="-p:20 -p_sm -p_md" style="--p_sm:var(--s30);--p_md:var(--s40)">
  <p>sm (480px) と md (800px) のブレークポイントでパディングが変化</p>
</div>
```

**JSX:**

```jsx
<Lism p={['20', '30', '40']}>
  <p>sm (480px) と md (800px) のブレークポイントでパディングが変化</p>
</Lism>
```

## AIツール連携

### Claude Code Skill

```bash
npx lism-cli skill add
```

同梱スキル（`lism-css-guide`・`lism-css-refactor`・`lism-mockup-guide`）を、使用しているAIツールのスキルディレクトリ（例: Claude Codeなら `.claude/skills/`）へ配置します。`npx lism-cli skill add lism-css-guide` のようにスキル名を指定すると個別に配置できます。ツールフラグなしで実行すると対話モードになり、`--claude`、`--cursor` などのフラグでツールを個別指定することもできます。

[skills.sh](https://skills.sh) 経由でも、同じ3つのスキルから必要なものを選んで導入できます。

```bash
npx skills add lism-css/core
```

詳細は [Skillsドキュメント](https://lism-css.com/docs/skills/) を参照してください。

### MCPサーバー

```bash
claude mcp add lism-css -- npx -y @lism-css/mcp
```

CursorやVS Codeのセットアップ方法は、[lism-cssパッケージのREADME](https://www.npmjs.com/package/lism-css#ai-tool-integration) を参照してください。

### llms.txt

```
https://lism-css.com/llms.txt
```

## ドキュメント

詳細なドキュメントは [lism-css.com](https://lism-css.com) をご覧ください。

## プレイグラウンド

サンドボックス環境でLism CSSを試す: [lism-css/lism-playgrounds](https://github.com/lism-css/lism-playgrounds)

## コミュニティ

フィードバックや質問は、[Lism CSS Discordサーバー](https://discord.gg/6PMcFHvc4h)までお気軽にどうぞ。

## クレジット

- [Phosphor Icons](https://phosphoricons.com/) — MIT License ([source](https://github.com/phosphor-icons))

## ライセンス

MIT
