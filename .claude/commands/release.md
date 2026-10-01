---
description: 指定パッケージのバージョン更新・changelog 追記・タグ付け・GitHub リリース作成を一貫して行う。npm publish とデプロイはユーザー手動
argument-hint: "{lism-css|lism-ui|lism-cli|plugin} {バージョン}"
---

# Release

指定パッケージのバージョン更新・changelog 追記・タグ付け・リリースノート生成・GitHub リリース作成を一貫して行う。npm publish とデプロイはユーザーが手動で行う。


## 引数

`$ARGUMENTS` をスペース区切りで解釈する。不足していればユーザーに確認する。

1. パッケージ識別子: `lism-css` / `lism-ui` / `lism-cli` / `plugin`
2. リリースバージョン（例: `0.10.0`）


## パッケージ

| 識別子 | npm パッケージ名 | ディレクトリ | タグプレフィックス | publish コマンド |
| --- | --- | --- | --- | --- |
| `lism-css` | `lism-css` | `packages/lism-css/` | `lism-css@v` | `nr publish:core` |
| `lism-ui` | `@lism-css/ui` | `packages/lism-ui/` | `lism-ui@v` | `nr publish:ui` |
| `lism-cli` | `lism-cli` + `create-lism` | `packages/lism-cli/` + `packages/create-lism/` | `lism-cli@v` | `nr publish:cli` |
| `plugin` | `@lism-css/plugin` | `packages/plugin/` | `lism-plugin@v` | `nr publish:plugin` |

`@lism-css/mcp` と `@lism-css/mockup` はタグ・GitHub リリース・changelog を運用していない。mcp は「mcp の特別ルール」に従い、mockup はバージョンを上げて `nr publish:mockup` を実行するだけでよい。

### mcp の特別ルール

- `lism-css` をリリースするときは、`@lism-css/mcp` も同じバージョンで出す。mcp は docs-index と `skills/lism-css-guide` をビルド時に同梱して配るため、出し忘れると古い情報を返し続ける
- バージョン更新の前に、docs-index が `apps/site` の日本語 MDX の変更に追従しているか確認し、必要なら `/mcp-update` か `/mcp-update-urls` を実行する
- 同じく、`skills/lism-css-guide` が core の変更に追従しているか確認し、必要なら `/update-skills` を実行する

### lism-cli の特別ルール

- `lism-cli` と `create-lism` は同じバージョンで同時に publish する（`nr publish:cli` がまとめて処理する）。両方の `package.json` の `version` を更新する
- 変更ファイルの振り分けでは `packages/create-lism/` も `lism-cli` として扱う
- publish 前に `packages/lism-cli/src/constants.ts` の `DEFAULT_UI_REF` / `DEFAULT_SKILL_REF` / `DEFAULT_TEMPLATES_REF` が `'main'` であることを確認する（`'dev'` や PR ブランチのままだと公開版 CLI が壊れる）
- `create-lism` は `lism-cli` を bundle で内包するため、`dependencies` の追従は不要

### テンプレートに新しい公開パッケージを追加する場合

`lism-cli create`は既定で`main`のテンプレートを取得する。`workspace:*`依存の追加時は、`packages/lism-cli/tsup.config.ts`の`packageVersions`にも対象を追加する。

### plugin の特別ルール

- `lism-css` のバージョン更新だけでは plugin を再リリースしない。peer の `*` は非互換な変更も拒否しないため、core のリリース時に plugin が使用する内部 API・SCSS 構成への影響を確認し、plugin の修正が必要な場合に対応する
- mockup の `lism-css` / `@lism-css/plugin` / `@lism-css/ui` 依存は `*`（workspace プロトコルではなく直書き。開発時のリンクは `pnpm-workspace.yaml` の `linkWorkspacePackages`）。新規インストール時は常に公開最新版を使うため、依存の更新だけでは mockup をリリースしない。mockup 自身の実装修正がある場合だけリリースする。core / plugin / ui のリリース時は mockup（viewer・`check`）への影響を確認し、非互換があれば mockup を修正してリリースする


## 現在の状態

- 現在のブランチ: !`git branch --show-current`
- プレフィックス別の最新タグ: !`git tag --list --sort=-version:refname | sort -s -t@ -k1,1 -u`
- lism-css の現在バージョン: !`node -p "require('./packages/lism-css/package.json').version"`
- lism-ui の現在バージョン: !`node -p "require('./packages/lism-ui/package.json').version"`
- lism-cli の現在バージョン: !`node -p "require('./packages/lism-cli/package.json').version"`
- plugin の現在バージョン: !`node -p "require('./packages/plugin/package.json').version"`
- mcp の現在バージョン: !`node -p "require('./packages/mcp/package.json').version"`


## 手順

### 1. dev ブランチの確認

- dev 以外にいる場合は警告し、dev に切り替えてよいか確認する
- `git pull origin dev` で最新にする

### 2. バージョン更新

対象の `package.json` の `version` が引数と一致していればスキップする。異なる場合:

1. `version` を更新する（更新前の値はステップ7で使う）。`lism-css` のリリースでは `packages/mcp/package.json` も同じバージョンにする
2. `lism-ui` は `nr build:ui` を実行し、version を埋め込んだ commit 対象の `packages/lism-ui/registry-index.json` を再生成する。怠ると publish 時の build で更新され、git-checks（unclean working tree）で失敗する
3. `git add` → `git commit -m "chore: {識別子} v{バージョン}"`（`registry-index.json` と mcp の `package.json` も同じコミット）
4. push してよいか確認 → `git push origin dev`

### 3. 前回タグの特定

同じタグプレフィックスの最新タグを前回タグとする。無ければリポジトリの最初のコミットからを対象にする。

### 4. 変更の分析

前回タグ〜dev の HEAD で `git log --oneline` と `git diff --stat` を取得し、変更ファイルのパスで振り分ける。

| パス | 振り分け |
| --- | --- |
| `packages/lism-css/` | lism-css |
| `packages/lism-ui/` | lism-ui |
| `packages/lism-cli/` `packages/create-lism/` | lism-cli |
| `packages/plugin/` | plugin |
| `apps/site/` | Documentation（各パッケージ共通） |
| その他 | Other |

対象パッケージのコード変更を伴うコミットだけをリリースノートの対象にする。`apps/site/` のみの変更（docs 修正・翻訳同期等）は含めない。`lism-css` をリリースする際は、plugin が使用する内部 API・SCSS への影響を確認する。mockup は「plugin の特別ルール」の条件に当てはまる場合だけリリース対象とする。

### 5. リリースノートと changelog エントリの生成

#### 5-A. GitHub リリースノート

日本語で生成する。コミットメッセージが日本語ならそのまま使う。空のカテゴリは省略する。

```markdown
## What's Changed

### Features
- 変更内容の説明 (コミットハッシュ短縮形)

### Bug Fixes
- 変更内容の説明 (コミットハッシュ短縮形)

### Other
- 変更内容の説明 (コミットハッシュ短縮形)
```

| コミット | カテゴリ |
| --- | --- |
| `feat` または新機能追加 | Features |
| `fix` またはバグ修正 | Bug Fixes |
| `chore` `refactor` `style` `perf` `ci` `build` | Other |
| `docs`（ドキュメントのみ） | 除外 |

#### 5-B. changelog エントリ

`lism-css` / `lism-ui` / `plugin` のみ。`lism-cli`は5-B・7・8を省略する。

リリースノートをもとに日本語・英語の両方で生成する。

- 既存の `## 未リリース` / `## Unreleased` があれば、今回のリリース対象の項目と移行案内を新エントリへ取り込む
- 親は常に `lism-css` の H2。`@lism-css/plugin` / `@lism-css/ui` はその中に H3 でネストする
- `lism-css` のリリースがない場合だけ `## @lism-css/ui v{バージョン} (YYYY.MM.DD)` の独立 H2 にする
- 同日に `lism-css` と追従パッケージを両方リリースするなら必ずネストする
- 追従パッケージの並びは `@lism-css/plugin` → `@lism-css/ui`
- 大きな変更・トピックがあれば H3 でテーマ別に分け、PR 番号があれば末尾に付ける（例: `(#324)`）
- `@lism-css/ui` 側のテーマ別見出しは、親との階層競合を避けるため H3 ではなく `**テーマ名**` にする
- Features / Bug Fixes 等のカテゴリ分けとコミットハッシュは書かない
- 日付は当日を `YYYY.MM.DD` 形式で書く
- H2 エントリ間には必ず `<Divider bds="dashed" my="40" />` を入れる
- 既存エントリ（v0.13.0 以降）のスタイルに合わせる

テンプレート（`[...]` は該当時のみ。末尾の `<Divider>` が次の既存エントリとの区切り）:

```markdown
## lism-css v{バージョン} (YYYY.MM.DD)

[**破壊的変更**を含むリリースです。]

[### {トピック名} (#PR)]

- 変更内容の簡潔な説明
...

[### その他]

- ...

[### `@lism-css/plugin` v{バージョン} (YYYY.MM.DD)]

- ...

[### `@lism-css/ui` v{バージョン} (YYYY.MM.DD)]

[**破壊的変更**を含むリリースです。]

[**{トピック名} (#PR)**]

- ...

<Divider bds="dashed" my="40" />
```

英語版の定型句:

| 日本語 | 英語 |
| --- | --- |
| `**破壊的変更**を含むリリースです。` | `This release contains **breaking changes**.` |
| `### その他` | `### Other` |

### 6. ユーザーに確認

タグ名 `{タグプレフィックス}{バージョン}`、リリースノート、changelog エントリ（ja / en）を表示し、続行の許可を得る。修正の指示があれば従う。

### 7. ドキュメント内のバージョン番号の更新

承認後、リポジトリ全体で `{npm パッケージ名}@{旧バージョン}`（例: `lism-css@0.25.0`、`@lism-css/ui@0.25.0`、`@lism-css/plugin@0.4.1`）を検索し、新バージョンに置換する。旧バージョンはステップ2の更新前の値。`changelog.mdx` と `package.json` は除外する。該当がなければスキップし、あればステップ8と同じコミットに含める。

### 8. changelog.mdx の更新

`apps/site/src/content/ja/changelog.mdx` と `apps/site/src/content/en/changelog.mdx` にエントリを追記する。

- 未リリースのセクションから、新エントリへ取り込んだ項目を削除する。対象外の項目は先頭に残し、空になったセクションは見出しと末尾の `<Divider>` を削除する
- 追記位置: 未リリースのセクションが残る場合はその直後、それ以外は冒頭の `<Divider bds="dashed" my="40" />` の直後。挿入後、H2エントリ間に `<Divider>` があることを確認する
- `lism-css` を先にリリース済みで、追従パッケージを後からリリースする場合: 既存の `## lism-css v{バージョン}` エントリの末尾（最後の H3 の下、次の `<Divider>` の前）に H3 をネスト追加する
- 同時リリースの場合: 親 + ネストの新規エントリを一度に作る

追記後、両ファイルを `git add` → `git commit -m "docs: v{バージョン} changelog 追記"` → push してよいか確認 → `git push origin dev`。

### 9. npm publish（ユーザー手動）

`lism-cli` は案内前に「lism-cli の特別ルール」の `constants.ts` 確認を行う。`lism-css` のリリースでは `nr publish:mcp` も続けて案内する。`lism-ui` は publish 時点の `lism-css` のバージョンを下限（`^x.y.z`）として依存するため、同時リリースでは `nr publish:core` を先にする。mockup がステップ4でリリース対象になった場合は、依存パッケージの publish 後に `nr publish:mockup` も続けて案内する。案内して完了を待つ。

```
pnpm publish を実行してください:
  {publish コマンド}

完了したら教えてください。
```

### 10. デプロイ（ユーザー手動）

`nr deploy` を案内する。次のどちらかに当てはまる場合は、続けて `nr deploy:templates` も案内する。テンプレプレビュー（`templates.lism-css.com`）はワークスペースのパッケージでビルドして配信しているため、デプロイしないと古い版のまま残る。

- `lism-css` / `lism-ui` / `plugin` のリリース
- ステップ4で `templates/` に変更がある

`nr deploy:templates` は作業ツリーの内容でビルドするため、`nr deploy` の後（dev と main が揃った状態）に実行する。案内して完了を待つ。

```
デプロイを実行してください:
  nr deploy
  [nr deploy:templates]

完了したら教えてください。
```

### 11. タグ付けと GitHub リリースの作成

publish とデプロイの完了をユーザーが確認した後に行う。

1. `git checkout main && git pull origin main`
2. `git tag {タグ名}`（main の HEAD に付与）→ `git push origin {タグ名}`
3. リリースノートを Write ツールで一時ファイルに書き、`gh release create {タグ名} --title "{タグ名}" --notes-file {パス}` で作成し、ファイルを消す。`gh release` のファイル指定は `--notes-file`（`-F`）で、`--body-file` ではない。`--notes "..."`・HEREDOC・`$(mktemp)`・リダイレクトは使わない（本文が壊れる、または許可リストで照合できず承認待ちで止まる）
4. dev に戻る
