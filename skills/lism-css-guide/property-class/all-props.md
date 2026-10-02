# Property Class 全Prop一覧

[property-class.md](../property-class.md)の分冊。全Propのプリセット値クラス・BP対応の詳細表。

ソース: [props.ts](https://raw.githubusercontent.com/lism-css/core/main/packages/lism-css/config/defaults/props.ts)

## 表の読み方

| カラム | 説明 |
| --- | --- |
| **Prop** | クラス名に使う省略名（例: `-fz:l` の `fz` 部分）。Lism コンポーネントの Props 名でもある |
| **CSS プロパティ** | 実際に制御される CSS プロパティ |
| **プリセット値クラス** | そのまま使えるクラス名の一覧（`-{prop}:{value}` 形式）。`—` はカスタム値のみ対応 |
| **BP** | ブレークポイント対応クラス（`-{prop}_{bp}` 形式）のサポート状況。`✔` は `sm`・`md`・`lg` に対応、`—` は非対応 |


## 全 Prop 一覧

### タイポグラフィ

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `f` | `font` | `-f:inherit` | — |
| `fz` | `font-size` | `-fz:base`, `-fz:5xl`〜`-fz:2xs` | ✔ |
| `fw` | `font-weight` | `-fw:light`, `-fw:normal`, `-fw:bold`, `-fw:100`〜`-fw:900` | — |
| `ff` | `font-family` | `-ff:base`, `-ff:accent`, `-ff:mono` | — |
| `fs` | `font-style` | `-fs:italic` | — |
| `hl` | `--hl`（ハーフレディング） | `-hl:base`, `-hl:xs`, `-hl:s`, `-hl:l`, `-hl:xl`, `-hl:0` | ✔ |
| `lh` | `line-height`（倍率・`--lh` 経由） | `-lh:xs`, `-lh:s`, `-lh:m`, `-lh:l`, `-lh:xl`, `-lh:1` | — |
| `lts` | `letter-spacing` | `-lts:base`, `-lts:xs`, `-lts:s`, `-lts:l`, `-lts:xl` | — |
| `ta` | `text-align` | `-ta:center`, `-ta:left`, `-ta:right` | — |
| `td` | `text-decoration` | `-td:none` | — |
| `tt` | `text-transform` | `-tt:uppercase`, `-tt:lowercase` | — |

**注意:** `line-height` は全要素で `var(--lh, calc(1em + var(--hl) * 2))` として管理されます。基本は `hl`（fz 非依存の固定量）を使い、fz に比例した行送りを保ちたい場合だけ `lh`（倍率）を使います。`lh` を指定した要素の子孫では `hl` は効きません。

### 表示・可視性

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `d` | `display` | `-d:none`, `-d:block`, `-d:flex`, `-d:inline-flex`, `-d:grid`, `-d:inline-grid`, `-d:inline`, `-d:inline-block` | ✔ |
| `o` | `opacity` | `-o:0`, `-o:mp`, `-o:p`, `-o:pp`, `-o:ppp` | — |
| `v` | `visibility` | `-v:hidden` | — |
| `ov` | `overflow` | `-ov:hidden`, `-ov:auto`, `-ov:clip` | — |
| `ov-x` | `overflow-x` | `-ov-x:clip`, `-ov-x:auto`, `-ov-x:scroll` | — |
| `ov-y` | `overflow-y` | `-ov-y:clip`, `-ov-y:auto`, `-ov-y:scroll` | — |
| `ar` | `aspect-ratio` | `-ar:21/9`, `-ar:16/9`, `-ar:3/2`, `-ar:1/1`, `-ar:og` | ✔ |

### サイズ

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `w` | `width` | `-w:100%`, `-w:fit` | ✔ |
| `h` | `height` | `-h:100%`, `-h:fit` | ✔ |
| `min-w` | `min-width` | `-min-w:100%` | ✔ |
| `max-w` | `max-width` | `-max-w:100%` | ✔ |
| `min-h` | `min-height` | `-min-h:100%` | ✔ |
| `max-h` | `max-height` | `-max-h:100%` | ✔ |
| `sz` | `inline-size` | — | ✔ |
| `min-sz` | `min-inline-size` | — | ✔ |
| `max-sz` | `max-inline-size` | `-max-sz:xs`, `-max-sz:s`, `-max-sz:m`, `-max-sz:l`, `-max-sz:xl`, `-max-sz:full`, `-max-sz:bleed` | ✔ |
| `bsz` | `block-size` | — | — |
| `min-bsz` | `min-block-size` | — | — |
| `max-bsz` | `max-block-size` | — | — |
| `contentSize` | `--contentSize` 変数のみ | `-contentSize:s`, `-contentSize:m`, `-contentSize:l`, `-contentSize:xl` | — |

**`max-sz` の特殊クラス:**
- `-max-sz:full` — `has--gutter` 内では gutter 分を含めた全幅に拡張
- `-max-sz:bleed` — 最外側の `is--container` 幅まで広がる（`margin-inline` で中央配置、`is--container` 祖先がなければ `100svi` まで広がる）

→ 詳細は [property-class/max-sz.md](./max-sz.md) 参照

**`contentSize` について:**
`--contentSize` 変数をセットする isVar タイプの Prop です。`is--wrapper` と組み合わせるとコンテンツ幅の上限となり、`set--bleed` と組み合わせると `--bleed` の計算基準値として使われます。
プリセット値（`s`, `m`, `l`, `xl`）は `-contentSize:{value}` クラスを出力し、それ以外の任意値は `--contentSize: {value}` をスタイル属性として出力します。

### 背景

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `bg` | `background` | — | — |
| `bgi` | `background-image` | — | — |
| `bgr` | `background-repeat` | `-bgr:no-repeat` | — |
| `bgp` | `background-position` | `-bgp:center` | — |
| `bgsz` | `background-size` | `-bgsz:cover`, `-bgsz:contain` | — |
| `bgc` | `background-color` | `-bgc:base`, `-bgc:base-2`, `-bgc:text`, `-bgc:brand`, `-bgc:accent`, `-bgc:keycolor`, `-bgc:inherit`, `-bgc:transparent`, `-bgc:current` | — |

### カラー

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `c` | `color` | `-c:base`, `-c:text`, `-c:text-2`, `-c:brand`, `-c:accent`, `-c:keycolor`, `-c:inherit` | — |
| `keycolor` | `--keycolor` 変数のみ | — | — |

セマンティック/パレットの全カラートークンは [tokens.md のカラー](../tokens.md#カラー)を参照。<br />
キーカラー変数: `keycolor`（ユーザー定義の `--keycolor` を参照する独立変数。詳細は `tokens.md` を参照）

`c` / `bgc` / `bdc` に `keycolor` を指定すると、`--keycolor` を参照する `-c:keycolor` のようなクラスが出力される（`style` 属性ではない）。

### 角丸

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `bdrs` | `border-radius` | `-bdrs:0`, `-bdrs:10`, `-bdrs:20`, `-bdrs:30`, `-bdrs:40`, `-bdrs:50`, `-bdrs:99`, `-bdrs:inner` | ✔ |
| `bdrs-tl` | `border-top-left-radius` | — | — |
| `bdrs-tr` | `border-top-right-radius` | — | — |
| `bdrs-br` | `border-bottom-right-radius` | — | — |
| `bdrs-bl` | `border-bottom-left-radius` | — | — |
| `bdrs-ss` | `border-start-start-radius` | — | — |
| `bdrs-se` | `border-start-end-radius` | — | — |
| `bdrs-es` | `border-end-start-radius` | — | — |
| `bdrs-ee` | `border-end-end-radius` | — | — |

### 影

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `bxsh` | `box-shadow` | `-bxsh:0`, `-bxsh:10`, `-bxsh:20`, `-bxsh:30`, `-bxsh:40`, `-bxsh:50` | ✔ |

**補足:** 影色（`--shc`）を要素内で上書きして再計算させたい場合は、`set--bxsh` クラスを併用する。

### ポジション

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `pos` | `position` | `-pos:static`, `-pos:fixed`, `-pos:sticky`, `-pos:relative`, `-pos:absolute` | ✔ |
| `z` | `z-index` | `-z:-1`, `-z:0`, `-z:1`, `-z:99` | — |
| `t` | `top` | `-t:0`, `-t:50%`, `-t:100%` | — |
| `l` | `left` | `-l:0`, `-l:50%`, `-l:100%` | — |
| `r` | `right` | `-r:0`, `-r:50%`, `-r:100%` | — |
| `b` | `bottom` | `-b:0`, `-b:50%`, `-b:100%` | — |
| `i` | `inset` | `-i:0` | — |
| `i-x` | `inset-inline` | — | — |
| `i-y` | `inset-block` | — | — |
| `i-s` | `inset-inline-start` | — | — |
| `i-e` | `inset-inline-end` | — | — |
| `i-bs` | `inset-block-start` | — | — |
| `i-be` | `inset-block-end` | — | — |

### 余白 — Padding

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `p` | `padding` | `-p:0`, `-p:5`, `-p:10`, `-p:20`, ... (SPACEトークン) | ✔ |
| `px` | `padding-inline` | `-px:0`, `-px:5`, `-px:10`, `-px:20`, ... (SPACEトークン) | ✔ |
| `py` | `padding-block` | `-py:0`, `-py:5`, `-py:10`, `-py:20`, ... (SPACEトークン) | ✔ |
| `ps` | `padding-inline-start` | `-ps:5`, `-ps:10`, `-ps:20`, ... (SPACEトークン) | ✔ |
| `pe` | `padding-inline-end` | `-pe:5`, `-pe:10`, `-pe:20`, ... (SPACEトークン) | ✔ |
| `pbs` | `padding-block-start` | `-pbs:5`, `-pbs:10`, `-pbs:20`, ... (SPACEトークン) | ✔ |
| `pbe` | `padding-block-end` | `-pbe:5`, `-pbe:10`, `-pbe:20`, ... (SPACEトークン) | ✔ |
| `pl` | `padding-left` | `-pl:5`, `-pl:10`, `-pl:20`, ... (SPACEトークン) | ✔ |
| `pr` | `padding-right` | `-pr:5`, `-pr:10`, `-pr:20`, ... (SPACEトークン) | ✔ |
| `pt` | `padding-top` | `-pt:5`, `-pt:10`, `-pt:20`, ... (SPACEトークン) | ✔ |
| `pb` | `padding-bottom` | `-pb:5`, `-pb:10`, `-pb:20`, ... (SPACEトークン) | ✔ |

SPACEトークンの全値（`5`〜`70`の離散値）は [tokens.md の余白 (space)](../tokens.md#余白-space) を参照。

### 余白 — Margin

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `m` | `margin` | `-m:auto`, `-m:0`, `-m:5`, `-m:10`, `-m:20`, ... (SPACEトークン) | ✔ |
| `mx` | `margin-inline` | `-mx:auto`, `-mx:0`, `-mx:5`, `-mx:10`, `-mx:20`, ... (SPACEトークン) | ✔ |
| `my` | `margin-block` | `-my:auto`, `-my:0`, `-my:5`, `-my:10`, `-my:20`, ... (SPACEトークン) | ✔ |
| `ms` | `margin-inline-start` | `-ms:auto`, `-ms:5`, `-ms:10`, `-ms:20`, ... (SPACEトークン) | ✔ |
| `me` | `margin-inline-end` | `-me:auto`, `-me:5`, `-me:10`, `-me:20`, ... (SPACEトークン) | ✔ |
| `mbs` | `margin-block-start` | `-mbs:auto`, `-mbs:0`, `-mbs:5`, `-mbs:10`, `-mbs:20`, ... (SPACEトークン) | ✔ |
| `mbe` | `margin-block-end` | `-mbe:auto`, `-mbe:5`, `-mbe:10`, `-mbe:20`, ... (SPACEトークン) | ✔ |
| `ml` | `margin-left` | `-ml:5`, `-ml:10`, `-ml:20`, ... (SPACEトークン) | ✔ |
| `mr` | `margin-right` | `-mr:5`, `-mr:10`, `-mr:20`, ... (SPACEトークン) | ✔ |
| `mt` | `margin-top` | `-mt:5`, `-mt:10`, `-mt:20`, ... (SPACEトークン) | ✔ |
| `mb` | `margin-bottom` | `-mb:5`, `-mb:10`, `-mb:20`, ... (SPACEトークン) | ✔ |

### Gap

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `g` | `gap` | `-g:0`, `-g:inherit`, `-g:5`, `-g:10`, `-g:20`, ... (SPACEトークン) | ✔ |
| `cg` | `column-gap` | `-cg:5`, `-cg:10`, `-cg:20`, ... (SPACEトークン) | ✔ |
| `rg` | `row-gap` | `-rg:5`, `-rg:10`, `-rg:20`, ... (SPACEトークン) | ✔ |

### Flex

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `fxf` | `flex-flow` | — | — |
| `fxw` | `flex-wrap` | `-fxw:wrap` | ✔ |
| `fxd` | `flex-direction` | `-fxd:column`, `-fxd:column-reverse`, `-fxd:row-reverse` | ✔ |
| `fx` | `flex` | `-fx:1` | ✔ |
| `fxg` | `flex-grow` | `-fxg:1` | — |
| `fxsh` | `flex-shrink` | `-fxsh:0` | — |
| `fxb` | `flex-basis` | — | ✔ |

### Grid

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `gt` | `grid-template` | — | ✔ |
| `gta` | `grid-template-areas` | — | ✔ |
| `gtc` | `grid-template-columns` | `-gtc:subgrid` | ✔ |
| `gtr` | `grid-template-rows` | `-gtr:subgrid` | ✔ |
| `gaf` | `grid-auto-flow` | `-gaf:row`, `-gaf:column` | ✔ |
| `gac` | `grid-auto-columns` | — | — |
| `gar` | `grid-auto-rows` | — | — |
| `cols` | `--cols` 変数 | — | ✔ |
| `rows` | `--rows` 変数 | — | ✔ |

### Grid アイテム

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `ga` | `grid-area` | `-ga:1/1` | ✔ |
| `gc` | `grid-column` | `-gc:1/-1` | ✔ |
| `gr` | `grid-row` | `-gr:1/-1` | ✔ |
| `gcs` | `grid-column-start` | — | — |
| `gce` | `grid-column-end` | — | — |
| `grs` | `grid-row-start` | — | — |
| `gre` | `grid-row-end` | — | — |

### 配置（Places）

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `ai` | `align-items` | `-ai:start`, `-ai:center`, `-ai:end`, `-ai:stretch`, `-ai:flex-start`, `-ai:flex-end` | ✔ |
| `ac` | `align-content` | `-ac:start`, `-ac:center`, `-ac:end`, `-ac:flex-start`, `-ac:flex-end`, `-ac:between` | ✔ |
| `ji` | `justify-items` | `-ji:start`, `-ji:center`, `-ji:end`, `-ji:stretch`, `-ji:flex-start`, `-ji:flex-end` | ✔ |
| `jc` | `justify-content` | `-jc:start`, `-jc:center`, `-jc:end`, `-jc:flex-start`, `-jc:flex-end`, `-jc:between` | ✔ |
| `pi` | `place-items` | `-pi:start`, `-pi:center`, `-pi:end` | — |
| `pc` | `place-content` | `-pc:start`, `-pc:center`, `-pc:end` | — |
| `aslf` | `align-self` | `-aslf:start`, `-aslf:center`, `-aslf:end`, `-aslf:stretch` | — |
| `jslf` | `justify-self` | `-jslf:start`, `-jslf:center`, `-jslf:end`, `-jslf:stretch` | — |
| `pslf` | `place-self` | `-pslf:start`, `-pslf:center`, `-pslf:end` | — |
| `order` | `order` | `-order:0`, `-order:-1`, `-order:1` | ✔ |

**コンポーネント用ショートハンド:** `ai`, `ac`, `ji`, `jc`, `aslf`, `jslf` では `s`→`start`, `e`→`end`, `c`→`center`, `fs`→`flex-start`, `fe`→`flex-end` のショートハンドが使えます。

### その他

| Prop | CSS プロパティ | プリセット値クラス | BP |
| --- | --- | --- | --- |
| `ovw` | `overflow-wrap` | `-ovw:anywhere` | — |
| `whs` | `white-space` | `-whs:nowrap` | — |
| `float` | `float` | `-float:left`, `-float:right` | — |
| `clear` | `clear` | `-clear:both` | — |
| `iso` | `isolation` | `-iso:isolate` | — |
| `wm` | `writing-mode` | `-wm:vertical-rl` | ✔ |
