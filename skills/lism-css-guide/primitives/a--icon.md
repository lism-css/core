# a--icon / `<Icon>`

アイコン要素を表示するためのクラス。`flex-shrink: 0`、デフォルトサイズ `1em`、`fill` 属性が無ければ `fill: currentcolor`。

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/primitives/a--icon.md

## 出力されるHTML構造

`<Icon>` は `label` の有無でアクセシビリティ属性を自動切り替えします。実際のタグは `icon`・`viewBox`・`src`・`as` の指定方法で `svg` や `img` などに変わりますが、属性の付与規則は共通です。

```html
<!-- label なし -->
<svg class="a--icon" aria-hidden="true">...</svg>

<!-- label あり -->
<svg class="a--icon" aria-label="..." role="img">...</svg>
```

## 専用Props

| Prop | 説明 |
| --- | --- |
| `icon` | アイコンを指定。コンポーネント・SVG文字列・オブジェクト（`{as, ...exProps}`）を渡す |
| `size` | SVGの幅・高さの既定値。明示した`width`・`height`を優先（通常は`fz`を推奨） |
| `label` | `aria-label` として出力。指定があれば `role="img"`、なければ `aria-hidden="true"` |

## `@lism-css/icons`を使う

`lism-css`はアイコンのSVGデータを内包しません。`@lism-css/icons`は同じ開発元のReact・Astro向けSVGアイコン集です。別途インストールし、末尾に`Icon`が付くコンポーネントをimportして`icon`に渡します。

導入方法・収録アイコン一覧・`weight`による線幅指定は[パッケージ解説](https://lism-css.com/docs/packages/icons.md)を参照してください。

```jsx
import { Icon } from 'lism-css/react';
import { CheckIcon } from '@lism-css/icons/react';

<Icon icon={CheckIcon} c="green" />
```

Astroではimport元をそれぞれ`lism-css/astro`・`@lism-css/icons/astro`にします。SVG文字列を渡す場合は`<svg`で始まるSVG全体を指定します。

## 関連プリミティブ

- [a--divider](./a--divider.md) — 区切り線
- [a--spacer](./a--spacer.md) — 空白要素
- [a--decorator](./a--decorator.md) — 装飾用要素
