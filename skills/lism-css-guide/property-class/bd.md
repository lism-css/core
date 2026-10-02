# -bd（ボーダー）

Lism CSS のボーダーは、CSS 変数（`--bds` / `--bdw` / `--bdc`）で管理される特殊仕様の Property Class。`-bd` または `-bd-{side}` クラスで変数管理を有効化し、`bds` / `bdc` / `bdw` Prop で個別に上書きする。

- クラス名: `-bd` / `-bd-{side}` / `-bds:*` / `-bdc:*` / `-bdw_{bp}` など
- Lism props: `bd`, `bd-{side}`, `bds`, `bdc`, `bdw`

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/property-class/bd.md

## 仕組み

`-bd` または `-bd-{side}` クラスが付くと、以下の初期値がセットされる。

```scss
/* 変数の初期値だけ弱い位置に置く（@layer ビルドでは @layer lism-base、no_layer ビルドでは :where()） */
:where(.-bd, [class*=" -bd-"], [class^="-bd-"]) {
  --bds: solid;
  --bdw: 1px;
  --bdc: var(--divider);
}
.-bd, [class*=" -bd-"], [class^="-bd-"] {
  border-width: var(--bdw);
  border-color: var(--bdc);
}
.-bd       { border-style: var(--bds); }
.-bd-x     { border-inline-style: var(--bds); }
.-bd-y     { border-block-style: var(--bds); }
/* ...各 side ごとに style を適用 */
```

`border-width` / `border-color` は全方向で共通出力され、`border-style` だけ `-bd` または `-bd-{side}` が出現している方向に適用される仕組み。`--bdw` を `0 0 1px 0.5em` のような複数値にすれば、方向ごとに太さを変えられる。

## 方向指定クラス

| Prop | CSS プロパティ |
| --- | --- |
| `bd` | `border`（変数管理を有効化） |
| `bd-x` | `border-inline` |
| `bd-y` | `border-block` |
| `bd-s` | `border-inline-start` |
| `bd-e` | `border-inline-end` |
| `bd-bs` | `border-block-start` |
| `bd-be` | `border-block-end` |
| `bd-t` | `border-top` |
| `bd-b` | `border-bottom` |
| `bd-l` | `border-left` |
| `bd-r` | `border-right` |

標準で用意しているのは物理方向（`-t` / `-b` / `-l` / `-r`）と論理方向（`-x` / `-y` / `-s` / `-e` / `-bs` / `-be`）のみ。

## 値プロパティ

| Prop | 変数 | プリセット値クラス | BP クラス |
| --- | --- | --- | --- |
| `bd` | — | `-bd:none` | — |
| `bds` | `--bds` | `-bds:dashed`, `-bds:dotted`, `-bds:double` | — |
| `bdc` | `--bdc` | `-bdc:brand`, `-bdc:accent`, `-bdc:divider`, `-bdc:keycolor`, `-bdc:inherit`, `-bdc:transparent`, `-bdc:current` | — |
| `bdw` | `--bdw` | — | `-bdw_sm`, `-bdw_md`, `-bdw_lg` |

`bdw` はブレイクポイント指定に対応。`--bdw` の値を BP で切り替えることで、ボーダーの方向自体を変化させることもできる。

## 関連

- [`-bdrs`](../property-class.md) — 角丸（`border-radius`）
- [`-bd-{side}` + `has--gutter`](../trait-class/has--gutter.md) — セクション区切りに使うと相性が良い
