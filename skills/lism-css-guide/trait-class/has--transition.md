# has--transition

`transition` 系のプロパティを CSS 変数経由でセットする Trait クラス。主に `-hov:*` クラスと組み合わせて、ホバー時のスムーズな変化に使う。

- Lism props: `hasTransition`（`<Lism hasTransition>` / `<Box hasTransition>` 等）
- 文字列を渡すと `--transitionProps` として出力される: `<Lism hasTransition="color, opacity">` → `class="has--transition" style="--transitionProps: color, opacity"`

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/trait-class.md#has--transition

## 対象プロパティは明示指定する

`--transitionProps` の初期値は `all` ではなく、色・影・透明度・transform 系・filter 系に限定したリスト。`all` はページ読み込み時やレイアウト変化時に意図しないアニメーション（ちらつき）を起こすため使わない。

実際に変化させるプロパティだけを `--transitionProps`（Lism props では `hasTransition="..."`）で明示指定する。初期値のリストに無いプロパティ（`padding`, `width`, `border-width` 等）を変化させる場合は必ず指定が要る。

```html
<a class="is--boxLink has--transition -hov:-bxsh" style="--transitionProps: box-shadow; --hov-bxsh: var(--bxsh--40)" href="/path">...</a>
```

```jsx
<BoxLink href="/path" hasTransition="box-shadow" hov={{ bxsh: '40' }}>...</BoxLink>
```

## SCSS 定義

```scss
.has--transition {
  --duration: var(--transition-duration, 0.25s);
  --ease: ease;
  --delay: 0s;
  --transitionProps: color, background-color, border-color, box-shadow, scale, rotate, translate, transform, opacity, filter, backdrop-filter;
  transition: var(--duration) var(--ease) var(--delay);
  transition-property: var(--transitionProps);
}
```

## CSS 変数

| 変数 | 役割 | デフォルト |
| --- | --- | --- |
| `--transitionProps` | transition 対象プロパティ | `color, background-color, border-color, box-shadow, scale, rotate, translate, transform, opacity, filter, backdrop-filter` |
| `--duration` | トランジションの長さ | `var(--transition-duration, 0.25s)` |
| `--ease` | イージング関数 | `ease` |
| `--delay` | ディレイ | `0s` |
| `--transition-duration` | 全体のデフォルト duration を `:root` などから上書きするためのグローバル変数 | 未定義（未指定時は `0.25s`） |

## 関連

- [`-hov:*` プロパティクラス](../property-class.md) — ホバー時の変化を定義
- [`set--hov`](../set-class.md#set--hov) — 親のホバー状態を子要素に伝播させる仕組み
