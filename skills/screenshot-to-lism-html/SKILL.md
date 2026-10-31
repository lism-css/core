---
name: screenshot-to-lism-html
description: "Web デザインのスクリーンショット（画像）を入力に、Lism CSS を使って忠実に再現した HTML を生成するためのワークフロー。LP など1ページ構成の静的ページを想定。画像分割 → 抽象DOMツリー抽出 → Lism CSS プリミティブへのマッピング → セクション別コーディング → Visual Critique の 5 フェーズを厳格に踏ませ、VLM の「典型 LP テンプレート当てはめ（幻覚）」を抑止する。Lism CSS の記法・トークン・命名規則は補助スキル lism-css-guide に完全に委譲する。"
---

# Screenshot to Lism HTML

このスキルは、**Web デザインのスクリーンショット画像を入力に、[Lism CSS](https://lism-css.com/) を使って忠実に再現した HTML を生成する**ためのワークフローを定義します。

## 位置づけ（`lism-css-guide` との関係）

本スキルは、[`lism-css-guide`](https://github.com/lism-css/lism-css/tree/main/skills/lism-css-guide) の**補助スキル**として機能します。役割分担は以下：

| スキル | 責務 |
|--------|------|
| **screenshot-to-lism-html（本スキル）** | 画像→**構造（抽象 DOM ツリー）**の忠実な読み取りと、それをセクション単位で Lism CSS プリミティブ・トークンにマッピングし、コーディングまで進めるワークフローの制御 |
| **lism-css-guide** | Lism CSS の**記法・命名規則・トークン・プリミティブ／コンポーネント選定・アンチパターン**などの実装ルール |

**本スキルは Lism CSS 固有の記法や命名規則を再定義しません。** 実装フェーズで Lism CSS のクラス・トークン・プロパティを扱う際は、必ず `lism-css-guide` を参照してください。本スキルの `pattern-catalog.md` は「画像から読み取ったレイアウトパターンを Lism CSS のどのプリミティブに落とすか」のマッピング表として位置づけます。

## 概要

VLM（視覚言語モデル）は、LP 全体の画像から「よくある LP のコード」を出力しがちで、画像の細部（写真の重なり・カラム比率・見出しのフォント差など）を見落とす傾向があります。本スキルは以下の 5 フェーズを**必ず順に踏む**ことでこれを抑止します。

1. 画像をセクション単位で分割する
2. コードを書く前に「抽象 DOM ツリー（design-inventory）」を作らせる
3. まず装飾なしの骨格 HTML（Lism プリミティブのクラスのみ）を組ませる
4. セクション画像を 1 枚ずつ見ながらスタイルを当てさせる
5. 生成 HTML のスクリーンショットを撮って「間違い探し」→ 修正のループを回す

**フェーズを飛ばしたり順序を入れ替えたりしないでください。**

## 事前準備

以下のコマンド例にある `<skill-dir>` は、本スキルのディレクトリ（この SKILL.md が置かれている場所）を指します。インストール環境によってパスが異なるため（例: `.claude/skills/screenshot-to-lism-html`、`.cursor/skills/screenshot-to-lism-html`）、実行時に読み替えてください。

初回実行時は、スクリプトの依存関係をインストールしてください。

```bash
npm install --prefix <skill-dir>/scripts
```

## ワークフロー

ユーザーから**スクリーンショット画像**と**出力先ディレクトリ**が渡されたら、以下のフェーズを順に実行してください。

### Phase 0: 画像のセクション分割

1. ユーザーが提供した画像（例: `input.jpg`）をセクションごとに分割します。
2. Shell ツールでプロジェクトルートから以下を実行（入力・出力パスはカレントディレクトリ基準で解決されます）：
   ```bash
   node <skill-dir>/scripts/split_image.js <入力画像パス> <出力先ディレクトリ>/sections
   ```
   *※ 自動分割がうまくいかない場合は、VLM 自身が Y 座標を推測して手動で切るか、ユーザーに相談してください。*

### Phase 1: 抽象 DOM ツリーと仕様の抽出（コード禁止）

1. `spec-definition-rules.md` と `pattern-catalog.md` を読み込みます。
2. 分割されたセクション画像群を見て、**カラーパレット・タイポグラフィ・レスポンシブ／ホバー挙動・抽象 DOM ツリー**を定義した `design-inventory.json`（または `.md`）を出力先ディレクトリに作成します。
3. **このフェーズでは絶対に HTML/CSS を書きません。** 「典型 LP テンプレの当てはめ」を回避するための最重要フェーズです。
4. カラー・スペーシング・タイポグラフィなどの数値は、Lism CSS のトークンにそのまま乗せるかを後段で判断するため、まず**画像から読み取った生の値**として `design-inventory` に記録します（トークン照合は Phase 2〜3 で行います）。

### Phase 2: グレーボックス骨格 HTML の構築

1. `generation-prompts.md` の Phase 2 に従います。
2. `design-inventory.json` を**絶対の契約**とし、Semantic HTML と `pattern-catalog.md` で指定した **Lism CSS プリミティブのクラス名**（`l--stack`, `l--columns`, `l--grid`, `is--container` など）だけを持つ `index.html` を作ります。画像は灰色のプレースホルダ `<div class="placeholder-image"></div>` にします。
3. Property Class（`-fz:xs` など）やトークン照合はまだ行いません。**構造だけを Lism CSS のプリミティブに落とす**フェーズです。
4. プリミティブ選定に迷ったら、必ず `lism-css-guide` の以下を参照：
   - `primitive-class.md`（「カラムレイアウト Primitive の使い分けガイド」）
   - `antipatterns.md`（レイアウト選択ミス）

### Phase 3: セクションごとのスタイリング

1. `generation-prompts.md` の Phase 3 に従います。
2. `index.html` に対し、Lism CSS の Property Class（`-fz:*`, `-p:*`, `-g:*`, `-bgc:*` など）と、必要に応じたカスタム CSS を当てていきます。**分割されたセクション画像を 1 枚ずつ順番に**参照しながら、上から下へ実装します。一気に全体を書きません。
3. **Lism CSS の記法・命名・トークン・カスタム CSS を書く条件は、すべて `lism-css-guide` に従います。** 特に：
   - **値・トークン照合**（`lism-css-guide/SKILL.md` の C5）を Phase 1 の生値に対して実施。差分表の作り方・確認の要否・提示する選択肢は `lism-css-guide` の `references/authoring.md`「デザインデータ取り込みフロー」に従う（選択肢の定義の正本はガイド側。本スキルで再定義しない）。本スキルの入力は画像なので、既定動作は「最寄りトークンへ丸める。実測 px をそのまま書かない」。
   - `set--*` / `u--*` / Property Class で書けるものは CSS ではなくマークアップで表現する（`lism-css-guide/antipatterns.md`「Property Class で書けるのに CSS で書く」、`lism-css-guide/SKILL.md` の C7「CSSに書くもの/Propsに移すもの」）。
   - `c--*` を新設する場合も同 SKILL のルールに従い、CSS に残すのは擬似クラス・状態切替・子孫セレクタなど「CSS でしか書けない宣言」のみ。
   - レスポンシブは Lism の Property Class の `_{bp}` サフィックスやコンテナクエリを使う。`<Grid gtc="repeat(3, 1fr)">` のような PC 固定は避ける。
4. `pattern-catalog.md` のパターン → プリミティブ対応表と、`lism-css-guide/primitive-class.md` の使い分けガイドを突き合わせながら実装します。

### Phase 4: Visual Critique（自己検証）

1. `visual-critique-loop.md` を読み込みます。
2. プレビュースクリプトで生成 HTML のスクリーンショットを撮ります（プロジェクトルートから実行）：
   ```bash
   node <skill-dir>/scripts/capture_preview.js <出力先ディレクトリ>/index.html <出力先ディレクトリ>/preview.png
   ```
3. `preview.png` と元の画像を並べて「間違い探し」を行い、CSS（および必要に応じて HTML）を修正します。
4. 修正 → 撮影のループを **最大 3 回**繰り返し、視覚的に一致したら完了します。

---

## 関連アセット（使用時に必ず参照すること）

- `pattern-catalog.md` — 画像から読み取ったレイアウトパターンを **Lism CSS プリミティブへマッピング**するカタログ
- `spec-definition-rules.md` — 抽象 DOM ツリー抽出ルール（Lism 用の記述フォーマットを含む）
- `generation-prompts.md` — 各フェーズのコード生成指示書
- `visual-critique-loop.md` — 自己検証ループ指示書

### 外部参照（Lism CSS 側の必読ドキュメント）

Phase 2 以降で必ず参照：

- [lism-css-guide/SKILL.md](https://github.com/lism-css/lism-css/blob/main/skills/lism-css-guide/SKILL.md) — 実装ルール全体
- [lism-css-guide/primitive-class.md](https://github.com/lism-css/lism-css/blob/main/skills/lism-css-guide/primitive-class.md) — プリミティブの一覧と使い分け
- [lism-css-guide/tokens.md](https://github.com/lism-css/lism-css/blob/main/skills/lism-css-guide/tokens.md) — デザイントークン
- [lism-css-guide/property-class.md](https://github.com/lism-css/lism-css/blob/main/skills/lism-css-guide/property-class.md) — Property Class
- [lism-css-guide/antipatterns.md](https://github.com/lism-css/lism-css/blob/main/skills/lism-css-guide/antipatterns.md) — 典型的な NG パターン
- [lism-css-guide/responsive.md](https://github.com/lism-css/lism-css/blob/main/skills/lism-css-guide/responsive.md) — レスポンシブ・ブレークポイント

プロジェクトによりローカルにインストール済みの場合はそちらを参照してください。
