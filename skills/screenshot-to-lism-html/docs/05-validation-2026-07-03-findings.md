# 検証振り返り: 2026-07-03 サンプル LP 生成

- 実施日: 2026-07-03
- 検証対象: `screenshot-to-lism-html` Skill v0（Lism CSS 補助スキル化直後の初回検証）
- 入力: `input/sample-lp.png`（3024 × 19530px、LISM Life 架空 LP、8 論理セクション）
- 出力: `output/sample-lp-260703/`
- ペア: `lism-css-guide`（Lism CSS の記法・命名・トークンの権威）
- 生成レポート: `output/sample-lp-260703/generation-report.md`（本ファイルは所感と再現手順・改善提案に絞る）

> **本ドキュメントの目的**: 検証で発生した具体的な事象と、そこから得た改善提案をチームで共有し、Skill v0.1 以降の改善に反映するための振り返りメモ。時系列と原因分析を残すことを優先し、細かい成果物の説明は `generation-report.md` を参照する。

---

## 1. 経緯と全体所感

初めて全 8 セクションのランディングページで、`screenshot-to-lism-html` Skill を Phase 0 〜 Phase 4 まで通しで実行した。**構造（プリミティブへのマッピング → 骨格 HTML → セクション別スタイリング → プレビュー撮影）の流れ自体は破綻せず動いた**が、途中で `Phase 0 の自動分割精度` / `Property Class の実在確認不足` / `Phase 4 の撮影バグ` の 3 大課題が浮上し、それぞれ回避・修正で対応した。細部の忠実度（Hero の写真オーバーラップ、余白、タイポサイズなど）は原画と乖離しており、次回以降のブラッシュアップが必要。

数字ベースの成果は `generation-report.md` の「実行結果サマリ」を参照。

---

## 2. 検証中に発生・対応した問題（対応済み）

### 2.1 Phase 4: `capture_preview.js` が長大 LP で先頭 3 セクションを繰り返し描画

- **症状**: `page.screenshot({ fullPage: true })` で撮影したプレビューが、ページ下部で「Header + Hero + Mission + Point」を再度描画。DOM 上には該当要素が 1 個ずつしかないのに、画像には複数回出現する。
- **診断過程**（時系列）:
  1. HTML 直接目視・`grep -c` → HTML 側に重複無しを確認
  2. Puppeteer で `document.querySelectorAll('.hero__title').length` → 1 個であることを確認
  3. Hero 見出しを `DEBUG_HERO_TOP / UNIQUE_TITLE` に一時置換 → 「重複箇所」にも該当文字が現れることを確認 → 描画側で本当に再描画されている
  4. `filter: blur(4px)` (Contact 背景) を外す → 変化なし
  5. `.hero__title` の `position: absolute` を通常フローに変更 → 変化なし
  6. `.step-photo` の `position: sticky` を外す → 変化なし
  7. `.site-header` の `position: absolute` を通常フローに変更 → 変化なし
  8. `page.setViewport({height: 全ページ高さ})` で単一撮影 → 変化なし
  9. CDP `Page.captureScreenshot` に `captureBeyondViewport: true` → 変化なし（さらに `deviceScaleFactor` 未指定で 2x スケール問題も追加発生）
  10. `page.screenshot({ clip: {x, y, width, height} })` は `clip.y` がドキュメント相対と判明。スクロール後でも `y: 0` は常にページ先頭を指すためスクロールが無効化されていた
  11. スクロール → `page.screenshot()`（clip なし・fullPage: false）→ ビューポート内容を毎回取得 → sharp で stitch → **成功**
- **原因の結論**: Puppeteer の `fullPage: true` は長大ページ（今回は約 10,700 px）で内部的な描画キャッシュ／再描画の順序に起因する既知バグに当たる（同種の Issue が Chromium / puppeteer 側で断続的に報告されている）。CDP の `captureBeyondViewport` でも解消せず。
- **修正**（本セッション中に反映済み）: `scripts/capture_preview.js` を「1600px ずつスクロール → ビューポート撮影 → sharp で stitch」方式に書き換え。呼び出しインターフェース（`npm run capture -- <html> <output> [width]`）は据え置き。
- **予防**: `SKILL.md` の Phase 4 で参照する `visual-critique-loop.md` はスクリプト経由なので、Skill 側の記載変更は不要。ただし今回の学びとして「LP のプレビューは十分な高さで撮る必要がある」ことは Skill の暗黙の前提。将来ヘルパーを差し替える際にも segment 方式を維持すること。

### 2.2 Phase 2/3: LLM が創作した Property Class を大量使用

- **症状**: 初回実装で以下のような Property Class を疑いなく使用した結果、レスポンシブ・スペーシング・カラーの多くが CDN Lism CSS では効かなかった。
  - `-cols:3` `-cols:2`（`--cols` を設定するには inline style または build 時生成が必要）
  - `-fz:huge` `-fz:md` `-fz:lg`（正しくは `xl / l / m` のトークン。`huge` は存在しない）
  - `-c:muted` `-c:invert`（Lism のカラートークンには存在しない）
  - `-ta:c` `-ai:c` `-ai:s` `-jc:sb` `-jc:c`（正しくは `center / start / between`）
  - `-w:full`（正しくは `-w:100%` または `-w:fit`）
  - `-lh:heading`（Lism の `-lh` は `1 / base / l / s / xs` トークンのみ）
- **診断**: `lism-css/packages/lism-css/src/scss/_prop-config.gen.scss` を読み、実在するショートハンド名とトークンを一括確認した。追加で CDN 版 `main.css`（約 29 KB）をダウンロードして `grep -o '\.-[a-z]*\\\\:[a-z0-9]*'` で 308 種の Property Class を列挙し、CDN で出力される部分集合を特定した。
- **修正**（本セッション中に反映済み）:
  - `sed` で `-jc:sb` → `-jc:between`、`-ai:c` → `-ai:center`、`-ta:c` → `-ta:center`、`-ai:s` → `-ai:start` 等を一括正規化
  - `-cols:*` は CDN では出力されないため `style="--cols: 2"` のインラインに切り替え
  - CDN で存在しないもの（`-fz:huge` `-c:muted` `-c:invert` `-w:full` `-lh:heading` などの Skill 独自語彙）は `style.css` にフォールバック定義を追加
- **Skill 側で対応が必要な部分**: 次章「未解決の課題」§3.2 参照。

### 2.3 Phase 0: 自動分割スクリプトが 21 セクション検出（実際は 8）

- **症状**: `split_image.js` が 21 セクションを検出。多くが 401px 前後の細かい断片で、Point セクション内部の空白帯や Mission 3 サブブロックの連続領域を境界と誤検出。実際の論理セクションは 8。
- **対応**（本セッション中に反映済み）: 目視で境界を再判定し、`sections-manual/` に 8 セクションを手動再クロップして Phase 1 以降で利用。`split_image.js` の出力 `sections/` は参考としてそのまま残置。
- **Skill 側で対応が必要な部分**: §3.1 参照。

### 2.4 スクリーンショットの拡張子違い（`input/sample-lp.jpg` → 実体は `.png`）

- **症状**: プロンプト上の入力パスは `input/sample-lp.jpg` だったが、リポジトリ上の実体は `input/sample-lp.png` のみ。
- **対応**: 実体の `.png` を使用して続行。エラーではなくオペレーターの誤字として扱えたので支障なし。ドキュメンテーション上の記憶用に本項に残す。

---

## 3. 検証で見えた Skill の改善課題（未解決）

現時点で Skill 本体（`SKILL.md` ほか）または補助スクリプトに反映されていない改善課題。次回以降のブラッシュアップの起点にする。

### 3.1 Phase 0 自動分割の誤検出率が実用に耐えない

- **現状**: `split_image.js` は「行内カラー分散が一定以下」を境界とする単純ヒューリスティック。LP デザインでは Point の縦フロー空白、Mission 内 3 サブブロックの連続、Voice の余白などが同じ条件を満たしてしまい、誤検出が多い。
- **影響**: Phase 1 で正しいセクション画像を参照できず、フォールバックとして LLM が Y 座標を目測 → 手動クロップに時間を割く必要が出る。
- **改善提案**（優先度順）:
  1. 検出ロジックを「背景色の変化＋一定以上の空白幅」に強化し、閾値を LP サイズに応じて自動調整
  2. 検出後の LLM 側検査ステップを SKILL.md の Phase 0 に組み込む（「N セクション検出。妥当と思わないなら手動再分割を勧める」プロンプト）
  3. Phase 0 の主フローを「LLM が全体画像から Y 座標を推測 → スクリプトで正確クロップ」に切り替え、自動検出は補助扱いにする

### 3.2 Property Class の実在確認手段が Skill 側にない

- **現状**: `SKILL.md` は「Lism の記法・命名は `lism-css-guide` を参照」と誘導しているが、実際に使えるショートハンド名（例: `fz`, `g`, `p`, `ai`, `jc`, `ta`）と有効な値のリストを LLM が Phase 2〜3 のプリフライトで確認する仕組みが無い。
- **影響**: 今回のように LLM が創作した名前（`-fz:huge`, `-c:muted`, `-ta:c` など）が素通りしてしまい、Phase 3 後半で「クラスが効かない」大量の後戻りが発生する。
- **改善提案**:
  1. `lism-css-guide/property-class.md` に「よく使うショートハンド × 値」のクイックリファレンスを追加し、Phase 3 冒頭で必読とする
  2. または本 Skill の `pattern-catalog.md` § プリミティブ対応表の各行に「代表 Property Class の候補」を注記する
  3. Phase 3 のプリフライトチェックリストに「使う予定の Property Class を全列挙して `property-class.md` と突き合わせる」を明示ステップとして追加

### 3.3 CDN 版 Lism CSS には Property Class のごく一部しか含まれないことが明示されていない

- **現状**: `lism-css-guide/SKILL.md` は CDN 読み込みを案内している一方で、CDN の `main.css`（約 29 KB）には 308 種の Property Class しか含まれない。SCSS 定義には存在する `-cols:*` や中間値スペーシング（`-g:24` など）は build tool 経由でないと生成されない。
- **影響**: 「CDN で始める」フローを選ぶユーザーは、Skill が指示するクラスの多くが効かず、フォールバック CSS を大量に書くハメになる。
- **改善提案**:
  1. `SKILL.md` の Phase 3 冒頭で「build tool 経由か CDN 版か」をユーザーに明示確認するステップを追加
  2. CDN 版限定で使える Property Class のサブセット表を `lism-css-guide` 側にも用意し、CDN 経路のときはそちらを参照
  3. または本 Skill 出力に「build ありき前提」の但し書きを入れ、CDN での運用は非推奨扱いにする

### 3.4 SKILL.md の Phase 2 / Phase 3 分離が実運用に合わない

- **現状**: `SKILL.md` は Phase 2（Lism プリミティブのクラス名のみの骨格 HTML）と Phase 3（Property Class + カスタム CSS）を明確に分離するよう指示。
- **観察**: 実際に LLM が動かすと、8 セクションを 2 パスで書き直すのはコンテキスト効率が悪く、1 パスで一気に書きたい欲求が強い。今回も生成レポートに「Phase 2/3 を 1 パスに結合」と明記して実施した。
- **改善提案**:
  1. `SKILL.md` に「Phase 2/3 は独立フェーズに分離するのが望ましいが、コンテキスト効率を優先する場合は 1 パス実装も許容。ただしその場合でも Property Class の実在確認とトークン照合は Phase 3 の手順を漏らさず実施」と現実的な運用指針を追記
  2. または「1 パス実装用の統合プロンプト」を `generation-prompts.md` に追加し、正規のフローとして位置づける

### 3.5 Phase 3 のトークン照合ユーザー確認（A/B/C）のフローが会話破綻を招く

- **現状**: `SKILL.md` の Phase 3 は色・スペーシング・タイポの差分をユーザー確認（A: px 直書き / B: 最寄りトークン / C: 基準値上書き）することを義務化。
- **観察**: LP 規模の実装で毎回全項目に対して 3 択を問うと会話が長大化する。今回は方針確認をスキップした（レポートに明記済み）。
- **改善提案**:
  1. Phase 3 冒頭で「グローバル方針」を 1 回だけ確認（例: 「B（最寄りトークン優先）でよいですか？」）
  2. 主要な数値（見出し fz、本文 fz、セクション余白、カード padding、カラー主要 3 色）だけ個別確認、その他は方針に沿って自動適用
  3. 方針確認は skill 側に UI/対話テンプレートとして書き置く

### 3.6 Phase 1 の `design-inventory.json` 形式が固定されていない

- **現状**: `spec-definition-rules.md` に JSON 例はあるが、必須フィールド／任意フィールドの区分と Phase 2 実装との紐付けが明文化されていない。
- **観察**: 今回は「`lism_primitive` フィールドを各要素に付けて Phase 2 を書き下しやすくする」独自拡張をして無事機能したが、他 LLM 実行時にこのフィールド名が保証されない。
- **改善提案**: `spec-definition-rules.md` に「必須フィールド一覧」（section id / pattern / lism_primitive / elements[].text）と「推奨フィールド」を分離して定義し、後段の実装で確実に参照できるようにする。

---

## 4. その他、今後改善の余地がありそうなこと

### 4.1 画像アセットの取り扱いが未整備

- 今回は本文重視のためすべてのメディアを灰色プレースホルダ（縞パターン）で置いた。実運用では原画から個別セクションの写真を切り出して `output/.../assets/` に格納する Phase が必要。
- 先行研究の `pixel-fidelity.md` に「アセットはリポジトリ内 `fixtures/.../assets/` を使う」ルールがあるが、本 Skill には未継承。
- 改善提案: Phase 3 の前段に「写真アセット切り出し」フェーズを追加し、`sections-manual/` から写真領域のみをさらに切り出すヘルパースクリプトを追加する。

### 4.2 Hero の「写真の上に文字がオーバーラップ」構造が定型化されていない

- 原画は Hero の白抜きタイトルが写真の上端に半分乗る構図。今回の生成物は縦積み（タイトル上 → 写真下）に劣化した。
- `pattern-catalog.md` の `absolute-overlay` パターン説明にはあるが、実装 HTML の雛形（Lism プリミティブ側で `l--frame + is--layer` をどう組むか）まで踏み込んで示すと再現度が上がる。
- 改善提案: `pattern-catalog.md` の Hero 系パターンに「Lism 実装スニペット」の追加。

### 4.3 生成レポートのテンプレートが未整備

- 今回の `generation-report.md` は自由記述で書いた。先行研究にはテンプレートがあったが、本 Skill には未整備。
- 改善提案: `docs/` または Skill 直下に `generation-report-template.md` を用意し、Phase 4 の直前にコピー→穴埋めする運用にする。

### 4.4 `visual-critique-loop.md` の指示が抽象的

- 「間違い探し」の観点は列挙されているが、Lism 補助スキル化に伴い「トークン外れ」「Property Class 誤用」「プリミティブ選定ミス」も指摘対象に入るべき。
- 改善提案: 差分レポートのチェック項目に「Lism 特有の観点」を独立セクションとして追加。

### 4.5 Phase 0 で `sections/` と `sections-manual/` の 2 系統が並存し得るが、後段の参照先が SKILL.md に明示されていない

- 今回は暗黙的に `sections-manual/` を Phase 1 の入力にした。SKILL.md にも `spec-definition-rules.md` にも参照先ディレクトリの決定ルールが書かれていない。
- 改善提案: Phase 0 の指示に「自動分割が妥当な場合は `sections/`、手動再分割した場合は `sections-manual/` を Phase 1 の入力とする」旨を明記。

### 4.6 スクリプトの実行時 CWD 依存

- `npm run capture -- ...` を `.cursor/skills/screenshot-to-lism-html/scripts/` から実行する前提で SKILL.md にコマンドが記載されている。プロジェクトルートから呼びたいケースが多いのに、そのケースの案内が無い。
- 改善提案: リポジトリルートに `package.json` のワークスペースを設定するか、SKILL.md にルートからの呼び出し例を追加。

### 4.7 プレビュー撮影の幅パラメータの妥当性

- 現行のデフォルト幅は 1280px（先行研究由来）。今回のデザインは 1440〜1512px 想定に見え、1280 で撮影すると本来の余白と食い違う可能性がある。
- 改善提案: `SKILL.md` の Phase 4 に「デザインの意図している幅を Phase 1 で必ず記録し、Phase 4 の撮影幅と一致させる」を追記。

---

## 5. 次回検証で優先して確認したい項目

1. **§2.1 の撮影修正が別 LP でも安定して動くか**（回帰確認）
2. **§3.1 の Phase 0 精度改善**（別解像度・別レイアウトの LP で誤検出率の変化を測る）
3. **§3.2 の Property Class クイックリファレンス**を追加した上での再実装で、フォールバック CSS の分量がどれだけ減るか

---

## 6. 関連ファイル

- 参照した Lism CSS 実装: `packages/lism-css/src/scss/_prop-config.gen.scss`（Property Class 全定義）／CDN `https://cdn.jsdelivr.net/npm/lism-css@0/dist/css/main.css`（実配布分）
