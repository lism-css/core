# 先行研究の概要（screenshot-to-lism-html プロジェクト）

本プロジェクトの土台となる先行研究 `figma-mcp-investigation`（`/Users/daisuke/Works/git/figma-mcp-investigation`）の内容を、本プロジェクトの設計検討に必要な範囲でまとめたメモ。

> **本プロジェクトの目的との差分**
>
> 先行研究は「Figma MCP + Lism CSS 公式 Skill + 独自前段スキル」を組み合わせ、Figma 由来のデザインを Lism CSS で再現することを主眼とする。
> 本プロジェクトは **Figma MCP を使わず**、**デザインスクリーンショット（画像のみ）を入力**に、[`lism-css-guide`](https://github.com/lism-css/lism-css/tree/main/skills/lism-css-guide) の**補助スキル**として **Lism CSS を使った HTML** を生成する **LLM 用 Skill** を作る、という点が異なる（[00-project-overview.md §3.3](./00-project-overview.md#33-lism-css-guide-の補助スキルとして-lism-css-出力を前提とする2026-07-03)）。
> 以下のまとめは、先行研究の「スクリーンショット入力」軸の知見のみを抽出している。

---

## 1. 先行研究の全体像

### 1.1 取り組みのゴール

- デザインデータ（Figma またはスクリーンショット）から、`Lism CSS` の規約に沿いつつ**視覚的に忠実な** Web ページ（静的 LP）を AI に生成させる
- 検証案件: **Interior LP（LISM Life）** — `fixtures/interior-lp/reference.jpg`（幅 1280px、1 枚）

### 1.2 利用しているスキル群（Cursor の Skill）

| Skill | 役割 | 入力 |
|-------|------|------|
| `lism-css-guide` | Lism CSS の文法・トークン・antipatterns（実装フェーズの基本） | 共通 |
| `figma-to-lism-css-guide` | Figma MCP 利用時の前段（構造抽出・パターン分類） | Figma URL |
| `screenshot-to-lism-css-guide` | **スクリーンショット**から構造抽出・パターン分類・忠実度チェック | 画像のみ |
| `layout-first-to-lism-css-guide` | スクリーンショットを**機械計測**し、骨格 IoU ゲートで形を固定してから Lism にリファクタ | 画像のみ |

本プロジェクトで参照すべきは下 2 つ（`screenshot-to-lism-css-guide` と `layout-first-to-lism-css-guide`）。

---

## 2. `screenshot-to-lism-css-guide` の要点

### 2.1 思想

> Lism の文法より **画像→構造の読み取り** が品質のボトルネック。

そこで「ビジュアルインベントリ → パターン分類 → セクション単位実装 → 自己検証」の 4 フェーズに分割し、HTML/CSS を書く前に**画像を読み切る**工程を強制する。

### 2.2 ワークフロー（必須フロー、抜粋）

1. 入力画像を上から下まで把握（セクション境界をメモ）
2. `design-inventory.md` を作成（テンプレートに沿って）
3. 各セクションに **UI パターン ID** を付与（Phase B）
4. 各セクションに **Lism プリミティブ第一候補**を記録（Phase C）
5. **トークン方針 A / C を宣言**（B は微差が蓄積しやすく、忠実再現のデフォルトにはしない）
6. **構造が複雑なセクションから順に**実装（1 セクションずつ照合）
7. `fidelity-checklist.md` で最終確認（構造・文言）
8. `generation-report.md` を出力（必須成果物）
9. **VRT 初回計測**（`vrt:diff-reference` / `vrt:section-diff`）
10. **VRT 修正ループ**（最大 3 回、フルページ不一致率 **25% 以下**を目標）→ `vrt-correction-report.md`

### 2.3 補助ドキュメント（資産化されている知見）

| ファイル | 内容 |
|---------|------|
| `visual-signals.md` | 画像から読む信号カテゴリ（背景・写真枚数・列数・テキスト整列・スクリム有無・接続装飾 等） |
| `pattern-catalog.md` | 17 種類の UI パターン（`text-flow`, `ui-stack`, `inline-row`, `tag-list`, `equal-columns`, `fluid-card-grid`, `2col-switch`, `media-with-content`, `media-frame`, `centered-block`, `fixed-tile`, `complex-grid`, `decorative-box`, `atomic-*`, `semantic-only`） |
| `primitive-mapping.md` | パターン → Lism プリミティブ（`l--*`）対応表 |
| `confusion-pairs.md` | 「似た見た目だが構造が違う」混同ペア 10 種（CP-01〜CP-10） |
| `disambiguation.md` | カラム系プリミティブの迷い判定木 |
| `fidelity-checklist.md` | 構造・文言・VRT の最終チェック |
| `pixel-fidelity.md` | アセット使用ルール・トークン方針 A/C・2 フェーズ生成 |
| `vrt-correction-loop.md` | VRT 修正ループの手順 |
| `design-inventory-template.md` / `generation-report-template.md` / `vrt-correction-report-template.md` | 成果物テンプレート |

### 2.4 重要な原則（Skill 内で繰り返されているもの）

- **よくある LP テンプレートに当てはめない**（推測でセクション構成を埋めない）
- **ナビ・見出しは画像から原文転記**（推測で別名にしない）
- **ページ一括生成を避ける**（複雑なセクションから 1 つずつ）
- **写真はリポジトリ内の `fixtures/.../assets/`** を使う（Unsplash 等の外部 URL は禁止）
- **画像ありセクションは 2 フェーズ必須**（HTML 骨格 → CSS 調整 → セクション VRT）

---

## 3. `layout-first-to-lism-css-guide` の要点

### 3.1 思想

> `screenshot-to-lism-css-guide` の課題は**レイアウト骨格の再現不足**。
> LLM のレイアウト推測より先に、スクリーンショットを**スクリプトで機械計測**し、その数値を実装の契約（`layout-spec.json`）として扱う。
> 「計測 → グレーボックス骨格 → IoU ゲート → Lism リファクタ → 中身充填」の順で進める。

### 3.2 ワークフロー（必須フロー、抜粋）

0. 入力スクリーンショットの枚数・幅を確認（1 枚なら responsive 方針 A/B をユーザーに確認）
1. `npm run layout:measure` → overlay 目視 → `layout-spec.json` を補正
2. **グレーボックス骨格 HTML**（`data-block` 付与、Lism クラス・文言・写真ゼロ）
3. `npm run layout:iou` → **全セクション IoU ≥ 0.9** まで修正（**骨格ゲート**）
4. （複数幅入力時）各幅で 2〜3 を繰り返す
5. **Lism プリミティブへリファクタ** → `layout:iou` 再実行（劣化なし）
6. **文言転記・アセット差し込み**（`screenshot-to-lism-css-guide` のテンプレートを流用）
7. **pixel VRT 修正ループ**（`screenshot-to-lism-css-guide` の手順を流用）
8. `skeleton-report.md` を出力（IoU 履歴・最終 VRT 指標）

### 3.3 設計の特徴

- **計測の機械化:** スクリーンショットから `layout-spec.json`（セクション Y 座標・コンテンツ幅・任意で内部ブロック矩形）を生成
- **IoU ゲート:** `data-block` 要素の矩形と spec の矩形を比較し、**IoU 0.9 以上**を骨格合格基準とする
- **段階的リッチ化:** グレーボックス → Lism → 中身、各段階で IoU 維持を検証
- **責務分担:** パターン分類・文言転記・VRT 修正ループは `screenshot-to-lism-css-guide` の資産を再利用

---

## 4. 既知の課題と教訓（最重要）

両スキルともに、**Interior LP での再現性は目標未達**で、原因が `docs/09-layout-first-issues-and-improvements.md` 等で詳細に棚卸しされている。

### 4.1 数値結果（フルページ不一致率、1280px、25% 以下が目標）

| スキル経路 | 不一致率 |
|-----------|---------|
| `lism-css-guide` のみ × スクリーンショット | 35.78% |
| `screenshot-to-lism-css-guide` v1 | 35.36% |
| `screenshot-to-lism-css-guide` v2（VRT 修正ループ 3 回） | **29.81%** |
| `layout-first-to-lism-css-guide` | 30.31%（IoU は 1.0 で合格） |

→ **どの経路も 25% 未達**。VRT 修正ループを 3 回回しても v2 は 29.81% で頭打ち。

### 4.2 `screenshot-to-lism-css-guide` で観測された主因

`docs/02-screenshot-to-lism-fidelity-discussion.md` より要約。Lism 文法ミスではなく **画像→構造の読み取り** が主要因。

| 観点 | デザイン | 生成物 |
|------|---------|--------|
| **Hero** | 薄いグレー背景＋中央に3枚の重なり写真＋セリフ見出し | 全面背景写真＋暗いオーバーレイ（**別パターン**） |
| **見出しフォント** | セクション見出しはセリフ体 | サンセリフのみ |
| **ナビ文言** | Mission / Features / Service / Flow / FAQ | 別名・別構成 |
| **Step** | 左右交互の大きな写真＋中央の矢印 | 左に縦長1枚＋右にリスト形式（簡略化） |

つまり、補助ドキュメントが充実していても **LLM は「よくある LP テンプレート」に当てはめてしまう**。

### 4.3 `layout-first-to-lism-css-guide` で観測された主因

`docs/09-layout-first-issues-and-improvements.md` より。**IoU 1.0 で合格しているのに、デザインと大きく乖離**する事象が起きた。

| # | 問題 | 内容 |
|---|------|------|
| **A** | **ゲートのトートロジー** | 既定の `--blocks sections` は「全幅 × Y 帯」しか検証しない。spec の値を実装に**インライン直書き**すれば必ず IoU 1.0 になり、**セクション内部のレイアウトは一切検証されない** |
| B | `npm run layout:iou` が常に `--selftest` を付与し `--url` を無視（spec の自己検証になっていた） |
| **C** | **グレーボックス工程の欠落** | `bootstrap-layout-first-page.mjs` が既存ページの HTML を流用し、文言・写真ゼロのグレーボックスを作っていない（v1 の誤った構造をそのまま継承） |
| D | 内部ブロック計測（`--blocks all`）が均一グリッド検出で、デザインの意味的レイアウトと対応しない |
| E | セクション境界 prior が生成ページ由来（デザインそのものの計測ではない） |
| F | 内容（文言）の照合工程がない |

→ **「IoU 合格」と「レイアウト不一致」が両立する**構造的欠陥。

### 4.4 横断的な教訓

1. **構造の誤認は補助ドキュメントだけでは直らない** — Hero を「コラージュ型」と認識できなければ、どれだけ Lism 知識を増やしても見た目は別物になる
2. **検証の指標選びが致命的** — 検証範囲が狭い指標（セクション帯 IoU だけ等）はゲートとして機能しない
3. **既存資産の流用が落とし穴** — v2 を流用して layout-first に持ち込んだ結果、v2 の誤りを継承
4. **数値合格 ≠ デザイン再現** — IoU・不一致率は必要条件であって十分条件ではない
5. **VRT 修正ループは効くが限界がある** — v1（35.36%）→ v2（29.81%）に改善するが、25% の壁を破れず

---

## 5. 既存プロンプトの使い方（`prompt.md`）

検証時はユーザーが次のようなプロンプトで Skill を呼び出していた。

### 5.1 `screenshot-to-lism-css-guide` × スクリーンショット v2 の例（要約）

```
次のスクリーンショットのデザインを、できる限り忠実に再現した HTML と CSS を生成してください。

入力画像: input/02-test/02_design.jpg
参照画像（VRT 用）: fixtures/interior-lp/reference.jpg

【screenshot-to-lism-css-guide】と【lism-css-guide】の両スキルを使用してください。
VRT 修正ループは screenshot-to-lism-css-guide の vrt-correction-loop.md に従うこと。

## 出力先
- ディレクトリ: test-page/02_screenshot-to-lism-css-guide_002template_screenshot_v2/
- ファイル: index.html, style.css
- セマンティックな HTML、各 <section> に id="{section-id}"

## 必須フロー（design-inventory 完成まで HTML/CSS を書かない）
1. 入力画像を上から下まで把握し、セクション境界をメモ
2. design-inventory.md を作成（テンプレートに沿う）
3. 初回生成はトークン方針 C、VRT 修正フェーズで方針 A を併用
4. measured-values.json の計測値を転記・調整

## 実装
5. 構造が複雑なセクションから 1 セクションずつ実装
6. 各セクション完了後、差分を箇条書きで報告
7. fidelity-checklist で構造・文言を最終確認
8. generation-report.md を出力

## VRT 修正フェーズ（必須）
9〜13. VRT 初回計測 → 修正ループ（最大 3 回）→ 報告ファイル更新
```

### 5.2 プロンプトに関する観察

- **必須成果物（`design-inventory.md`, `generation-report.md`, `vrt-correction-report.md`）が明示**されている
- **「〜まで HTML/CSS を書かない」という強い制約**を冒頭で宣言している
- **出力先ディレクトリ・命名規則**まで指定し、再生成時は v2/v3 とバージョン分け（上書き禁止）
- **VRT は別フェーズとして明示的に区切られている**

→ 強いプロンプトでも 25% の壁を破れなかった点が、本プロジェクトで再検討すべき部分。

---

## 6. 本プロジェクトに向けた示唆（ブレスト用の論点）

先行研究を踏まえた上で、本プロジェクトの設計を考えるときの論点。**結論ではなく検討項目**として記す（一部項目は [00-project-overview.md §3](./00-project-overview.md) で決着済み。決着済みの項目には注記を付す）。

### 6.1 「主因は画像→構造の読み取り」をどう攻めるか

- 補助ドキュメント（pattern-catalog, confusion-pairs 等）を充実させるアプローチは試されたが、**Hero の構造誤認は防げなかった**
- 別軸として：
  - 機械計測（layout-first）— ただし内部ブロック検出の精度が課題
  - セクション単位の段階的確認（複雑セクションから順に、ユーザー確認を挟む）
  - 「テンプレート想起の禁止」をシステムプロンプトレベルで強制
  - スクリーンショットを **複数の解像度・拡大領域**に分割して逐次入力

### 6.2 出力先の前提（Lism CSS かどうか） **[2026-07-03 決着]**

- 先行研究は **Lism CSS への準拠**が前提（プリミティブ選定・トークン照合）
- 本プロジェクトでは検討の結果、**Lism CSS を出力先**に確定した（[00-project-overview.md §3.3](./00-project-overview.md#33-lism-css-guide-の補助スキルとして-lism-css-出力を前提とする2026-07-03)）
- 「Lism 側の問題」と「画像 → 構造読み取り側の問題」の切り分けは、**`lism-css-guide` に Lism 実装ルールを完全に委譲する**（本 Skill は Lism 記法の詳細を持たない）ことで担保する

### 6.3 検証指標（ゲート）の設計

- **IoU だけ**では layout-first のようにトートロジーに陥る
- **pixel diff だけ**では構造ミスを「全体的に少し違う」としか拾えない
- 候補：
  - セクション単位の構造一致（DOM ツリー比較・要素種別/位置/数）
  - セクション単位 + ブロック単位の二段 IoU（**spec 値の直書き禁止**ルールとセットで）
  - 文言一致率（OCR ベース or 入力画像から OCR してインベントリと突合）
  - VRT を必須ではなく**早期失敗フィードバック**として軽量に回す

### 6.4 工程の分割粒度

- 先行研究は「インベントリ → 実装 → VRT」の 3 段
- もっと細かい段（例: セクション境界推定 → ナビ/Hero 確定 → 1 セクションずつ反復）にしてユーザー確認を挟むほうが、構造ミスの早期検出に効くかもしれない
- 一方で **ユーザー負荷が上がる** → 自動化と人手の境界をどこに引くか

### 6.5 既存資産の継承範囲

先行研究には流用価値が高い資産がある：

| 資産 | 流用候補 |
|------|---------|
| `pattern-catalog.md` の 17 UI パターン定義 | 出力先が変わっても UI パターンの語彙は再利用可 |
| `confusion-pairs.md` の混同ペア | 同上、汎用的な視覚的注意点 |
| `visual-signals.md` の信号カテゴリ | 同上 |
| `fidelity-checklist.md` の構造チェック | 出力先非依存にリライト可能 |
| VRT 修正ループの考え方 | 検証指標を差し替えれば流用可 |
| `design-inventory` テンプレート | 形式はそのまま流用可 |

ただし **Lism プリミティブ前提の対応表（`primitive-mapping.md` 等）** は出力先が変わると作り直し。

---

## 7. 参照すべきファイル一覧（先行研究側）

本プロジェクトを進める上で参照する元ファイル。

### 7.1 Skill 本体

- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/SKILL.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/visual-signals.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/pattern-catalog.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/primitive-mapping.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/confusion-pairs.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/fidelity-checklist.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/pixel-fidelity.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/screenshot-to-lism-css-guide/vrt-correction-loop.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/layout-first-to-lism-css-guide/SKILL.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/layout-first-to-lism-css-guide/layout-spec-guide.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/layout-first-to-lism-css-guide/skeleton-rules.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/layout-first-to-lism-css-guide/lism-refactor-guide.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/.cursor/skills/layout-first-to-lism-css-guide/responsive-policy.md`

### 7.2 プロンプト・検証結果

- `/Users/daisuke/Works/git/figma-mcp-investigation/prompt.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/output/02-test/vrt-report.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/docs/02-screenshot-to-lism-fidelity-discussion.md`
- `/Users/daisuke/Works/git/figma-mcp-investigation/docs/09-layout-first-issues-and-improvements.md`

### 7.3 検証案件

- 入力: `/Users/daisuke/Works/git/figma-mcp-investigation/input/02-test/02_design.jpg`
- 参照: `/Users/daisuke/Works/git/figma-mcp-investigation/fixtures/interior-lp/reference.jpg`
- 元ページ: https://templates.lism-css.com/lp-astro/interior/

---

*作成: 2026-06-21（先行研究の整理）。本プロジェクトの設計検討と並行して随時更新する。*
