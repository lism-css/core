# Generation Workflow Prompts

このドキュメントは、抽象 DOM ツリー（Design Inventory）から **Lism CSS を使った HTML** を生成するためのプロンプトとワークフローの指示書です。
LLM は以下のフェーズに従って順番に処理を進めてください。

> Lism CSS の記法・命名規則・トークン・アンチパターンなどは **すべて `lism-css-guide` を参照** してください。本ドキュメントは、そのルールを **どのフェーズでどう適用するか** を指示します。

## Phase 1: 抽象 DOM ツリーの生成（Design Analysis）

**ユーザーの入力:**
`[入力画像: section_01.png]`

**LLM へのプロンプト指示:**
> あなたはプロのフロントエンドエンジニアであり、UI/UX デザイナーです。
> 提供されたセクション画像を分析し、`spec-definition-rules.md` および `pattern-catalog.md` に従って「抽象 DOM ツリー（Design Inventory）」を作成してください。
> **この段階では絶対に HTML や CSS のコードを書かないでください。**
>
> 以下の項目を含めてください：
> 1. カラーパレットとタイポグラフィの推測（画像からの生値・px 値）
> 2. レスポンシブ挙動とホバーエフェクトの定義
> 3. JSON（または Markdown 構造）による抽象 DOM ツリー
> 4. 各要素に `lism_primitive` / `lism_target` を添え、`pattern-catalog.md` のマッピングに従うこと
>
> **禁止事項:**
> - 「よくある LP」の定型構造への丸め込み（`pattern-catalog.md` §3 の要注意パターンを必ず確認）
> - ダミーテキスト（Lorem ipsum 等）への置き換え
> - 画像に存在しない要素の追加

## Phase 2: グレーボックス骨格 HTML の生成（Skeleton HTML）

**ユーザーの入力:**
Phase 1 で生成された抽象 DOM ツリー

**LLM へのプロンプト指示:**
> Phase 1 で定義した抽象 DOM ツリーに基づき、まず「グレーボックス骨格 HTML」を生成してください。
>
> **ルール:**
> - Property Class（`-fz:*` / `-p:*` / `-bgc:*` 等）はまだ書きません。**Lism のプリミティブのクラス名（`l--stack` / `l--columns` / `l--frame` / `is--container` 等）だけ**を付けます。
> - Astro/React 環境で組む場合は、対応する `<Stack>` / `<Columns>` / `<Frame>` / `<Container>` を使ってもよいですが、Props はレイアウト成立に必要な最小限（`cols` など）に留めます。色・スペーシング・タイポは Phase 3 で追加します。
> - 画像はすべて灰色のプレースホルダ（`<div class="placeholder-image"></div>`）にします。
> - クラス名の付け方（`c--*` / `is--*` / `l--*` / `-{prop}:{value}`）は `lism-css-guide/naming.md` に従います。
> - 抽象 DOM ツリーの構造から 1 ミリも逸脱しないでください。勝手に要素を追加・削除しない。
> - Semantic HTML（`<section>` / `<header>` / `<article>` / `<nav>` / `<main>` / `<footer>` 等）を適切に使ってください。
> - プリミティブ選定に迷ったら、`lism-css-guide/primitive-class.md` の「カラムレイアウト Primitive の使い分けガイド」を参照してください。

## Phase 3: セクションごとのスタイリング（Section-by-Section Styling）

**ユーザーの入力:**
Phase 2 の HTML 骨格 + 元のセクション画像

**LLM へのプロンプト指示:**
> 骨格 HTML と元の画像を元に、**Lism CSS の Property Class ／トークン**を使ってデザインを完全に再現してください。
>
> **手順:**
> 1. **値・トークン照合を必ず実施**（`lism-css-guide/SKILL.md` の C5「値・トークン照合」）。Phase 1 で記録した色・スペーシング・フォントサイズ・角丸・影の生値をリストアップし、`lism-css-guide/tokens.md` の値と突き合わせて差分表を出す。
> 2. デザイン値とトークンにズレがある場合の扱いは、`lism-css-guide` の `references/authoring.md`「デザインデータ取り込みフロー」に従う。画像入力の既定動作は「最寄りトークンへ丸める（実測 px をそのまま書かない）」。確認が必要な値（任意色・ブランド色など）は、ガイド側で定義された選択肢を提示して **ユーザーに確認する**。
> 3. 決まった方針に沿って、上から下へセクションごとに Property Class を付けていく。
>
> **ルール:**
> - Property Class（`-fz:*` / `-p:*` / `-g:*` / `-bgc:*` / `-c:*` / `-bdrs:*` / `-hov:*` 等）で書ける宣言は **CSS ではなくマークアップに書く**（`lism-css-guide/antipatterns.md`「Property Class で書けるのに CSS で書く」、`lism-css-guide/SKILL.md` の C7）。
> - CSS ファイル側に書くのは、擬似クラス／擬似要素／状態切替／子孫セレクタ／計算式など **CSS でしか書けない宣言のみ**。
> - 同じ Property Class の組み合わせが 3 箇所以上で繰り返されるなら、`c--{name}` として意味づけを与える（CSS に中身が無くてもクラス名は残す）。
> - レスポンシブは Property Class の `_{bp}` サフィックスや各プリミティブの Props で表現する。`<Grid gtc="repeat(3, 1fr)">` のような PC 固定は NG（`lism-css-guide/antipatterns.md`）。
> - ホバーは `-hov:*` 系（詳細 `lism-css-guide/property-class/hov.md`）。
> - HTML の構造は Phase 2 のものを破壊しない。装飾のためだけの過剰な `<div>` 追加を避け、Lism プリミティブの Props で表現できないかを先に検討する。
> - `lism-css-guide/antipatterns.md` に列挙された NG パターンを踏まないよう、実装前にセルフチェックしてください。

## Phase 4: コードの結合と自己検証準備

> すべてのセクションの HTML が完成したら、それらを一つの `index.html`（および必要ならカスタム CSS ファイル）に結合してください。
> 続いて Visual Critique（自己検証）フェーズへ移行します（`visual-critique-loop.md` を参照）。
