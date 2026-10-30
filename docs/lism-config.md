基準日: 2026-09-19・コミット9feef9fa0

# lism.config.js メモ（運営者向け）

`lism.config.js`は、CSS出力・React / Astroコンポーネントの実行時設定・`lism-cli ui`の設定を1つにまとめるプロジェクトルートの設定ファイル。この文書は内部構造と実装上の制約だけを持つ。書き方・セットアップ・purge・CLIビルドの使い方は公式docs（`apps/site/src/content/ja/`の`customize/config.mdx` / `customize/purge.mdx` / `customize/scss.mdx` / `css-files.mdx` / `installation.mdx`）が正。

`full.css`はブレークポイント対応をほぼ全propへ広げた全部入りビルド（`config/presets/props-full.ts`のfull preset）、`main.css`は既定のprops設定の出力。


## トップレベルキー

| キー | 役割 |
| --- | --- |
| `props` | Lism propsが出力するクラス・CSSプロパティ・utility値を追加 / 上書き |
| `tokens` | トークンを`{ key: value }`の値マップで定義 / 上書き。CSS変数の出力・ユーティリティ生成・props受理を1か所でまかなう |
| `traits` | `isHoge`→`is--hoge`のような真偽値class propを追加。対応するスタイルは別途必要 |
| `breakpoints` | `xs` / `xl`の有効化やBPサイズの上書き |
| `isFullMode` | コンポーネント側のprops設定も`full.css`寄りにする |
| `defaultImportant` | Property Classに既定で`!important`を付ける（Sassの`$default_important`相当のビルド時設定） |
| `ui` | `lism-cli ui add`等の出力先（`framework` / `dir`）。helperは常に`{dir}/_helper`に置く。旧`cli`キーも互換読込する（deprecation警告あり） |

設定ファイルは`lism.config.ts`→`lism.config.mjs`→`lism.config.js`の順に探し、最初の1つを読む。


## 型（`lism-css/config-types`）

- `LismConfig` / `PropConfig` / `BreakpointKey`を公開する。実体は`config/types.ts`で、副作用のある`config/index.ts`に依存しない。
- ジェネリクスの`defineConfig`ヘルパーは提供しない。`satisfies`のほうがliteral保持・typo検出・エラーメッセージのすべてで優れる。
- ビルド時生成物の`lism-env.d.ts`（コンポーネント側のprop / trait解禁）とは別レイヤー。
- `PropConfig`は`@lism-css/plugin`のSCSS直列化（`serialize.ts`）でもre-exportして共有する（型の二重管理を防ぐ）。


## プラグインが要る理由

- `props` / `tokens` / `traits`をReact / Astroコンポーネントに効かせるには必要。コンポーネント側は`lism-css/config.js`をimportする構造なので、ユーザーの`lism.config.js`へ差し替えるaliasプラグインが要る。
- Vite / AstroのCSS importでconfig反映済みCSSをその場で出すにも必要。素の`import 'lism-css/main.css'`はパッケージ同梱のCSSを読む。
- `lism-css build`で事前生成するだけならプラグイン登録は不要。ただしコマンド提供元として`@lism-css/plugin`は必要。

統合入口は`@lism-css/plugin/vite` / `@lism-css/plugin/astro`の`lismCss()`（`lismCss({ purge: true })`でpurgeも行う。`typegen`等のオプションは`packages/plugin/src/builder/shared.ts`の`LismCssOptions`を参照）。purge単体の入口は`@lism-css/plugin/purge/vite`の`lismPurge()`と`@lism-css/plugin/purge/astro`の`lismPurgeAstro()`（オプションは`packages/plugin/src/purge/options.ts`の`LismPurgeOptions`）。


## `lism-css build`の出力先

`packages/plugin/package.json`の`bin`で`lism-css`→`./bin/cli.mjs`。設定ファイルを直接読んでconfig反映済みCSSを生成し、`--full`で`full.css` / `full_no_layer.css`も対象にする。

- 出力先はインストール済み`lism-css`の`dist/css`（`node_modules/lism-css/dist/css`、`builder/paths.ts`の`cssDistDir`）で、同梱CSSを直接上書きする。変更するオプションは無い。
- 上書きするので、プラグイン無しの`import 'lism-css/main.css'`でも生成後のCSSが読まれる。これが狙い。
- 書き込みは同じディレクトリの一時ファイルへ書いて`fs.renameSync`で差し替える（`compile.ts`の`writeCss`）。新しい実体になるので、pnpmのハードリンク配置でもストア側のファイルは変わらない。
- `node_modules`を入れ直すと消える。インストール後に毎回実行する運用にする。
- 処理フロー5の「`node_modules`内は書き換えない」はSCSSソースの話で、CSS出力先には当てはまらない。


## 他バンドラ / SCSS-source構成

- `@lism-css/plugin/webpack`の`withLismWebpack(config, opts)`: webpack主導バンドラ（`@wordpress/scripts`等）向けの汎用プリミティブ。オプションは`packages/plugin/src/builder/webpack.ts`の`WithLismWebpackOptions`を参照（`css:false`でCSS事前生成とCSS aliasをno-op、`config:true`で`lism-css/config.js`をユーザー設定へalias、`watch:true`で`lism.config.js`を`fileDependencies`へ登録）。WP / テーマ固有のロジックは持たず、消費側の責務とする。
- `@lism-css/plugin/next`の`withLism(nextConfig, opts)`: Next.js 16以降向け。Next.jsにはbare CSS importを横取りする口が無いので、config反映済みCSSを`<projectRoot>/.lism-css/css/*`へ事前生成し、`lism-css/<entry>.css`をaliasで差し替える。Turbopackが主経路（`turbopack.resolveAlias`にproject-relativeパス）で、`--webpack`用に`resolve.alias`へも絶対パスで同じaliasを入れる。`lism-css/config.js`のaliasと`lism-env.d.ts`生成（`opts.typegen`、既定true）も行う。返り値は`(phase, ctx) => config`の非同期関数で、`export default withLism(nextConfig, opts)`として渡す。devでは`lism.config.js`を`fs.watch`で監視し、変更時にCSS / 型を再生成する。
- `@lism-css/plugin/builder`の`generateLismScss(opts)`: 自前SCSSビルド向けに、config適用済みsettingのbridgeを`_lism-config.gen.scss`・`lism-setting.scss`（既定outDir=`<projectRoot>/.lism-css/scss`）へ生成する。消費側は`loadPaths:['.lism-css/scss']`+`NodePackageImporter`で、`@use 'lism-setting'`→`@use 'pkg:lism-css/scss/main_no_layer'`の順に読む（settingをconfig付きで先にロードする必要があるため順序依存）。

`withLism`のオプションは`packages/plugin/src/builder/next.ts`の`WithLismOptions`、`generateLismScss`は`packages/plugin/src/builder/scss-source.ts`の`GenerateLismScssOptions`を参照する。webpack / Next.jsでpurge用の`full.css`も生成するには`full: true`を指定する（webpackでは`css: true`も必要）。


## 処理フロー（Vite / Astro）

1. 起動時に設定ファイルを探す。`configPath`指定時はそのファイルだけを見る。
2. `lism-css/config.js`をユーザーの`lism.config.js`へaliasする。React / Astroコンポーネントの`CONFIG`もユーザー設定を読む。
3. CSSビルドも同じ設定を読む。マージ順は`defaultConfig`→`lism.config.js`。`full.css`用は`defaultConfig`→`full preset`→`FULL_CSS_DEFAULTS`（`breakpoints.xs: '360px'`）→`lism.config.js`。`FULL_CSS_DEFAULTS`は`packages/plugin/src/builder/load-config.ts`で定義し、purge併用を前提に`xs`を有効化する。ユーザー設定で上書きできる。
4. `isFullMode:true`なら、`main.css`系で使う設定も手順3のfull用設定と同じになり、`xs`の既定有効化も含む。
5. `import 'lism-css/main.css'`等をViteプラグインが捕捉し、設定反映済みCSSをその場でコンパイルして返す。`node_modules`内は書き換えず、一時ディレクトリへSCSSを複製して生成SCSS（`_prop-config.gen.scss` / `_prop-config-full.gen.scss` / `_tokens.gen.scss`）だけ差し替える。
6. 型生成が有効なら、`breakpoints`の追加BP、`props` / `traits`の追加キー、`isFullMode`、既定propへの追加値を`lism-env.d.ts`へ反映する（`generateLismEnvDts`）。追加値は`presets` / `utils`と参照するtokensから抽出し、`CustomPropValueRegistry`を拡張する。たとえば`tokens.space`にキーを足すと、`p`など`space`を参照するpropの値の型・補完に加わる。
7. `purge:true`時は、設定反映済みの`full.css`からknown selectorを作る。configで追加したクラスもpurge対象になる。


## 注意点

- `props` / `tokens`内のオブジェクトはdeep mergeされ、既存キーを残したまま個別キーを追加 / 上書きできる。配列はマージでなく置き換えなので、既存値を残すなら`lism-css/default-config`をimportしてspreadする（例: `ta: { presets: [...props.ta.presets, 'justify'] }`）。
- `tokens`の変数名はトークン形式に従う（既定→`--{token}--{key}` / `space`→`--s{key}` / `color`・`palette`→`--{key}` / `vars`→キーそのまま）。
- `tokens.vars`は`--L` / `--C` / `--fz-mol` / `--hl-unit` / `--s-unit`の構造変数。他トークンの計算式から参照される出力専用グループで、propsからは参照されない（ユーティリティ生成・prop受理・型導出の対象外）。既存キーの上書きだけを想定し、新規キーは`:root`に出るがどこからも参照されない。
- `space`と`bxsh`の変数は`:root`単独でなく`:root, .set--s` / `:root, .set--bxsh`で宣言される（`config/defaults/token-scope.ts`の`TOKEN_SCOPE`）。`.set--s`で余白単位をem化する等、クラスで構造変数を上書きしたときに派生値を再計算させるため。出力CSSに`:root`以外のセレクタが並ぶのは正常。
- `defaultImportant:true`はCSS生成時にSassの`$default_important`へ反映するビルド時設定。CSSを再生成しないと反映されず、ランタイム注入（`window._LISM_CSS_CONFIG_`）では切り替えられない。素のSassで`@use 'lism-css/scss/setting' with ($default_important: ...)`と明示した場合はそちらが優先。`main_no_layer` / `full_no_layer`は`$layer_mode: 0`から常に`!important`を付ける（`_mixin.scss`の`resolve_important`）ため、この設定も`props`の個別`important`も`@layer`ありビルドにだけ効く。
