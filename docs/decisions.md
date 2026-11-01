# 設計判断の記録

decisionsの決定記録はあくまでただ記録。今後の方針を確定させるものではない。再検討が必要な場合は、最新の現状を踏まえて考え直すこと。

- 領域ごとに、今有効な判断だけを置く。判断を覆したときは項目を足さず、同じ項目を書き換える。
- 日付順に積んでいた旧形式の記録は、[18107fc0cの`docs/decisions.md`](https://github.com/lism-css/core/blob/18107fc0c8c881200d8a6137d3e4808b89240f73/docs/decisions.md)で読める。
- アイコンの形状・収録・正本の判断は、[lism-css/iconsの記録](https://github.com/lism-css/icons/blob/main/docs/decisions.md)に置く。

## CSS設計

<a name="css-layers"></a>
### CSSレイヤーの構成と順序

- **決定と理由**:
  - コアは`lism-base → lism-block → lism-trait → lism-primitive → lism-custom → lism-utility`の6層の順序を先頭で宣言する（`packages/lism-css/src/scss/_with_layer.scss`）。各層の役割は[css-methodology.mdx](../apps/site/src/content/ja/css-methodology.mdx)に置く。
  - `b--`のベーススタイルを置く`lism-block`は`lism-base`の直後に置く。利用者が明示的に足す`is--`・`has--`・`l--`等に、`b--`のベーススタイルが記述順に関係なく必ず負けるようにするため。
  - 旧`lism-component`（v0.26.0より前の`c--`の置き場）は宣言に残さない。宣言だけ残すと公開文書の6層の表記と食い違い、互換のための説明を利用者向けに足すことになる。
- **守る条件**: 宣言からレイヤー名を外すと、利用者CSSの同名の`@layer`はエラーにならず初出の位置で登録され、優先度だけが変わる。並べ替えも利用者CSSの優先度を黙って変える。どちらも破壊的変更として扱う。
- **受容**: `@layer lism-component`を書いた利用者CSSや`@lism-css/ui` v0.26.0未満の`_style.css`は、エラーにならず優先度だけが変わる（lism-cssより後に読み込むと`lism-utility`より強く、前に読み込むと最弱）。移行先は`lism-block` / `lism-custom`。
- **関連**: uiのCSSがこの順序を崩さないための宣言は[ui-css-layer-order](#ui-css-layer-order)。

<a name="class-prefixes"></a>
### 独自クラスの接頭辞（`b--`・`c--`）の意味と併用

- **決定と理由**:
  - `b--`は「ベーススタイルをCSS（`lism-block`）で管理する基礎部品」の印にし、パッケージの提供物に限らない。利用者のプロジェクトにも`lism-block`があり、docsの作例のCSSを`lism-block`へ置いて`lism-custom`の`c--`で上書きする使い方が、レイヤー構成のままできるため。`b--`にする条件と命名の形は[css-rules.md](../skills/lism-css-guide/css-rules.md)の「独自クラスの選び方（2分類）」に置く。
  - `c--searchModal b--modal`のような、`b--`と`c--`の本体クラスの併用を許可する。モーダルをナビ用・検索用に使い分けるなど、使う場所ごとに見た目を変えたい場面は普通にあり、`c--`の`lism-custom`は`lism-block`より後ろのレイヤーなので記述順に関係なく`c--`が勝つ。
- **守る条件**:
  - 使う場所ごとの差分は`c--`側に書き、`b--`のModifierにしない。共通部品に特定ページ用の差分が入り込む。
  - 併用を`c--`のElement（`c--siteSearch_modal b--modal`）に限らない。どの`c--`の子要素でもない部品にも、Element名を付けることになる。
  - `b--`同士・`c--`同士の本体クラスは併用しない。同じレイヤー内でぶつかり、CSSの記述順で結果が変わる。
  - 接頭辞の混在を許すのは本体クラスどうしだけ。Modifierの接頭辞は本体クラスに合わせる（`b--btn c--btn--outline`は不可）。
- **関連**: [css-methodology.mdx](../apps/site/src/content/ja/css-methodology.mdx)のBlock Class・Custom Class、[ui-package-scope](#ui-package-scope)

<a name="divide-utilities"></a>
### 区切り線のUtility（`u--divide`・`u--enclose`）の扱い

- **決定と理由**: コアのCSSにも`util` propのプリセット型にも持たず、Utility ClassページのOpt-in節で`@layer lism-utility`へ足すCSS例として案内する。`gap`と子要素の`box-shadow`で線を描く方式で、`border`より描画がやや粗く、フレックスボックスで子要素自体が折り返すと行末にも線が出る。並び方向が切り替わるレイアウトの区切り線は`bdw`のブレイクポイント切り替えで`border`として描けるので、コアに持つ必要は薄い。コアから外しておけば、より良い実装が出たときに互換を抱えずに済む。`u--enclose`も同じ方式で同じ弱点を持つので、`u--divide`とそろえて扱う。
- **関連**: [utility-class.mdx](../apps/site/src/content/ja/utility-class.mdx)のOpt-in節

<a name="tt-values"></a>
### text-transformのクラス値の名前

- **決定と理由**:
  - クラス値は`-tt:uppercase` / `-tt:lowercase`と省略しない。値名の規則「6文字以上で意味が通るものは省略可」（[naming.mdx](../apps/site/src/content/ja/naming.mdx)）には当たるが、`uppercase`はTailwind等でも省略されずに使われる語で、CSSを知っている人ほど`-tt:uppercase`と書いてしまう。実際に自前スキルの例文でも、当時は存在しなかった`-tt:uppercase`を書いていた。
  - 旧クラス`-tt:upper` / `-tt:lower`はCSSから消し、propsの`tt="upper"` / `tt="lower"`だけを互換として残す。propsは`packages/lism-css/config/defaults/props.ts`の`tt`の`shorthands`で新しいクラスへ解決できるので、旧クラスをCSSに抱えずに、propsで書いた既存コードを壊さずに済む。
- **守る条件**:
  - 省略形の`fit`・`between`・`current`は維持する。Tailwindと同じ略し方で定着しており、`currentColor`はcamelCaseがクラス値として扱いづらい。
  - このリポジトリで管理するdocs・templates・patterns・mockupは、propsでも`uppercase` / `lowercase`を使う。
- **関連**: [deprecations.md](./deprecations.md)

<a name="space-tokens"></a>
### 余白トークンの刻み

- **決定と理由**:
  - 主軸の10刻みは係数がフィボナッチ数列で、タイポグラフィの縦のリズムを作るためのもの。水平方向のgapやpaddingはこのリズムに縛られなくてよいので、5刻みを隣り合う主軸の係数のちょうど中間値として置く。
  - 5刻みは`50`まで。`50`を超えるサイズは水平方向には使わないので中間値を置かない。「50までは5刻み」で覚えやすい。
  - 主軸は`70`まで。それより大きいサイズはトークンではなく個別の値で指定する。
- **守る条件**: 中間値の係数は、隣り合う主軸の係数のちょうど中間にする。`45`の係数を切りのいい`6`（48px = 3rem）にする案は、この規則から外れるので採らない。
- **前提**（2026-09-05時点）: `40`と`50`の間は水平方向のgapとしてまだ使う範囲だった。`80`（272px）はトークンで扱うサイズを超えていて、リポジトリ内に使用箇所がなかった。
- **関連**: `packages/lism-css/config/defaults/tokens.ts`の`space`

<a name="gutter-vars"></a>
### `.has--gutter`の余白量の変数

- **決定と理由**:
  - 余白量の変数は`:root`で定義する`--gutter-px`にする。命名規則の`--{target}-{prop}`（targetは`.has--gutter`、propは`padding-inline`の省略名`px`）に当たり、`.set--bleed`など`.has--gutter`の外からも同じ値を読める。以前の`--gutter--base`（`:root`の基準値）と`--gutter`（`.has--gutter`で基準値に戻す）の2層は、`--{prop}--{token}`がトークンのカタログ用の形なのにgutterには`base`以外の値がなく、`base`の定義（`:root`/`body`の初期値にセットされるもの）にも当たらなかった。祖先で`--gutter`を上書きすると入れ子の`.has--gutter`だけ基準値に戻り、`.set--bleed`や`-max-sz:full`と余白がずれた。
  - 1.xの間は`--gutter--base`と、`.has--gutter`がセットする`--gutter`を互換で残す。利用者が書いた上書きと参照をメジャーバージョンの中で壊さないため。`--gutter-px`が`--gutter--base`を参照する向きにして、`:root`での`--gutter--base`の上書きを効かせる。`.set--bleed`・`-max-sz:full`・`--sz--bleed`が`--gutter`を読むのも1.xの間は変えない。変えると、要素で上書きした`--gutter`が届かなくなる。
- **守る条件**:
  - `:root`に1語の`--gutter`を置いて1本化しない。`:root`で定義する1語の変数はカラートークンと色の計算用の変数だけで、命名規則上は色に見える。
  - 1.xの間、`.has--gutter`は`--gutter`をセットし続ける。`--gutter`をセットせずに`padding-inline: var(--gutter, var(--gutter-px))`とする案では、`.has--gutter`の内側で`var(--gutter)`を読むコードが壊れ、祖先で上書きした`--gutter`が子孫へ引き継がれて`--gutter-px`より優先される。
- **前提**（2026-10-29時点）: リポジトリ内に、`:root`以外で`--gutter--base`を上書きしている箇所はない。
- **受容**: `:root`以外で`--gutter--base`を上書きしても効かない。`--gutter-px`は`:root`で値が決まって子孫へ引き継がれるため。
- **関連**: v2で行う作業は[deprecations.md](./deprecations.md)、利用者向けの説明は[trait-class.mdx](../apps/site/src/content/ja/trait-class.mdx)

<a name="lts-tokens"></a>
### `lts`トークンの値の持ち方

- **決定と理由**: `xs`〜`xl`は`--lts--base`からの相対値（`calc(var(--lts--base) ± n)`）にし、`--lts--base`の既定は`0em`にする。固定のem値だと、フォントに合わせて基本字間を少し詰めたいときに全段階を上書きすることになる。`normal`は`calc()`に入れられないので、描画が`normal`と同じ`0em`を既定にする。
- **守る条件**: `--lts--base`の上書きは`:root`で行う前提にする。`var()`は宣言元の`:root`で置換されるので、子孫要素で上書きしても`xs`〜`xl`には伝わらない。
- **前提**（2026-09-05時点）: 子孫要素で`lts`を部分的に上書きする用途がないので、`TOKEN_SCOPE`に登録して`set--lts`を作ることはしない（公開クラスが増えるだけ）。必要になったら`packages/lism-css/config/defaults/token-scope.ts`の`TOKEN_SCOPE`へ1行で足せる。
- **受容**: 利用側が`--lts--base: normal`と書くと、`xs`〜`xl`の`calc()`が無効になる。長さで指定することを[tokens/typography.mdx](../apps/site/src/content/ja/tokens/typography.mdx)に書いている。

<a name="lh-tokens"></a>
### `lh`トークンの値の持ち方

- **決定と理由**: `lh`は[lts-tokens](#lts-tokens)と違い、`--lh--base`を置かずに各段階を固定値で持ち、中央のキーは`m`にする。`lh`はbodyにセットしない独立したスケールで、`hl`や`lts`のような「本文の既定」という意味の`base`が当てはまらない。
- **守る条件**: docsで`hl`と`lh`の既定値を互いに関連づけて説明しない。16px時にたまたま一致する程度の関係しかない。
- **前提**（2026-09-10時点）: `base`の上書きで`lh`全体を動かしたい場面は`lts`ほどない。
- **関連**: `packages/lism-css/config/defaults/tokens.ts`の`lh`

## コンポーネント

<a name="icon-data"></a>
### `Icon`とアイコンデータの分担

- **決定と理由**:
  - `lism-css`はアイコンのSVGデータを持たず、名前で指定するプリセットも持たない。`Icon`（`packages/lism-css`の`src/components/atomic/Icon/`と`astro/atomic/Icon/`）は、渡されたコンポーネント・SVG文字列・`viewBox`付きのSVG子要素・画像を描画する機能だけを持つ。コアに入れるアイコンを用途や利用頻度で選び続ける必要をなくし、描画機能とアイコンデータの責務を分けるため。
  - `@lism-css/ui`の既定アイコン（Alert・Callout・Modal・Popoverが使うもの）は、ui側の`src/helper/icons.ts`にSVG文字列で持つ。UIの既定値はUI側で完結させる。中身はiconsリポジトリのビルド結果から`scripts/generate-icons.mjs`で生成し、手で二重管理しない。同期の方法は[icons-repo](#icons-repo)。
  - templates・patterns・サイトのサンプルでアイコンを使うときは、`@lism-css/icons`のコンポーネントをimportして`Icon`へ渡す。
- **守る条件**: UIで使うアイコンだけでもコアへ戻さない。名前で引くプリセットは1つのオブジェクトにまとめてバンドルされるのでtree-shakingが効かず、収録を増やすほどコアが重くなる。
- **関連**: アイコンの形状・収録・`weight`の段階値は[iconsリポジトリの判断記録](https://github.com/lism-css/icons/blob/main/docs/decisions.md)、依存の指定は[icons-dependency-range](#icons-dependency-range)。

<a name="icon-weight"></a>
### `Icon`の`weight`と線幅の扱い

- **決定と理由**:
  - `Icon`は`weight`を解釈しない。外部コンポーネントにはそのまま渡し、ネイティブ要素（SVG文字列から描くsvg・`img`・`span`等）には出力しない。値の解釈と線幅への変換はアイコンパッケージが担う。コアが変換すると`@lism-css/icons`の段階値と二重管理になり、外部パッケージ固有の`weight`の値（Phosphorの`duotone`等）も妨げる。
  - `strokeWidth`・`weight`などの値は、素材の既定（iconオブジェクトの値・SVG文字列の属性）→ `Icon`のトップレベルのprops → `exProps`の順に後勝ちでマージする（`getProps.ts`の`getProps`）。利用側の指定が素材の既定に負けないようにするため。
  - `weight`の段階値と線幅指定との優先順位は、サイトの`@lism-css/icons`解説ページ（`apps/site/src/content/ja/packages/icons.mdx`）にだけ書き、Icon解説と配布用スキルからはそこへリンクする。アイコン側の更新のたびに複数の文書を直さずに済む。
- **守る条件**: `_icon.scss`の`.a--icon`に`stroke-width`の既定を入れない。`.a--icon`はlucide等の外部アイコンにも付き、CSSはSVGの属性より強いので、外部アイコンが自分で持つ`stroke-width`を上書きしてしまう。
- **関連**: マージ順と`weight`の受け渡しは`Icon.test.tsx`で検査している。

<a name="ui-package-scope"></a>
### `@lism-css/ui`に置く部品の線引き

- **決定と理由**: パッケージに置くのは、汎用のUI語彙（Button・Badge等）と、JSを伴うインタラクティブUI（Accordion・Modal・Tabs等）。どちらでもない部品は、利用者が手で書けない仕組みを持つかで残すかを決める。primitivesの組み合わせと少量のCSSで組めるもの（Chat等）はパッケージに置かず、docsの作例として`b--`のCSSごと紹介する。作例のCSSを利用者の`lism-block`レイヤーへコピーすれば、マークアップを変えずに同じ見た目になる。パッケージに入れると、時刻・既読・footerのような要求が発散しやすい。
  - ShapeDividerはCSSだけで組める飾り部品だが、セクションの境目の飾りとしてサイトをまたいで使い回せ、Chatのように要求が広がらないので、汎用のUI語彙として置く。中のSVGは利用者が自由に渡す。
- **関連**: docs側の作例の置き場は[site-ui-sections](#site-ui-sections)、作例のクラスを`b--`にする理由は[class-prefixes](#class-prefixes)。

<a name="ui-primitive-classes"></a>
### uiコンポーネントがprimitiveクラス・`u--cbox`を使う基準

- **決定と理由**:
  - primitiveの既定の宣言をそのまま使える部品は、primitiveのクラスを付けたまま`b--`のCSSで差分だけを書く（Alert・Callout・Avatar・Tabs）。異なる宣言が要る部品はprimitiveを外し、`b--`のCSSが自前で持つ（Button）。レイアウトが用途で変わる部品は既定のレイアウトを出力せず、利用者が`layout` propで指定する（AccordionのRoot）。
  - `u--cbox`はpropsで付けたままにし、色味の調整は部品のCSSで`--cbox-*`変数を上書きして行う。cboxのcolor-mixの計算式をui側へ複製しない。複製すると`_cbox.scss`の計算を変えたときにuiだけ取り残される。

<a name="ui-css-layer-order"></a>
### uiのコンポーネントCSSのレイヤー順序の宣言

- **決定と理由**:
  - `packages/lism-ui/src/components/*/_style.css`の各先頭に`@layer lism-base, lism-block;`を置く。各コンポーネントは自分の`_style.css`をimportするので、出力位置は利用側のバンドラが決める。`lism-css/main.css`より前に出力されると`lism-block`が最初のレイヤーとして登録され、`lism-base`より弱くなる（#644では`a`要素のButtonに下線とリンク色が残った）。`@layer`文は登録済みのレイヤーの位置を変えず、未登録のレイヤーを宣言順に後ろへ足すので、先頭の2層を固定すれば、後から読まれる`main.css`の宣言で残りの層が正しい順に並ぶ。
  - コンポーネントCSSの自動読み込みはやめない。`style.css`に一本化すると、利用者に`style.css`の読み込みを求める破壊的変更になり、使う部品のCSSだけを読み込む利点も失う。
  - `dist/style.css`は全部品の`_style.css`を結合するので、`build-css.js`が先頭の1つだけ残し、1つも無ければビルドを失敗させる。部品ごとのCSS（`dist/components/*/_style.css`）は各自の宣言を残す。
- **守る条件**:
  - 宣言するのは`lism-base`と`lism-block`の2層だけにする。全層を書くと、コア側でレイヤーを増減するたびにui側も直すことになる。ui側のCSSが使うレイヤーは`lism-block`だけにする。
  - 宣言は`src`の`_style.css`に書く。Astro版は`src`の`_style.css`を読むので、ビルド時に`dist`へ足す方式では効かない。
- **関連**: レイヤーの構成は[css-layers](#css-layers)。全`_style.css`の先頭にあることは`packages/lism-ui/src/components/styleLayerOrder.test.ts`で検査している。

<a name="tabs-react-state"></a>
### React版Tabsの状態の配り方

- **決定と理由**: `Tabs.Root`が`TabsContext`で`tabId`・選択中のindex・選択関数・キー操作・Tabのアンマウント通知を配り、TabとPanelがContextを見て属性とイベントを決める。`Tabs.Item`構成は「indexを自動で振って並べ替えるだけ」にし、`Tabs.Item`を使わない手動構成と同じ経路に通す。Astro版の手動構成は`setTabs`（DOMスクリプト）で動くので、React版も利用者に状態管理を書かせずに動かす。
- **守る条件**:
  - React版では`setTabs`を`useEffect`から呼ぶ方式にしない。DOM属性を直接書き換えるのでReactのstateとずれ、リスナーを解除できずStrictModeや再マウントで重複する。
  - 手動構成で利用者が指定するのは`index`だけにする。`tabId`はContextの値をpropsより優先する。Accordionの`accID`と同じ規約。
  - キー移動は同じtablist内のタブをDOM順にたどり、移動先のindexは`aria-controls`から戻す。ディープリンクは対象のTabがDOMに実在するかで判定する。手動構成ではタブ数を描画時に知れないため。
  - 選択中のTabがアンマウントされたら、DOM順で先頭のTabへ選択を移す（そのTabにフォーカスがあればフォーカスも移す）。選択が外れたままだと、残るTabがすべて`tabIndex=-1`・Panelがすべて`hidden`になり、キーボードでタブ群へ戻れなくなる。DOMに要素が残る擬似アンマウント（StrictMode等）は補正しない。
  - 手動構成では、範囲外のindexを`1`へ戻す補正をしない（Astro版の手動構成と同じ）。補正するのは一度マウントされたTabが外れた場合だけで、一度も存在しないindexの指定は選択なしのまま残す。後から対象のTabが増えたときに、利用者の指定を勝手に別のタブへ移さないため。
- **関連**: 手動構成の使い方と制約は[Tabsのドキュメント](../apps/site/src/content/ja/ui/Tabs.mdx)。

## パッケージの構成と公開

<a name="package-versions"></a>
### パッケージごとのバージョンの上げ方

- **決定と理由**:
  - `@lism-css/mcp`はlism-cssと同じバージョンで、lism-cssのリリースごとに出す。mcpはapps/siteから作ったdocs-indexと`skills/lism-css-guide`をビルド時に同梱して配るため、coreに合わせて出し直さないと古い情報を返し続ける。手順は`/release`（`.claude/commands/release.md`の「mcpの特別ルール」）に組み込んである。
  - それ以外のパッケージ（`@lism-css/ui`・lism-cli / create-lism・`@lism-css/plugin`・`@lism-css/mockup`）はcoreとバージョンを揃えず、自身に変更があったときだけ上げる。揃えると、変更の無いパッケージまで再リリースすることになる。
  - v1（2026-10-01）で1.0.0にしたのはlism-cssとmcpだけ。uiはベータとして扱うので0.xを続ける。lism-cli・plugin・mockupはもともとcoreに合わせず自身の変更時だけ出す運用なので、v1で揃える理由がなく、各自のバージョンを続ける。
- **守る条件**: mcpだけは「変更があったときだけ上げる」にしない。docs-indexやガイドの差分を毎回見極めることになり、判断が漏れると古い情報が残る。
- **前提**（2026-10-01時点）: uiはまだベータとして扱っている。uiを1.0.0にするときは、この項目と[ui-core-dependency](#ui-core-dependency)・[deep-imports](#deep-imports)の互換の範囲を見直す。
- **関連**: 互換処理を消す時期の目安は[deprecations.md](./deprecations.md)。

<a name="ui-core-dependency"></a>
### uiの`lism-css`への依存の指定

- **決定と理由**: `@lism-css/ui`は`lism-css`へ`workspace:^`で依存する（`packages/lism-ui/package.json`）。公開時に`^{その時点のcoreのバージョン}`になり、下限がテストしたcoreのバージョンを示す。coreだけを更新しても、利用者のプロジェクトでuiの下に別バージョンのlism-cssが重複して入らない。
- **守る条件**:
  - 固定バージョンになる指定（`workspace:*`）に戻さない。coreだけが新しくなると、uiのJSは古いlism-css、CSSはプロジェクト直下の新しいlism-cssを使う。固定してもテストした組み合わせにはならず、lism-cssが重複するだけになる（npmで再現確認済み）。
  - 依存の下限は公開時のローカルのcoreのバージョンになるので、同時リリースではcoreを先にpublishする（`/release`の手順に組み込み済み）。
- **関連**: `lism-cli ui add`でコピーされたコードには依存の指定が効かない。その互換は[deep-imports](#deep-imports)で扱う。

<a name="deep-imports"></a>
### lism-cssの深いパスの公開範囲

- **決定と理由**:
  - `lism-css/lib/*`・`lism-css/react/*`・`lism-css/astro/*`の深いパスのうち、公開APIは`lism-css/lib/getLismProps`だけにする。`lism-css-guide`スキルで利用者に案内しているため。それ以外は内部用とし、利用者にはapps/siteの`core-components/Lism.mdx`の`getLismProps()`の節で示す。`lism-css/scss/*`はdocsで案内しているので公開API。1.0.0以降は公開APIを壊す変更にメジャー更新が要るため、内部を整理するたびにメジャー更新が要らないよう約束する範囲を絞った。
  - uiのソースが一度でもimportした深いパスと名前は、uiが使わなくなっても1.xの間はできれば互換を保つ。公開APIではないので約束はしない。`lism-cli ui add`はuiのソースを利用者のプロジェクトへそのままコピーし、コピーされたコードは利用者のlism-cssを直接importする。uiを更新してもコピーは置き換わらないので、lism-cssだけを更新した利用者の環境で壊れるのを避ける。一覧は`packages/lism-ui/src/components/lismCssDeepImports.test.ts`が持ち、lism-css側で消えていないかと、uiが一覧に無い深いパスを使っていないかを検査する。
  - 内部モジュールを非互換に変えたいときは、なるべく新しいモジュールを別名で足してuiを切り替え、古いほうは2.0.0で消す。既にコピーされたコードは古いモジュールを使い続けられる。やむを得ず1.xで壊すときは、テストの一覧からも外す。
- **受容**: uiが使うため、`packages/lism-css/package.json`の`exports`はワイルドカードのまま残す。内部用のモジュールも技術的にはimportできる。
- **関連**: v2で行う削除作業は[deprecations.md](./deprecations.md)の「uiが使わなくなった深いパス」。uiの依存の指定は[ui-core-dependency](#ui-core-dependency)。

<a name="icons-repo"></a>
### アイコンパッケージの置き場とuiへの反映方法

- **決定と理由**:
  - `@lism-css/icons`は別リポジトリ`lism-css/icons`で開発・公開する。アイコンパッケージは`lism-css`に依存せず独立性が高く、同じリポジトリに置くとアイコンの追加要望や不具合報告が本体のissueに混ざる。コアがSVGデータを持たなくなり（[icon-data](#icon-data)）、このリポジトリで再生成が要るのは`@lism-css/ui`の既定アイコンだけになったので、別リポジトリにしても「アイコンを公開してからこちらで再生成」の二段階は毎回は起きない。
  - uiの既定アイコン（`packages/lism-ui/src/helper/icons.ts`）は、ローカルでビルドしたiconsリポジトリの`dist/data.js`を`gen:icons --source`（`packages/lism-ui/scripts/generate-icons.mjs`）で読む手動同期で更新し、生成物をコミットする。`lism-cli ui add`がGitHub上の`packages/lism-ui/src/helper`をそのまま配信するため、ビルド時生成にはしない。手順はルートの`CLAUDE.md`。
- **守る条件**: uiがnpmの`@lism-css/icons`にdevDependencyとして依存して読む形にしない。アイコン側を先に公開しないとuiがビルドできない順序制約が残る。
- **関連**: iconsリポジトリ側の判断は[lism-css/iconsのdecisions.md](https://github.com/lism-css/icons/blob/main/docs/decisions.md)。解説ページはapps/siteの`packages/icons.mdx`に置いている。

<a name="icons-dependency-range"></a>
### サイト・テンプレートの`@lism-css/icons`依存の指定

- **決定と理由**: apps/siteと`templates/*`の`package.json`は`@lism-css/icons`を`*`で指定し、実際に使うバージョンはルートの`pnpm-lock.yaml`で決める。アイコン側のリリースごとにサイト・テンプレートの依存範囲を書き換える手間をなくすため。新版を取り込むときはlockfileを更新する。
- **守る条件**: `workspace:`プロトコルで指定しない。`lism-cli create`は`workspace:`の依存を公開版の`^x.y.z`へ置き換えるが（`packages/lism-cli/src/commands/create.ts`の`rewriteWorkspaceDeps`）、置き換えに使う版数は`packages/lism-cli/tsup.config.ts`で焼き込んだ公開Lismパッケージにしか無く、知らない依存にはlism-cssの版数が入る。`*`ならこの置換の対象から外れ、生成したプロジェクトにもそのまま残る。
- **関連**: iconsリポジトリの置き場は[icons-repo](#icons-repo)。

## ビルド・開発ツール

<a name="turbo-self-build"></a>
### lism-cssの`lint`・`typecheck`のビルド依存

- **決定と理由**: `turbo.json`で`lism-css#lint`と`lism-css#typecheck`は、`^build`に加えて自身の`build`にも依存させる。この2つは自パッケージの`dist`の型定義で型を解決する（`packages/lism-css/astro/`などが`lism-css/lib/*`を自己参照のexportsでimportする）。`^build`だけだと`build`と同時に走り、distの再生成と競合して型解決が壊れる。
- **守る条件**: turboのキャッシュでdistが残っていると問題が表面化しない。ローカルやキャッシュの効いたCIで通ることを、この依存を外す根拠にしない（lockfileの変化でキャッシュが切れたCIで初めてlintが落ちた）。

<a name="plugin-purge-emit"></a>
### `@lism-css/plugin`のpurgeが出力し直すCSSの出し方

- **決定と理由**: purgeでファイル名が変わるCSSは、`generateBundle`で元のアセットを`bundle`から消し、`this.emitFile`で出し直す（`packages/plugin/src/purge/vite.ts`の`lismPurge`）。Rolldown（Vite 8）は`generateBundle`の`bundle`への新キー代入を無視するため、キーを付け替える方式ではCSSが出力されない。
- **守る条件**: pluginはpeerでVite 6〜8を受けるので、Rollup（Vite 7まで）とRolldown（Vite 8）の両方で出力される方式にする。Rolldownでの検証は`vite8`（`npm:vite@8`）エイリアスを使う`packages/plugin/src/purge/vite.test.ts`で行う。
- **前提**（2026-09-18時点）: pluginのdevDependenciesのviteは7のままにしている。monorepo内のVite 7の利用者である`@lism-css/mockup`と型を揃えるため。

<a name="mockup-vite-cache"></a>
### mockupの共有viteキャッシュの排他

- **決定と理由**: `@lism-css/mockup`は依存最適化のviteキャッシュを複数プロセスで共有する。viteはキャッシュのcommitを連続の`renameSync`で行い、プロセス間の排他が無いため、同じcacheDirへ同時に書くと片方が失敗してブラウザ表示が壊れる。そこで共有パスを`<共有パス>.inuse.<pid>`へrenameして原子的に占有する（`packages/mockup/src/core/cache-claim.ts`の`claimViteCacheDir`）。占有できなければ`null`を返し、呼び出し側はプロセス固有のディレクトリへ退避する。退避してもキャッシュを再利用せず毎回事前バンドルするだけで機能は同じなので、この関数は例外を投げない。
- **守る条件**:
  - 各プロセスが書くのは自分のpid名のディレクトリだけにし、renameの元になるのは共有パスと死んだpidの残骸だけにする。
  - 死んだpidの残骸は次の起動で回収する。回収しないと、クラッシュ1回でOSのtmp掃除まで共有キャッシュが使えなくなる。
  - 残骸の回収を、回収専用の別のロックで直列化しない。そのロックがクラッシュで残ると、以後の回収が止まる。
- **受容**: pidの再利用によるABA。生きたプロセスの占有ディレクトリを他プロセスが動かす操作は無いが、pidの再利用だけは区別できない。

## テンプレート・CLI

<a name="template-variant-type"></a>
### variant違いのテンプレートの持ち方

- **決定と理由**: 同じカテゴリのvariant違い（LPの業種別など）は、`single-project-variant`型で1プロジェクトの`src/pages/{variant}/`に並べる。variant間では独自のkeyframesやclass prefixなど構造の違いが大きく、「共通base＋variantごとの差分」で配っても共通にできる部分が薄い。1プロジェクトなのでプレビューも1サイトにまとめてビルドできる。型の仕組みと追加手順は[cli-guide.md](./cli-guide.md#テンプレ運用)と`templates/manifest.ts`の`SingleProjectVariantTemplateDef`にある。
- **守る条件**: まだテンプレートの無い`web`カテゴリ（`templates/manifest.ts`の`CategoryId`）を作るときも、この型に倣う。業種ごとに構造が違う点はLPと同じなので、共通base＋差分（旧`base-overlay`型）を復活させる理由にならない。

<a name="template-html-dist"></a>
### LPテンプレートのHTML版の配布

- **決定と理由**: LPテンプレート（`templates/lp/astro/`）のビルド結果をHTML版としてCLIから配らない。Astroの出力はminify済みで手編集に向かず、JSは`type="module"`なので`file://`で開くと動かない。配るには生成物を整形・変換してコミットし、sourceとのずれをCIで検査し続ける必要があり、その保守に利用価値が見合わない。
- **前提**（2026-09-30時点）: `lism-cli create`はgigetでGitHub上の`templates/`を取得するため、配るファイルはリポジトリにコミットしておく必要がある。
- **受容**: HTMLが欲しい利用者には、Astro版をビルドした`dist/`を使ってもらう。

<a name="templates-markdown"></a>
### techlogテンプレートのMarkdown / MDX処理

- **決定と理由**: `templates/blog/astro/techlog`のMarkdown / MDX処理は`unified()`を使わず、Sätteriにする。テンプレートは利用者の出発点なので、Astro 7の既定に合わせる。独自の記法（`:::type`、URL単独段落のLinkCard、`[[slug]]`、見出しアンカー）は`src/lib/satteri/`のMDAST / HASTプラグインで持つ。Sätteriを選んだ理由、未対応の`:::type`をコンパイルエラーにする理由、`smartPunctuation`の`--`のダッシュ変換を止める理由は`apps/site`と同じ（[site-markdown](#site-markdown)）。techlogで変換を止めているのは、記事の見出しにクラス接頭辞（`b-- / c--`）を書くため。
- **前提**（2026-09-18時点）: Astro 7の既定プロセッサはSätteriで、`unified()`はremark / rehypeプラグインをまだ移植できない場合の代替という位置付け。
- **関連**: 見出しIDをAstroより先に付ける理由は`src/lib/satteri/heading-anchor.mjs`の冒頭コメント。

<a name="templates-compress-html"></a>
### テンプレートの`compressHTML`

- **決定と理由**: テンプレートの`compressHTML`はAstro 7の既定（`'jsx'`）のままにし、`astro.config.mjs`に書かない。`apps/site`が`true`にしているのはドキュメントの出力差分を抑えるためで（[site-compress-html](#site-compress-html)）、利用者の出発点になるテンプレートには当てはまらない。
- **前提**（2026-09-18時点）: Astro 6からの更新時、5テンプレートの全撮影ページがAstro 6のビルドとピクセル一致した（差分は写真の再エンコードと記事本文の更新だけ）。
- **受容**: `'jsx'`はインライン要素間の空白も落とすので、空白が見た目に要る箇所はマークアップで明示する（`{' '}`等）。

## ドキュメントサイト（apps/site）

<a name="site-workspace-name"></a>
### サイトのワークスペース名

- **決定と理由**: サイト本体のワークスペースは`apps/site`、パッケージ名は`lism-site`、ルートスクリプトは`*:site`の形にする。「docs」がサイト本体・プロジェクト文書の`docs/`・サイトのURLパス`/docs/`の3つを指し、AIエージェントへの指示で取り違えが起きていたため。
- **守る条件**:
  - URLパス`/docs/`、コンテンツディレクトリ`src/content`、エージェント名・コマンド名（`lism-docs-editor`・`docs-update`等）は改名の対象にしない。公開URLや運用の呼び名を変えずに済ませるため。
  - `apps/site/scripts/generate-lastmod-map.ts`は旧パス`apps/docs`の履歴も読み、内容の変わらないワークスペース移動を更新として数えない。外すと全URLのlastmodが改名日になる。

<a name="site-hosting"></a>
### サイトの配信先と配信設定の置き場

- **決定と理由**:
  - 静的サイトをCloudflare Workersの静的アセット配信で出す。`@astrojs/cloudflare`アダプターは使わない（サーバー処理が要らない）。Workerのカスタムドメインに必要なため、`lism-css.com`のDNSゾーンもCloudflareに置く。Vercelから移したのは、Vercelの`headers`がパスパターン式で、存在しない`.md`の404にも`text/markdown`が付く不整合（#506）を直せなかったため。
  - 配信設定は`apps/site/wrangler.jsonc`・`public/_headers`・`public/_redirects`に置き、コードで管理する。`workers_dev: false`もダッシュボードではなく`wrangler.jsonc`で持つ。
  - `.md`のcharset付き`Content-Type`は、`run_worker_first`で`.md`だけに挟む`apps/site/worker/index.ts`で成功応答と304にだけ付ける。応答ヘッダーの仕様は[docs-md.md](./docs-md.md#mdの応答ヘッダー)。
  - HSTSは`_headers`の`/*`ルールで付ける。www→apexの301（Redirect Rule）とHTTP→HTTPS（Always Use HTTPS）は、ファイルで持てないのでゾーン設定で持つ。
- **守る条件**:
  - Workerの設定をダッシュボードだけで変えない。次の`wrangler deploy`で`wrangler.jsonc`の内容へ戻る。
  - `.md`の`Content-Type`を`_headers`へ移さない。`_headers`は存在しない`.md`の404にも当たり、#506が再発する。
- **前提**（2026-09-17時点）:
  - Cloudflare Pagesは新規利用ではWorkersが公式に推奨されていたので採らなかった。
  - ダッシュボードのHSTS設定はmax-ageの上限が12か月で、Vercel時代と同じ値を出せなかった。
  - Vercel側のプロジェクト・ドメイン・DNSゾーンは削除済みで、Vercelへ戻す手段は無い。
- **受容**: `_redirects`やRedirect Ruleのリダイレクト応答にはHSTSが付かない。存在しない`.md`の404にも`_headers`の`X-Robots-Tag: noindex`が付く。
- **関連**: ビルドとデプロイの実行場所は[サイトのビルドとデプロイの実行場所](#site-deploy)。

<a name="site-deploy"></a>
### サイトのビルドとデプロイの実行場所

- **決定と理由**: 本番のビルドとデプロイはGitHub Actions（`.github/workflows/deploy.yml`）で行う。`main`へのpushで`build:site`と`wrangler deploy`を実行し、`.turbo`を`actions/cache`で引き継いで変更のない依存パッケージのビルドを省く。Cloudflare側のビルド（Workers BuildsのGit連携）は使わない。同じコミットのビルドがActionsの方が速く、turboのキャッシュも残せるため。
- **守る条件**:
  - Workers BuildsのGit連携を有効に戻さない。Actionsと二重にデプロイされる。
  - Cloudflareの認証はGitHub secrets（APIトークンとアカウントID）で行い、secretsを使うjobのトリガーは`main`へのpushに限る。forkからのPRにsecretsを渡さないため。
- **前提**（2026-09-17時点）:
  - 本番ビルドはWorkers Buildsで約9分、同じコミットをActionsのランナーで約5.5分（Vercel時代は約4分）。公開リポジトリのActionsは無料・無制限。
  - Workers Buildsのビルドキャッシュはpnpmストアと`node_modules/.astro`だけでturboのキャッシュが残らず、依存3パッケージを毎回ビルドしていた（#624）。VercelのリモートキャッシュをWorkers Buildsで使う案はVercelへの依存が残り、turboの`cacheDir`を`node_modules/.astro`配下へ向ける案は7日で失効することと、パスの扱いが未確認の仕様に頼ることから採らなかった。
- **受容**: PRごとのプレビュービルドとPRへのコメントは無い。
- **関連**: 公開の手順・除外パス・secretsの扱いは[docs-update.md](./docs-update.md#公開する)。

<a name="site-markdown"></a>
### サイトのMarkdown / MDX処理

- **決定と理由**:
  - Markdown / MDXの処理はAstro 7の既定のSätteriで行う。`@astrojs/mdx`もMDXを`markdown.processor`へ委ねるため、`## 見出し {#id}`の見出しID指定（`headingAttributes`）がMDXでも使える。自前のプラグインは`apps/site/src/lib/satteri/`のMDAST / HASTプラグインで持つ。`docs-md` integrationのHTML→Markdown変換はこの対象に入らず、unifiedのまま（[docs-md.md](./docs-md.md)）。
  - `:::type`はMDASTプラグイン（`directive-callout.ts`）で`<Callout type>`の`mdxJsxFlowElement`に変換し、`Callout.astro`をそのまま使う。HAST側でコンポーネント相当の要素を組み立てると、プリセット（色・アイコン）を二重に持つことになる。
  - 未対応の`:::type` / `::name`はコンパイルエラーにする。Sätteriは処理されなかったdirectiveを黙って捨てるので、typoが本文の欠落として公開される。
  - `smartPunctuation`はダッシュの変換だけを止め（`dashes: false`）、引用符と省略記号の変換は残す。本文や見出しのクラス名・接頭辞（`u--cbox`、`b-- / c--`等）の`--`がダッシュに変換されるため。この理由はtechlogテンプレートにも当てはまる（[techlogテンプレートのMarkdown / MDX処理](#templates-markdown)）。
- **守る条件**: ダッシュの変換を戻すなら、クラス名を含む本文・見出しが変わらないことを確かめる。
- **前提**（2026-09-18時点）: 本文中でダッシュの意味で`--` / `---`を書いている箇所は無かった。
- **関連**: プラグインごとの処理は[apps/site/spec.md](../apps/site/spec.md)。

<a name="site-compress-html"></a>
### サイトの`compressHTML`

- **決定と理由**: `apps/site`は`compressHTML: true`を明示し、Astro 6と同じ空白処理を保つ。Astro 7の既定`'jsx'`はインライン要素の間の空白まで落とし、全ページの出力が変わる。`'jsx'`へ切り替えるかは、効果と出力の差分を見て別に決める（未検討）。テンプレートの設定は[テンプレートの`compressHTML`](#templates-compress-html)。

<a name="site-ui-sections"></a>
### docsの`ui/`の分類と作例の置き場

- **決定と理由**:
  - `ui/`は「Blocks（`@lism-css/ui`の提供物）」と「Examples（`ui/examples/`）」の2分類にする。セクションに仕立てられる作例は、部品の大きさでも見出し付きのセクションとして成り立つなら`patterns/`へ置く。セクションにならない部品と、技法の解説が本体のページは`ui/examples/`へ置く。
  - CSSの有無と`b--` / `c--`では置き場を分けず、ページ内で明示する。同じTimelineが`ui/`では`b--timeline`、patternsでは`c--timeline`で書かれ、patternsも`_style.css`付きの作例を載せており、どちらも境界にならないため。
  - パッケージから外した部品（Chat等）は、`ui/examples/`に`b--`の作例として載せる。作例のCSSを利用者が`@layer lism-block`へコピーすれば、マークアップを変えずに同じ見た目になる。パッケージに残すかの線引きは[`@lism-css/ui`に置く部品の線引き](#ui-package-scope)、接頭辞の意味は[独自クラスの接頭辞の使い分けと併用](#class-prefixes)。
  - 作例のURLは`/ui/examples/{slug}/`。公開実績のある旧URL（`/ui/components/*`・`/ui/block-examples/*`等）は`apps/site/src/config/redirects.ts`でリダイレクトする。
- **守る条件**: ディレクトリ名・URLと分類をそろえる。ラベルだけを変えると、ディレクトリ名と分類がずれたまま残る。
- **前提**（2026-10-01時点）: 作例をdocs側へ移して`ui/`をパッケージの提供物だけにする案は、docsのサイドバーがすでに9セクションあり作例が埋もれるので採らなかった。

<a name="og-image-font"></a>
### OG画像の描画方式とフォント

- **決定と理由**:
  - 記事ページのOG画像は、無地の背景に上下2本の罫線・タイトル・説明文・右下のロゴを`apps/site/src/lib/ogImage.tsx`の`renderOgSvg`（satori）で描く。説明文を画像に入れるのは、Xのリンクカードが説明文を表示せず、画像の中の説明文だけが内容を伝えるため。
  - フォントはサイト本体と同じGen Interface JPにする。satoriが読めるTTFを、リリースzipから常用漢字・人名用漢字と記事の実際の文字でサブセットして`src/assets/og/`にコミットする（`scripts/subset-og-font.ts`）。収録文字の一覧`og-font-chars.txt`を、サブセット化とビルド時の照合の両方が参照する唯一の正とする。
  - title / descriptionにフォント未収録の文字があればビルドを止める（`src/lib/pageHelpers.ts`の`generateOgImage`）。satoriは未収録の文字を空白で描いてエラーにしないので、放置すると文字の欠けた画像が公開される。
  - OG画像はビルドのたびに描き直し、キャッシュを持たない。以前のローカルキャッシュはキーにテンプレートの版や説明文を含まず、デザインを変えた後も古い画像が残る原因になっていた。
- **守る条件**: キャッシュを足すなら、キーに描画に関わる入力（テンプレート・フォント・title・description）をすべて含める。
- **前提**（2026-09-05時点）:
  - Gen Interface JPのnpm配布はwoff2だけで、satoriはwoff2を読めない。
  - Noto Sans JPをフォールバックに残すと400と600で3MBを抱え続け、ビルドのたびにリリースzipを取得してサブセットすると毎回58MBの取得が走る。
  - 無地の描画なら全160枚が約2秒で終わる。
  - takumiは同じレイアウトの実測で処理時間が同等で、必要な`lineClamp`・省略記号・複数フォントのフォールバックはsatoriにあったので乗り換えなかった。
- **受容**: 記事のtitle / descriptionに新しい文字が入るとビルドが失敗し、`og:font`を実行してTTFと文字一覧をコミットし直す運用になる。

<a name="preview-iframe"></a>
### iframeプレビューの縮小方式

- **決定と理由**: ドキュメントのiframeプレビュー（`apps/site/src/components/Preview/PreviewFrame.astro`）は中身を等倍で埋め込み、`zoom` / `transform`で縮小しない。サイズ切替のモバイル・タブレットは本物のビューポート幅で描き、デスクトップは本文幅にする。広い画面での表示は「別タブで表示」で見せる。縮小すると、中身の高さに合わせる計算とブラウザごとの`zoom`の扱いの違いへの補正が残り続けるため。
- **守る条件**: 縮小を入れ直すなら、iframe内のdialogアニメーションの表示位置を崩さないこと（`transform: scale()`ではずれた）。
- **前提**（2026-09-03時点）: Safari 26.3以前は親の`zoom`をiframe内へ伝えず、高さのフィットが崩れてスクロールバーが出た。旧WebKitには`zoom`時のwidth・margin・`calc()`の扱いの不具合もあった（Safari 26.4で修正）。`zoom`を残して補正する案は、Chromeと旧Safariで挙動が分かれ、幅の整数丸めで1px未満のはみ出しが出るなど保守が重かった。
- **受容**: 目次のあるMDXページでは、デスクトップ表示が本文幅までしか見えない。
