# デザイントークン

Lism CSS では、余白・フォントサイズ・カラーなどの主要なCSSプロパティに対してデザイントークンを定義しています。
トークン値は CSS 変数にマッピングされ、Props やユーティリティクラスから参照できます。

CSSコードを書く場合やコンポーネントのPropsに値を指定する際は、明確な意図がない限りは固定値のハードコーディングを避け、デザイントークンの値を優先して使用してください。

## TOC

- [トークン概要テーブル](#トークン概要テーブル)
- [余白 (space)](#余白-space)
- [フォントサイズ (fz)](#フォントサイズ-fz)
- [行間 (hl/lh)](#行間-hllh)
- [字間 (lts)](#字間-lts)
- [フォント (ff)](#フォント-ff)
- [ウェイト (fw)](#ウェイト-fw)
- [透明度 (o)](#透明度-o)
- [角丸 (bdrs)](#角丸-bdrs)
- [影 (bxsh)](#影-bxsh)
- [サイズ (sz)](#サイズ-sz)
- [アスペクト比 (ar)](#アスペクト比-ar)
- [フロー余白 (flow)](#フロー余白-flow)
- [ガター (gutter)](#ガター-gutter)
- [カラー](#カラー)
- [トークン値の命名規則](#トークン値の命名規則)

[詳細](https://lism-css.com/docs/tokens.md)

---

## トークン概要テーブル

| カテゴリ | トークン値 | CSS変数パターン | 例 |
| --- | --- | --- | --- |
| 余白 (space) | `5`, `10`, `15`, `20`, `25`, `30`, `35`, `40`, `45`, `50`, `60`, `70` | `--s{N}` | `--s20` |
| フォントサイズ (fz) | `base`, `2xs`, `xs`, `s`, `m`, `l`, `xl`, `2xl`, `3xl`, `4xl`, `5xl` | `--fz--{key}` | `--fz--l` |
| ハーフレディング (hl) | `base`, `xs`, `s`, `l`, `xl` | `--hl--{key}` | `--hl--s` |
| 行間比率 (lh) | `xs`, `s`, `m`, `l`, `xl` | `--lh--{key}` | `--lh--m` |
| 字間 (lts) | `base`, `xs`, `s`, `l`, `xl` | `--lts--{key}` | `--lts--s` |
| フォント (ff) | `base`, `accent`, `mono` | `--ff--{key}` | `--ff--mono` |
| ウェイト (fw) | `light`, `normal`, `bold` | `--fw--{key}` | `--fw--bold` |
| 透明度 (o) | `mp`, `p`, `pp`, `ppp` | `--o--{key}` | `--o--p` |
| 角丸 (bdrs) | `10`, `20`, `30`, `40`, `50`, `99`, `inner` | `--bdrs--{key}` | `--bdrs--20` |
| 影 (bxsh) | `10`, `20`, `30`, `40`, `50` | `--bxsh--{N}` | `--bxsh--20` |
| サイズ (sz) | `xs`, `s`, `m`, `l`, `xl` | `--sz--{key}` | `--sz--l` |
| アスペクト比 (ar) | `og` | `--ar--{key}` | `--ar--og` |
| フロー余白 (flow) | `base`, `s` | `--flow--{key}` | `--flow--base` |
| セマンティックカラー (color) | `base`, `base-2`, `text`, `text-2`, `divider`, `link`, `brand`, `accent`, `neutral` | `--{name}` | `--brand` |
| パレットカラー (palette) | `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `gray`, `white`, `black` | `--{name}` | `--red` |


---


## 余白 (space)

フィボナッチ数列ベースのスケーリング。`--s-unit`（デフォルト `0.5rem` ≒ 8px）を基準単位とする。

| CSS変数 | 値 | 実サイズ目安 |
| --- | --- | --- |
| `--s5` | `calc(var(--s-unit) * 0.5)` | ≒ 4px |
| `--s10` | `var(--s-unit)` | ≒ 8px |
| `--s15` | `calc(var(--s-unit) * 1.5)` | ≒ 12px |
| `--s20` | `calc(var(--s-unit) * 2)` | ≒ 16px |
| `--s25` | `calc(var(--s-unit) * 2.5)` | ≒ 20px |
| `--s30` | `calc(var(--s-unit) * 3)` | ≒ 24px |
| `--s35` | `calc(var(--s-unit) * 4)` | ≒ 32px |
| `--s40` | `calc(var(--s-unit) * 5)` | ≒ 40px |
| `--s45` | `calc(var(--s-unit) * 6.5)` | ≒ 52px |
| `--s50` | `calc(var(--s-unit) * 8)` | ≒ 64px |
| `--s60` | `calc(var(--s-unit) * 13)` | ≒ 104px |
| `--s70` | `calc(var(--s-unit) * 21)` | ≒ 168px |

10 刻みの主軸は係数 `1, 2, 3, 5, 8, 13, 21`（フィボナッチ数列）に基づき、タイポグラフィの縦のリズムを作る。5 刻み（`--s5`〜`--s45`）は主軸トークン間のちょうど中間値（4px / 12px / 20px / 32px / 52px 相当）で、縦のリズムに縛られない水平方向の gap / padding 用。中間値は `50` まで。`--s-unit` を上書きするとスケール全体を比例的に調整できる。`--fz--base` を流体値にしていて余白も連動させたい場合は、`:root` で `--s-unit: calc(var(--fz--base) * 0.5)` に上書きする。

### `set--s` ユーティリティ

`set--s` クラスを当てた要素のスコープ内では `--s-unit` が `0.5em` に切り替わり、`--s5`〜`--s70` が現在のフォントサイズ基準で再計算される。Button / Badge / インライン要素など、内部余白をフォントサイズに追従させたい部品で使う。

```html
<!-- ボタンの padding が button 自身の font-size に追従する -->
<button class="set--s -fz:s -py:10 -px:20">...</button>
```

`--s-unit` を任意値で上書きすれば、別の基準にも切り替えられる。

```html
<button class="set--s -p:10" style="--s-unit: .4375em">...</button>
```


## フォントサイズ (fz)

倍音列（調和数列）ベースの、ハーモニックモジュラースケーリングを採用。`--fz-mol`（デフォルト `8`）を分子とする `mol / (mol ± n)` の比率で算出される。

| CSS変数 | 値 | 説明 |
| --- | --- | --- |
| `--fz--5xl` | `calc(1em * var(--fz-mol) / (var(--fz-mol) - 6))` | 最大（mol/(mol-6)） |
| `--fz--4xl` | `calc(1em * var(--fz-mol) / (var(--fz-mol) - 5))` | 特大（mol/(mol-5)） |
| `--fz--3xl` | `calc(1em * var(--fz-mol) / (var(--fz-mol) - 4))` | 3XL（mol/(mol-4)） |
| `--fz--2xl` | `calc(1em * var(--fz-mol) / (var(--fz-mol) - 3))` | 2XL（mol/(mol-3)） |
| `--fz--xl` | `calc(1em * var(--fz-mol) / (var(--fz-mol) - 2))` | XL（mol/(mol-2)） |
| `--fz--l` | `calc(1em * var(--fz-mol) / (var(--fz-mol) - 1))` | L（mol/(mol-1)） |
| `--fz--m` | `1em` | M（基準） |
| `--fz--s` | `calc(1em * var(--fz-mol) / (var(--fz-mol) + 1))` | S（mol/(mol+1)） |
| `--fz--xs` | `calc(1em * var(--fz-mol) / (var(--fz-mol) + 2))` | XS（mol/(mol+2)） |
| `--fz--2xs` | `calc(1em * var(--fz-mol) / (var(--fz-mol) + 3))` | 最小（mol/(mol+3)） |
| `--fz--base` | `1rem` | 本文の基本フォントサイズ |

`--fz-mol` を上書きすることでスケール全体を調整可能（7以上の値に対応）。


## 行間 (hl/lh)

`line-height` は全要素で `var(--lh, calc(1em + var(--hl) * 2))` として算出される。既定は `--hl`（ハーフレディング）で管理し、`--lh` がセットされていればそちらが優先される。

`hl` はハーフレディングの大きさ。`--hl-unit`（≒ 2px）を基準単位とする。

| CSS変数 | 値 | 説明 |
| --- | --- | --- |
| `--hl--xs` | `var(--hl-unit)` | 極小の行間（≒ 2px） |
| `--hl--s` | `calc(var(--hl-unit) * 2)` | 小さめの行間（≒ 4px） |
| `--hl--base` | `calc(var(--hl-unit) * 3)` | 基本の行間（≒ 6px） |
| `--hl--l` | `calc(var(--hl-unit) * 4)` | 大きめの行間（≒ 8px） |
| `--hl--xl` | `calc(var(--hl-unit) * 5)` | より大きな行間（≒ 10px） |

`--fz--base` を流体値にしていて行間も連動させたい場合は、`:root` で `--hl-unit: calc(var(--fz--base) * 0.125)` に上書きする。

`lh` は `line-height` を倍率で指定するトークン。`hl` が fz 非依存の固定量なのに対し、fz に比例した行送りを保ちたい場合に使う。

| CSS変数 | 値 |
| --- | --- |
| `--lh--xs` | `1.125` |
| `--lh--s` | `1.25` |
| `--lh--m` | `1.5` |
| `--lh--l` | `1.75` |
| `--lh--xl` | `2` |


## 字間 (lts)

| CSS変数 | 値 | 説明 |
| --- | --- | --- |
| `--lts--base` | `0em` | 基本の文字間隔。長さで指定（`normal` 不可） |
| `--lts--xs` | `calc(var(--lts--base) - 0.05em)` | より狭い文字間隔 |
| `--lts--s` | `calc(var(--lts--base) - 0.025em)` | 狭めの文字間隔 |
| `--lts--l` | `calc(var(--lts--base) + 0.05em)` | 広めの文字間隔 |
| `--lts--xl` | `calc(var(--lts--base) + 0.1em)` | より広い文字間隔 |

`xs`〜`xl` は `--lts--base` からの相対値。`:root` で `--lts--base` を変えると全体が連動する（子孫要素での上書きは `xs`〜`xl` に伝わらない）。


## フォント (ff)

| CSS変数 | 値 |
| --- | --- |
| `--ff--base` | `-apple-system, 'BlinkMacSystemFont', 'Hiragino Sans', sans-serif` |
| `--ff--accent` | `Georgia, serif` |
| `--ff--mono` | `ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace` |


## ウェイト (fw)

| CSS変数 | 値 | 説明 |
| --- | --- | --- |
| `--fw--light` | `300` | 細め |
| `--fw--normal` | `400` | 標準 |
| `--fw--bold` | `600` | 太字（Hiragino Sans W6 相当） |

数値ユーティリティ: `-fw:100` 〜 `-fw:900` も使用可能。


## 透明度 (o)

音楽の強弱記号（piano 系列）に由来するセマンティック命名を採用。`p`（piano / 弱く）の反復回数が多いほど透明度が増す。Lism 内で「文字の反復回数で段階を表す」命名は opacity のみの例外。

| CSS変数 | 値 | 説明 |
| --- | --- | --- |
| `--o--mp` | `0.9` | mezzo-piano: ごく軽い減衰 |
| `--o--p` | `0.8` | piano: hover fade, 補助テキスト等 |
| `--o--pp` | `0.6` | pianissimo: disabled, divider, decorator 等 |
| `--o--ppp` | `0.4` | pianississimo: 最も強く減衰 |


## 角丸 (bdrs)

増分が0.125remずつ大きくなる二階等差数列のスケール。

| CSS変数 | 値 | 説明 |
| --- | --- | --- |
| `--bdrs--10` | `0.25rem` | ≒ 4px |
| `--bdrs--20` | `0.375rem` | ≒ 6px |
| `--bdrs--30` | `0.625rem` | ≒ 10px |
| `--bdrs--40` | `1rem` | ≒ 16px |
| `--bdrs--50` | `1.5rem` | ≒ 24px |
| `--bdrs--99` | `99rem` | 完全な丸（pill） |
| `--bdrs--inner` | `calc(var(--bdrs, 0px) - var(--p, 0px) + 1px)` | 内側の角丸（親要素に合わせる） |


## 影 (bxsh)

要素に近い薄い影と主となる影の2層で構成される。近い側の影は、1段小さいシャドウサイズ `--shsz--{N}` と、`--shc`（シャドウカラー）を50%薄めた `--shc--near` を使う。要素ごとに `--shc` を上書きして再計算したい場合は、`set--bxsh` クラスを併用する（`--shc--near` も `--shc` から再計算される）。

| CSS変数 | 値 |
| --- | --- |
| `--bxsh--10` | `var(--shsz--5) var(--shc--near), var(--shsz--10) var(--shc)` |
| `--bxsh--20` | `var(--shsz--10) var(--shc--near), var(--shsz--20) var(--shc)` |
| `--bxsh--30` | `var(--shsz--20) var(--shc--near), var(--shsz--30) var(--shc)` |
| `--bxsh--40` | `var(--shsz--30) var(--shc--near), var(--shsz--40) var(--shc)` |
| `--bxsh--50` | `var(--shsz--40) var(--shc--near), var(--shsz--50) var(--shc)` |

| CSS変数 | 初期値 |
| --- | --- |
| `--shadow` | `hsl(220 2% 4% / 8%)` |
| `--shc` | `var(--shadow)` |
| `--shc--near` | `color-mix(in srgb, var(--shc), transparent 50%)` |
| `--shsz--5` | `0px 0px 1px` |
| `--shsz--10` | `0px 1px 3px` |
| `--shsz--20` | `0px 2px 6px` |
| `--shsz--30` | `0px 4px 12px` |
| `--shsz--40` | `0px 8px 24px` |
| `--shsz--50` | `0px 16px 48px` |


## サイズ (sz)

`contentSize` や `w` / `h` / `sz` / `max-sz` などのサイズ系 Props で参照されるトークン。

| CSS変数 | 値 |
| --- | --- |
| `--sz--xs` | `400px` |
| `--sz--s` | `640px` |
| `--sz--m` | `880px` |
| `--sz--l` | `1200px` |
| `--sz--xl` | `1600px` |


## アスペクト比 (ar)

| CSS変数 | 値 |
| --- | --- |
| `--ar--og` | `1.91/1` |


## フロー余白 (flow)

`l--flow` のコンテンツ間余白に使われるトークン。`:root` で定義されている。

| CSS変数 | 値 | 説明 |
| --- | --- | --- |
| `--flow--base` | `var(--s30)`（`lang="ja"` 時は `var(--s35)`） | `l--flow` の基準余白 |
| `--flow--s` | `var(--s20)` | `-flow:s` で適用される小さめの余白 |


## ガター (gutter)

サイト全体のガター（左右余白）量を扱う変数群。`--flow--base` / `--flow` と同じく「基準値（`:root`）+ 要素ローカル機能変数」の2層構造を採る。

| CSS変数 | 初期値 | 説明 |
| --- | --- | --- |
| `--gutter--base` | `var(--s30)` | サイトコンテンツの左右余白の基準値（`:root` で定義） |
| `--gutter` | `var(--gutter--base)` | `.has--gutter` で要素ローカルに初期化される機能変数。要素単位で `style="--gutter: 20px"` のように上書き可能 |

参照される主な箇所:

- `has--gutter` の `padding-inline: var(--gutter)`
- `is--container` と `has--gutter` 併用時の `--sz--bleed` 計算（`100cqi + var(--gutter) * 2`）
- `-max-sz:full` の負 margin による hang 拡張（`var(--gutter)` を参照）


## カラー

### セマンティックカラー

サイト全体のカラー設計に使用するトークン。

| CSS変数 | デフォルト値 | 説明 |
| --- | --- | --- |
| `--base` | `hsl(220 0% 99%)` | ベース背景色 |
| `--base-2` | `hsl(220 4% 95%)` | 代替背景色 |
| `--text` | `hsl(220 0% 8%)` | 基本テキスト色 |
| `--text-2` | `hsl(220 4% 32%)` | 補助テキスト色 |
| `--divider` | `hsl(220 4% 88%)` | 区切り線色 |
| `--link` | `oklch(50% 0.3 240)` | リンク色 |
| `--brand` | `hsl(212, 88%, 50%)` | ブランド色 |
| `--accent` | `hsl(347, 65%, 57%)` | アクセント色 |
| `--neutral` | `hsl(220, 2%, 75%)` | hover 背景などの生成に使う中立的な補助色 |

### パレットカラー

OKLCH で定義されたカラーパレット。`--L`（明度）と `--C`（彩度）の基準値を調整するとパレット全体の色味を変更可能。デフォルト: `--L: 60%`, `--C: 0.2`。

| CSS変数 | 値 |
| --- | --- |
| `--red` | `oklch(var(--L) var(--C) 20)` |
| `--orange` | `oklch(calc(var(--L) + 6%) calc(var(--C) - 0.01) 48)` |
| `--yellow` | `oklch(calc(var(--L) + 12%) calc(var(--C) - 0.02) 80)` |
| `--green` | `oklch(calc(var(--L) + 4%) calc(var(--C) - 0.02) 152)` |
| `--blue` | `oklch(calc(var(--L) - 4%) calc(var(--C) + 0.01) 264)` |
| `--purple` | `oklch(calc(var(--L) - 4%) calc(var(--C) + 0.01) 288)` |
| `--pink` | `oklch(calc(var(--L) + 2%) calc(var(--C) + 0.01) 352)` |
| `--gray` | `oklch(calc(var(--L) - 4%) calc(var(--C) / 10) 240)` |
| `--black` | `#000` |
| `--white` | `#fff` |

### キーカラー変数 (`--keycolor`)

`--keycolor` は、カラートークンとは性質が異なる。初めから値があるわけではない。ボックス全体のカラーリングなどを行う際の「軸となる色」を指定するための変数。

`--keycolor: var(--red)` のように指定しておくことで、そのボックス自身や子要素のカラー Props（`c`, `bgc`, `bdc` など）で 特定の色をハードコーディングせずに `--keycolor` 経由で参照できるようにすることができる。代表的な使用例は `u--cbox` ユーティリティクラス。

`c` / `bgc` / `bdc` の値に `keycolor` を指定すると、`-c:keycolor` のような Property Class が出力される（`style` 属性ではない）。これらのクラスは `--c: var(--keycolor)` のように `--keycolor` を参照する。

```html
<!-- ボックスにキーカラーを設定、テキストをキーカラーに連動させる例 -->
<div class="u--cbox" style="--keycolor: var(--red)">
  <p class="-c:keycolor">...</p>
</div>
```
```jsx
<Lism class="u--cbox" keycolor="var(--red)">
  <Text c="keycolor">...</Text>
</Lism>
```

- `c`, `bgc` 等のカラー系 Props では、セマンティックカラー → パレットカラーの順で検索される
- どちらも最終的に `var(--{name})` に変換される
- `bgc="black:50%"`（透過）や `c="text:blue:5%"`（混色）のような `:` 記法も使える。詳細は [components-core.md の CSS Props](./components-core.md#css-props)
- `main.css` でクラス化されるのは厳選したセマンティックカラーと `keycolor` のみ（`-c:brand` / `-c:keycolor` など）。それ以外のカラートークン（`red` などのパレットカラー）は `style` 属性の CSS 変数として出力される
- `full.css` + `isFullMode` では、`c` / `bgc` / `bdc` の全カラートークンがクラス化される（`-bgc:red` など）


## トークン値の命名規則

1. **`s`, `m`, `l`, `xl` 等のサイズ表記** — ベース値（`base` or `m`）があり、それに対する大小を表すトークン
   - `:root`/`body` にセットされている値に戻すものは `base`、そうでない中心値は `m`
2. **`10`, `20`, `30` 等の数値表記** — `0`（`none`）が基準で、段階的に値を持つトークン
3. **セマンティック名** — プロパティ固有の意味を持つ名前（例: `--ar--og`, `--ff--mono`など）
