# `set--` クラス

`@layer lism-base` に属し、HTML 要素の基礎スタイリングまたは CSS 変数のセットアップだけを行うクラス群です。
HTML では直接クラスを付与し、Lism コンポーネントでは `set` prop（`set="plain"`, `set="revert"`, `set="bxsh"` 等）で指定します。

`set` prop の記法（複数値指定・`-` prefix による除外）は [components-core.md](./components-core.md#共通-props) を参照してください。

set-- は目的別に 2 カテゴリに分かれます。

| カテゴリ | 用途 | クラス |
| --- | --- | --- |
| 基礎スタイリング | HTML 要素のリセット／リバート | `set--plain` / `set--revert` |
| 変数のセット | CSS 変数のセットアップのみを行う | `set--bxsh` / `set--hov` / `set--bdrsInner` / `set--bleed` / `set--s` |

`set--{name}` の `{name}` は、そのクラスがセットアップする CSS 変数の名称に対応します（例: `--bxsh--*` → `bxsh`、`--_isHov` / `--_notHov` → `hov`、`--bdrs--inner` → `bdrsInner`、`--s*` → `s`）。

## TOC

- [`set--plain`](#set--plain)
- [`set--revert`](#set--revert)
- [`set--bxsh`](#set--bxsh)
- [`set--hov`](#set--hov)
- [`set--bdrsInner`](#set--bdrsinner)
- [`set--bleed`](#set--bleed)
- [`set--s`](#set--s)

[詳細](https://lism-css.com/docs/set-class.md)

---

## 対応ソースコード

ソース: https://github.com/lism-css/core/tree/main/packages/lism-css/src/scss/base/set（`set--{name}` は `_{name}.scss` に対応。`set--s` は `_index.scss` と `base/tokens/_tokens.gen.scss`、`set--bxsh` は `base/tokens/_tokens.scss` と `base/tokens/_tokens.gen.scss` で定義）

---

## `set--plain`

`width`, `color`, `font`, `padding`, `border` など、ブラウザデフォルトスタイルを完全にリセットします。
ボタン・リンク等のスタイリング時に活用します。

使用例:
```html
<button class="set--plain">...</button>
```
```jsx
<Lism as="button" set="plain">...</Lism>
```

## `set--revert`

ブラウザデフォルトの見た目を明示的に復活させるためのクラスです。
これ単体ではスタイルは持ちません（全プロパティをrevertするというようなものではない）。

特定のHTML要素と組み合わせてスタイルを定義して使うものであり、現状は `ul` / `ol` のみ対象です。

Lism CSSでは、クラスを持つリスト（`ul` / `ol`）ではスタイルがリセットされます。
クラスを持ちつつ、箇条書き表示を維持したい場合（Property Class しか持たないリストなど）に `set--revert` を付与します。


使用例:
```html
<ul class="-fz:l set--revert">
  <li>item 1</li>
  <li>item 2</li>
</ul>
```
```jsx
<Lism as="ul" fz="l" set="revert">
  <li>item 1</li>
  <li>item 2</li>
</Lism>
```

## `set--bxsh`

`SHADOW` トークン変数（`--bxsh--{N}`）を再計算するためのクラスです。`:root` で定義される `--shc`（影の色）を特定要素で上書きしたい時に利用します。近い側の影色 `--shc--near` も `--shc` から再計算されるため、2層の影がまとめて変わります。

使用例:
```html
<div class="l--box set--bxsh -bxsh:20" style="--shc: hsl(200 50% 50% / 20%)">...</div>
```
```jsx
<Box set="bxsh" bxsh='20' style={{ '--shc': 'hsl(200 50% 50% / 20%)' }}>...</Box>
```


## `set--hov`

ホバー状態の判定変数（`--_notHov`, `--_isHov`）を次のようにセットします。主に**子要素のホバースタイルを制御する**時に活用します。

- `--_isHov`は非hover時(かつ非focus-within時)にのみ空白定義さます。
- `--_notHov`は逆に、hover時またはfocus-within時に空白定義されます。

この空変数トリックにより、次のような書き方ができます。

- `var(--_isHov, {ホバー時に適用させたい値})`
- `var(--_notHov, {非ホバー時に適用させたい値})`

（`var(--_isHov, ...) var(--_notHov, ...)`とするとホバー前後のスタイルを1行で書くこともできますが、`box-shadow`などの半角スペースで区切って値を調整するプロパティではこの書き方無効となります。）

使用例:

```html
<div class="-hov:test">...</div>
```
```css
.-hov\:test {
  color: var(--_isHov, green) var(--_notHov, red); /* hover時はgreen, 非hover時はred*/
  box-shadow: var(--_isHov, var(--bxsh--30)); /* hover時はshadowをつける（非hover時は無効な値） */
  opacity: var(--_notHov, var(--o--pp)); /* 非hover時は不透明度を下げる（hover時は無効な値） */
}
```

さらに、親要素に`set--hov`を付与してその子要素で`--_isHov`変数と`--_notHov`変数を使うことで、親要素のhoverをトリガーとして子要素のスタイルを変化させることも可能になります。

例えば、親のボックスがhoverされたら、その内部の画像をズームするようなケースで活用でき、`-hov:in:zoom`クラスが標準で用意されています。

```html
<a href="###" class="l--frame set--hov is--boxLink -ar:21/9 -ov:hidden">
  <img class="has--transition -hov:in:zoom" src="https://cdn.lism-css.com/img/2SvHdIk1KOOR.webp" width="960" height="640" loading="lazy" />
  <div class="is--layer -bgc" style="--c: #fff; --bgc: rgb(0 0 0 / 50%)"></div>
  <div class="l--center is--layer -c" style="--c: #fff;">
    <span class="-fz:xl">バナーリンク</span>
  </div>
</a>
```

```css
.-hov\:in\:zoom {
  --transitionProps: scale;
  scale: var(--_isHov, 1.1);
}
```


## `set--bdrsInner`

親要素の角丸(`--bdrs`)とPadding(`--p`)の値から、その内側の角丸（`--bdrs--inner`）を自動計算するためのクラスです。
親要素に`set--bdrsInner`をクラスをセットし、子要素では`-bdrs:inner`をセットすることで、計算された`--bdrs--inner`をセットすることができます。

（親要素では`bdrs`と`p`の指定が必須となります。）

使用例:
```html "set--bdrsInner" "-bdrs:inner"
<div class="set--bdrsInner -p:15 -bdrs:40 -bd">
  <div class="-bdrs:inner">...</div>
</div>
```
```jsx
<Lism set="bdrsInner" p="15" bdrs="40" bd>
  <Lism bdrs="inner">...</Lism>
</Lism>
```


## `set--bleed`

片側ブリードレイアウトを組むのに便利な `--bleed` 変数を生成するクラスです。コンテンツ幅（`--contentSize`）の外側の余白量がセットされます。ただし、ガター幅（`--gutter` / `--gutter--base`）を下限とし、これより狭くなる場合はガター幅を返します。

`--contentSize` が未指定の場合は `--sz--m` を基準値として使用します。

`padding-inline: var(--bleed)` を子要素に当てれば、その要素だけコンテンツ幅の外側ガターまで広げられるため、画像とテキストを並べた片側ブリードの 2 カラムなどに活用できます。

使用例（`Columns` の片側だけブリードさせる）:
```html
<div class="is--container">
  <div class="l--columns set--bleed -contentSize:s -cols_sm -g:0 -g_sm -ai:center" style="--cols:1;--cols_sm:2;--g_sm:var(--s10)">
    <div class="l--box has--gutter -ps -py:30 -py_sm" style="--ps:var(--bleed);--py_sm:0">
      <p>...</p>
    </div>
    <div class="l--frame -bdrs:inner -ar:3/2">
      <img src="..." alt="" />
    </div>
  </div>
</div>
```
```jsx
<Container>
  <Columns set="bleed" contentSize="s" cols={[1, 2]} g={['0', '10']} ai="center">
    <Box hasGutter ps="var(--bleed)" py={["30", "0"]}>
      <p>...</p>
    </Box>
    <Frame bdrs="inner" ar="3/2">
      <img src="..." alt="" />
    </Frame>
  </Columns>
</Container>
```


## `set--s`

余白トークン（`--s5`〜`--s70`）を現在のフォントサイズ基準で再計算するためのクラスです。ButtonやBadgeなど、内部余白を要素自身のfont-sizeに追従させたい時に利用します。

詳細なスケールと使い方は[tokens.mdの`set--s`ユーティリティ](./tokens.md#set--s-ユーティリティ)を参照してください。

使用例:

```html
<button class="set--s -fz:s -py:10 -px:20">...</button>
```

```jsx
<Button set="s" fz="s" py="10" px="20">...</Button>
```
