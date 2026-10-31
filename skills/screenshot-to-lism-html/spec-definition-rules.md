# Specification Definition Rules（抽象 DOM ツリーと見えない仕様の策定ルール）

LLM（VLM）がセクション画像を読み取り、Lism CSS で実装する**前に**、必ず本ドキュメントのルールに従って「抽象 DOM ツリー（Design Inventory）」と「仕様（Spec）」を策定してください。
**このフェーズで直接 HTML/CSS を記述することは固く禁じられています。**

> Lism CSS の記法・命名・トークン値の詳細は `lism-css-guide`（`tokens.md` / `naming.md` / `primitive-class.md` など）に委譲します。本ドキュメントは「画像から何を、どういう形で抜き出すか」に集中します。

## 1. 全体仕様の抽出（Global Specifications）

画像全体（または提供された各セクション画像）から、以下の共通仕様を推測・抽出します。**トークンへの丸め込みはこのフェーズでは行わず、まず画像からの生の値を書き出す**のがポイントです（Phase 3 でトークン照合の判断をユーザーと合意します）。

- **カラーパレット（Color Palette）**
  - `primary`, `secondary`, `text`, `background`, `border`, `accent` などの役割ごとに HEX / RGB を推測。
  - 記述例: `primary: #3498db（推測）`。
  - Phase 3 の実装時に、Lism の `--base` / `--base-2` / `--text` / `--accent` / `--keycolor` などのカラートークン（実在するトークン名は `lism-css-guide/tokens.md` のセマンティックカラー表を参照。`--base-3` や `--accent-2` のような連番トークンは存在しない）へマッピング／上書きを検討します。
- **タイポグラフィ（Typography）**
  - 見出し（Heading）と本文（Body）のフォントファミリー分類（sans-serif / serif / monospace / 日本語明朝 / 日本語ゴシック 等）。
  - 見出しレベルごとの `font-size` の推測値（px）と、行間（`line-height`）。
  - Phase 3 で Lism の `--fz--*` トークンへの照合を行います。
- **スペーシング（Spacing）**
  - セクション間の余白（section padding）、要素間の標準的な間隔（例: `16px` / `24px`）の推測値。
  - Phase 3 で `--s*` トークン（`lism-css-guide/tokens.md`）への照合を行います。
- **コンテンツ幅**
  - 中央コンテンツエリアの最大幅の推測値（px）。Phase 3 で `--sz--*` / `-max-sz:*`（`lism-css-guide/property-class/max-sz.md`）にマッピング。

## 2. 見えない仕様の言語化（Invisible Specifications）

静止画のスクリーンショットには現れない「動的な振る舞い」や「デバイス別の振る舞い」を、ヒューリスティクスに基づいて言語化します。

- **ホバーエフェクト（Hover Effects）**
  - ボタン（`button` / `Button`）、リンク（`a`）、クリッカブルなカード（`BoxLink`）に対して、ホバー時の視覚変化を明記します。
  - 推測ルール（実装は Lism の `-hov:*` 系 Property Class。詳細 `lism-css-guide/property-class/hov.md`）：
    - ソリッドカラーのボタン → `brightness(0.9)` または `opacity: 0.8` 相当で暗く／薄く。
    - アウトラインボタン → 背景色を塗りつぶし、文字色を反転。
    - リンク付きカード → 影を濃くする、または `translateY(-4px)` で浮かす。
- **レスポンシブ挙動（Responsive Behavior）**
  - `pattern-catalog.md` のマッピングに従い、モバイル画面幅（例: `< 768px`）でどう変化するかを明記します。実装は Lism の Property Class の `_{bp}` サフィックスや各プリミティブの Props を利用（`lism-css-guide/responsive.md`）。
  - 例:「このセクションは `equal-columns (3 列)` パターンで `l--columns` にマップする。SP では `l--stack` 相当（1 列）に切替」

## 3. 抽象 DOM ツリーの構築（Abstract DOM Tree）

各セクション画像について、以下の JSON（または同等の構造化された Markdown）形式でレイアウト構造を記述します。
この構造は、後続の実装フェーズにおける **「絶対の契約」** となります。推測で不要な要素を足したり、引いたりしないでください。

### 記述フォーマット（JSON 例）

```json
{
  "section": "Hero",
  "layout_pattern": "absolute-overlay",
  "lism_primitive": "l--frame + is--layer",
  "background": {
    "type": "image",
    "note": "全面背景写真 + rgba(0,0,0,0.4) のオーバーレイ",
    "confidence": "high"
  },
  "content_pattern": "center",
  "content_primitive": "l--center",
  "elements": [
    {
      "type": "heading",
      "level": "h1",
      "text": "画像から正確に転記した見出し",
      "font_family_guess": "serif",
      "font_size_guess_px": 48,
      "color_guess": "#ffffff"
    },
    {
      "type": "paragraph",
      "text": "画像から正確に転記した本文",
      "font_family_guess": "sans-serif",
      "color_guess": "rgba(255,255,255,0.8)"
    },
    {
      "type": "button",
      "text": "詳しく見る",
      "variant": "solid-primary",
      "hover": "brightness(0.9)",
      "lism_target": "@lism-css/ui Button（variant=solid）"
    },
    {
      "type": "equal-columns",
      "cols": 3,
      "cols_mobile": 1,
      "lism_primitive": "l--columns",
      "items": [
        { "type": "card", "content": "..." },
        { "type": "card", "content": "..." },
        { "type": "card", "content": "..." }
      ]
    }
  ]
}
```

### 注意事項

- **画像からの正確な転記**: 見出し・本文・ナビ・ボタン・リンクのテキストは、画像から正確に OCR 転記します。「Lorem ipsum」等のダミーに置き換えない。読み取れない箇所は `"__UNREADABLE__"` としてマークし、ユーザーに確認する。
- **パターンの厳守**: `layout_pattern` および要素の `type` は、必ず `pattern-catalog.md` で定義された名称を使用。Lism プリミティブへのマッピングも `pattern-catalog.md` の右列に従う。
- **幻覚（ハルシネーション）の防止**: 画像に存在しないナビゲーション項目、フッターリンク、SNS アイコン等を勝手に追加しない。画像に見えるものだけを構造化する。
- **「典型 LP テンプレへの丸め込み」の抑止**: `pattern-catalog.md` §3「典型 LP テンプレに丸めやすい要注意パターン」に該当する疑いがある場合、必ず**画像を再観察し**、「写真は何枚か」「重なっているか」「カード数は何枚か」等を明示的にツリーに書き残す。
- **Lism 用の付加情報**: 各要素に `lism_primitive` / `lism_target` フィールドを添えて、Phase 2 でのマークアップ変換をトレース可能にする。マッピングは `pattern-catalog.md` に従う。
