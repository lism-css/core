# docs — 関連ドキュメント一覧

`screenshot-to-lism-html` Skill（[../SKILL.md](../SKILL.md)）に関連するプロジェクト背景・設計検討・使い方をまとめたドキュメント群のインデックスです。

> Skill 本体（ワークフロー・ルール類）は 1 階層上に配置しています。Lism CSS 自体の記法・命名・トークン等は [`lism-css-guide`](https://github.com/lism-css/lism-css/tree/main/skills/lism-css-guide) に委譲しています。

> **本 docs 配下のドキュメント内で言及される `input/`、`output/` 配下のパスについての注記**: これらは lism-css リポジトリへの反映前の検証で使用していた入力・出力ディレクトリを指しており、本リポジトリには含まれていません。同様に、`figma-mcp-investigation` など統合前の別プロジェクト側の絶対パス／相対パスへの言及も、本リポジトリには含まれていません。

---

## ドキュメント一覧

| # | ファイル | 概要 |
|---|---------|------|
| 00 | [00-project-overview.md](./00-project-overview.md) | **プロジェクト概要**。目的・スコープ・主要な決定事項（時系列）・ブレスト記録・未決事項をまとめた中心ドキュメント。`lism-css-guide` の補助スキルとしての位置づけと Lism CSS 出力への方針決定（§3.3）を含む |
| 01 | [01-prior-research-summary.md](./01-prior-research-summary.md) | **先行研究の概要**。`figma-mcp-investigation` プロジェクトの `screenshot-to-lism-css-guide` / `layout-first-to-lism-css-guide` の思想・ワークフロー・観測された課題・数値結果・教訓を、本プロジェクトの設計検討に必要な範囲で抽出したメモ |
| 02 | [02-llm-skill-approach-proposal.md](./02-llm-skill-approach-proposal.md) | **アプローチ提案**。スクリーンショットから Lism CSS ベースの HTML を忠実に生成するために有効そうな手法（セクション分割・抽象 DOM ツリー・Visual Critique・パターンカタログへのレスポンシブ振る舞い定義など）を提案 |
| 03 | [03-usage-prompt-examples.md](./03-usage-prompt-examples.md) | **プロンプト例集**。本 Skill を呼び出すときのユーザー側プロンプトのサンプル。基本形・詳細指定・手動介入／リカバリ（自動分割失敗時・Visual Critique のみ・Phase 3 再開）と、ハルシネーション時の軌道修正 Tips |
| 04 | [04-how-it-works.md](./04-how-it-works.md) | **仕組みと手順の解説**（デザイナー・ディレクター・エンジニア向け）。なぜ一発生成しないのか、Phase 0〜4 の各ステップが何をしているのか、利用メリット、非エンジニア視点での関わり方を Mermaid 図付きで説明 |
| 05 | [05-validation-2026-07-03-findings.md](./05-validation-2026-07-03-findings.md) | **検証振り返り（2026-07-03）**。Lism CSS 補助スキル化直後の初回通し検証で発生した問題を時系列で整理。対応済み修正（`capture_preview.js` の撮影方式変更・Property Class 命名正規化）と、未解決の Skill 改善課題（Phase 0 精度・Property Class 実在確認・CDN 版限界の明示ほか）を共有 |
| 06 | [06-baseline-without-subskill-2026-07-04.md](./06-baseline-without-subskill-2026-07-04.md) | **対照検証（2026-07-04）**。補助スキルを一切使わず `lism-css-guide` のみで同じ入力から HTML/CSS を再生成した結果。05 findings §3.2〜3.5 が補助スキル固有ではなく素の状態でも必ず踏む構造的問題であることを裏付け、優先度付き改善提案（P0〜P5）として整理 |

---

## 読み進める順序の目安

- **本プロジェクトの全体像を掴みたい** → 00 → 04
- **Skill を使ってみたい** → 04 → 03 → [`../SKILL.md`](../SKILL.md)
- **設計の背景を理解したい** → 00 → 01 → 02
- **Skill 本体の中身を読みたい** → [`../SKILL.md`](../SKILL.md) → [`../pattern-catalog.md`](../pattern-catalog.md) → [`../spec-definition-rules.md`](../spec-definition-rules.md) → [`../generation-prompts.md`](../generation-prompts.md) → [`../visual-critique-loop.md`](../visual-critique-loop.md)
- **これから Skill 改善に手を入れたい** → 06 → 05 → 00 §5 → [`../SKILL.md`](../SKILL.md)

---

## 関連リンク

- Skill 本体: [../SKILL.md](../SKILL.md)
- ペアとなる公式スキル: [lism-css-guide](https://github.com/lism-css/lism-css/tree/main/skills/lism-css-guide)
- Lism CSS 公式サイト: https://lism-css.com/
