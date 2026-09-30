基準日: 2026-09-19・コミット9feef9fa0

# Lism CLI ガイド（運営者向け）

この文書が持つもの: `lism-cli` / `create-lism`の運営手順（既定ref・build・publish・publish前チェック）と、`templates/`の規約・言語判定・プレビューデプロイ。
持たないもの: ユーザー向けの使い方（[packages/lism-cli/README.md](../packages/lism-cli/README.md)と[apps/siteのinstallation](../apps/site/src/content/ja/installation.mdx)）、テンプレのスクショ撮影（[template-screenshots.md](./template-screenshots.md)）。


## 構成

| パッケージ | bin | 役割 |
| --- | --- | --- |
| `lism-cli` | `lism-cli` | 本体。サブコマンドは`create` / `init` / `ui` / `skill` / `mockup` |
| `create-lism` | `create-lism` | `pnpm create lism`用ラッパー。`lism-cli`をbundleで内包し、runtime依存を持たない |

- `init`は`lism.config.js`のひな形を生成する。既存の`lism.config.*`があれば何もしない。`--ui-framework` / `--ui-dir`で`ui:`の値を先渡しでき、無ければ対話で聞く。
- `mockup`は`@lism-css/mockup`の案内表示だけ。
- 配信元はGitHubの`lism-css/core`。コンポーネント・helper・skill・テンプレはgiget（`github:lism-css/core/...`）で取得し、UIカタログ（`packages/lism-ui/registry-index.json`）だけはraw GitHubへ直接fetchする（`commands/ui/fetcher.ts`の`fetchCatalog`）。


## 🚨 既定ref（最重要）

`packages/lism-cli/src/constants.ts`の`DEFAULT_UI_REF` / `DEFAULT_SKILL_REF` / `DEFAULT_TEMPLATES_REF`は、ブランチに関係なく常に`'main'`。dev / mainのマージで切り替えない。検証目的のbeta publishでもPRブランチに変えない（ブランチ削除で公開済みCLIが壊れる）。

- dev側を試すときは、コマンドの`--ref dev`で都度指定する（`create` / `ui add` / `ui list` / `skill add` / `skill check` / `skill update`）。
- `--ref`が変えるのは取得元だけ。skill一覧（`SKILL_NAMES`）とテンプレ一覧（`TEMPLATES`）はCLI本体に焼き込まれているので、dev側で追加したskill / テンプレを試すにはdevのCLIをローカルビルドする。


## build / publish

```bash
nr build:cli    # cli → create-lism の順（^build依存で順序保証）
nr publish:cli  # build → lism-cli publish → create-lism publish
```

- `lism-cli`と`create-lism`は同じバージョンで一緒にpublishする。
- `lism-cli create`が生成する`workspace:*`は、実行時にnpmのdist-tag `latest`を解決して`^x.y.z`へ置換する。レジストリ到達不可時だけ、tsupの`define`で埋め込んだ`LISM_PACKAGE_VERSIONS`にフォールバックする。
- `packages/lism-ui/registry-index.json`はcommit対象。コンポーネント増減時は`pnpm --filter @lism-css/ui build`で再生成してcommitする。


## テンプレ運用

`templates/`配下が`lism-cli create`の配信元。SSOTは`templates/manifest.ts`の`TEMPLATES`で、`packages/lism-cli/src/commands/create.ts`がimportする。

### 規約

- 各テンプレの`package.json`に必ず`"private": true`を付ける（npmへの誤公開防止）。階層の深さは問わない（`scripts/check-templates-private.mjs`が`package.json`まで再帰して検出する）。
- `base-overlay`型（現在の`TEMPLATES`に登録なし）を追加する場合、overlay側に`package.json`を置かない。CLIはbaseの`package.json`を採用し、overlayは差分ファイルだけ上書きする。置くと`name`の書き換えが二重化し、`workspace:*`置換も崩れる。共通設定はbaseに集約する。
- `single-project-variant`型（例: `templates/lp/astro/`）は`src/pages/{variant}/`を並べる構成。CLIは選択variantの`index.astro`を`src/pages/index.astro`へ持ち上げ、他variantを削除する。variant追加は`src/pages/{variant}/index.astro`を作り、`TEMPLATES`にslugを足す。

### 言語

- 表示言語は全サブコマンド共通の`--lang <ja|en>`（`createProgram.ts`）。未指定時は`LC_ALL` / `LANG`→macOSの`defaults read -g AppleLanguages`→`Intl`のロケールの順に`ja`かを見て、どれにも当たらなければ`en`（`i18n.ts`の`detectLang`）。macOSはOSが日本語でもターミナルの`LANG`が英語のことがあるため`AppleLanguages`も見る。
- `create`（`create-lism`も同じ）は先に生成言語を確定し、それを表示言語にも使う。`--lang`があればそれ。無ければTTYでは他のどの選択より先に言語選択プロンプト（`English / 日本語`の固定表示）を出し、非TTY（CI・パイプ）は`en`。
- 言語別overlay（`project`型の`langOverlays`）
  - base内の`.lang/{lang}/`に差分ファイルだけを置き、`manifest.ts`の`langOverlays`に`{ en: 'blog/astro/minimal/.lang/en' }`のように登録する。確定した言語のoverlayがあれば、base取得後にマージする。base言語（多くは`ja`）にoverlayは不要。
  - 現状`en`を持つのは`blog-astro-minimal` / `blog-astro-personal` / `blog-astro-techlog`。
  - 画面文言は`siteConfig.uiText`等へ集約すると差分が小さく済む（コメントや開発者向けのビルドエラー文言は対象外）。
  - `.lang/`は`screenshots/`と同様に、生成プロジェクトから自動削除される。
  - ローカル確認は`nr build:template:en <pkg>`（`.lang/en`を一時的にsrcへマージしてbuild→src復元）→`nr preview:template <pkg>`。
- 言語別variant（`single-project-variant`型）
  - 文章量が多くデザインごと差し替えるLPは、`.lang/`のoverlayでなく`src/pages/{lang}/{variant}/`（必要なら`src/components/{lang}/{variant}/`も）に置く。同じ`src/`内に並べるので`nr dev`で両言語を確認できる。
  - `{lang}/{variant}/`にはbaseと違うファイルだけを置く。base側のファイル（`_style.css`や共通コンポーネント）はen側から`@/pages/{variant}/_style.css`のようにalias（`@/`）で参照する。相対パス（`../../{variant}/`）はCLIが書き換えないので使わない。
  - CSSの言語差は1ファイル内で切り替える。ページ全体やrootトークンは`html[lang='ja']`で絞る（en版はコンポーネント内に`lang="ja"`の要素を持つことがあり、素の`[lang='ja']`だとそこにも当たる）。
  - `--lang en`で`src/pages/en/{variant}/index.astro`があれば、CLIは`{variant}/`を持ち上げた上に`en/{variant}/`を上書きする（同名ファイルはen優先）。無ければbaseだけを持ち上げる。`manifest.ts`の追加定義は不要。抽出時に他variantと`en/`は削除され、`@/{dir}/{variant}/`と`@/{dir}/en/{variant}/`の両形式が`@/{dir}/`へ書き換わる。
  - CLIの抽出処理を変える改修では、CLIを先に公開してからテンプレ変更をmainへマージする（公開済みCLIは常にmainのテンプレを取得するため。前述の`DEFAULT_TEMPLATES_REF`を参照）。
  - `Layout.astro`は`lang` prop（既定`ja`）で`<html lang>`を切り替える。en版ページは`<Layout title lang="en">`。
  - 現状`en`を持つのは`lp-astro-corporate` / `lp-astro-interior` / `lp-astro-ryokan`。
  - ローカル確認は`nr build:template lp-astro`（jaと`/en/{variant}/`を同時にビルド）→`nr preview:template lp-astro`。

### プレビューデプロイ（`templates.lism-css.com`）

Cloudflare Pagesへwranglerで配信する。

- `nr deploy:templates`: `build:templates`（core / uiをビルドし、`scripts/build-previews.mjs`で全テンプレを`.preview/merged`へ集約）→Pagesプロジェクト`lism-templates`へdeploy。
- `nr deploy:template <pkg>`: 1テンプレだけビルドし、`scripts/write-noindex-headers.mjs`で`_headers`（noindex）をdistへ書いてからPagesプロジェクト`lism-<pkg>`へdeploy。


## publish前チェック

- [ ] `constants.ts`の3つのrefが`'main'`
- [ ] `registry-index.json`が最新
- [ ] `nr lint` / `nr typecheck` / `nr test`
- [ ] `node packages/lism-cli/bin/lism-cli.mjs --help`でコマンド体系を目視確認
