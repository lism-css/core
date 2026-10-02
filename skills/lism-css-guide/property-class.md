# Property Class

Property Class は、主要な CSS プロパティに対して頻繁に使用される値やトークンを手軽にセットできるユーティリティクラスです。  
CSS Layer の外（最も高い詳細度）に配置され、`-{prop}(:{value})` / `-{prop}_{bp}` の形式で定義されています。

## TOC

- [基本書式](#基本書式)
  - [プリセット外の値をクラス化する（`:value` 記法、Lism Props 限定）](#プリセット外の値をクラス化するvalue-記法lism-props-限定)
- [Prop早見リスト](#prop早見リスト)
- [特殊な Property Class](#特殊な-property-class)
  - [ボーダー（`bd` 系）](#ボーダーbd-系)
  - [ホバー（`hov` 系）](#ホバーhov-系)
- [値の省略形（例外一覧）](#値の省略形例外一覧)
- [Property Class の特殊な出力タイプ](#property-class-の特殊な出力タイプ)
- [Property Class の検索・一括修正](#property-class-の検索一括修正)

[詳細](https://lism-css.com/docs/property-class.md)

個別ドキュメント:

- [property-class/all-props.md](./property-class/all-props.md) — 全 Prop 一覧（プリセット値クラス・BP対応の詳細表）
- [property-class/bd.md](./property-class/bd.md) — ボーダー（`-bd` / `-bd-{side}` 系）
- [property-class/hov.md](./property-class/hov.md) — ホバー（`-hov:*` 系）
- [property-class/max-sz.md](./property-class/max-sz.md) — 最大幅（`-max-sz:full` / `-max-sz:bleed` 等）

---

## 基本書式

クラス名は必ず完全な文字列で書き、値による切り替えも完全なクラス名同士で分岐する。

### プリセット値

トークンやプリセットに対応する値は、`-{prop}:{value}` の書式でクラスを指定します。

```html
<div class="-p:20 -fz:l -c:brand">...</div>
```

### カスタム値（任意の値）

トークンやプリセットに該当しない任意の値は、**`-{prop}` クラス** と **`--{prop}` CSS変数** の組み合わせで指定します。

```html
<!-- カスタム値: .-{prop} クラス + --{prop} 変数 -->
<div class="-w" style="--w: 200px">...</div>
<div class="-gtc" style="--gtc: 1fr 2fr 1fr">...</div>
```

この形式が使えるのは、BP 対応の Prop（[all-props.md](./property-class/all-props.md) の BP 列が ✔）と `alwaysVar` タイプのみ。ただし変数プロパティ（`hl` / `bdw` / `cols` / `rows` 等、`props.ts` で `isVar` のもの）は `-{prop}` クラスを持たず、`style="--{prop}: ..."` だけで指定する。それ以外の Prop（`lts` / `fw` / `z` 等）にも `-{prop}` クラスは無いため、`style="letter-spacing: 0.3em"` のように CSS プロパティを直接指定する。


### プリセット外の値をクラス化する（`:value` 記法、Lism Props 限定）

Lism コンポーネントの Propsに渡す値の頭に `:` を付けると、 **強制的に Property Class を出力**できる。cssを追記してトークン値を独自に増やした場合などに活用できる。

```jsx
<Text lts=":2xl">...</Text>
// → <p class="-lts:2xl">...</p>
```

## Prop早見リスト

「このCSSプロパティにPropがあるか」の存在確認用の一覧です。プリセット値クラス・BP対応・特殊出力の詳細は[property-class/all-props.md](./property-class/all-props.md)を必ず参照してください。

- タイポグラフィ: `f` `fz` `fw` `ff` `fs` `hl` `lh` `lts` `ta` `td` `tt`
- 表示・可視性: `d` `o` `v` `ov` `ov-x` `ov-y` `ar`
- サイズ: `w` `h` `min-w` `max-w` `min-h` `max-h` `sz` `min-sz` `max-sz` `bsz` `min-bsz` `max-bsz` `contentSize`
- 背景: `bg` `bgi` `bgr` `bgp` `bgsz` `bgc`
- カラー: `c` `keycolor`
- 角丸: `bdrs` `bdrs-{tl|tr|br|bl|ss|se|es|ee}`
- 影: `bxsh`
- ポジション: `pos` `z` `t` `l` `r` `b` `i` `i-{x|y|s|e|bs|be}`
- Padding: `p` `px` `py` `ps` `pe` `pbs` `pbe` `pl` `pr` `pt` `pb`
- Margin: `m` `mx` `my` `ms` `me` `mbs` `mbe` `ml` `mr` `mt` `mb`
- Gap: `g` `cg` `rg`
- Flex: `fxf` `fxw` `fxd` `fx` `fxg` `fxsh` `fxb`
- Grid: `gt` `gta` `gtc` `gtr` `gaf` `gac` `gar` `cols` `rows` / アイテム側: `ga` `gc` `gr` `gcs` `gce` `grs` `gre`
- 配置: `ai` `ac` `ji` `jc` `pi` `pc` `aslf` `jslf` `pslf` `order`
- ボーダー: `bd` `bd-{side}` `bds` `bdc` `bdw`（特殊仕様→下記「ボーダー（bd系）」）
- ホバー: `hov`（特殊仕様→下記「ホバー（hov系）」）
- その他: `ovw` `whs` `float` `clear` `iso` `wm`

`padding`/`margin`/`gap`/`font-*`/`color`/`background`/`border-radius`/`width`/`height`/`text-align`など上記にあるプロパティの宣言は、カスタムCSSに書く前にProps/Property Classへ移せないか確認します（擬似要素・子孫セレクタ・状態切替を伴う場合のみCSSに残す）。

## 特殊な Property Class

以下は通常の `-{prop}:{value}` パターンとは異なる特殊な仕組みを持つ Prop です。

### ボーダー（`bd` 系）

Lism CSS のボーダーは CSS 変数（`--bds` / `--bdw` / `--bdc`）で管理される特殊仕様。`-bd` または `-bd-{side}` を付けると初期値（`solid` / `1px` / `var(--divider)`）がセットされ、`bds` / `bdc` / `bdw` Prop で上書きする。

| Prop | CSS プロパティ / 変数 | 主なクラス |
| --- | --- | --- |
| `bd` | `border`（変数管理を有効化） | `-bd`, `-bd-{x\|y\|s\|e\|bs\|be\|t\|b\|l\|r}`, `-bd:none` |
| `bds` | `--bds` | `-bds:dashed`, `-bds:dotted`, `-bds:double` |
| `bdc` | `--bdc` | `-bdc:brand`, `-bdc:accent`, `-bdc:divider`, `-bdc:keycolor`, `-bdc:inherit`, `-bdc:transparent`, `-bdc:current` |
| `bdw` | `--bdw` | BP クラス: ✔（`-bdw_sm` / `-bdw_md` / `-bdw_lg`） |

→ 詳細（方向ごとのスタイル指定、BP での方向切り替え等）は [property-class/bd.md](./property-class/bd.md) 参照

### ホバー（`hov` 系）

ホバーエフェクト用のクラス群。以下の 3 形式がある。

| 形式 | 役割 | 動作条件 |
| --- | --- | --- |
| `-hov:-{prop}` | `--hov-{prop}` 変数で hover 時の値を変化させる | `:hover`（`@media (any-hover: hover)` 内） |
| `-hov:{preset}` | hover 時のスタイルをプリセットで適用 | `:hover`（同上） |
| `-hov:in:{preset}` | 親の `set--hov` を起点に子のスタイルを変化させる | 親に `set--hov` が必要 |

**標準クラス:** `-hov:-c`, `-hov:-bgc`, `-hov:-bdc`, `-hov:-o`, `-hov:-bxsh`, `-hov:-transform`, `-hov:underline`, `-hov:in:hide`, `-hov:in:show`, `-hov:in:zoom`

**`<Lism>` の `hov` prop:** 文字列指定（`hov="-c"` → `-hov:-c`。自動変換なし、カンマ区切りで複数可）とオブジェクト指定（`hov={{ c: 'red' }}` → `-hov:-c` + `--hov-c: var(--red)`。値 `true` でクラスのみ出力）が可能。

→ 詳細は [property-class/hov.md](./property-class/hov.md) 参照


## 値の省略形（例外一覧）

Property Class の値名は基本的に CSS の実値と同じですが、以下は省略形が使われます。

| クラス例 | 実際の CSS 値 | 対象 Prop |
| --- | --- | --- |
| `-w:fit` | `width: fit-content` | `w`, `h` |
| `-ac:between` | `align-content: space-between` | `ac`, `jc` |
| `-bdc:current` | `border-color: currentColor` | `bdc` |
| `-bgc:current` | `background-color: currentColor` | `bgc` |


## Property Class の特殊な出力タイプ

### `alwaysVar` タイプ

`lh`, `c`, `bgc`, `p`, `m`, `bdrs` の 6 つ（`lh` のみ BP 非対応）。

例えば`-p`の場合、プリセット値クラス（`-p:20`）でも常に CSS 変数（`--p`）経由で値が適用されます。  
さらに BP クラスでも `padding:var(--p);--p:var(--p_sm) !important;` の形で出力されるため、`--p` は常に現在適用中の値を指します。

これにより、子要素や疑似要素から `var(--p)` で親の値を参照できます。

**CSS 出力例:**

```css
.-p, [class*="-p:"] { padding: var(--p) }
.-p\:20 { --p: var(--s20) }
@container (min-width: 480px) {
  .-p_sm { padding: var(--p); --p: var(--p_sm) !important }
}
```

対象プロパティは、ソースの [props.ts](https://raw.githubusercontent.com/lism-css/core/main/packages/lism-css/config/defaults/props.ts) で `alwaysVar: 1` がセットされているものです。


## Property Class の検索・一括修正

Property Class をコードベース全体で一括修正する場合、同じ Prop が**複数の書式**で出現するため、以下のパターンをすべて検索する必要があります。

| 出現場所 | 検索パターン例（`p` の場合） |
| --- | --- |
| HTML / className — プリセット値 | `-p:20` |
| HTML / className — BP対応・カスタム値 | `-p` / `-p_sm` / `-p_md` / `-p_lg` |
| JSX Props | `p="20"` / `p={20}` / `p={[20, 30]}` |
| getLismProps オブジェクト | `{ p: '20' }` / `{ p: 20 }` |
