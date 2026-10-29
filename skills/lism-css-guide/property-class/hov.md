# -hov（ホバー）

hover 時の挙動を制御する Property Class。`:hover` 擬似クラスで動作する系と、親の `set--hov` に連動する系の 2 系統に分かれる。

- クラス名: `-hov:-{prop}` / `-hov:{preset}` / `-hov:in:{preset}`
- Lism props: `hov`（`<Lism hov="-c">` / `<Box hov={{ bgc: 'brand' }}>` 等）

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/property-class/hov.md

## 3 つの形式

| 形式 | 役割 |
| --- | --- |
| `-hov:-{prop}` | `--hov-{prop}` 変数を受け取り、hover 時に該当プロパティを変化させる |
| `-hov:{preset}` | hover 時のスタイルセットをプリセット名でまとめて適用する |
| `-hov:in:{preset}` | 親要素の `set--hov` を起点に、子要素のスタイルを変化させる |

`-hov:-{prop}` と `-hov:{preset}` は `@media (any-hover: hover)` 内で定義されるため、タッチデバイスでは無効。  
`-hov:in:*` はメディアクエリ外で、親の `set--hov` がセットする `--_isHov` / `--_notHov` 変数で動作する。

トランジションを付けたい場合は [`has--transition`](../trait-class/has--transition.md) クラスを併用する。

## `-hov:-{prop}` — プロパティ変更

`:hover` で直接動作する。クラスを付けるだけで初期値で変化する。

| クラス | 変化するプロパティ | 初期値 |
| --- | --- | --- |
| `-hov:-c` | `color` | `var(--hov-c, var(--link))` |
| `-hov:-bdc` | `border-color` | `var(--hov-bdc, currentColor)` |
| `-hov:-bgc` | `background-color` | `var(--hov-bgc, color-mix(in srgb, var(--bgc, var(--base)), var(--neutral) 20%))` |
| `-hov:-o` | `opacity` | `var(--hov-o, var(--o--p))` |
| `-hov:-bxsh` | `box-shadow` | `var(--hov-bxsh, var(--bxsh--50))` |
| `-hov:-transform` | `transform` | `var(--hov-transform, translate(0, -4px))` |

任意の値へ変化させたい場合は、`--hov-{prop}` 変数で値を指定する。

`-hov:-bgc` は初期値として、現在の背景色を `--neutral` へブレンドした背景色を使う。ライト/ダークどちらの背景でも使いやすいhover背景にしたい場合は、`hov="-bgc"` を基本形として使う。

プロジェクト全体で `-hov:-bgc` のデフォルト値を差し替えたい場合は、`:root` で `--hov-bgc` を定義する。ただし `:root` で定義した値の中の `var(--bgc)` は `:root` で解決されるため、要素ごとの背景色には追従しない。

## `-hov:{preset}` — プリセット

hover 時のスタイルセットをプリセット名でまとめて適用する。

| クラス | 内容 |
| --- | --- |
| `-hov:underline` | テキストに下線を表示 |

プロジェクト固有のプリセットを自作して追加することもできる（実装例は公式ドキュメント参照）。

## `-hov:in:{preset}` — 親連動

親要素に `set--hov` を付けると、`--_isHov` / `--_notHov` 変数が hover 状態に応じて切り替わる。`-hov:in:*` はこの変数を参照する仕組み。

| クラス | 効果 | 仕組み |
| --- | --- | --- |
| `-hov:in:hide` | 親 hover 時にフェードアウト | `opacity: var(--_isHov, 0)` |
| `-hov:in:show` | 親 hover 時にフェードイン | `opacity: var(--_notHov, 0)` / `visibility: var(--_notHov, hidden)` |
| `-hov:in:zoom` | 親 hover 時にズーム | `scale: var(--_isHov, 1.1)` |

## `<Lism>` コンポーネントでの `hov` 指定

`<Lism>`（およびその継承コンポーネント）の `hov` prop は、文字列・オブジェクトの 2 通りで指定できる。

- **文字列指定**: 入力した文字列がそのまま `-hov:{入力文字列}` クラスとして出力される。カンマ区切りで複数指定可。**自動変換は行われない**（`"c"` → `-hov:-c` のような省略はサポートしない）。
- **オブジェクト指定**: 主に `-hov:-{prop}` へ任意の値を渡す用途。`hov={{ prop: value }}` で `-hov:-{prop}` クラス + `--hov-{prop}` 変数を出力。値に `true` を指定すると `-hov:{key}` クラスのみ出力され、任意値プロップとプリセット／自作クラスを同時に指定できる。

```jsx
// 文字列指定（自動変換なし）
<Lism hov="-c,-bxsh">  // → <div class="-hov:-c -hov:-bxsh">
// オブジェクト指定（任意値 → クラス + 変数）
<Lism hov={{ c: 'red', shadowUp: true }}>
// → <div class="-hov:-c -hov:shadowUp" style="--hov-c: var(--red)">
```

## `has--transition` との併用

`-hov:*` による変化は即時に切り替わる。なめらかなトランジションを付けたい場合は `has--transition` を併用し、`--duration` で所要時間を調整する。

## 関連

- [`has--transition`](../trait-class/has--transition.md) — hover 時の変化にトランジションを付ける
- [`set--hov`](../set-class.md#set--hov) — 親の hover 状態を子要素に伝播させる仕組み
- [`set--bxsh`](../set-class.md) — `-hov:-bxsh` と組み合わせる場合の影色再計算
