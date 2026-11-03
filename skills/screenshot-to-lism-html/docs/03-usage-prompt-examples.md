# Screenshot to Lism HTML Skill プロンプト例

このドキュメントでは、`.cursor/skills/screenshot-to-lism-html/SKILL.md` を使用して、デザイン画像から **Lism CSS ベースの HTML** を生成させる際に、ユーザーが入力すべきプロンプト（指示）の例をまとめています。

> **前提**: 本 Skill は [`lism-css-guide`](https://github.com/lism-css/lism-css/tree/main/skills/lism-css-guide) の補助スキルとして機能します。Lism CSS 側の実装ルール（記法・命名・トークン・アンチパターン）は `lism-css-guide` に委譲するため、プロンプトでも両スキルの併用を明示するのが基本形です。

## 1. 基本的な使用プロンプト

もっともシンプルに Skill を呼び出す場合のプロンプトです。画像ファイルと出力先のみを指定します。

```text
次のスクリーンショット画像から、Lism CSS を使って可能な限り忠実に HTML を生成してください。
.cursor/skills/screenshot-to-lism-html/SKILL.md のワークフロー（Phase 0〜4）に従って順番に進めてください。
Lism CSS の記法・命名・トークンは lism-css-guide のルールに従います。

- 入力画像: input/sample-lp.jpg
- 出力先ディレクトリ: output/sample-lp/
```

## 2. 詳細な条件を指定するプロンプト

プロジェクトの要件に合わせて、出力ファイルの命名規則や、事前に定義されたルールを強調する場合のプロンプトです。

```text
提供したランディングページの画像（input/design.png）から、Lism CSS を使った HTML を生成してください。
.cursor/skills/screenshot-to-lism-html/SKILL.md のワークフローに厳格に従い、HTML を直接書く前に必ず抽象 DOM ツリーの定義を行ってください。
Lism CSS の記法・トークン・アンチパターンは lism-css-guide を参照してください。

【要件】
- 入力画像: input/design.png
- 出力先ディレクトリ: dist/lp-project/
- 画像の書き出し先: dist/lp-project/images/ （必要に応じて適当なダミー画像を配置してください）
- HTML のルート要素にはセマンティックな `<main>` を使用してください。
- `pattern-catalog.md` に記載のない独自レイアウトがある場合は、一番近いパターン（→ 対応する Lism プリミティブ）の組み合わせに分解して抽象 DOM ツリーを作成してください。
- Property Class で書ける宣言は CSS ではなくマークアップに寄せる（lism-css-guide の「プリフライト・c-- 定義時の分解」）。
- Phase 3 のトークン照合時、デザイン値と Lism トークンの差分表を出し、A/B/C の方針をユーザーに確認してから実装に進んでください。

Phase 0 の画像分割から始めてください。
```

## 3. 手動介入・リカバリ時のプロンプト

Phase 0（自動分割スクリプト）がうまくいかなかった場合や、特定の Phase から再開させたい場合のプロンプトです。

### 3-1. 自動分割に失敗した場合（手動で分割画像を用意した状態）

```text
画像の自動分割をスキップし、手動で分割した以下のセクション画像群を使用して Phase 1（抽象 DOM ツリーの構築）から開始してください。
.cursor/skills/screenshot-to-lism-html/SKILL.md に従ってください。Lism CSS のルールは lism-css-guide を参照してください。

- 入力画像:
  - input/sections/hero.png
  - input/sections/features.png
  - input/sections/contact.png
- 出力先ディレクトリ: output/manual-split/
```

### 3-2. Visual Critique（自己検証）ループだけを回したい場合

```text
現在出力先 (`output/sample-lp/`) にある HTML について、.cursor/skills/screenshot-to-lism-html/SKILL.md の 【Phase 4: Visual Critique】 を実行してください。

スクリプトでプレビュー画像を撮影し、元の画像（input/sample-lp.jpg）と比較して間違い探しを行い、Lism CSS の Property Class ／カスタム CSS を修正するループを視覚的に一致するまで繰り返してください。修正時も lism-css-guide のルール（プリミティブ選定・トークン照合・antipatterns）に従ってください。
```

### 3-3. Phase 3 のトークン照合フェーズから再開したい場合

```text
Phase 1〜2 は完了済みで、design-inventory.json と骨格 HTML（Lism プリミティブのみ付与）が output/sample-lp/ にあります。
.cursor/skills/screenshot-to-lism-html/SKILL.md の 【Phase 3: セクションごとのスタイリング】 から再開してください。

- lism-css-guide/SKILL.md の「プリフライト・トークン照合」を design-inventory.json の生値に対して実行
- 差分表を提示し、方針（A: px 直書き / B: 最寄りトークンに丸める / C: 基準値上書き）をユーザーに確認
- 承認された方針で上から下へセクションごとに Property Class を付与
```

## Tips: LLM のハルシネーション（幻覚）を防ぐコツ

Skill を実行中、LLM が手順をスキップして突然大量の HTML を書き出し始めた場合は、すぐに処理を停止（Cancel）し、以下のように注意して軌道修正してください。

```text
指示に違反しています。まだ Phase 1 の抽象 DOM ツリー (`design-inventory.json`) が完成していません。
HTML と CSS を書くのをやめ、まずは pattern-catalog.md のマッピング（画像パターン → Lism プリミティブ）に従った抽象 DOM ツリーの抽出のみを行ってください。
```

Phase 3 で Property Class や CSS を書き始めた際に、トークン照合をスキップしていた場合は次のように誘導します。

```text
待ってください。Phase 3 は Lism トークンとの照合とユーザーへの方針確認（A/B/C）が先です。
lism-css-guide/SKILL.md の「プリフライト・トークン照合」と「デザインデータ取り込み時のフロー」に従い、まず差分表を提示してください。
```
