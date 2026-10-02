# アンチパターン辞書

AI が Lism CSS のコードを生成する際に間違いやすい記法と、その正しい書き方をカタログ化したもの。コードを書く前に該当カテゴリを確認すること。

値・スタイル宣言系はこのファイル、構造・レイアウト・レスポンシブ系は [antipatterns-layout.md](./antipatterns-layout.md) に分けている。

## TOC

### 値・スタイル宣言系（このファイル）

- [px / 固定値の直書き](#px--固定値の直書き)
- [Property Class で書けるのに CSS で書く](#property-class-で書けるのに-css-で書く)
- [クラス名を部分文字列から組み立てる](#クラス名を部分文字列から組み立てる)
- [Token typo（存在しない値）](#token-typo存在しない値)
- [独自クラスの CSS を所定の `@layer` に入れない](#独自クラスの-css-を所定の-layer-に入れない)
- [hover を component CSS に書いて負ける](#hover-を-component-css-に書いて負ける)
- [Reset 済みプロパティの再指定](#reset-済みプロパティの再指定)
- [`--keycolor` の誤用](#--keycolor-の誤用)
- [Prop 型ミス](#prop-型ミス)

### 構造・レイアウト・レスポンシブ系（antipatterns-layout.md）

- [レイアウト選択ミス](./antipatterns-layout.md#レイアウト選択ミス)
- [ベーススタイルを CSS 側で持つ部品を `c--` のままにする](./antipatterns-layout.md#ベーススタイルを-css-側で持つ部品を-c---のままにする)
- [Astro/React Primitive を使わず素の HTML で組む](./antipatterns-layout.md#astroreact-primitive-を使わず素の-html-で組む)
- [ボタン装飾を reset から自作する](./antipatterns-layout.md#ボタン装飾を-reset-から自作する)
- [`Frame` 未使用のメディア枠手組み](./antipatterns-layout.md#frame-未使用のメディア枠手組み)
- [全面リンクの手組み（`BoxLink` 未使用）](./antipatterns-layout.md#全面リンクの手組みboxlink-未使用)
- [primitive 既定値の重複指定](./antipatterns-layout.md#primitive-既定値の重複指定)
- [サイト最外殻を `Wrapper` に使う](./antipatterns-layout.md#サイト最外殻を-wrapper-に使う)
- [row 方向の `Flex` / `Cluster` 直下に `Wrapper` を置く](./antipatterns-layout.md#row-方向の-flex--cluster-直下に-wrapper-を置く)
- [セクション外殻を `Flex` + `min-h` で組む](./antipatterns-layout.md#セクション外殻を-flex--min-h-で組む)
- [標準 HTML 属性を `exProps` に入れる](./antipatterns-layout.md#標準-html-属性を-exprops-に入れる)
- [レスポンシブ抜け](./antipatterns-layout.md#レスポンシブ抜け)
- [レスポンシブ配列の冗長指定](./antipatterns-layout.md#レスポンシブ配列の冗長指定)
- [`is--` の誤用（状態・バリエーション）](./antipatterns-layout.md#is---の誤用状態バリエーション)
- [クラス名の命名ミス](./antipatterns-layout.md#クラス名の命名ミス)
- [CSS の無い Element クラスを付ける](./antipatterns-layout.md#css-の無い-element-クラスを付ける)

---

## px / 固定値の直書き

デザインデータ由来の px / rem / em をそのまま書くと、Lism CSS のスケール統一が崩れる。**書く前に [デザインデータ取り込みフロー](./references/authoring.md#デザインデータ取り込みフロー) に従うこと**。入力種別ごとの既定動作と、丸め/カスタムトークン化/直書き例外（A/B/C）の選択肢の定義はフロー側が正本。確認なしに固定値を採用しない。

### スペース・サイズ

| NG | OK | 理由 |
| --- | --- | --- |
| `padding: 3px 10px` | `padding: var(--s5) var(--s10)` または Props で `py="5" px="10"` | `3px` はトークン外。最寄りは `--s5`(4px) |
| `min-width: 28px; height: 28px` | `min-w` / `h` をトークン値に丸める、または基準値を上書き | `28px` はトークン外 |
| `gap: var(--s5); padding: var(--s10) var(--s15)` を CSS で直書き | `<Lism g="5" py="10" px="15">` | Property Class / Props で書ける |

### 角丸・ボーダー

| NG | OK | 理由 |
| --- | --- | --- |
| `border-radius: 2px` | `border-radius: var(--bdrs--10)`（4px） | 角丸トークンの最小は `--bdrs--10`（4px）。`2px` はトークン外 |
| `border-radius: 8px` | `--bdrs--20`（6px）か `--bdrs--30`（10px）に丸める | 8px はトークン外 |

### タイポグラフィ

| NG | OK | 理由 |
| --- | --- | --- |
| `font-size: 13px` を直書き | `font-size: var(--fz--xs)` または Props で `fz="xs"` | フォントサイズは調和数列スケール。固定値は避ける |
| `letter-spacing: 0.02 / 0.12 / 0.14 / 0.18 / 0.2 / 0.24em` を散在 | `--lts--xs/-s/-l/-xl` を使う、または独自の `--lts--*` を `global.css` で追加 | デフォルトの `lts` トークンは `xs/s/l/xl` のみ。多種混在はデザイントークンとして不健全 |

### 実測pxの包括例外化（例外の自作）

「正確に再現して」等のユーザー指示を根拠に「ページ固有の実測値として採用」のような例外カテゴリを自作し、実測pxを一括採用してはいけない。`✅例外`にできるのは下記「直書きしてよい例外」に該当する場合だけで、ユーザー指示や実測値であることは根拠にならない。

| NG | OK | 理由 |
| --- | --- | --- |
| 実装プランに「『正確に再現』に基づくページ固有実測値として採用」と書き、実測pxを一括直書きして自分で✅ | 入力が画像のみなら最寄りトークンへ丸める（丸め先は`tokens.md`で照合）。px固定が必要と判断したら、その方針自体を⏸にする | 例外の許可リストに新カテゴリを自作しない。包括免除は値照合そのものを消す |

### 直書きしてよい例外

- 1px / -1px の罫線・視覚補正（border / margin の打ち消し）
- transform / vertical-align 等の微調整値（数 px 単位）
- `media query` / `@container` の閾値など、ブラウザ仕様上 px 必須の値
- `b--` のベーススタイルで、要素自身の font-size に追従させる em 値（padding / gap 等）

---

## Property Class で書けるのに CSS で書く

`c--*` を定義したくなったら、まず宣言ごとに Property Class へ落とせるか確認する。落とせる宣言を CSS に書くと、CSS が肥大化し、Property Class の利点（差分上書きの容易さ・読みやすさ）が失われる。

| NG（CSS 直書き） | OK（Property Class） |
| --- | --- |
| `.c--tag { font-size: var(--fz--xs); padding: var(--s10); background: var(--base-2); border-radius: var(--bdrs--10); }` | `<span class="c--tag -fz:xs -p:10 -bgc:base-2 -bdrs:10">` |
| `.c--eyebrow { font-size: var(--fz--2xs); color: var(--text-2); text-transform: uppercase; }` | `<span class="c--eyebrow -fz:2xs -c:text-2 -tt:uppercase">` |

CSS に残すのは、基本的には　`::before` / `> li` などの「Primitive / Trait / Property Class で書けないセレクタ」を伴う宣言。単一要素への装飾束は呼び出し側マークアップに移す。

なお、CSS が空になっても本体クラス `c--{name}` は何のパーツかを示す名前としてマークアップに残して構わない（→ [css-rules.md の Custom Class](./css-rules.md#custom-classc--)）。Element（`c--{name}_{element}`）は CSS で参照しなくなったら外す（→ [CSS の無い Element クラスを付ける](./antipatterns-layout.md#css-の無い-element-クラスを付ける)）。

ベーススタイルを CSS 側で管理することを前提にする部品（サイト共通で繰り返し使うボタン・バッジ・カード級）は、`c--*` ではなく `b--*` を使い、CSS を `@layer lism-block` に書く（→ [css-rules.md の Block Class](./css-rules.md#block-classb--)）。`b--` の3条件を満たさない `c--*` でこの節の規律を外してはいけない。

---

## クラス名を部分文字列から組み立てる

クラス名は必ず完全な文字列で書き、切り替えは完全なクラス名同士で分岐する。部分的な連結は検出・検索できないクラスを作る。

| NG | OK |
| --- | --- |
| `` `-mt:${size}` `` / `'-mt:' + size` | `size === 'l' ? '-mt:40' : '-mt:30'` |

CSS Purge の詳細は[customize.mdの公式ドキュメントリンク](./customize.md#toc)を参照。

## Token typo（存在しない値）

既定トークンの正確な一覧は[tokens.md](./tokens.md)を参照。独自追加は可能だが、以下の未定義値と混同しない。

### カラー

| NG | OK | 理由 |
| --- | --- | --- |
| `bgc="primary"` | `bgc="brand"` | セマンティックカラーに `primary`/`secondary` は無い。ブランド色は `brand`/`accent` |
| `bgc="secondary"` | `bgc="base-2"` | サブ背景色は `base-2`（`base-3` がユーザーによって追加定義されている可能性もある） |
| `c="muted"` | `c="text-2"` | 補助テキスト色は `text-2` |
| `c="danger"` | `c="red"` | パレットカラーから選ぶ（`red` / `orange` 等） |

- セマンティックカラー: `base` / `base-2` / `text` / `text-2` / `divider` / `link` / `brand` / `accent` / `neutral`
- パレットカラー: `red` / `blue` / `green` / `yellow` / `purple` / `orange` / `pink` / `gray` / `white` / `black`

### スペース（`p` / `m` / `g` 等）

スペーストークンの数値は**離散的**で、`5/10/15/20/25/30/35/40/45/50/60/70` のみが用意されている。`8/12/14/55/65/75` 等を書きそうになったら、必ず最寄りトークンに丸めるか、ユーザーに方針確認すること（→ [デザインデータ取り込みフロー](./references/authoring.md#デザインデータ取り込みフロー)）。

| NG | OK | 理由 |
| --- | --- | --- |
| `p="8"` | `p="10"` | スペーストークンは離散値のみ。tailwindのような4の倍数で連続するスケールではない |
| `g="6"` | `g="5"` | 同上 |
| `m="55"`, `m="65"` | `m="50"` or `m="60"` | `50` 以降の中間値は用意されていない（5 刻みは `45` まで） |
| `m="100"` | `m="70"` | 上限は `70`（ユーザーが追加定義している可能性はある） |

### フォントサイズ（`fz`）

| NG | OK | 理由 |
| --- | --- | --- |
| `fz="14"` | `fz="s"` | `fz` は文字列キー（数値は不可） |
| `fz="large"`, `fz="md"` | `fz="l"` | 略号は `2xs` / `xs` / `s` / `m` / `l` / `xl` / `2xl` … |

### 角丸 / 影

| NG | OK | 理由 |
| --- | --- | --- |
| `bdrs="sm"`, `bdrs="round"` | `bdrs="20"`, `bdrs="99"` | 角丸トークンは `10` / `20` / `30` / `40` / `50` / `99` / `inner` |
| `bxsh="xs"`, `bxsh="sm"` | `bxsh="10"`, `bxsh="20"` | shadowトークンは `10` / `20` / `30` / `40` / `50` |

### プリセット外の値を Lism Props に渡している

Lism Props では、props.ts で事前定義されたものが `-{prop}:{value}` クラスとして出力される。それ以外の値はそのまま出力されてCSSとして無効になる。

```JSX
// NG: 事前定義されたトークン値に合致しないため、-lts:2xl は出力されない
<Text lts="2xl">...</Text>
```

独自にProperty Classを拡張したりトークン値を増やしたりする場合は、 [property-class.md の `:value` 記法](./property-class.md)を活用するか、[`lism.config.js`による拡張](./customize.md)が必要。

---

## 独自クラスの CSS を所定の `@layer` に入れない

`.c--*`のCSSは基本的に`@layer lism-custom`内に置く（`b--`のベーススタイルだけ`@layer lism-block`）。Astroの`<style>`内でも同じ。Layer外に置くと、Lism内部レイヤーやProperty Classとの優先順位設計が崩れる。

| NG | OK |
| --- | --- |
| `.c--hero { padding: var(--s40); }` | `@layer lism-custom { .c--hero::before { ... } }` |
| `<style>.c--pricing { ... }</style>` | `<style>@layer lism-custom { .c--pricing { ... } }</style>` |
| `@layer lism-custom { .b--btn { ... } }` | `@layer lism-block { .b--btn { ... } }` |

ただし、`c--*`のクラスでは、`padding`/`gap`/`font-size`/`color`などProps/Property Classへ移せる宣言を、Layerへ入れる前にマークアップ側へ移す（`b--`のベーススタイルは対象外で、`@layer lism-block`で CSS 側で管理してよい）。  
また、詳細度の関係で`@layer`の外で書く必要がある場合は外に出してよい。

---

## hover を component CSS に書いて負ける

hover効果は`-hov:*`、`hov={{}}`、`set--hov`、`has--transition`を優先する。component CSSの`:hover`へ単純な色・影・transformを直接書くと、Property Classやhover変数の設計と競合しやすい。

| NG | OK | 理由 |
| --- | --- | --- |
| `.c--button:hover { box-shadow: var(--bxsh--20); }` | `<Button hov={{ bxsh: '20' }} hasTransition>` | hover用Property Classを使う |
| `.c--card:hover { background: var(--base-2); }` | `<Box hov={{ bgc: 'base-2' }} hasTransition>` | hover時の値はPropsで宣言できる |
| `.c--link:hover { --keycolor: var(--brand); }` | `set--hov`や`hov={{ ... }}`を検討 | hover変数の仕組みに寄せる |

擬似要素や複雑な子孫セレクタが必要なhoverだけCSSに残す。

---

## Reset 済みプロパティの再指定

Lism CSSのreset/base styleで既に初期化されている値を、念のために再指定しない。特に`margin:0`系はHTML要素側で処理済みなので、意図的な差分が無い限り追加しない。

| NG | OK | 理由 |
| --- | --- | --- |
| `<p class="-m:0">` | `<p>` | resetで`margin:0`済み。不要なProperty Classがノイズになる |
| `<Heading m="0">` | `<Heading>` | 見出しmarginもbase側の前提を確認し、同値なら書かない |
| `.c--body { margin: 0; }` | `.c--body {}`または削除 | reset済みの宣言をcomponent CSSへ再掲しない |

例外として、特定の外部CSS配下・埋め込みHTML・resetが効かない隔離領域で打ち消しが必要な場合は、理由を残して指定する。

---

## `--keycolor` の誤用

`--keycolor` は要素単位で「軸となる色」を切り替えるための**ローカル変数**。サイト全体のブランドカラーやリンクカラーには使わない。

| NG | OK | 理由 |
| --- | --- | --- |
| `:root { --keycolor: #c8553d; }` | `:root { --brand: #c8553d; }`（または `--accent` / `--link`） | サイト共通の色は `--brand` / `--accent` / `--link` などのセマンティックカラーで定義する |
| `<Link c="keycolor">` | `<Link c="brand">` または `<Link c="link">` | リンク・hover などの恒常的なアクセントは `brand` / `link` を使う |
| `hov={{ c: 'keycolor' }}` | `hov={{ c: 'brand' }}` | 同上 |
| `border-inline-start: 3px solid var(--keycolor)`（CSS 直書き） | `border-inline-start: 3px solid var(--brand)` | 同上 |

### `--keycolor` を使うべき場面

「**そのボックス／コンポーネント自身の軸色**」を切り替えたい時のみ：

```jsx
<Lism class="u--cbox" keycolor="var(--red)">
  <Text c="keycolor">...</Text>
</Lism>
```

詳細: [tokens.md のキーカラー変数セクション](./tokens.md#キーカラー変数---keycolor)

---

## Prop 型ミス

### Heading の `level` は文字列

| NG | OK | 理由 |
| --- | --- | --- |
| `<Heading level={3}>` | `<Heading level="3">` | `level` は `'1'` 〜 `'6'` の文字列 union 型 |

### レスポンシブ値は配列 or オブジェクト

| NG | OK | 理由 |
| --- | --- | --- |
| `<Columns cols="1,2,3">` | `<Columns cols={[1, 2, 3]}>` | レスポンシブは配列 |
| `<Box p="20 30 40">` | `<Box p={[20, 30, 40]}>` | 同上 |

### BP 非対応 Prop への配列指定

レスポンシブ配列を渡せるのは BP 対応の Prop だけ。BP 対応可否は [all-props.md](./property-class/all-props.md) の BP 列で確認する。

| NG | OK | 理由 |
| --- | --- | --- |
| `<Box ta={['start', null, 'center']}>` | `<Box ta="center">` | `ta` / `fw` / `ov` などは BP 非対応。レスポンシブが必要なら SCSS 側で `bp: 1` を有効にするか、単一値にする |
