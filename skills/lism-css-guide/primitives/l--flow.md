# l--flow / `<Flow>`

子要素間の余白を `margin-block-start` で管理するフローレイアウト。**記事コンテンツなどテキスト主体のフローレイアウト**に最適。

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/primitives/l--flow.md

## 余白の仕組み

`l--flow`直下の子要素は、`--flow`をもとに`--mbs`で上余白を決め、`margin-block-start`に適用します。見出しタグの`h1`〜`h4`は`calc(var(--flow) * 1.5 + 0.5em)`で余白を大きくします。

| クラス | 余白量 |
| --- | --- |
| `l--flow` | `--flow--base`（`--s30`、`lang="ja"` 時は `--s35`） |
| `.l--flow.-flow:s` | `--flow--s`（`--s20`） |
| `.l--flow.-flow:` | `--flow` を直接指定した値 |

`--flow--base` / `--flow--s` は `:root` で定義されたトークン（[tokens](../tokens.md#フロー余白-flow) 参照）。日本語環境では文字密度に合わせて `--flow--base` が広めに上書きされる。

## 既定の挙動

- `display:flow-root`。
- 直下の`* + *`へ`--flow:var(--flow--base)`、`--mbs:var(--flow)`、`margin-block-start:var(--mbs)`を付与します。
- 先頭要素と`is--skipFlow + *`は`--mbs:0px`で上余白を打ち消します。
- 直下の`img`/`video`/`iframe`は`display:block`へ初期化します。

## 専用Props

| Prop | 説明 |
| --- | --- |
| `flow` | `--flow` の値を指定。トークン値 `s` を渡すと `-flow:s` クラスが付与、任意値を渡すと `-flow:` + `style="--flow:..."` が出力される |

## `is--skipFlow`

`l--flow` 直下で使用し、**次の兄弟要素との余白を打ち消す**トレイトクラス。フローコンテンツの先頭に `position: absolute` な要素を配置したい場合などに使用します。

```html
<div class="l--flow">
  <div class="is--skipFlow">スキップ対象</div>
  <p>本文1（上の要素との余白が打ち消される）</p>
  <p>本文2</p>
</div>
```

`is--skipFlow` は `l--flow` 専用のトレイトクラスで、独立したドキュメントは持ちません。

## 入れ子時の注意点

`l--flow` の直下で `l--flow` をネストして `--flow` をカスタム値で直接指定すると、**その子側の `l--flow` 自身の `margin-block-start` にも影響**が出ます。直下にネストせず、別要素で一度ラップすれば回避できます。

```jsx
// NG: 直下ネストで --flow を上書きすると親子両方に影響
<Flow>
  <p>親コンテンツ</p>
  <Flow flow="5px">  {/* この Flow 自体の上マージンも 5px になる */}
    <p>子コンテンツ</p>
  </Flow>
</Flow>

// OK: 間に1段ラップを挟む
<Flow>
  <p>親コンテンツ</p>
  <div>
    <Flow flow="5px">
      <p>子コンテンツ</p>
    </Flow>
  </div>
</Flow>
```

## 関連プリミティブ

- [l--stack](./l--stack.md) — `gap` で余白を管理する縦積み（こちらは Flexbox）
- [is--wrapper](../trait-class/is--wrapper.md) — 記事コンテンツ幅の制限用ラッパー（`l--flow` とセットで使うことが多い）
