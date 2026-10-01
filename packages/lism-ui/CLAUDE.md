# CLAUDE.md

このファイルは Claude Code および サブエージェント向けのガイドです。


## パッケージ概要

`lism-css` の上に構築されたインタラクティブな UI コンポーネントライブラリ。React と Astro の両方のコンポーネントを提供。

| 項目 | 内容 |
|------|------|
| npm パッケージ名 | `@lism-css/ui` |
| ソース | `src/` |
| 出力 | `dist/`（編集禁止） |
| ビルド | Vite（React） + build-css.js（CSS） |
| 依存 | `lism-css`（`workspace:^`。公開時に`^{core のバージョン}`になる） |
| peerDependencies | `react ^18 \|\| ^19` |


## 開発コマンド

```bash
pnpm dev           # 開発サーバー
pnpm build         # フルビルド（registry-index + React + CSS）
pnpm build:css     # CSS のみ
pnpm gen:registry  # registry-index.json を再生成
```


## 主要ディレクトリ / ファイル

| パス | 説明 |
|------|------|
| `src/components/` | コンポーネント本体 |
| `src/components/react.ts` | React エクスポート一覧 |
| `src/components/astro.ts` | Astro エクスポート一覧 |
| `src/helper/` | ユーティリティ関数 |
| `src/style.scss` | スタイルエントリポイント |
| `scripts/generate-registry-index.ts` | `lism-cli` が参照するカタログ JSON を生成するスクリプト |
| `registry-index.json` | `lism-cli ui list` / `--all` が giget 経由で fetch するカタログ（build 時に自動再生成・commit 済み） |
| `scripts/generate-exports.ts` | `package.json` の `exports` を `src/components/` から自動生成するスクリプト（barrel に加え `@lism-css/ui/{react,astro}/{Component}` の deep path も提供。**vite build 後**に走り、dist の出力ファイル名を見てシンプル系/コンパウンド系の参照先を切り替える。build 時に自動再生成・commit 済み） |


## コンポーネント構造

各コンポーネントは `react/` と `astro/` のサブディレクトリに分かれている：

```
components/ComponentName/
├── react/            # React コンポーネント（.jsx/.tsx）
│   ├── ComponentName.jsx
│   └── index.js
├── astro/            # Astro コンポーネント（.astro）
│   ├── ComponentName.astro
│   └── index.js
├── _style.css        # コンポーネント固有のスタイル
├── getProps.js|ts    # Props 処理ロジック（任意）
└── script.js         # クライアント JS（任意）
```

### エクスポート/インポート

各コンポーネントは **コンポーネント単位の deep path** からの import を推奨している（未使用コンポーネントの混入を確実に避けるため）。

```js
// React
import { Accordion } from '@lism-css/ui/react/Accordion';
import { Modal } from '@lism-css/ui/react/Modal';

// Astro
import { Accordion } from '@lism-css/ui/astro/Accordion';
import { Modal } from '@lism-css/ui/astro/Modal';
```

`@lism-css/ui/react` / `@lism-css/ui/astro` からの一括 import (barrel) も互換のため残しているが、ドキュメント・サンプルコードでは原則 deep path 形式を使うこと（`installation.mdx` のみ barrel についての注釈あり）。


## 注意事項

- `dist/` ディレクトリは編集禁止（ビルド生成物）
- lint 設定はモノレポルートに配置
