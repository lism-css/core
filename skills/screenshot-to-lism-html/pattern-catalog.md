# Pattern Catalog（画像パターン → Lism CSS プリミティブ マッピング）

このドキュメントは、**スクリーンショットから読み取ったレイアウトパターン**を、**Lism CSS のどのプリミティブ／トレイト／コンポーネントに落とすか**を示すマッピング表です。

- 画像を解析する際は、必ず本カタログのいずれかのパターンに分類してから、右列の Lism プリミティブへ置き換えます。
- 各プリミティブの Props・記法・レスポンシブ挙動の詳細は **`lism-css-guide` を必ず参照**してください（本ファイルには書きません）。
- 迷ったら `lism-css-guide/primitive-class.md` の「カラムレイアウト Primitive の使い分けガイド」と `lism-css-guide/antipatterns.md` の「レイアウト選択ミス」を確認します。

---

## 1. レイアウトパターン → Lism プリミティブ

| 画像パターン | 見た目の判定基準 | 対応する Lism プリミティブ／クラス | 補足 |
|-------------|-----------------|-----------------------------------|------|
| **container**（コンテンツ幅制限） | セクション内で左右に均等な余白があり、コンテンツ幅が一定 | `is--wrapper` / `<Wrapper>` | サイズは `contentSize` Prop（`-contentSize:s/m/l/xl`。詳細 `lism-css-guide/trait-class/is--wrapper.md`）。`is--container` はコンテナクエリの基準宣言で、幅制限はしない点に注意 |
| **stack**（縦積み） | 要素が縦方向に等間隔で並ぶ | `l--stack` / `<Stack>` | `gap` は Lism の spacing トークンに寄せる |
| **inline-row / cluster**（横並び・折返し可） | タグ列・ナビリンク・ボタン群のように横に並ぶ | `l--cluster` / `<Cluster>` | `flex-wrap: wrap` 前提。ヘッダーナビはモバイルでハンバーガー置換 |
| **flex-row**（横並び・折返し無し想定） | ロゴ＋ボタンなど 2〜3 要素の一列 | `l--flex` / `<Flex>` | 折り返しが要る場合は `Cluster` |
| **equal-columns**（均等幅 N カラム） | 同幅のカード N 枚が横並び。BP でカラム数が変わる | `l--columns` / `<Columns>` | PC 3 列 → タブレット 2 → SP 1 のように BP で切替。`gtc="repeat(3, 1fr)"` 直書きは NG |
| **auto-columns**（幅指定のカードが折返し） | 幅は一定、画面幅に応じて自然に折り返す | `l--autoColumns` / `<AutoColumns>` | 「Grid の repeat(auto-fill, minmax)」用途 |
| **tile-grid**（サイズが揃うタイル） | 縦横同サイズのタイルが敷き詰められる | `l--tileGrid` / `<TileGrid>` | 詳細は primitive-class.md |
| **switch-columns**（要素数で列数が自動切替） | 要素が 1〜3 のときに列数が変わる | `l--switchColumns` / `<SwitchColumns>` | 詳細は primitive-class.md |
| **with-side**（メイン + サイド 2 カラム） | 記事＋サイドバー等、片側固定幅 | `l--withSide` / `<WithSide>` | 2 カラム LP 内の内部レイアウトにも使用 |
| **media-with-content**（画像＋テキストの左右分割） | 左に画像、右にテキスト（または逆）の 2 カラム | `l--columns` または `l--withSide` | モバイルは画像上・テキスト下の縦積みに切替 |
| **frame**（アスペクト比固定の枠） | 写真・動画埋め込みが指定比率で切り抜き | `l--frame` / `<Frame>` | 比率は Props で指定 |
| **center**（コンテンツを中央寄せ・上下中央） | ヒーローの見出し＋ボタンなどが上下左右中央 | `l--center` / `<Center>` | Hero でよく使う |
| **flow**（記事本文の縦フロー） | 見出し・段落・リスト・引用が続く本文領域 | `l--flow` / `<Flow>` | Markdown レンダリング領域や記事本文で使用 |
| **absolute-overlay**（背景の上にコンテンツ） | 背景画像／動画の上にテキストやカードが載る | `l--frame` + `<Layer>`（`is--layer`）等の重ね合わせ | Hero で頻出。「全面背景 + 暗いオーバーレイ」に安易に丸めない（後述） |
| **box**（単純な箱・仕切り） | 背景色・角丸・パディングを持った矩形 | `l--box` / `<Box>` | カード等の土台 |

## 2. コンポーネントパターン → Lism / @lism-css/ui

| 画像パターン | 対応 | 補足 |
|-------------|------|------|
| **button**（クリッカブルなアクション） | `@lism-css/ui` の `Button` または `is--boxLink` / `<BoxLink>` | ホバー変化を必ず定義（`-hov:*` 系。詳細 `lism-css-guide/property-class/hov.md`） |
| **card**（境界／影／背景で囲まれた情報の塊） | `l--box` / `<Box>` を土台に、内部を `l--stack` などで組む | リンク全体クリック可なら `is--boxLink`。ホバーの影変化は `-hov:-bxsh`。浮き上げ（`translateY`）は `-hov:*` にプリセットがないためカスタム CSS で対応（`lism-css-guide/property-class/hov.md`） |
| **tag / badge**（小さなラベル） | `@lism-css/ui` の `Badge` またはカスタム `c--tag`（Property Class で書く） | `c--*` の CSS に残す宣言は `lism-css-guide/antipatterns.md`「Property Class で書けるのに CSS で書く」と `lism-css-guide/SKILL.md` の C7「CSSに書くもの/Propsに移すもの」に従う |
| **accordion / modal / tabs / callout** | `@lism-css/ui` の同名コンポーネント | `lism-css-guide/components-ui.md` を参照 |
| **icon / divider / spacer / decorator** | `<Icon>` / `<Divider>` / `<Spacer>` / `<Decorator>`（`a--*`） | 装飾要素はまずこれで置き換えられないかを検討 |

## 3. 「典型 LP テンプレ」に丸めやすい要注意パターン

VLM が画像の詳細を見ずに「よくある LP」に丸めてしまいがちなパターン。**該当する疑いがある場合は Phase 1 で必ず詳細記述を残す**こと。

| 誤読しがちなパターン | 実際の構造の可能性 | 見分けるチェック項目 |
|--------------------|------------------|-------------------|
| Hero を「全面背景画像 + 暗いオーバーレイ + 中央テキスト」に丸める | 実は複数写真のコラージュ／片側だけに写真／写真は背景ではなく `l--frame` の要素 | 写真は何枚あるか？重なっているか？暗い矩形は写真ではなく色付きの装飾ブロックではないか？ |
| Step / Feature を「左に画像 1 枚、右にテキストリスト」に丸める | 実は各ステップに個別の画像があり、左右交互配置（`l--columns` 交互反転など） | ステップ数と画像数が一致しているか？画像は 1 枚ではなく複数か？ |
| ナビゲーション文言を「サービス / 実績 / 会社概要 / お問い合わせ」の定番に丸める | 実際の文言はデザインごとに異なる | ナビ各項目の文言を OCR で正確に転記する。想像で埋めない |
| カードのカラム数を「3 列固定」に丸める | 実際は 2 列 / 4 列 / auto-columns | 画像 1 行あたりのカード数を実測する |
| 「境界線なし・背景色なし」のブロックを勝手に `<Card>` にする | 単に `l--stack` の 1 アイテム | 装飾がないなら Card にせず素の要素で組む |

## 4. パターン適用ルール

- 独自の複雑なレイアウトを見つけても、可能な限り `l--stack` / `l--columns` / `l--flex` / `l--withSide` / `l--frame` などのプリミティブの組み合わせに分解します。プリミティブを使わず `<div>` + Property Class でゴリ押すのは NG（`lism-css-guide/SKILL.md` の C1「構造・セマンティクス選定」、`lism-css-guide/primitive-class.md` の使い分けガイド）。
- レスポンシブ挙動（BP による列数・折返し・非表示化・順序反転）は、原則として Lism の Property Class の `_{bp}` サフィックスまたは各プリミティブの Props で表現します。詳細は `lism-css-guide/responsive.md`。
- Property Class の記法・命名の省略ルール（`bgc`, `fz`, `bdrs` など）は `lism-css-guide/naming.md` を参照。本ファイルには書きません。
