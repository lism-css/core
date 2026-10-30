基準日: 2026-09-03・コミット105422df

# Lismスキル群 解説

Lism CSSが配布するAIエージェント向けskillについて、何ができるか・どう導入するか・内部の処理の流れを整理した運営者向けメモ。ルールの正典は各`skills/{name}/SKILL.md`で、この文書は要約だけを持つ。


## 配布しているskill

実体は`skills/{name}`配下。配信対象は`packages/lism-cli/src/constants.ts`の`SKILL_NAMES`で管理する。

| skill | 役割 | 起動する場面 |
| --- | --- | --- |
| `lism-css-guide` | 新規実装・UI作成・ページ作成・コンポーネント作成の前向き作業 | 要件・デザインからコードを書くとき |
| `lism-css-refactor` | 既存コードの監査・整理・リファクタの後ろ向き作業 | ユーザーがリファクタ・監査・整理を明示したとき |
| `lism-mockup-guide` | `@lism-css/mockup`のデータディレクトリとして画面モックアップを組む作業 | `lism-mockup`でモックアップを作成・修正するとき |

知識の正典は常に`lism-css-guide`側に置く。`lism-css-refactor`と`lism-mockup-guide`はtoken値やPrimitive選定などの一般知識を持たず、判断に迷ったら同階層の`lism-css-guide`へrouteする。両skillのSKILL.md冒頭に「`lism-css-guide`が同じ階層に入っていることを前提にする」と明記している。`lism-mockup-guide`はさらに、モックアップのデータ契約（ファイル構成・スキーマ・import規則）の正典を`lism-mockup init`が生成する契約説明書（`packages/mockup/templates/README.md`）に置き、skill本文は要約とワークフローに徹する。


## 導入

### `lism-cli skill`

配布元は`lism-cli`（binは`lism-cli`のみ。`lism`というbinは無い）。

```bash
pnpm dlx lism-cli skill add                    # 対話モード。マーカーから使用中ツールを自動検出し、選択式で導入先を決める
pnpm dlx lism-cli skill add lism-css-guide     # skill名を指定（未指定なら全skill）
pnpm dlx lism-cli skill add --claude --cursor  # 導入先ツールを明示
pnpm dlx lism-cli skill check --verbose        # 既存配置との差分確認
pnpm dlx lism-cli skill update --claude        # 配置済みskillを最新版へ上書き
```

| サブコマンド | 引数 | オプション |
| --- | --- | --- |
| `skill add [skill]` | skill名（省略時は全skill、未知の名前はエラー） | `-o, --overwrite`、`--ref <ref>`、ツールフラグ（`--all`含む） |
| `skill check` | なし（配置済み全件が対象） | `--ref <ref>`、`-v, --verbose` |
| `skill update` | なし（全skillが対象） | `--ref <ref>`、ツールフラグ（`--all`含む） |

ツールフラグと配置先・自動検出マーカー（`packages/lism-cli/src/commands/skill/paths.ts`の`SKILL_PATHS`）:

| ツールフラグ | 配置先 | 自動検出マーカー |
| --- | --- | --- |
| `--claude` | `.claude/skills/<skill>` | `.claude` |
| `--codex` | `.agents/skills/<skill>` | `.agents`, `.codex` |
| `--cursor` | `.cursor/skills/<skill>` | `.cursor` |
| `--windsurf` | `.windsurf/skills/<skill>` | `.windsurf` |
| `--cline` | `.cline/skills/<skill>` | `.cline` |
| `--copilot` | `.github/skills/<skill>` | `.github/copilot-instructions.md`, `.github/copilot` |
| `--gemini` | `.gemini/skills/<skill>` | `.gemini` |
| `--junie` | `.junie/skills/<skill>` | `.junie` |

- `skill add`でツールフラグを1つも指定しないと、マーカーから検出したツールを初期選択にした対話式チェックボックスで導入先を決める。
- `skill check`にツールフラグは無く、各`<配置先>/SKILL.md`が存在するものを配置済みとして全件見る。
- `--ref <ref>`で取得元のブランチ・タグ・コミットを変えられる。既定は常に`main`。挙動と制約は[cli-guide.md](./cli-guide.md)の「既定ref」を参照。

### skills.sh経由

`npx skills add lism-css/core`でも導入できる（トップレベル`README.md`の案内）。配信元は`lism-cli skill add`と同じ`skills/`配下。詳細は[Skillsドキュメント](https://lism-css.com/docs/skills/)。


## `lism-css-guide`の流れ

```txt
0. 実行レベル判定（不要/軽量/通常/値照合付き。迷っても上げない。デザイン再現かどうかで迷う時だけ値照合付き）
1. 初期確認（対象に関係する詳細ファイルを先に開く）
2. 目的別実装ガイドでPrimitive/コンポーネント候補を選定
3. 実装前チェック（C0–C8）→ 実装プラン作成（未確認判断には🔁を付ける）
4. 資料確認トリガーに従い、操作の直前に資料を読んで🔁を✅/⏸へ解消
5. ⏸が残る項目はユーザー確認
6. 実装
7. 提出前セルフチェックで実装プランと実装を照合（通常・値照合付きのみ）
```

- 実行レベル: 「不要」は機械的な基準（新規`c--*` / `b--*`・新規CSS宣言・未使用Primitive導入・新規レスポンシブ切替・トークン外の値のいずれも含まない）で判定し、手順6以外を行わず`.lism/`にファイルも作らない。「軽量」はプランを3〜5行に簡略化し、手順7を行わない。「通常」は新規セクション、または新規CSSを伴う新規部品。「値照合付き」（Figma / スクショ等のデザイン再現）はプランをチャットでなく`.lism/plan.md`に保存する。
- C0〜C8は構造・命名・状態・トークン・レスポンシブ・CSS / Props境界・Primitive既定値の確認。詳細と出力形式は`references/authoring.md`。
- 提出前セルフチェックは、プランと実装を1行ずつ照合して「計画変更（意図的） / 実装漏れ / 要確認」に分類し、プロセス照合・ルール照合・プラン再審査・個別確認を行う。サブエージェントが使える環境では、実装した本人でなく読み取り専用の評価サブエージェントに委任し、結果を`.lism/review.md`へ保存、違反ゼロまで修正→再評価を繰り返す。報告表には違反・要確認の行だけを載せ、違反ゼロなら照合した資料名の一覧と件数サマリだけでよい。


## `lism-css-refactor`の流れ

```txt
0. 範囲を決める（対象ファイル/コンポーネント/選択範囲を明示）
1. 読む（対象コード・周辺・利用箇所）
2. Pass1実行 → 洗い出し表を .lism/plan.md として保存
3. Pass2–9実行（洗い出し表の各行に判定を付与）
4. 修正案の差分を作る（この時点ではユーザーに未提示）
5. Pass10実行（提示前の見直し・再審査。評価サブエージェントへ委任可）
6. 修正案を提示する（⏸はここでユーザー確認）
7. 適用する（ユーザー許可後のみ）
8. 検証して報告する
```

`lism-css-guide`が無ければ`lism-cli skill add`での追加を案内し、推測だけでリファクタ判断を進めない。Pass10の結果は`.lism/review.md`へ保存し、違反ゼロまで修正→再評価を繰り返してから提示する。判定基準は`references/checklist.md`。

| Pass | 確認すること |
| --- | --- |
| 1 | 対象コードの洗い出し |
| 2 | 構造（div手組みをPrimitive / Traitへ置き換えられるか） |
| 3 | 重複（3箇所以上あるものをコンポーネント化できるか） |
| 4 | Property Class化（CSSに書いた装飾をProps / classへ移せるか） |
| 5 | token（px直書き・存在しない値がないか） |
| 6 | 状態・バリエーション（`is--`の誤用がないか） |
| 7 | 命名（class名がLismの命名規則に合うか） |
| 8 | レスポンシブ（固定Grid・container指定漏れ） |
| 9 | 既定値重複（Primitiveが元々持つ指定を重ねていないか） |
| 10 | 提示前の見直し（修正案が元の見た目・動きを壊していないか） |


## `lism-mockup-guide`の流れ

```txt
1. init（データディレクトリが無ければ npx @lism-css/mockup init から始める）
2. 契約確認（生成されたREADME.md＝契約説明書とサンプルページを読む）
3. 実装（ここからは lism-css-guide の実装フローに従う）
4. 自己検証（npx @lism-css/mockup check。非0のうちは完成と報告しない）
5. ブラウザ確認（devサーバーは常駐。バックグラウンド起動またはユーザー起動。目視はユーザーの役割）
6. 完了報告（checkはrender時エラーを検出しないため、目視確認の依頼を添える）
```

判定記号は定義せず、マークアップの判断はすべて`lism-css-guide`の記号・フローを使う。skill本文が持つのはデータ契約の要約（ページID規則・`mockup.config.json` / `tokens.json`スキーマ・import許可リスト・`check`の保証範囲）だけ。


## 判定記号（skill間の違い）

同じ記号でも`lism-css-guide`と`lism-css-refactor`で意味と使える記号が異なる。両skillとも、表にない記号や注記の組み合わせの自作を禁止し、該当行は未確定 / 未通過として扱う。

| 記号 | guide | refactor |
| --- | --- | --- |
| ✅ | 確定。新規定義や合意済み例外は`✅新規`・`✅例外`・`✅前提`と注記する | 触らない（問題ない / 対象外） |
| 🔁 | 資料確認トリガー該当。資料を読んで✅ / ⏸へ解消するまでコードへ反映しない | （使わない） |
| ⏸ | 要ユーザー確認。確認まで実装しない | 要ユーザー確認（px丸め・色推測・挙動変更・外部依存など） |
| 🔧 | （使わない） | 修正する |
| ⬜ | （使わない） | 意図的に残す（合意済み例外・独自意図が明確） |

- `✅例外`は`antipatterns.md`の「直書きしてよい例外」に該当する場合だけで、根拠の引用が必須。
- 自律実行などでユーザー確認が取れない場合は、原則準拠側の既定動作を選び、`✅前提`で前提を明示して進める。


## CLI内部の流れ

### `skill add`（`commands/skill/add.ts`）

```txt
positional引数からskill対象を解決（未指定なら SKILL_NAMES 全件）
  → ツールフラグから導入先を解決（未指定ならマーカー自動検出 + 対話選択）
  → skillごとに giget で github:lism-css/core/skills/{name}#{ref} を一時ディレクトリへ取得（1回のみ）
  → 選択された各ツール配置先ごとに、既存ディレクトリとsha256で差分比較
  → 差分が無ければスキップ、あれば（--overwrite未指定時は）差分サマリ表示 → 上書き確認
  → コピー
  → 一時ディレクトリ削除
```

差分は`commands/skill/skillSource.ts`の`compareSkillDirs`がファイル単位のsha256で判定し、unchanged（一致）/ modified（内容が違う）/ added（リモートのみ）/ localOnly（ローカルのみ。旧ファイルかユーザー独自ファイル）に分類する。

### `skill check`（`commands/skill/check.ts`）

```txt
SKILL_NAMES × ALL_SKILL_TOOLS の全組から、配置先に SKILL.md があるものだけを「配置済み」として収集
  → skillごとにリモートを1度だけ取得
  → 配置済みの各ローカルディレクトリとファイル単位で比較
  → 差分サマリを表示（--verbose でファイル単位の詳細も表示）
```

配置済みが1件も無ければ、その旨を案内して終了する。

### `skill update`（`commands/skill/update.ts`）

`skillAddCommand(undefined, { ...options, overwrite: true })`を呼ぶだけの薄いラッパー。skill引数なし・`--overwrite`強制の`add`と同義で、登録済みの全skillを対象ツールへ強制上書きする。
