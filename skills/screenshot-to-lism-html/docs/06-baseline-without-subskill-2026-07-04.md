# 対照検証（補助スキル不使用ベースライン）— 2026-07-04

> **サマリ**: [05-validation-2026-07-03-findings.md](./05-validation-2026-07-03-findings.md) で挙げた課題が「補助スキル固有の問題」なのか「素の `lism-css-guide` だけでは常に踏む構造的な問題」なのかを切り分けるための対照実験。同じ入力画像を、補助スキル `screenshot-to-lism-html/SKILL.md` を**一切参照せずに** `lism-css-guide/SKILL.md` のみで再生成し、生成中に発生した現象を記録した。
>
> 結論: 05 の findings §3.2 / §3.3 / §3.4 / §3.5 の課題は、**補助スキル固有ではなく素の状態でも必ず踏む**ことを確認した。したがって、これら 4 項目は補助スキル側で先回りして解決する価値がある。

---

## TOC

- [1. 検証条件](#1-検証条件)
- [2. 実施フロー（補助スキル無し版）](#2-実施フロー補助スキル無し版)
- [3. 途中で発生した問題と対応（時系列）](#3-途中で発生した問題と対応時系列)
- [4. 補助スキル使用時（2026-07-03）との比較](#4-補助スキル使用時2026-07-03との比較)
- [5. この検証で確認できたこと・できなかったこと](#5-この検証で確認できたことできなかったこと)
- [6. 補助スキルへの改善提案（優先度付き）](#6-補助スキルへの改善提案優先度付き)
- [7. 関連ファイル](#7-関連ファイル)

---

## 1. 検証条件

- **入力画像**: `input/sample-lp.png`（3024×19530）
- **出力先**: `output/sample-lp-no-subskill-260704/`
- **使用スキル**: `.cursor/skills/lism-css-guide/SKILL.md` のみ
- **明示的に不使用**:
  - `.cursor/skills/screenshot-to-lism-html/SKILL.md`
  - 配下の `pattern-catalog.md` / `generation-prompts.md` / `spec-definition-rules.md` / `visual-critique-loop.md`
  - `scripts/split_image.js`（Phase 0 の自動分割）
- **例外的に使用**: `scripts/capture_preview.js` はプレビュー撮影の汎用ツールとして使用（HTML/CSS 生成には影響しない）
- **モデル**: Claude Opus 4.7 xhigh

## 2. 実施フロー（補助スキル無し版）

補助スキルの Phase 0〜4 が無いため、次の順で場当たり的に進めた：

1. 入力画像を Read で見て 10 セクションを目視で判別（`split_image.js` は使わない）
2. `lism-css-guide/SKILL.md` を頭から読み、`tokens.md` / `primitive-class.md` / `property-class.md` の該当箇所を確認
3. HTML を一括で執筆（Phase 2 / Phase 3 の分離はしない）
4. `style.css` にトークン上書き＋プレースホルダ＋コンポーネント差分 CSS を記述
5. `capture_preview.js` で撮影し、崩れた箇所だけ CSS を追記して再撮影

### セクション分割の判定

`split_image.js` を使わず目視のみで「Header / Hero / Mission / 派生 2 枠 / Point / Service / Step / Voice / FAQ / Contact / Footer」の 10 セクションに分けた。誤検出は発生しないが、境界の正確な Y 座標は取れていない。

## 3. 途中で発生した問題と対応（時系列）

補助スキルなしでスクリーンショットから 1 パスで生成した際に発生した現象と対応を、発生順に記録する。ここで発生した現象はすべて、素の `lism-css-guide` だけでは事前に警告される仕組みが無かったもの。

### 3.1. 初回撮影でページ全体が単色で埋め尽くされた

- **症状**: `preview.png` のほぼ全域（約 13000px 分）が同じ khaki 色のグラデーションで覆われ、テキストや他のセクションは最下部にわずかに見える状態。
- **原因**: `.c--placeholder` に `position: absolute; inset: 0;` を当てていたが、親の `.l--frame` に `position: relative` が付いていなかったため、絶対配置の基準が `<body>` にまで遡り、プレースホルダが body 全面を覆っていた。
- **仮説と反証**: CDN 版 `lism-css@0.16.0` の `l--frame` が `position: relative` を含まない可能性を疑い、`style.css` 側で明示的に `position: relative` を追加して解消。
- **05 findings との対応**: §3.3（CDN 版限界の未明示）に該当。素の `lism-css-guide` は CDN URL として `lism-css@0.16.0` を案内しているが、これがガイド本文の記述と乖離している（ガイドは `0.22.2` 前提）ため、そもそもプリミティブの一部が期待通り出力されないことに気付きにくい。

### 3.2. `l--flex` / `l--withSide` / `l--columns` が期待通りに動かず、全セクションが縦積みになった

- **症状**: 3.1 の後、レイアウトは表示されるようになったが、ヘッダーは左上に極小の LISM Life テキストだけ、Mission / Sub-mission / Point / Service / Voice はすべて縦 1 列。
- **原因**: 現在の CDN URL `lism-css@0.16.0` は、`l--flex` / `l--withSide` / `l--columns` などのレイアウトプリミティブが完備されていない、あるいは記法が旧仕様。
- **対応**: `style.css` にプリミティブ 5 種（`l--flex` / `l--stack` / `l--cluster` / `l--columns` / `l--withSide`）と gap トークン（`-g:10`〜`-g:60`）のフォールバック CSS を追加。レイアウトが横並びになった。
- **05 findings との対応**: §3.3 に加えて §3.2（Property Class 実在確認手段の不足）に該当。プリミティブと Property Class のどちらも「実際に CDN から吐き出される集合」が把握できない。

### 3.3. `l--withSide` フォールバックの basis 計算ミスで縦積み再発

- **症状**: 3.2 のフォールバック後、Mission セクションだけ横並びにならず、テキストと写真が縦に並んだ。
- **原因**: 初版のフォールバック `.l--withSide > * { flex: 1 1 var(--mainW, 50%); }` + `.is--isSide { flex: 0 1 var(--sideW, auto); }` は、`--mainW: 50%` + `--sideW: 45%` + gap 50px の合計が `-px:30` 込みの利用幅を超え、`flex-wrap: wrap` が発火して縦積みへ倒れた。
- **対応**: `flex: 1 1 0` + `.is--isSide { flex: 0 0 var(--sideW, 40%); }` に変更し、side の basis を固定・main を残り fill する形へ。
- **05 findings との対応**: パターンカタログ相当が無いことに由来。`l--withSide` の `mainW`/`sideW` の関係、gap 込みの basis 計算、`is--isSide` の役割を自力で再現するのはコストが高い。

### 3.4. Contact セクションの白文字が全く見えなかった

- **症状**: 3.3 の後、Contact 内の "Contact" / "お問い合わせ" 見出しが暗い背景に埋もれて見えない。
- **原因**: `-c:white` を書いたが、CDN 版 `main.css` にはパレット色の Property Class（`-c:white` / `-c:black` / `-c:red` など）が含まれていない。
- **対応**: `style.css` に `.-c\:white { color: #fff; }` などのパレット色フォールバックを追加。
- **05 findings との対応**: §3.2 / §3.3。`property-class.md` の表では「パレットカラー: red, white, black ...」と併記されているが、CDN 版で実際に生成されるのはセマンティックのみ、という点に事前警告がない。

## 4. 補助スキル使用時（2026-07-03）との比較

| 観点                  | 補助スキルあり（`sample-lp-260703`）                                           | 補助スキルなし（`sample-lp-no-subskill-260704`）                                                                   |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| セクション分割        | `split_image.js` 実行 → 誤検出 21 セクション → 手動再クロップ 8 セクション     | 目視のみ 10 セクション（誤検出は発生しないが境界 Y は不明）                                                        |
| 実装量                | HTML 371 行、CSS 多め（Property Class フォールバック多数）                     | HTML 約 300 行、CSS 中量（プリミティブ＋Property Class フォールバックが必要）                                      |
| Phase 分離            | Phase 2/3 分離は現実性を欠き 1 パス実装（レポート明記）                        | そもそも Phase 概念なしで最初から 1 パス                                                                           |
| Property Class の創作 | 大量発生（`-cols:3` `-fz:huge` 等）→ 一括 normalize + フォールバック追加で対応 | 発生は抑制（`property-class.md` を都度参照した）ものの、CDN 版に存在しないクラス（`-c:white`）は依然として書く     |
| プレビュー撮影        | 撮影バグに遭遇し診断に長時間、最終的にセグメント式へ書き換えて解消             | セグメント式スクリプトを再利用したためバグ再発なし                                                                 |
| CDN 版の限界に遭遇    | 検証中に遭遇、レポートに findings として明記                                   | 補助スキル無しでもすぐに遭遇。素の `lism-css-guide` からは事前警告なし                                             |
| 到達した見た目        | 構造再現 8 セクション ○、細部の余白・タイポ・写真構図に乖離                    | 構造再現 10 セクション ○、Mission/Point/Step の写真サイズが原画より小さめ、Hero の写真上文字オーバーラップは未実装 |

### 補助スキルが（もしあれば）解決していたはずの局面

補助スキル `screenshot-to-lism-html/SKILL.md` の各章と、今回のハマり箇所の対応：

| 補助スキル側の章                                      | 今回のハマり                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Phase 0（自動分割 + 手動フォールバック）              | セクション境界を目視判定するため、Mission の派生 2 ブロックを見落としかけた（1 度書き出し後に追加）              |
| `pattern-catalog.md`（Hero オーバーラップ雛形）       | Hero 写真上に文字がオーバーラップする原画構図が再現できず、縦積みで妥協                                          |
| `pattern-catalog.md`（`l--withSide` バリエーション）  | 3.3 の basis 計算ミス。パターン集があれば発生しなかった                                                          |
| `spec-definition-rules.md`（`design-inventory.json`） | 色・タイポ・スペーシングを最初に列挙・照合するルーチンが無く、CDN で使えないトークンをその場で発見する形になった |
| `visual-critique-loop.md`                             | 撮影→比較→差分修正のループを都度自力で組み立てた                                                                 |
| CDN 版限界の明示（05 findings §3.3）                  | 3.1〜3.4 が全てここに帰着。素の `lism-css-guide` にはこの警告が無く、必ず踏むと予測できる罠                      |

## 5. この検証で確認できたこと・できなかったこと

### 確認できたこと

- **05 findings §3.2 / §3.3 は補助スキル無しでも発生する構造的問題**である（CDN 版限界の未明示、Property Class 実在確認手段の不足）。したがって補助スキル側で解決する価値がある
- `capture_preview.js` のセグメント式撮影は補助スキル無しでも問題なく動作する（05 findings §2.1 の修正は回帰なし）
- 素の `lism-css-guide` からでも「Lism CSS ベースの HTML を出す」こと自体は 10 セクション到達で可能。ただし CDN 版限界に起因する再修正ループのコストが大きい

### 確認できなかったこと（次回以降の検証課題）

- 別 LP（サンプル以外の入力画像）でも同じハマりが再現するか
- 補助スキルの `pattern-catalog.md` を強化した後で、素の状態との差分がどこまで縮まるか
- CDN 版ではなく npm build 版で構築した場合、これらのハマりが本当に消えるか（今回の検証範囲外）

## 6. 補助スキルへの改善提案（優先度付き）

本検証と 05 findings を統合した優先度：

### 【最優先】P0. CDN 版と build tool 版の差異を Phase 3 冒頭で明示

- **なぜ最優先か**: 3.1〜3.4 の全てがここに帰着。1 箇所の明記で 4 つのハマりを事前回避できる
- **具体案**:
  - `screenshot-to-lism-html/SKILL.md` の Phase 3 冒頭に「CDN 版か build tool 版か」をユーザーに確認するステップを追加
  - CDN 版で使える Property Class・プリミティブのサブセットを `pattern-catalog.md` または新規 `docs/cdn-subset.md` に一覧化
  - CDN 版で使えないもの（パレット色 `-c:white`、レスポンシブ `-cols_sm`、中間値 `-g:24` 等）を NG リスト化

### 【高】P1. `l--withSide` / `l--columns` / `l--frame` のパターンカタログ整備

- **なぜ高いか**: 3.3 の basis 計算ミス、Mission/Sub-mission セクションでの写真サイズ調整、Point/Step の非対称 2 カラムはすべて `l--withSide` の使い分けに帰着
- **具体案**:
  - `pattern-catalog.md` に「LP でよく出る非対称 2 カラム」の実装スニペット集を追加
  - Hero の写真上文字オーバーラップ（`l--frame` + `is--layer`）の雛形
  - Service カード、Voice カード、FAQ アコーディオンの標準実装

### 【高】P2. Property Class クイックリファレンス

- **なぜ高いか**: 05 findings §3.2 の課題。素の状態で `-c:white` を書いてしまうように、`property-class.md` の表は網羅性が高い一方で「実際に使える集合」の絞り込みが読み手側に委ねられている
- **具体案**:
  - `pattern-catalog.md` に「LP 実装で頻出する Property Class 20〜30 個」の実用リスト
  - CDN 版 / build tool 版のどちらで使えるかを列で明示
  - `-cols`, `-fz`, `-g`, `-c`, `-bgc`, `-p`, `-py`, `-px`, `-m`, `-mx`, `-ai`, `-jc`, `-ta`, `-w`, `-h`, `-max-sz`, `-ar`, `-bdrs`, `-lh` などの実プリセット値のみ列挙

### 【中】P3. Phase 2/3 分離ルールの現実化

- **なぜ中か**: 05 findings §3.4 で既に指摘済み。今回の検証でも 1 パス実装で問題なく到達した
- **具体案**: SKILL.md に「Phase 2 と Phase 3 は独立フェーズが望ましいが、コンテキスト効率を優先するなら 1 パス実装も許容」と現実的な運用指針を追記

### 【中】P4. トークン照合の A/B/C 確認をグローバル方針 1 回に集約

- **なぜ中か**: 05 findings §3.5。今回の検証は補助スキル無しなので確認ステップ自体が発生しなかったが、補助スキル導入時には破綻する
- **具体案**: Phase 3 の冒頭で「トークン方針」を 1 回だけ確認、以降はその方針に沿って自動適用

### 【低】P5. Phase 0 自動分割の高度化

- **なぜ低か**: 目視判別で 10 セクションに到達できるため、Phase 0 の精度改善は投資対効果が低い可能性
- **具体案**: `split_image.js` を「高精度自動化」より「LLM が Y 座標を推測 → 手動確認」ワークフローに置き換える方が現実的かもしれない

## 7. 関連ファイル

- 補助スキル: [`../SKILL.md`](../SKILL.md)
- 前回検証の findings: [`./05-validation-2026-07-03-findings.md`](./05-validation-2026-07-03-findings.md)
- 対照実験の生成物（本検証で作られた HTML/CSS/preview）: `output/sample-lp-no-subskill-260704/`
- 前回検証の生成物（比較対象）: `output/sample-lp-260703/`
- パターンカタログ（今回の改善提案 P1/P2 の反映先）: [`../pattern-catalog.md`](../pattern-catalog.md)
- 撮影スクリプト（本検証で唯一の例外的使用）: [`../scripts/capture_preview.js`](../scripts/capture_preview.js)
