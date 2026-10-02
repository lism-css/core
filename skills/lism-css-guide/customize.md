# カスタマイズ

`lism-css` パッケージから読み込む CSS や、コンポーネントが受け付ける Props の挙動を上書きしてカスタマイズする方法をまとめます。

## TOC

- [`@layer` をオフにする](#layer-をオフにする)
- [SCSS でのカスタマイズ](#scss-でのカスタマイズ)
- [`lism.config.js` でのカスタマイズ](#lismconfigjs-でのカスタマイズ)
- [追加スタイルを読み込ませる方法](#追加スタイルを読み込ませる方法)

詳細（公式ドキュメント）:

- 概要: [https://lism-css.com/docs/customize.md](https://lism-css.com/docs/customize.md)
- CSSファイルの種類（`@layer` なし版 / `full.css`）: [https://lism-css.com/docs/css-files.md](https://lism-css.com/docs/css-files.md)
- `lism.config.js`（props / tokens / traits・breakpoints・`isFullMode`・追加スタイル）: [https://lism-css.com/docs/customize/config.md](https://lism-css.com/docs/customize/config.md)
- SCSS（`$setting` / `$props`・BP上書き）: [https://lism-css.com/docs/customize/scss.md](https://lism-css.com/docs/customize/scss.md)
- CSS Purge: [https://lism-css.com/docs/customize/purge.md](https://lism-css.com/docs/customize/purge.md)

---

## `@layer` をオフにする

`lism-css/main.css` の代わりに `lism-css/main_no_layer.css` を読み込むだけで、`@layer` を使わない CSS に切り替えられます。
no-layer版は既存サイトや WordPress テーマなど、カスケードを制御できない環境向けです。レイヤーの代わりに、Property Class は常に `!important` 付き、`u--trim` / `u--trimAll` / `u--cbox` はセレクタ二重化（`.u--trim.u--trim` = 0-2-0）で出力され、「Property Class > Utility Class > 単一クラス」の序列を再現します。`lism.config.js` の `defaultImportant: false`・`$default_important: 0`・`props` の個別 `important: 0` を指定しても `!important` は外れません。`b--` など上記以外のクラス同士の優先度は読み込み順・詳細度に依存します。

```js
// 通常
import 'lism-css/main.css';

// @layer なしのCSSを読み込む場合はこちら
import 'lism-css/main_no_layer.css';
```

`@layer` のオン・オフは SCSS 変数では管理されません。**読み込むファイル自体を切り替える**点に注意してください。


## SCSS でのカスタマイズ

`lism-css/scss/_setting.scss` で定義された変数を `@use ... with (...)` で上書きできます。
上書き定義をしてから `lism-css/scss/main.scss` を読み込むことでカスタマイズが反映されます。

ソース: [`_setting.scss`](https://raw.githubusercontent.com/lism-css/core/main/packages/lism-css/src/scss/_setting.scss)

### 上書き可能な変数

| 変数 | 用途 | デフォルト |
| --- | --- | --- |
| `$breakpoints` | ブレイクポイント数値の定義（`0` は無効＝クエリを出力しない） | `('xs': 0, 'sm': '480px', 'md': '800px', 'lg': '1120px', 'xl': 0)` |
| `$is_container_query` | コンテナクエリで出力するか（`1` = container query, `0` = media query） | `1` |
| `$default_important` | Property Class にデフォルトで `!important` を付与するか（no-layer版では無視され、常に付与） | `0` |
| `$props` | Property Class ごとの個別出力設定 | `prop-config` のデフォルト |

### 基本フォーマット

```scss
// 1. 設定変数を上書き
@use '../path-to/node_modules/lism-css/src/scss/setting' with (
  $breakpoints: (
    'sm': '400px',  // 個別キーの上書き可
  ),
  $is_container_query: 0,
  $default_important: 1,
  $props: (
    // 個別 Prop の設定（後述）
  )
);

// 2. main.scss を読み込む（@layer なしにする場合は main_no_layer）
@use '../path-to/node_modules/lism-css/src/scss/main';
```

> Astro の場合、相対パスを付けず `lism-css/scss/setting` のようにパッケージ名から書けます。

### `$props` の個別カスタマイズ

各 Property Class について、出力するブレイクポイントを絞ったり、ユーティリティクラスを追加したりできます。

```scss
@use '../path-to/node_modules/lism-css/src/scss/setting' with (
  $props: (
    'fz': (
      important: 1,        // .-fz:* に !important を付与
    ),
    'h': (
      bp: 0,               // .-h_sm 等のブレイクポイント版を出力しない
    ),
    'p': (
      bp: ('sm', 'md'),    // BP対応クラスを .-p_sm / .-p_md だけに限定（bp は 0 / 1 / BPキーのリストのみ）
      utilities: (
        'box': '2em',      // .-p:box { --p: 2em } を追加
      ),
    ),
  )
);
@use '../path-to/node_modules/lism-css/src/scss/main';
```

### 注意点

SCSS を直接読み込む構成では、コンパイル時に `lism-css` 本体 CSS と読み込み順がずれる可能性があります。意図しない上書きが起きないよう、レイヤー順を確認してください。


## `lism.config.js` でのカスタマイズ

プロジェクトのルート直下に `lism.config.js`（または `lism.config.ts` / `lism.config.mjs`）を置くことで、**コンポーネントの挙動**（受け付ける props の値や、出力されるクラス名）をカスタマイズできます。

設定ファイルの型チェック・補完には `lism-css/config-types` の `LismConfig` 型を使います。`.ts` は `export default { ... } satisfies LismConfig`、`.js` は `/** @type {import('lism-css/config-types').LismConfig} */` を付けると、キー名の typo や値の形をエディタが検出します（コンポーネント側の prop/trait を解禁する生成物 `lism-env.d.ts` とは別物）。

### Vite / Astro プラグインの登録（推奨セットアップ）

`lism.config.js` を読み込ませるには、Vite（または Astro）の設定ファイルで `@lism-css/plugin` の統合プラグインを登録します。**未登録の場合、ファイルを置いてもデフォルト設定のまま**になります。

```bash
pnpm add -D @lism-css/plugin
```

```js
// vite.config.js
import { defineConfig } from 'vite';
import { lismCss } from '@lism-css/plugin/vite';

export default defineConfig({
  plugins: [lismCss()],
});
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { lismCss } from '@lism-css/plugin/astro';

export default defineConfig({
  integrations: [lismCss()],
});
```

この統合プラグイン1つで、以下がまとめて有効になります。

- **config alias**: コンポーネント（JS ランタイム）が `lism.config.js` を読み込めるようになる
- **動的CSSビルド**: `import 'lism-css/main.css'` 等を捕捉し、`lism.config.js` を反映済みの CSS をその場で生成する（props / tokens を追加すると CSS に自動反映される）
- **型の自動生成**: 有効化したブレイクポイント・追加した props / traits を反映した `lism-env.d.ts` を起動時に自動生成する

設定ファイルはプロジェクトルートから `lism.config.ts` → `lism.config.mjs` → `lism.config.js` の順で自動検出します。別の場所に置く場合は `configPath` で指定できます。

```js
// Vite
plugins: [lismCss({ configPath: './config/lism.config.js' })],
// Astro
integrations: [lismCss({ configPath: './config/lism.config.js' })],
```

### Next.js（16 以降）での導入

Next.js には Vite / Astro のような「import をその場で変換する仕組み」が無いため、`@lism-css/plugin/next` の `withLism()` で `next.config.mjs` をラップします。`lism.config.js` を反映した CSS を `.lism-css/css/` へ事前生成し、`lism-css/main.css` 等の import をその生成物へ alias します（型生成・dev 中の config 変更追従も含む）。

```js
// next.config.mjs
import { withLism } from '@lism-css/plugin/next';

export default withLism({ /* nextConfig */ });
```

- `app/layout.tsx` などで `import 'lism-css/main.css'` をグローバル読み込みする。
- `.lism-css/` は `.gitignore`、`lism-env.d.ts` は `tsconfig.json` の `include` に追加してコミットする。
- CSS purge は現状 Vite / Astro のみ対応（Next.js は未対応）。

### ブレイクポイントの有効化（xs / xl）

デフォルトのブレイクポイントは **`xs: 0`（無効） / `sm: 480px` / `md: 800px` / `lg: 1120px` / `xl: 0`（無効）** です。値 `0` は「無効＝CSSクエリを出力しない」を表します。

`xs` / `xl` を有効にするには、`lism.config.js` の `breakpoints` にサイズを差分指定するだけで済みます。

```js
// lism.config.js
export default {
  breakpoints: {
    xs: '360px',  // xs を有効化
    xl: '1400px', // xl を有効化
  },
};
```

これだけで、ブレイクポイント対応の全 Property Class が `xs` / `xl` のレスポンシブクラス（`-p_xs` / `-p_xl` 等）も出力するようになります。prop ごとの個別指定は不要です。

統合プラグイン使用時は有効化したブレイクポイントがプロジェクト直下の `lism-env.d.ts` に自動反映され、`BreakpointRegistry` の手書き拡張は不要です。`lism-env.d.ts` は git にコミットしてください（`astro check` 等の型チェックがこのファイルを拠り所にします）。

> SCSS を直接利用する構成では、`@use 'lism-css/scss/setting' with ($breakpoints: ...)` で有効化する方法も利用できます（[SCSS でのカスタマイズ](#scss-でのカスタマイズ) を参照）。

### フォーマット

```js
// lism.config.js
export default {
  props: {
    // Property Class の出力をカスタマイズ
  },
  tokens: {
    // トークンを { key: value } の値マップで定義（CSS変数の値出力・ユーティリティ生成・props受理を一括）
  },
  traits: {
    // Trait（is--* / has--*）用の props を追加
  },
};
```

デフォルト値は以下を参照：

- props: [`config/defaults/props.ts`](https://raw.githubusercontent.com/lism-css/core/main/packages/lism-css/config/defaults/props.ts)
- tokens: [`config/defaults/tokens.ts`](https://raw.githubusercontent.com/lism-css/core/main/packages/lism-css/config/defaults/tokens.ts)
- traits: [`config/defaults/traits.ts`](https://raw.githubusercontent.com/lism-css/core/main/packages/lism-css/config/defaults/traits.ts)

### カスタマイズ例

```js
// lism.config.js
import DEFAULT_CONFIG from 'lism-css/default-config';
const { props } = DEFAULT_CONFIG;

export default {
  props: {
    // 既存propにpresetsを追加
    ta: { presets: [...(props.ta.presets || []), 'justify'] },
    // 既存propにutility値を追加
    p: { utils: { box: '2em' } },
    // 新しいpropの追加（filterはデフォルトに含まれない。出力するCSSプロパティを prop で指定する）
    filter: { prop: 'filter', utils: { blur: 'blur(3px)' } },
  },
  tokens: {
    // トークンは { key: value } の値マップで定義（既定に deep-merge される）
    // → :root { --lts--2xl: .5em } を出力し、tokenClass:1 の lts は -lts:2xl も自動生成される
    lts: { '2xl': '.5em' },
    // space は --s{key}、color は --{key} の変数名で出力される
    space: { '90': '6rem' }, // → --s90: 6rem
    color: { success: 'oklch(0.6 0.15 150)' }, // → --success: ...
  },
  traits: {
    isHoge: 'is--hoge',
  },
};
```

これによってコンポーネント側で次のような挙動が追加されます：

| 入力 | 出力されるクラス |
| --- | --- |
| `ta="justify"` | `-ta:justify` |
| `p="box"` | `-p:box` |
| `filter="blur"` | `-filter:blur` |
| `lts="2xl"` | `-lts:2xl` |
| `isHoge` | `is--hoge` |

```jsx
<Box p="box" ta="justify" filter="blur" lts="2xl" isHoge>Box</Box>
// → <div class="l--box is--hoge -p:box -ta:justify -filter:blur -lts:2xl">Box</div>
```

### 追加した prop / trait の型解禁

統合プラグイン使用時は、追加した prop / trait も `lism-env.d.ts`（`CustomPropRegistry` / `CustomTraitRegistry` の拡張）で自動解禁され、手書きの型拡張は不要です。

なお、既存 prop への値追加（`ta="justify"` 等）はもともと任意の文字列を受け付けるため、型エラーにはなりません（ただし補完候補には出ません）。


## 追加スタイルを読み込ませる方法

`lism.config.js` で props を増やしただけでは、対応するユーティリティクラスのスタイルが必要になります。構成によって反映方法が異なります。`traits` はクラス名だけを追加するため、`is--*` のスタイルはどの構成でも手動追記 / SCSS で用意します。

### Vite / Astro（統合プラグイン使用時）は自動反映（手動ビルド不要）

`@lism-css/plugin` の統合プラグインを登録している場合、`lism.config.js` に props / tokens を追加すると、**dev サーバ / ビルドの CSS に自動反映されます**。手動追記や `npx lism-css build` は不要で、dev 中の変更は HMR で CSS と型 `.d.ts` が追従します。`tokens` に書いた値は CSS 変数の定義（`:root { --lts--2xl: .5em }`）・ユーティリティクラス・props 受理がまとめて反映されるため、`global.css` への手書きも不要です（既定値の上書きも可）。

軽微な追加であれば、props を増やさず Lism Props の `:value` 記法（→ [property-class.md](./property-class.md)）と `global.css` への手書きだけで済ませることもできます。

```css
/* Property Class は @layer を付けない */
.-lts\:2xl {
  letter-spacing: var(--lts--2xl);
}
```

```jsx
<Text lts=":2xl">...</Text>
```

### CLI コマンドで CSS を再ビルド（Vite / Astro を使わない構成）

純 SCSS 構成や他バンドラなど、Vite / Astro の統合プラグインを使わない構成では、`@lism-css/plugin` が提供する `npx lism-css build` が `lism.config.js` を CSS に反映するための正規の手段です。

webpack 主導のバンドラ（`@wordpress/scripts` 等）では `@lism-css/plugin/webpack` の `withLismWebpack()` で webpack config をラップできます。自前の SCSS ビルドで config 適用済みの `setting` を `@use` したい構成では、`@lism-css/plugin/builder` の `generateLismScss()` が bridge SCSS（`@use 'lism-setting'`）を生成します。

```bash
npx lism-css build          # lism.config.js 反映の CSS を再生成
npx lism-css build --full   # full.css / full_no_layer.css も生成
```

`lism.config.js` の内容に基づいて `lism-css/main.css` を再生成します。上記カスタマイズ例だと、以下のスタイルが自動生成されます：

```css
.-ta\:justify { text-align: justify; }
.-p\:box { --p: 2em; }
.-filter\:blur { filter: blur(3px); }
.-lts\:2xl { letter-spacing: var(--lts--2xl); }
```

> **注意**:
> - `tokens` の値は CLI ビルドでも CSS 変数とユーティリティクラスの両方が出力されます。値が `'-'` のキーはカタログ登録のみで `:root` 宣言を出力しません（`flow` や `bdrs.inner` のように実値を手書きSCSS側へ置くもの）。
> - `lism-css` パッケージ自体を上書きする処理のため、**パッケージ更新ごとに再実行**が必要です。

### 手動で CSS を追記

CLI を使わず、追加クラス分の CSS をプロジェクト側で書いて読み込ませる方法でも問題ありません。

```css
@layer lism-base {
  :root {
    --lts--2xl: 0.15em;
  }
}

@layer lism-trait {
  .is--hoge { /* ... */ }
}
```

### SCSS だけで値を追加する（`lism.config.js` を使わない構成）

`@lism-css/plugin` を使わない構成では `lism.config.js` は読み込まれない。SCSS の `$props` の `utilities` で値を追加し、コンポーネントからは `:value` 記法（`p=":box"`）で強制クラス化するか、HTML に直接クラスを書いて使う。

```scss
@use '../path-to/node_modules/lism-css/src/scss/setting' with (
  $props: (
    'ta': ( utilities: ( 'justify': 'justify' ) ),
    'p': ( utilities: ( 'box': '2em' ) ),
    'lts': ( utilities: ( '2xl': 'var(--lts--2xl)' ) ),
  )
);
@use '../path-to/node_modules/lism-css/src/scss/main';

// トークン追記
@layer lism-base {
  :root { --lts--2xl: 0.15em; }
}
```
