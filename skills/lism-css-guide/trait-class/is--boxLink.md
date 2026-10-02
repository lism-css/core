# is--boxLink / `<BoxLink>`

ボックス全体をクリック可能なリンク領域にするクラス。

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/trait-class/is--boxLink.md

## 専用Props

| Prop | 説明 |
| --- | --- |
| `href` | リンク先を指定。`href` があれば `<BoxLink>` 自体が `<a>` タグに、なければ `<div>` として出力される（**特殊挙動**） |

通常の `<Lism>` エイリアスコンポーネントと異なり、`<BoxLink>` だけは `href` 指定の有無で出力タグが動的に切り替わります。

## 使い方

`<BoxLink>` は `<Lism isBoxLink>` のエイリアスです。使い方は次の2通り。

1. `href` を指定して `<BoxLink>` 自体を `<a>` にする
2. `<BoxLink>` は `<div>` のまま、内部のアンカーに `is--coverLink`（`isCoverLink` Prop）を付ける。`is--coverLink` は `::before` を `inset: 0` で広げ、ボックス全体をクリック領域にする。BoxLink 内部に別のリンクも置く場合はこちら（`is--boxLink` 内の他の `a` は `z-index: 2` で前面に出る）

```jsx
<BoxLink p="30">
  <Link isCoverLink href="/article/1">Heading link text</Link>
  <a href="/tag/foo">Inner Link</a>
</BoxLink>
```

## Opt-in スタイル

### Tabキーフォーカス時のアウトラインをボックス全体に広げる

`is--coverLink` でリンクを設置した場合、デフォルトでは Tab フォーカス時のアウトラインがリンクテキスト部分のみに表示されます。ボックス全体に広げたい場合は以下のCSSを追記してください。

```css
@supports selector(:has(*)) {
  .is--boxLink:has(.is--coverLink:focus-visible) {
    outline: auto 1px;
    outline: auto 1px -webkit-focus-ring-color;
  }
  .is--coverLink:focus {
    outline: 0;
  }
}
```

## 関連プリミティブ

- [is--container](./is--container.md) — コンテナクエリの基準要素
- [is--wrapper](./is--wrapper.md) — コンテンツ幅ラッパー
