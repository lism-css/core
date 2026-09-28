---
description: skills/lism-css-guide/ の各ファイルを最新ソースと照合して更新する
---

# Skill Update

`skills/lism-css-guide/` 配下のファイルを最新ソースと照合して更新する。

対象ファイルとソースの対応は、この指示書に列挙せず「対応規則」から実行時に導く。ファイルの実体は `ls` / Glob で拾い、この指示書に個別のファイル名を足さない。パッケージの構成・主要ファイルは `packages/lism-css/CLAUDE.md` / `packages/lism-ui/CLAUDE.md` で把握する。


## 情報の優先順位

1. **パッケージソース（絶対基軸）**: `packages/lism-css/` と `packages/lism-ui/` のソースコードが常に正
2. **ドキュメント（補足）**: `apps/site/src/content/ja/` の MDX は解説の参考として使うが、ソースと矛盾する場合はソースを優先


## 対象ファイルの分類

| 分類 | 対象 | 扱い |
| --- | --- | --- |
| ルート基本ファイル | `SKILL.md` と直下の `*.md`（`antipatterns*.md` を除く） | 通常同期 |
| 分冊 | `property-class/*.md` | 通常同期。`property-class.md` と重複・矛盾が出ないようセットで照合 |
| クラス単位詳細 | `primitives/*.md`, `trait-class/*.md` | 通常同期。1クラス1ファイル |
| 限定チェック | `antipatterns*.md`, `references/*.md` | 有効性チェックのみ（後述） |


## 対応規則（skill ファイル ↔ ソース）

以下のパスは、特記なければ `packages/lism-css/` 基準。MDX は `apps/site/src/content/ja/` 基準。

### クラス単位詳細ファイル

ファイル名＝クラス名（camelCase を維持）。MDX も同名。`{name}` は接頭辞を除いたクラス名。

| 接頭辞 | skill 側 | SCSS | MDX | 公式ドキュメント URL |
| --- | --- | --- | --- | --- |
| `l--` | `primitives/` | `src/scss/primitives/layout/_{name}.scss` | `primitives/{class}.mdx` | `https://lism-css.com/docs/primitives/{class}.md` |
| `a--` | `primitives/` | `src/scss/primitives/atomic/_{name}.scss` | `primitives/{class}.mdx` | 同上 |
| `is--` | `trait-class/` | `src/scss/trait/is/_{name}.scss` | `trait-class/{class}.mdx` | `https://lism-css.com/docs/trait-class/{class}.md` |
| `has--` | `trait-class/` | `src/scss/trait/has/_{name}.scss` | 現状は個別 MDX なし。`trait-class.mdx` を参照 | 現状は個別ページなし。`https://lism-css.com/docs/trait-class.md#{class}` |

React/Astro 側の Props 実装は `src/components/` の `layout/` / `state/` / `atomic/`。Trait は `href` → `<a>`、`contentSize`、`@sm` / `@md` バリエーション等の固有挙動も照合する。

原則 SCSS と 1:1。例外:

- `l--box` / `a--decorator`: 対応する SCSS を持たない
- `is--coverLink`: SCSS はあるが独立ファイルを作らず、`is--boxLink.md` 内で扱う
- `is--skipFlow` / `is--side`: 独立ファイルを作らず、`l--flow.md` / `l--withSide.md` 内で言及する
- 個別 MDX・個別ページの有無は MDX ディレクトリの実体で判断し、URL の形式（個別 / 一覧アンカー）もそれに従う

### ルート基本ファイル・分冊

ファイル単位で列挙せず、ディレクトリを起点に探す。

| skill 側 | 主なソース |
| --- | --- |
| `SKILL.md` | 両パッケージの `package.json`（バージョン）と exports。「詳細リファレンス」「クラス単位の詳細リファレンス」の一覧は実ファイルと一致させる |
| `base-styles.md`, `tokens.md`, `set-class.md` | `src/scss/reset.scss`, `src/scss/base/`（`tokens/`, `set/` 配下）, `config/defaults/tokens.ts`。set prop の処理ロジックは `src/lib/helper/` |
| `primitive-class.md` | `src/scss/primitives/`。俯瞰マップに徹し、個別 Primitive へのリンクは載せない |
| `trait-class.md` | `src/scss/trait/`, MDX `trait-class.mdx`。俯瞰マップに徹し、個別の詳細は `trait-class/*.md` |
| `utility-class.md` | `src/scss/utility/`。Property Class との違いの説明を維持 |
| `property-class.md`, `property-class/*.md` | `config/defaults/props.ts`, `src/scss/_prop-config*.gen.scss`（生成物）, `src/scss/props/`（カテゴリ別 SCSS）, MDX `property-class/{同名}.mdx` |
| `responsive.md` | `src/scss/_query.scss`（BP・コンテナクエリ）, `src/lib/`（レスポンシブ Props の正規化） |
| `css-rules.md`, `naming.md` | `src/scss/_with_layer.scss`（Layer 宣言）, `src/scss/primitives/`・`src/scss/base/`（プレフィックス）, `config/defaults/props.ts`（省略ルール）, MDX `naming.mdx`。`b--` の実例は `packages/lism-ui/src/`、`c--` はユーザー独自クラスで本体に実装はない |
| `components-core.md` | `src/components/`, `src/lib/getLismProps.ts`, `config/`, `src/lib/helper/`。Atomic/Trait/Layout の対応表には `primitives/*.md` への詳細リンクを保持する。個別 Props・仕様の詳細は `primitives/*.md` / `trait-class/*.md` 側に置き、こちらへ戻さない |
| `components-ui.md` | `packages/lism-ui/src/`, `packages/lism-cli/src/commands/`（`ui` 等のサブコマンド） |
| `customize.md` | `src/scss/` 直下（`main*.scss` / `full*.scss` / `_with_layer.scss` / `_setting.scss` の `$lism-` 変数）, `packages/lism-cli/src/`（lism.config の読み込み）, `packages/plugin/src/`（`@lism-css/plugin`）, MDX `customize.mdx` |

## クラス単位詳細ファイルの構成

各 `primitives/*.md` / `trait-class/*.md` は以下の構成を維持する：

- Front matter なし、`# {クラス名} / <Component>` の h1 で開始
    - 対応コンポーネントを持たない `has--*` は h1 を `# {クラス名}` のみとし、概要文の後に `- Lism props: hasXxx（<Lism hasXxx> 等）` の行を置く
- 概要文（1〜2文）の後に、見出しを付けず `公式ドキュメント（使い方・コード例）: {URL}` の1行リンクを置く。URL は上の表の形式を維持し、誤って書き換えない
    - SCSS raw URL の行は置かない（SCSS の参照先は上の「対応規則」で足りる）
- 以降は必要に応じたセクション（`## 既定の挙動`、`## 専用Props`、`## 使い方`、HTML 構造、動作の仕組み、特殊仕様、Opt-in スタイル、`has--*` の `## SCSS 定義` / `## CSS 変数` など）
- 末尾は `## 関連プリミティブ`（`has--*` は `## 関連`。3〜4個に絞る）
- コード例は専用の Usage セクションを設けず、解説に必要な箇所へ JSX / HTML / SCSS コードブロックで記載する（MDX の `<Preview>` / `<PreviewArea>` / `<PreviewCode>` / `<SrcCode>` 等のカスタムコンポーネントは廃棄）
- コード例で使う要素・クラス・コンポーネントは `lism-css` パッケージに含まれるものだけに限定する（`@lism-css/ui` のコンポーネント解説を除く）

## 限定チェック対象ファイル

`antipatterns*.md` / `references/*.md` は失敗例・執筆ノウハウの蓄積ファイルのため、通常のソース同期とは扱いを分ける。

- 構成・文章の書き換えや、失敗例・ノウハウの追加削除は行わない（運用ルールは CLAUDE.md の注意事項を参照）
- チェックするのは、記載されているクラス名・Props 名・コード例・ファイルパスが現在のソースでも有効かどうかのみ
- 無効になった箇所は値の置き換えのみ最小修正する。例自体が成立しなくなっている場合（対象 API の廃止等）は修正せず、差分サマリーで報告してユーザーに判断を仰ぐ


## 作業手順

対象ファイルが多いため、分類単位（ルート基本ファイル / `property-class/` / `primitives/` / `trait-class/`）で分担し、照合は researcher、更新は worker サブエージェントへ委譲して並列で進めてよい。差分サマリーはメインエージェントが集約する。

### 1. 現状の把握

- `skills/lism-css-guide/` 配下の全ファイルを読む（限定チェック対象も含む）
- 両パッケージの `package.json` からバージョンを取得し、`SKILL.md` のバージョン表記（`lism-css@x.y.z` / `@lism-css/ui@x.y.z`）と比較する
- 存在チェック: 「対応規則」の SCSS ディレクトリ配下の実体と `primitives/*.md` / `trait-class/*.md` が 1:1 対応しているか（例外は「対応規則」参照）、`SKILL.md` の「クラス単位の詳細リファレンス」に挙がるファイル名と実ファイルが一致するかを確認する（数値ではなくソースの実体を基準にする）

### 2. ソースコードの読み取りと照合

各ファイルについて「対応規則」のソースを読み取り、内容と照合する。

チェック観点:
1. **値の正確性**: トークン値、Props 名、クラス名がソースと一致しているか
2. **網羅性**: ソースに存在するが、記載されていない重要な項目がないか
3. **存在確認**: 記載されているが、ソースから削除された項目がないか
4. **コード例の正確性**: JSX / HTML のコード例が現在の API で動作するか
5. **バージョン情報**: SKILL.md のバージョン表記が最新か
6. **クラス単位詳細ファイルの整合性**: 専用 Props・ドキュメント URL・関連プリミティブ相互リンク先が現在のソース構成と一致しているか

### 3. 更新

差分が見つかった場合、ファイルを更新する。

- 既存の構成（セクション構造・テーブル形式）は維持する
- 値の修正・行の追加削除のみ行い、文体やフォーマットの変更はしない
- 新規セクションの追加が必要な場合は、既存のスタイルに合わせる

### 4. 差分サマリーの報告

変更点をファイルごとにまとめてユーザーに報告する。変更がなかったファイルも「変更なし」と報告する。


## 注意事項

- ソースに存在しない情報を推測で追加しないこと
- 説明文は簡潔なスタイルを維持する（「です・ます」調ではなく体言止め中心）
- `詳細: URL` のリンクは変更しない（URL の有効性チェックは本コマンドの範囲外）
- スキルファイル内のソースコードへのリンクは、必ず raw URL 形式（`https://raw.githubusercontent.com/lism-css/core/main/{path}`）を使用すること。`https://github.com/lism-css/core/blob/main/...` 形式は使わない。ディレクトリへのリンク（`tree/`）はそのまま GitHub URL で可
- スキルファイル内の公式ドキュメント (`https://lism-css.com/...`) へのリンクは AI が直接読み込めるよう `.md` 版を使用する（例: `https://lism-css.com/docs/primitives/l--box.md`）。ただし `.md` 版が存在しない URL（`/demo/...`、`/ui/` トップ等）は対象外として現状の HTML URL のまま維持する
