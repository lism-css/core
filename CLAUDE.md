# CLAUDE.md

## 動作ルール

- 会話・質問はすべてこのプロジェクトの話として答える。
- 実装・設計・ファイル変更は、ユーザーがタスク用コマンドやスキルを提示するか明示的に許可するまで始めない。質問への回答や簡単な説明は即座に行ってよい。

## プロジェクト概要

Lism CSS は軽量なCSS設計フレームワーク。レイアウトプリミティブ・ユーティリティクラス・デザイントークン等をCSSレイヤー構造で提供し、React / Astro コンポーネントも同梱する。pnpm workspaces と Turbo のモノレポ。lint系設定はルート直下。

### packages（npm公開）

- `packages/lism-css/`: コアCSS + React / Astro レイアウトコンポーネント — [CLAUDE.md](packages/lism-css/CLAUDE.md)
- `packages/lism-ui/`: インタラクティブUIコンポーネント（Accordion, Modal, Tabs 等）— [CLAUDE.md](packages/lism-ui/CLAUDE.md)
- `packages/lism-cli/`: `lism-cli` コマンド本体（`create` / `ui` / `skill`）
- `packages/create-lism/`: `pnpm create lism` 用ラッパー（`lism-cli` をbundleで内包）
- `packages/mcp/`: AIコーディングツール向けMCPサーバー

### apps

- `apps/site/`: Astro 製ドキュメントサイト — [CLAUDE.md](apps/site/CLAUDE.md)
- `apps/catalog/`: コンポーネントカタログ

### その他

- `skills/lism-css-guide/`: `lism-cli skill add` と skills.sh の配信元
- `templates/`: `lism-cli create` のテンプレート
- `docs/*.md`: 運営者向けの現行文書と設計判断の記録（`docs/decisions.md`）。サイト本体は`apps/site`、`/docs/`はサイトのURLパス。
- `.plan/*.md`: 実装プラン文書。

各ワークスペースの詳細は、それぞれのCLAUDE.mdやREADME.mdを参照。

## Git / PR運用

- 作業ブランチの既定は `dev`。新しいブランチは必ず `dev` から切る。PRのターゲットも `dev`。

## 公開情報の取り扱い（OSS）

GitHubへ書く内容（issue・PR・コミットメッセージ・コードコメント・ドキュメント）に次を含めない。

- ローカルの絶対パス（`/Users/...` などユーザー名を含むもの）
- メールアドレス・氏名などの個人情報
- このリポジトリと無関係な他プロジェクト名・顧客名・業務情報
- APIキー・トークン・環境変数の値などの秘密情報

ログやコマンド出力は相対パス等に置換・マスクしてから引用する。会話・グローバル設定・メモリ由来の情報は、明示的な指示がない限り投稿文に含めない。issue・PR作成後は本文を表示して漏洩がないか確認する。

## 主要コマンド

```bash
nr dev:site # ドキュメントサイトをlocalhostで起動
nr build # 全ワークスペースをTurboでビルド
nr build:core # packages/lism-css のみ
nr build:ui # packages/lism-ui のみ
nr build:cli # packages/lism-cli + packages/create-lism（^build依存で順序保証）
nr build:site # apps/site のみ
nr lint
nr typecheck
nr test
```

## 公式ドキュメントサイト(`apps/site`)のURL

ルート言語は日本語。READMEやドキュメントでリンクするときは言語に合うパスを使う。

- 日本語: `https://lism-css.com/`（`/ja/` は付けない）
- 英語: `https://lism-css.com/en/`

## 注意事項

- アイコンパッケージ（`@lism-css/icons`）は[lism-css/icons](https://github.com/lism-css/icons)リポジトリで管理する。UIの既定アイコン（`packages/lism-ui/src/helper/icons.ts`）を更新するときは、iconsリポジトリを`pnpm build`したうえで`pnpm --filter @lism-css/ui gen:icons -- --source {iconsリポジトリのパス}`を実行し、差分をコミットする。確認は同じ引数に`--check`を付ける。
- `lism-css` パッケージ本体の編集中は、明示的な指示がない限り `lism-css-guide` スキルを読まない。
- `templates/*`を編集するときは、先に`templates/README.md`の保守ルールと意図的な言語差分を確認する。
- `templates/*` の新規追加時は `package.json` に `"private": true` を付ける（npmへの誤公開防止）。
- `.claude/skills/` にローカルスキルを新規作成するときは、SKILL.md のfrontmatterに `metadata.internal: true` を付ける（`npx skills`の配布対象から除外するため。配布用スキルは `skills/` 配下のみ）。
- `skills/lism-css-guide/` の更新時:
  - 失敗例を `SKILL.md` 冒頭へ単純に積み増すのは禁止。
  - スキルからMCPを案内しない。
  - ファイルは役割ごとに分け、タスクに必要なファイルだけ参照できる構成にする。
- docsの小さな文言調整やページ構成の変更で毎回ビルドしなくてよい。
- プランは実装完了時に削除すること。
- 互換のために古い書き方を残すときは、`docs/deprecations.md`に項目を足す。互換処理を消したら項目も消す。
