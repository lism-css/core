# @lism-css/ui

[English](./README.md) | [日本語](./README.ja.md)

[![npm version](https://img.shields.io/npm/v/@lism-css/ui.svg)](https://www.npmjs.com/package/@lism-css/ui)
[![License: MIT](https://img.shields.io/npm/l/@lism-css/ui.svg)](https://github.com/lism-css/core/blob/main/LICENSE)

## @lism-css/ui とは？

`@lism-css/ui` は、[lism-css](https://www.npmjs.com/package/lism-css) の上に構築されたインタラクティブなUIコンポーネントライブラリです。アコーディオン、モーダル、タブなど、よく使うUIパターンの React / Astroコンポーネントを提供します。

すべてのコンポーネントはLism CSSのレイアウトシステムとデザイントークンを前提としています。

## 利用可能なコンポーネント

| コンポーネント | 説明 |
|---------------|------|
| **Accordion** | ネイティブ `<details>` 要素を使った展開可能なコンテンツセクション |
| **Alert** | アイコンとカラーバリエーション付きのコンテキストフィードバックメッセージ |
| **Avatar** | ユーザープロフィール用の円形画像表示 |
| **Badge** | 小さなステータスラベルやカウンター |
| **Button** | バリエーションとサイズ付きのスタイル付きボタン |
| **Callout** | ヒント、警告、注意書き用のハイライトコンテンツブロック |
| **Chat** | 会話形式のレイアウト用チャットバブルUI |
| **Details** | スタイル付きネイティブ `<details>` / `<summary>` 要素 |
| **Modal** | バックドロップ付きダイアログオーバーレイ |
| **NavMenu** | ネストアイテム対応のナビゲーションメニュー |
| **Popover** | ネイティブ Popover API と CSS Anchor Positioning によるクリックで開くパネル |
| **ShapeDivider** | SVGシェイプによる装飾的なセクションディバイダー |
| **Tabs** | タブ付きコンテンツパネル |
| **Tooltip** | CSS Anchor Positioning で配置するホバー / フォーカス時の補足テキスト |
| **DummyText** | プロトタイピング用のプレースホルダーテキスト |

## インストール

```bash
npm i @lism-css/ui
```

または

```bash
pnpm add @lism-css/ui
```

> `lism-css` は `@lism-css/ui` の通常の依存関係（dependencies）なので、別途インストールする必要はありません。

## セットアップ

`lism-css` のCSSをグローバルスタイルとしてインポートします:

```js
import 'lism-css/main.css';
```

各コンポーネントのCSSは、コンポーネントをimportしたときに自動で読み込まれます。`@lism-css/ui/style.css` を別途インポートする必要はありません。

コンポーネントを使わずに `b--button` などのクラスをHTMLで直接使う場合は、全コンポーネントのCSSをまとめた `@lism-css/ui/style.css` を読み込みます:

```js
import 'lism-css/main.css';
import '@lism-css/ui/style.css';
```

## 使い方

各コンポーネントは個別のパス（deep path、例: `@lism-css/ui/{react,astro}/<Component>`）から import するのを推奨しています。実際に使うコンポーネントだけが成果物（バンドル）に含まれるよう、確実に絞り込めるためです。

互換のため `@lism-css/ui/react` / `@lism-css/ui/astro` からの一括 import（バレルエクスポート）も利用できますが、本番ビルドでは以下のように個別 import を使用してください。

### React

```jsx
import { Accordion } from '@lism-css/ui/react/Accordion';
import { Button } from '@lism-css/ui/react/Button';
import { Text } from 'lism-css/react';

<Accordion.Root>
  <Accordion.Item>
    <Accordion.Heading>
      <Accordion.Button>FAQ の質問</Accordion.Button>
    </Accordion.Heading>
    <Accordion.Panel>
      <Text>回答の内容がここに入ります。</Text>
    </Accordion.Panel>
  </Accordion.Item>
</Accordion.Root>

<Button href="/about" variant="outline">
  詳しく見る
</Button>
```

### Astro

```astro
---
import { Accordion } from '@lism-css/ui/astro/Accordion';
import { Button } from '@lism-css/ui/astro/Button';
import { Text } from 'lism-css/astro';
---

<Accordion.Root>
  <Accordion.Item>
    <Accordion.Heading>
      <Accordion.Button>FAQ の質問</Accordion.Button>
    </Accordion.Heading>
    <Accordion.Panel>
      <Text>回答の内容がここに入ります。</Text>
    </Accordion.Panel>
  </Accordion.Item>
</Accordion.Root>

<Button href="/about" variant="outline">
  詳しく見る
</Button>
```

## lism-cssとの関係

このパッケージは、コアとなる CSS パッケージの上に構築されています。ここで登場する主なパッケージは次の2つです:

- **[lism-css](https://www.npmjs.com/package/lism-css)** — レイアウトコンポーネント（Box、Flex、Stack、Gridなど）、デザイントークン、Property Class、レスポンシブシステムを提供するコアCSSフレームワーク。
- **@lism-css/ui**（このパッケージ）— コアのレイアウトシステムを拡張し、すぐに使えるインターフェースパターン（Accordion、Modal、Tabsなど）を提供するインタラクティブUIコンポーネント。

`lism-css` は `@lism-css/ui` の通常の依存関係（dependencies）なので、自動的にインストールされます。

## AIツール連携

AIコーディングツールがLism CSSのドキュメントを参照するためのMCPサーバーが利用可能です:

```bash
claude mcp add lism-css -- npx -y @lism-css/mcp
```

その他のセットアップ方法については、[lism-css README](https://www.npmjs.com/package/lism-css#ai-tool-integration) を参照してください。

## ドキュメント

詳細なドキュメントは [lism-css.com](https://lism-css.com) をご覧ください。

## ライセンス

MIT
