基準日: 2026-09-30・コミットcd06232fa

# 意思決定の記録

## 2026-09-30: LPテンプレのHTML版はCLIで配らない

#375では、LPテンプレ（`templates/lp/astro/`）のビルド結果をHTML版としてCLIから配る予定だった。`static-html`型とCLIの分岐だけが先に実装されていた。調べると、Astroの出力はminify済みで手編集に向かない。JSは`type="module"`のため、`file://`で開くと動かない。さらにCLIはgigetでGitHubから取得するため、生成物をコミットし、sourceとのずれをCIで検査し続ける必要がある。

- 決定: HTML版は配らない。`static-html`型とstackの`html`、関連するCLIの分岐・文言・テストを削除する。
- 却下: #375の計画どおり`templates/lp/html/_generated/`を生成してコミットする案。整形・スクリプト変換・ずれ検査を保守し続ける手間に、利用価値が見合わない。
- 受容: HTMLが欲しい利用者には、Astro版を`npm run build`して`dist/`を使ってもらう。

## 2026-09-30: `@lism-css/mcp`はlism-cssと同じバージョンで出す

同日の決定「1.0.0以降、3つのバージョンは揃えない」のうち、mcpの部分を覆す。mcpはapps/siteから作ったdocs-indexと`skills/lism-css-guide`をビルド時に同梱して配るため、coreのリリースに合わせて出し直さないと古い情報を返し続ける。v0.26.0〜v0.30.0もcoreと同じバージョンで出していたが`/release`に書かれておらず、v0.31.0では出し忘れかけた。

- 決定: lism-cssをリリースするときは、mcpも同じバージョンにして公開する。手順は`/release`に組み込む。
- 決定: `@lism-css/ui`は同日の決定どおり、変更があったときだけ上げる。
- 却下: mcpも変更があったときだけ上げる案。docs-indexやガイドに差分があるかを毎回見極めることになり、判断が漏れると古い情報が残る。
- 対象外: lism-cssを出さずにmcpだけを直して出すときの番号の付け方。

## 2026-09-30: v1ではlism-css・ui・mcpだけを1.0.0にし、以降のバージョンは揃えない

v1リリースに向けて、各パッケージのバージョンの付け方を決めた。現在はlism-css・`@lism-css/ui`・`@lism-css/mcp`が0.30.0で揃い、lism-cli（create-lism）・`@lism-css/plugin`・`@lism-css/mockup`はそれぞれ別のバージョンで上げている。`/release`もパッケージごとにリリースする作り。

- 決定: v1ではlism-css・`@lism-css/ui`・`@lism-css/mcp`の3つを1.0.0にする。利用者が直接使うパッケージで、v1の安定宣言の対象にする。
- 却下: lism-cli・create-lism・`@lism-css/plugin`・`@lism-css/mockup`も1.0.0に揃える案。これらはcoreのリリースに合わせず、自身の変更があるときだけリリースする運用のため（`/release`のpluginの特別ルール）、v1の時点で揃える理由がない。各自のバージョンを続ける。
- 決定: 1.0.0以降、3つのバージョンは揃えない。変更のあったパッケージだけを上げる（例: uiだけ直して1.0.1）。
- 却下: v1以降も3つを常に同じバージョンにする案。変更の無いパッケージまで再リリースすることになる。

## 2026-09-29: `@lism-css/ui`のコンポーネントCSSは先頭で`lism-base, lism-block`の順序だけを宣言する

各コンポーネントは自分の`_style.css`をimportしており、そのCSSの出力位置は利用側のバンドラが決める。`lism-css/main.css`より前に出力されると`lism-block`が最初のレイヤーとして登録され、`lism-base`より弱くなる（#644）。`a`要素の`Button`に下線とリンク色が残った。

- 決定: `packages/lism-ui/src/components/*/_style.css`の各先頭に`@layer lism-base, lism-block;`を置き、全ファイルにあることをテストで検査する。`@layer`文は登録済みのレイヤーの位置を変えず、未登録のレイヤーを宣言順に後ろへ足す。先頭の2層を固定すれば、後から読まれる`main.css`の宣言で残りの層が正しい順に並ぶ。ui側のCSSが使うレイヤーは`lism-block`だけ。
- 却下: 6層すべてを宣言する案。レイヤーを増減するたびにui側も直すことになる（`lism-component`の削除がその例）。
- 却下: コンポーネント側のCSSの自動読み込みをやめ、`style.css`に一本化する案。利用者に`style.css`の読み込みを求める破壊的変更になり、使うコンポーネントのCSSだけを読み込む利点も失う。
- 却下: ビルド時に`dist`のCSSへ宣言を付与する案。Astro版は`src`の`_style.css`を読むため効かない。
- 決定: `dist/style.css`は全コンポーネントの`_style.css`を結合するため、同じ宣言がコンポーネントの数だけ入る。`packages/lism-ui/build-css.js`がコンパイル後に先頭の1つだけ残し、1つも無ければビルドを失敗させる。共有の`compileCssTree`と`dist/components/*/_style.css`は変えない。

## 2026-09-28: 後方互換用の`lism-component`レイヤーを削除する

v0.26.0で`c--`を`b--`へ移行したとき（#546, #559）、旧`c--`の配置先だった`lism-component`は宣言だけ残した。宣言から消すと、利用者CSSの`@layer lism-component`が初出の位置で登録され、優先度が変わるため。空のレイヤーが公開文書の6層の表記と食い違うという報告があり、v1へ持ち越さずに互換を切る。

- 決定: `@layer`宣言から`lism-component`を外し、`lism-base → lism-block → lism-trait → lism-primitive → lism-custom → lism-utility`の6層にする。2026-08-15のレイヤー順の決定のうち`lism-component`の部分を覆す。
- 却下: 宣言を残し、公開文書へ後方互換レイヤーの注記を足す案。v1へ持ち越したくない互換のために、利用者向けの説明を増やすことになる。
- 受容: `@layer lism-component`を書いた利用者CSSや`@lism-css/ui` v0.26.0未満のCSSは、エラーにならず優先度だけが変わる（lism-cssより後に読み込むと`lism-utility`より強く、前に読み込むと最弱）。移行先はv0.26.0で案内済みの`lism-block` / `lism-custom`で、リリースノートに破壊的変更として書く。

## 2026-09-19: React版Tabsの手動構成はContextで状態を配り、`setTabs`は使わない

#87の問題12。React版は`Tabs.Item`内のTab・Panelにだけ状態とイベントを設定しており、`Tabs.Root`へList・Tab・Panelを直接置く手動構成は表示されるだけで動かなかった。Astro版は同じ構成が`setTabs`（DOMスクリプト）で動くため、React版も利用者に状態管理を書かせずに動かす。

- 決定: Rootが`TabsContext`で`tabId`・選択中のindex・選択関数・キー操作を配り、TabとPanelがContextを見て属性とイベントを決める。Item構成は「indexを自動採番して並べ替えるだけ」にし、両構成を同じイベント経路に通す。
- 却下: `useEffect`から`setTabs`を呼ぶ方式。DOM属性を直接書き換えるためReactのstateとずれ、リスナーを解除できずStrictMode・再マウントで重複する。
- 決定: 手動構成で利用者が指定するのは`index`だけ。`tabId`はContextの値をpropsより優先する（Accordionと同じ規約）。初期選択は`defaultIndex`→`isActive`付きのTab→`1`の順。`isActive`はAstro版の書き方をそのまま移せるようにするための互換。
- 決定: キー移動はtablist内のタブをDOM順にたどり、移動先のindexは`aria-controls`から復元する。ディープリンクは対象タブがDOMに実在するかで判定する。
- 決定: 選択中のTabがアンマウントされたら、DOM順で先頭のTabへ選択を移す（そのTabにフォーカスがあった場合はフォーカスも移す）。選択が外れたままだと残るTabがすべて`tabIndex=-1`・Panelがすべて`hidden`になり、キーボードでタブ群へ戻れなくなるため。TabはContextの`onTabUnmount`で自分の消滅を伝えるだけにし、DOMに要素が残っている擬似アンマウント（StrictMode等）は補正しない。
- 受容: 手動構成はタブ数を描画時に知れないため、範囲外のindexを`1`へ戻すフォールバックは行わない（Astro版の手動構成と同じ）。補正は一度マウントされたTabが外れた場合だけで、一度も存在しないindexの指定は選択なしのまま残す。後から対象のTabが増えた場合に、利用者の指定を勝手に別のタブへ移さないため。

## 2026-09-18: templates の Astro テンプレートを Astro 7 へ更新し、techlog の Markdown 処理も Sätteri へ移行する

`apps/site` の Astro 7 化（#580 PR1 / PR2）に続いて、`templates/*` の Astro テンプレート 5 つを astro 7.3 へ更新した。`lism-cli create` の生成物とプレビューサイトが変わるため、Astro 6 のビルド成果物と撮影画像を退避して比較したうえで採用した。

- 決定: techlog の Markdown / MDX 処理は `unified()` を維持せず Sätteri へ移行する。Astro 7 の既定であり、`unified()` は「まだ移植できない場合」の代替として残る位置付けのため、テンプレートの出発点としては既定に合わせる。remark プラグイン 3 つと `rehype-autolink-headings` は `src/lib/satteri/` の MDAST / HAST プラグインに移植し、記事の書き方は変えない。
- 決定: 見出しアンカーは HAST プラグインで `github-slugger` により先に `id` を付けてから `<a>` を追加する。Astro の見出し ID プラグインはユーザープラグインより後に走り、既存の `id` があればそれを採用するため、この順序で `render()` の `headings.slug` と一致する。
- 決定: techlog は `apps/site` と同じく `smartPunctuation: { dashes: false }` にする。見出し中の `b-- / c--` のようなクラス接頭辞がダッシュに変換されていた。他の 4 テンプレートは Markdown 設定を持たない。
- 決定: `compressHTML` は Astro 7 の既定（`'jsx'`）のままにする。5 テンプレートの全撮影ページで Astro 6 のビルドとピクセル一致した（差分は写真の再エンコードと記事本文の更新だけ）。`apps/site` が `true` にしたのはドキュメントの出力差分を抑えるためで、テンプレートには当てはまらない。
- 受容: `@lism-css/icons` 0.3.0 の peer `astro` が `^5 || ^6` のため、astro 7 では unmet peer の警告が出る。icons リポジトリ側で peer を広げるまで警告のみで動作に影響はない。
- 受容: Astro 7 は 4KB 未満の CSS を `<style>` へインライン化するため、lp の `_animations.css` は外部ファイルではなくページ内に出力される。

## 2026-09-18: Markdown / MDX の処理を Sätteri へ移行し、`--` のダッシュ変換を止める

Astro 7 の既定プロセッサである Sätteri へ `apps/site` の Markdown / MDX パイプラインを切り替えた（#580）。`@astrojs/mdx` 8 は MDX も `markdown.processor` へ委譲するため、`## 見出し {#id}` の見出し ID 指定が MDX でも使え、`hov.mdx` のリンク用空要素（`c--scrollTarget`）によるアンカー位置のずれを解消できる。remark / rehype プラグイン 3 つは `src/lib/satteri/` に Sätteri プラグインとして移植し、Astro 7 化直後のビルド成果物と全件比較して差分を分類した。

- 決定: `:::type` は MDAST プラグインで `<Callout type>` の `mdxJsxFlowElement` に変換し、`Callout.astro` をそのまま使う。HAST 側でコンポーネント相当の要素を組み立てる案は、プリセット（色・アイコン）の二重管理になるので採らない。
- 決定: 未対応の `:::type` / `::name` はコンパイルエラーにする。Sätteri は未処理の directive を黙って捨てるため、typo が本文の欠落として出る。旧パイプラインで素の `<div>` として出ていた `:::caution`（`is--wrapper.mdx`）は `:::warning` に直した。
- 決定: `smartPunctuation: { dashes: false }` にする。本文中のクラス名（`u--cbox`、`set--bxsh` 等）の `--` が em ダッシュに変換されていた（11 ページ）。プロース中に `--` / `---` をダッシュとして使っている箇所は無い。引用符と省略記号の変換は残す。
- 受容: Sätteri は表のセル・行の間に改行を入れる。HTML の表では表示に影響しない。ブロック要素間の改行数の差も同様。`en/css-methodology` の先頭の引用符が閉じ記号から開き記号（`“`）に変わる差は、正しい方向への修正として受け入れる。
- 対象外: `docs-md` 統合の HTML → Markdown 変換は引き続き unified（`rehype-parse` / `rehype-remark` / `remark-stringify`）を使う。`@astrojs/markdown-remark` と `unified()` プロセッサは `apps/site` から外した。

## 2026-09-18: Astro 7 へ更新し、compressHTML は true で v6 の空白処理を維持する

dev サーバーのコールドスタートでページ用 CSS が `<head>` に出ず、大きな FOUC が起きていた（#580）。原因は Astro 6 の dev サーバー内部の不具合 2 件の組み合わせで 6.x にバックポートは無く、head メタデータの機構が再設計された Astro 7 へ上げて根本対応した。Vite 8（Rolldown）と Rust コンパイラに切り替わるため、`dev` ブランチのビルド成果物と全件比較して差分を分類したうえで採用した。

- 決定: `compressHTML: true` を明示し、v6 の空白処理を維持する。Astro 7 の既定 `'jsx'` はインライン要素間の空白まで落とし、全ページの出力が変わる。`'jsx'` の採用は効果と差分を別途見てから決める。
- 決定: `disableServerTreeshake`（#624）は削除する。Rolldown では tree-shaking の有無で SSR コンパイル（約 6.1 秒）も全体（約 19 秒）も変わらなかった（各 2 回計測）。
- 決定: `@lism-css/plugin` の purge は、リネーム後の CSS を `this.emitFile` で出し直す。Rolldown は `generateBundle` の `bundle` への新キー代入を無視するため、キーを付け替える旧方式では CSS が出力されない。 plugin の devDependencies の vite は 7 のままにし（monorepo 内の Vite 7 利用者である mockup と型を揃えるため）、Rolldown の検証は `vite8`（`npm:vite@8`）エイリアスのテストで行う。
- 決定: `lism-css` の `lint` と `typecheck` は turbo で自身の `build` にも依存させる。この 2 つは自パッケージの `dist` の型定義（`lism-css/lib/*` の自己参照 exports）で型を解決するため、`^build` だけだと `build` と同時に走り、dist の再生成と競合して型解決が壊れる。`dev` では turbo キャッシュで dist が残っていたため表面化せず、lockfile の変化でキャッシュが切れた本 PR の CI で lint が落ちた。
- 受容: Rust コンパイラは入れ子 CSS の子セレクタ（`> code` 等）にもスコープ属性を付ける。スロット由来の要素を指す箇所（`PropBadge.astro`）だけ `:global()` で除外し、同一コンポーネント内の要素を指す入れ子は触らない。スコープ属性のハッシュ値、タグ間の空白の有無、CSS 関数引数の空白、インライン JS の minify 結果、生成アセットのハッシュ名の差は同値として受け入れる。
- 対象外: `templates/*` の Astro テンプレート 5 つは別 issue で追従する。

## 2026-09-17: apps/siteのデプロイをWorkers BuildsからGitHub Actionsへ移す

#511ではWorkers Builds（Git連携）を採用したが、本番ビルドが約9分とVercel時代の約4分より長くなった。同じコミットをGitHub Actionsのランナーでビルドすると約5.5分で、公開リポジトリのActionsは無料・無制限。Workers Buildsのビルドキャッシュはpnpmストアと`node_modules/.astro`だけでturboのキャッシュが残らず、依存3パッケージを毎回ビルドしていた（#624）。

- 決定: mainへのpushで`.github/workflows/deploy.yml`が`pnpm build:site`と`wrangler deploy`を実行する。`.turbo`を`actions/cache`で保存・復元する。除外パスはWorkers Buildsの監視パス除外と同じにする。
- 決定: Cloudflareの認証はGitHub secrets（APIトークンとアカウントID）で行う。トリガーはmainのpush限定なのでforkからのPRには露出しない。
- 決定: Workers BuildsのGit連携は最初のActionsデプロイが成功した後に解除する（二重デプロイの防止）。プレビューURLとPRコメントは無くなるが、非本番ビルドは既にOFFで実質の変化はない。
- 却下: VercelのリモートキャッシュをWorkers Buildsに足す案（Vercel依存が残る）。turboの`cacheDir`を`node_modules/.astro`配下に向けてWorkers Buildsのキャッシュに載せる案（7日で失効・パス基準未確認の仕様に依存する）。
- 対象外: apps/siteのコンパイル自体の軽量化は#624の2として別途扱う。

## 2026-09-17: 公式サイトの配信を Vercel から Cloudflare Workers へ移し、DNS ゾーンも Cloudflare に置く

apps/site は完全な静的サイトで、Vercel でのデプロイは昔の名残だった。Vercel の`headers`設定はパスパターン式のため、存在しない`.md`の404にも`text/markdown`が付く不整合（#506）を直せなかった。Worker の Custom Domain に必要なため、Vercel DNS にあった`lism-css.com`のゾーンも Cloudflare へ移管した（#511。2026-09-17完了、Vercel 側のプロジェクト・ドメイン・DNSゾーンは削除済みでロールバック手段は無い）。

- 決定: 配信は Cloudflare Workers の静的アセット配信＋Workers Builds の Git 連携（`main`への push で本番デプロイ）。`@astrojs/cloudflare`アダプターは使わない。設定は`apps/site/wrangler.jsonc`・`public/_headers`・`public/_redirects`で管理し、`workers_dev: false`もダッシュボードではなく`wrangler.jsonc`で持つ（ダッシュボードだけの変更はデプロイで戻る）。
- 決定: `.md`の`Content-Type`（charset付き）は`_headers`に書かず、`run_worker_first`の小さな Worker（`apps/site/worker/index.ts`）で成功応答と304にだけ付ける。`_headers`だと404にも付いて #506 が再発する。
- 決定: HSTS（Vercel と同じ2年）は`_headers`の`/*`ルールで付ける。ダッシュボードの HSTS 設定は max-age の上限が12か月で再現できない。www→apex は Redirect Rule で301（Vercel 時代は307）、HTTP→HTTPS はゾーン設定 Always Use HTTPS。
- 却下: Cloudflare Pages（新規は Workers が公式推奨）。小文字 URL の meta refresh リダイレクト76件を`_redirects`で301化する案（移行と独立した変更のためスコープ外）。
- 受容: リダイレクト応答に HSTS が付かない、存在しない URL の404に`X-Robots-Tag: noindex`が付く。

## 2026-09-13: weightの解釈をアイコンパッケージへ委ねる

`@lism-css/icons`がweightを受け取るようになり、コアの変換は重複した責務になった。また、コアがweightを線幅へ変換すると、外部パッケージ固有のweight指定を妨げる。アイコン側の更新ごとにサイト・テンプレートの依存範囲を書き換える手間もなくす。

- 決定: `Icon`はweightを外部コンポーネントへそのまま渡し、ネイティブ要素には出力しない。値の解釈と線幅への変換はアイコンパッケージが担う。
- 決定: weightの段階値と線幅指定との優先順位はサイトのicons解説ページに集約し、Icon解説と配布用スキルから参照する。
- 決定: サイト・テンプレートの`@lism-css/icons`依存は`*`とし、実際に使うバージョンはlockfileで管理する。既存プロジェクトへの新版取り込み時はlockfileを更新する。
- 却下: コアに`@lism-css/icons`固有のweight変換を残す案と、依存範囲をアイコンのリリースごとに書き換える運用。

## 2026-09-13: アイコンパッケージを`lism-css/icons`リポジトリへ分離する

アイコンパッケージは`lism-css`に依存せず独立性が高く、同じリポジトリに置くとアイコンの追加要望や不具合報告が本体のissueに混ざる。2026-09-10の「モノレポ内で公開する」は、別リポジトリ案を「公開→こちらで再生成の二段階が毎回発生する」として却下していたが、#618で全アイコンがオリジナル設計になり、#619でコアがSVGデータを持たなくなったため、モノレポ側で再生成が要るのは`@lism-css/ui`の既定アイコン8個だけになった。これを手動同期にすれば二段階の問題は消える。この決定を覆す。

- 決定: リポジトリは`lism-css/icons`、ブランチは`main`のみ、タグは`v{バージョン}`。npmの`@lism-css/icons`は新リポジトリから公開する。
- 決定: `@lism-css/ui`の既定アイコン（`src/helper/icons.ts`）はビルド時生成をやめ、ローカルでビルドしたiconsリポジトリの`dist/data.js`を読む`gen:icons --source`の手動同期でコミットする。`lism-cli ui add`がGitHub上のこのファイルを配信するため、生成物はコミット対象のまま。
- 決定: `apps/site`・templatesはnpmの`@lism-css/icons`を固定バージョンで参照する。`workspace:*`を使わないので`lism-cli create`の置換対象から外れる。
- 却下: `git filter-repo`で履歴を引き継ぐ案。履歴が数コミットしかなく、#616はコア側の変更と一体のコミットだった。
- 却下: `@lism-css/ui`がnpmの`@lism-css/icons`にdevDependencyとして依存する案。アイコン側を先に公開しないとuiがビルドできない順序制約が残る。
- 対象外: docsの`packages/icons`ページは`lism-css.com`に残す。

## 2026-09-12: アイコンのSVGデータをコアから分離する

コア収録アイコンを用途や利用頻度で選び続ける必要をなくし、描画機能とアイコンデータの責務を分ける。2026-09-10のコア34個への絞り込み方針を置き換える。

- 決定: `lism-css`はSVGデータを持たず、`Icon`の名前指定プリセットを廃止する。コンポーネント・SVG文字列・SVG子要素を描画する機能は維持する。
- 決定: UIの既定アイコンは`lism-ui`に持たせる。SVGの原本は`packages/icons`に集約し、必要なデータを生成して手作業での二重管理を避ける。
- 決定: templates・patterns・サイトのサンプルでは`@lism-css/icons`のコンポーネントをimportする。
- 却下: UIで使うアイコンだけをコアに残す案。UIの既定値はUI側で完結させる。

## 2026-09-12: 公式サイトのワークスペースは `apps/site` と呼ぶ

「docs」がリポジトリ内で3つの意味を持っていた。サイト本体の `apps/docs`、プロジェクト文書の `docs/`、サイトのURLパス `/docs/`。AIエージェントへの指示で取り違えが起きるため、サイト本体を `apps/site` へ改名した。Cloudflare Workers移行（#511）ではWorker名やWorkers Buildsのルートディレクトリを登録するので、その前に最終名へ揃えておく。

- 決定: ワークスペースは `apps/site`、パッケージ名は `lism-site`、ルートスクリプトは `dev:site` / `build:site` / `format:site` / `check:site`。
- 決定: `generate-lastmod-map.ts` は旧パス `apps/docs` の履歴も読み、内容変更なしのワークスペース移動だけを更新日時から除外する。全URLのlastmodがリネーム日になるのを防ぐため。
- 却下: `apps/web` は意味が広い。`@lism-css/site` はスコープを変える必要がないため見送り。
- 対象外: URLパス `/docs/`、コンテンツディレクトリ `src/content`、エージェント名・コマンド名（`lism-docs-editor`・`docs-update` 等）は変えない。

## 2026-09-10: text-transform のクラス値は省略せず uppercase / lowercase にする

Property Class の値名は「6文字以上で意味が通るものは省略可」として `-tt:upper` / `-tt:lower` を使っていた。ただし `uppercase` は Tailwind 等でも省略されずに使われる語で、CSSを知っている人ほど `-tt:uppercase` と書いてしまう。実際に自前スキルの例文でも存在しない `-tt:uppercase` を書いていた。実装は `config/defaults/props.ts` の `tt` を参照する。

- 決定: クラス名は `-tt:uppercase` / `-tt:lowercase` に変更し、`-tt:upper` / `-tt:lower` はCSSから削除する。
- 決定: props の `tt="upper"` / `tt="lower"` は互換として残し、`shorthands` で `-tt:uppercase` / `-tt:lowercase` に解決する。
- 決定: このリポジトリで管理する docs・templates・patterns・mockup は props も `uppercase` / `lowercase` に揃える。
- 対象外: `fit` / `between` / `current` は Tailwind と同じ略し方で定着しており、`currentColor` はキャメルケースが扱いづらいため維持する。

## 2026-09-10: `lh` トークンは固定値のままにし、値を `1.125`〜`2` に下げる

`--lh--xs`〜`--lh--xl` は `1.25`〜`2.25` で、中央の `m` が `1.75` と高めだった。`lts` と同じく base からの相対値（`calc`）にする案も検討したが、`lh` は body にセットしない独立スケールで、`hl` や `lts` のような「本文の既定」を意味する base が当てはまらない。

- 決定: 固定値のまま `m` を `1.5` に据え、`xs: 1.125` / `s: 1.25` / `l: 1.75` / `xl: 2` の 0.25 刻み（`xs` だけ 0.125 刻み）にする。キー名は `m` のまま。
- 却下: `--lh--base` を置いて `xs`〜`xl` を `calc()` で連動させる案。`lh` には body の既定という意味の base がなく、名前が実態と合わない。base の上書きで全体を動かしたい場面も `lts` ほどない。
- 対象外: `hl` と `lh` の既定値の対応関係。16px 時にたまたま一致する程度のものなので、ドキュメントでも互いの値を関連づけて説明しない。

## 2026-09-10: コアを34個に絞り、用途に応じて追加アイコンを使う

コア候補39個を見直し、塗り版と組み合わせるアイコンや用途の限られるアイコンは追加パッケージへ寄せる。サンプルの装飾はコア内で置き換えられるが、施設案内など意味のあるアイコンは依存を避けるためだけに別の形へ変えない。

- 決定: `cart`・`star`・`heart`・`lock`・`lock-open`をコアから外し、`@lism-css/icons`で提供する。収録対象は`packages/icons/scripts/config.mjs`の`coreIconNames`で管理する。
- 決定: docsのButton・Callout・Badge・Timelineなどのサンプルとinteriorは、コア内の別アイコンへ置き換える。
- 決定: ryokanの日英ページは`@lism-css/icons`の`Cart`と`Book`を使う。依存は共通のLPテンプレートへ追加する。
- 却下: 追加依存を避けることを優先し、売店のカートや書斎の本も別アイコンへ置き換える案。

## 2026-09-10: 半塗りの星は線と塗りを分け、既存の塗り版も残す

既存の`star-half`は輪郭まで塗りパスになっており、線幅では太さを変えられない。評価表示で半塗りを使いつつ、通常の`star`と輪郭の太さを揃えられるようにする。

- 決定: 既存の形状は`star-half-fill`へ名前を変え、塗りだけのアイコンとして残す。
- 決定: 新しい`star-half`は`star`の外周を線で描き、その背面に左半分の塗りを置く。中央の境界線は描かない。線幅の変更は外周だけに効き、塗り領域は固定する。
- 決定: どちらも`@lism-css/icons`専用とする。コア候補は39個を維持し、全体は47個になる。
- 対象外: 任意の割合で星を塗り分ける評価コンポーネント。

## 2026-09-10: コア候補は一般的なWebサイトで使う線アイコン39個とする

現在用意しているアイコンは、会員ページやショップを含む一般的なWebサイトに必要なUIを想定して選んでいる。UIコンポーネントとナビゲーションの用途だけに絞ると、ユーザー・カート・ログインなどの基本的な用途が抜ける。

- 決定: 線アイコン40個のうち、`book`を除く39個をコア候補とする。対象は`packages/icons/scripts/config.mjs`の`coreIconNames`で管理する。
- 決定: `book`と塗りアイコン6個は`@lism-css/icons`専用とする。同パッケージにはコア候補を含む46個すべてを収録する。
- 却下: コアをUI用8個と操作・ナビゲーション用10個の計18個に絞る案。
- 対象外: 別ファイルで管理しているロゴの収録先。コアへの実装反映はPhase 2で行う。

## 2026-09-10: `dot`を廃止し、iconsパッケージにも移さない

`dot`はdocs・templates・packagesに利用箇所がなく、塗り専用で`weight`にも追従しないため、残す必要がない。

- 決定: `dot`をコアのプリセットから削除する。`@lism-css/icons`にも収録しない。
- 決定: 正本の`dot`アートボードと生成入力からも削除する。
- 却下: コアに残す案と、iconsパッケージへ移す案。
- 対象外: `info`や`dots`などの内部にある小さな点。これらは決定済みの線描画円を維持する。

## 2026-09-10: コアのアイコンは厳選した線アイコンだけにし、残りは `@lism-css/icons` としてモノレポ内で公開する

`lism-css` の Icon プリセットは1つのオブジェクトにまとめてバンドルされ、tree-shaking が効かない。fill 系や用途の限られるアイコンまで含めるとコアが肥大する一方、`@lism-css/ui` は Alert / Callout / Modal / Popover で8個のプリセットを名前で参照しているため、コアからプリセットを全廃はできない。

- 決定: `lism-css` のプリセットは厳選した線アイコンだけにする。下限は `@lism-css/ui` が参照する `lightbulb` / `alert` / `warning` / `check-circle` / `question` / `info` / `note` / `x` に、ナビ系（caret・arrow・menu・dots・search・check）を足したもの。fill 系はコアから外す（現在の利用は templates の interior `caret-down-fill` と docs の Badge `star-fill` のみ）。
- 決定: 残りは `@lism-css/icons` として `packages/icons/` に置く。exports は `lism-css` と同じ形（`/react` は dist、`/astro` は生成した `.astro` をそのまま配布）。コンポーネントは `lism-css` に依存しない素の SVG で、`strokeWidth`（既定 1.5）を受ける。`<Icon icon={X} weight="bold">` はコアが `weight` を `strokeWidth` へ変換して渡す。
- 決定: コアのプリセットも同じ SVG 源から生成する（厳選リスト＋生成物）。Phosphor Icons の著作権表示と MIT 本文は `THIRD_PARTY_LICENSES` のようなファイルで両パッケージに同梱し、`files` に含める。
- 却下: 別リポジトリで管理する。プリセット・`@lism-css/ui` の参照名・docs の一覧・templates・スキルが全部このリポジトリにあり、別リポジトリだと「公開→こちらで再生成」の二段階が毎回発生する。iconsパッケージがコアに依存しない設計なら、外部からアイコンだけの貢献を受けたい・独立した見せ方をしたい・`.ai` が増えて重い、のいずれかが起きた時点で `git subtree split` で切り出せる。
- 対象外: `thin` ウェイトと、`weight` 以外の名前付き API。要望が出るまで足さない。

## 2026-09-10: アイコンの正本は Illustrator ファイル1つにし、書き出した SVG をリポジトリのビルド入力にする

Phosphor 由来もオリジナルも1か所で管理したい。Figma は `<circle>` と円弧を3次ベジェへ展開して書き出すため、svgo で円弧を戻してもドットが残り、Phosphor raw の2〜3倍のデータになる。Illustrator の「スクリーン用に書き出し」は `<circle>` / `<polyline>` / `<line>` と線属性を保つことを実際の書き出しで確認した。

- 決定: 正本は `lism-icons.ai` 1ファイル。24×24pt のアートボード1枚＝アイコン1個、アートボード名＝アイコン名。線は中央揃え・1.5pt・round cap / join。Phosphor raw（256グリッド）は線幅ごと 9.375% に縮小して配置する。
- 決定: 「スクリーン用に書き出し」（SVG、プレゼンテーション属性、小数3桁、オブジェクトID最小、レスポンシブ無し）で全アートボードを一括書き出しし、そのSVGをリポジトリに置いてビルド入力にする。書き出したSVGは手で編集しない（直すなら `.ai` を直して出し直す）。正規化（背景 `<rect>`・`id`・`data-name`・`<g>` の除去、`currentColor` 化、線幅とキャップのルート `<svg>` への寄せ、`stroke-linejoin="miter"` 等の例外だけ要素に残す）と `presets.ts` / コンポーネントの生成はスクリプトが行う。
- 決定: `.ai` は git LFS で管理し、PDF互換オフで保存する（4アイコンで PDF互換オン 602KB → オフ 244KB → 未使用パネル項目の削除後 142KB）。ビルド入力はSVGなので CI に LFS は不要。
- 却下: Figma を正本にする（データ肥大に加え、取り込みに API トークンと座席が要る）。書き出しSVGを直接編集する運用（`.ai` と乖離する）。
- 受容: Phosphor 由来のアイコンは `.ai` を経由すると円弧 `a` が `c` になり、raw より数%大きくなる（chat-teardrop-dots で 305 → 316 バイト）。LFS 未導入の共同作業者の手元では `.ai` がポインタファイルになる（SVG とコードには影響しない）。

## 2026-09-10: Icon プリセットを線データに切り替え、太さは `weight` / `strokeWidth` で変える（24グリッド）

現行のプリセットは Phosphor v2 の塗りアウトラインパスで、`caret-down` / `caret-right` / `arrow-down` / `arrow-right` の4つだけ bold 相当、他は regular のため、混ぜると太さが揃わない。太さ違いを名前で増やすとパスが丸ごと重複する。Phosphor v2 のウェイトは別パスだが、公式サイトの raw ダウンロードと `phosphor-icons/core` の `raw/` には線描画の元データがあり、線幅で太さを変えられる。

- 決定: プリセットは線描画（`fill="none" stroke="currentColor"`）の内部マークアップとし、線幅・キャップ・ジョインはルート `<svg>` の属性に持たせる。太さは `weight` の3段階（light 1 / regular 1.5 / bold 2）と、`strokeWidth` / `stroke-width` の素通しで変える。明示の `strokeWidth` が `weight` より優先。描画は React / Astro 両方に既にある `__html` 経路を使う。
- 決定: viewBox は `0 0 24 24`。Phosphor regular（256グリッドで16）は 1.5 になり、heroicons outline や lucide（24グリッド・stroke 2）と同じ土俵で数値を比べられる。既存の `menu-2` も 24 グリッド。
- 決定: `getProps.ts` のマージ順を「プリセットの既定 → 利用側の値」に直す。現在は `exProps = { ...exProps, ...presetIconData }` でプリセットが後勝ちなので、利用側の `strokeWidth` が上書きされる。`_icon.scss` に `stroke-width` の既定は入れない。`.a--icon` は lucide 等の外部アイコンにも付き、CSS は属性より強いため 24 グリッドの `stroke-width="2"` を壊す。
- 決定: 点（ドット）は塗り円ではなく半径 0.375 の線描画円（線幅 1.5）で描く。lucide / heroicons と同じ方式で、regular では Phosphor と同じ直径 2.25 になり、`weight` に追従して 1.75 〜 2.75 に変わる。半径が最小線幅の半分以下なので穴は開かない。塗りのままにするのは `dot`（箇条書き用の大きな点）と fill 系だけ。
- 却下: `caret-down-bold` のようなウェイト別の名前分割（塗りパスの複製で、thin / light に広がらない）。viewBox 16 / 32 / 48（数字はきれいだが他ライブラリと数値互換がない）。Phosphor 忠実の bold 2.25（lucide の 2 との差は 16px 表示で 0.2px 未満なので丸める）。
- 受容: プリセットに `fill` 属性で色を付ける使い方は効かなくなり、`c` で指定する（リポジトリ内に該当なし、docs でも案内していない）。既存の太字4種は 2.25 相当から 2 へわずかに細くなる。ドット付きアイコンの bold は、Phosphor 公式 bold（ドット半径も拡大）と完全には一致しない。

## 2026-09-05: OG画像の余白は文字とロゴの見える端を実測して整える

apps/site のOG画像は、行の内部余白やロゴ内の文字位置により、指定した余白と見た目の距離が一致しない。長いタイトル・説明文の画像を確認し、生成PNG上の文字やロゴの端を実測して配置を調整した。実装は `apps/site/src/lib/ogImage.tsx` の `renderOgSvg` を参照する。

- 決定: 上下の罫線は、それぞれ画像の上端・下端から64px内側を配置の基準とする。文字やロゴとの間隔は罫線の内側の端から測る。
- 決定: タイトル上の余白と説明文との間隔は、行の内部余白を含めた見た目で整える。指定値を機械的に揃えない。
- 決定: テキストは左寄せにし、右下のロゴ側へ広く余白を取る。説明文はタイトルより小さくし、両方の字間を少し広げる。
- 決定: タイトル・説明文とも最大2行で省略し、長文がロゴの領域へ伸びるのを防ぐ。
- 決定: ロゴは黒いマークの高さが実測36px。末尾の「CSS」の最後の「S」から下の罫線まで36px、画像右端まで32pxになる配置を採用する。下位置の端数は、黒いマークより文字の下端が上にある分の補正なので、切りのよい値へ丸めない。

## 2026-09-05: apps/site のOG画像を無地レイアウトで描き直し、フォントをサブセットTTFで同梱する

サイトリニューアルに合わせて記事ページのOG画像を作り直す。従来は背景JPEGを敷いてタイトルだけを Noto Sans JP で描いており、サイト本体の書体と揃っていなかった。ローカルの `.cache/og/` はVercelのビルドで復元されず本番では効いていない一方、キーにテンプレート版や説明文を含まないため、デザイン変更後に古い画像が残る事故の原因になっていた。

- 決定: 背景JPEGをやめ、無地の背景に上下2本の罫線・タイトル・説明文・右下ロゴを satori で描く。説明文を画像に入れるのは、X のリンクカードが説明文をどこにも表示せず、画像内の説明文だけが内容を伝えるため。
- 決定: フォントをサイト本体と同じ Gen Interface JP に揃える。npm配布は woff2 のみで satori が読めないため、リリースzipのTTFを常用漢字・人名用漢字＋記事の実文字でサブセットして `src/assets/og/` にコミットする。収録文字の一覧 `og-font-chars.txt` を、サブセット化とビルド時照合が参照する唯一の正とする。
- 決定: title / description にフォント未収録の文字があればビルドを止める。satori は未収録文字を空白で描いてエラーにしないため、放置すると文字の欠けた画像が公開される。
- 決定: ローカルキャッシュ `.cache/og/` を廃止する。本番ビルドでは元々効いておらず、無地描画なら全160枚が約2秒で終わる。
- 却下: takumi への乗り換え。同一レイアウトの実測で処理時間は同等で、必要な `lineClamp`・省略記号・複数フォントのフォールバックは satori にある。sharp は Astro の画像最適化でも使うため依存からは消えない。
- 却下: Noto Sans JP をフォールバックに残す案と、ビルド時にリリースzipを取得してサブセットする案。前者は400と600で3MBを抱え続け、後者は毎回58MBの取得がCIとホスティング先のビルドで走る。
- 受容: 記事の title / description に新しい文字が入ったらビルドが失敗する。`pnpm --filter lism-site og:font` を再実行してTTFと文字一覧をコミットし直す運用になる。

## 2026-09-05: `u--divide` / `u--enclose` をコアから外し、Opt-in の追加 CSS 例として案内する

`u--divide` / `u--enclose` は `gap` と子要素の `box-shadow` で区切り線を描く仕組みで、`border` と比べて描画がやや粗く安定しない。フレックスボックスで子要素自体が折り返すと行末にも線が出るなど見え方が崩れる。並び方向が切り替わるレイアウトの区切り線は `bdw` のブレイクポイント切り替えで `border` として描けるため、コアに持つ必要は薄い。将来より良い実装が出たときに互換を抱えないためにも外す。

- 決定: `_divide.scss` を削除し、`util` prop のプリセット型からも `divide` / `enclose` を外す。
- 決定: Utility Class ドキュメントの Opt-in 節に、`@layer lism-utility` へ追加する CSS 例として残す。`u--enclose` も同じ仕組みなのでセットで移す。
- 決定: docs のパターンプレビューと templates の使用箇所は `bd` 系へ置き換える。縦並びは親 `bd-be` + 各子 `bd-bs`、横並び（Footer の Cluster）は先頭以外の子に `bd-s`（`bd-s={i > 0}`）。templates に Opt-in の CSS を持ち込まない。
- 却下: `u--divide` だけ外して `u--enclose` を残す。同じ描画方式で同じ弱点を持つ。
- 受容: 利用側で `u--divide` / `u--enclose` を使っていた箇所は、Opt-in の CSS を追加するか `bd` 系へ置き換える必要がある。changelog に破壊的変更として記載する。

## 2026-09-05: 余白トークンに `45` を追加し、`80` を削除する。10刻みは縦のリズム用、5刻みは水平方向用

余白トークンの主軸 `--s10` 〜 `--s80` は係数がフィボナッチ数列（1, 2, 3, 5, 8, 13, 21, 34）で、タイポグラフィの「縦のリズム」を作るための設計。水平方向の gap や padding はこのリズムに縛られなくてよく、5 刻みの `--s5` / `15` / `25` / `35` はそのために隣同士のちょうど中間値として置いている。`40`（40px）と `50`（64px）の間は水平方向の gap としてまだ使う範囲だが中間値がなく、逆に `80`（272px）はトークンで扱うサイズを超えていて、リポジトリ内でも使用箇所がなかった。

- 決定: `--s45: calc(var(--s-unit) * 6.5)`（≒ 52px）を追加する。既存の中間値と同じく、隣の係数 5 と 8 のちょうど中間にする。
- 決定: 5 刻みは `50` まで。`50` を超えるサイズは水平方向には使わないので中間値を置かない。「50 までは 5 刻み」で覚えやすい。
- 決定: `--s80` を削除し、主軸は `--s70`（≒ 168px）まで。これ以上のサイズはトークンではなく個別の値で指定する。
- 却下: `45` の係数を 6（48px = 3rem）にする。切りのいい数だが、中間値の規則から外れる。
- 受容: `p="80"` 等を使っていた利用側では効かなくなる。changelog に破壊的変更として記載する。

## 2026-09-05: `lts` トークンは `--lts--base` からの相対値にし、base の既定を `0em` にする

`--lts--xs` 〜 `--lts--xl` は固定の em 値で、`--lts--base` だけ変えても他は動かなかった。フォントを変えて基本字間を少し詰めたい場合、結局 5 つ全部を上書きすることになる。`xs` 〜 `xl` を `calc(var(--lts--base) ± n)` にすれば base の上書きだけで連動するが、`normal` は `calc()` に入れられないため base の既定を `0em` にする必要がある。

- 決定: `--lts--base: 0em`、`xs` 〜 `xl` は `calc(var(--lts--base) ± n)`（`n` は従来の値）。描画は `normal` と同じ。
- 決定: `--lts--base` の上書きは `:root` で行う前提にする。`var()` は宣言元の `:root` で置換されるため、子孫要素で base を上書きしても `xs` 〜 `xl` には伝わらない。
- 却下: `lts` を TOKEN_SCOPE に登録して `set--lts` で部分上書きできるようにする。用途がなく、公開クラスが増えるだけ。必要になったら 1 行で追加できる。
- 受容: 利用側が `--lts--base: normal` と書くと `xs` 〜 `xl` の `calc()` が無効になる。長さで指定することをドキュメントに明記する。

## 2026-09-05: docs の本文フォントは 16px を下限にし、広い画面でだけ少し大きくする

apps/site は `set--cqUnit` で `--REM` を流体化し、本文・サイドバー・目次・プレビュー枠のフォントを狭い幅で 16px より少し小さく（0.95rem〜1rem）していた。日本語フォントはスマホで 16px だとやや大きく見えるため日本語基準で縮める、という日本では一般的な調整だったが、英語では少し小さい印象になっていた。フォントを Inter + Noto Sans JP から Gen Interface JP に変えたことで、日本語の字面が英数字側に寄って全体に小さくなり、日英でサイズ感の差がなくなった。これで縮める理由が消え、逆に広い画面で少し大きくする方向に変えた。

- 決定: `--REM` は 16px を下限にし、幅 800px〜1000px で 16px → 16.8px（1.05rem）へ大きくする。定義は `apps/site/src/styles/_theme.scss` の `.set--cqUnit`。
- 決定: `set--cqUnit`（と対で使う `set--s`）を付けるのは記事本文（`.c--article`）だけ。サイドバー（SiteNav）・目次（TableOfContents）・プレビュー枠（PreviewArea）からは外す。下限が 1rem になったため、狭い要素に付けても root と同じ 16px にしかならない。
- 却下: 従来どおり狭い幅で 16px 未満に縮める。Gen Interface JP では日本語も英語も小さく見えすぎる。
- 受容: 800px 未満では流体化せず 16px 固定。`.c--article` の祖先にコンテナ指定がないため、cqw は実質ビューポート幅として働く。

## 2026-09-03: ドキュメントの iframe プレビューは等倍で埋め込む（zoom / transform で縮小しない）

apps/site の PreviewFrame は、狭い本文幅でも広いビューポートのレイアウトを見せるため、iframe を表示幅より広く描画して CSS zoom で縮めていた。しかし Safari 26.3 以前は親の zoom を iframe 内へ伝えないため、中身の高さにフィットさせる処理が崩れてスクロールバーが出た。補正を入れれば直るが、縮小前提の高さ計算と、旧 WebKit の zoom バグ（width・margin・calc() の扱い。Safari 26.4 で修正）への対処が残り続ける。

- 決定: 中身は等倍で埋め込む。サイズ切替はモバイル 380px・タブレット 640px・デスクトップは本文幅で、いずれも本物のビューポート幅になる。広い画面で見たい場合は「別タブで表示」を使う。
- 却下: zoom を残して補正する案（コミット cf2de844 の状態）。Chrome と旧 Safari で挙動が分かれ、幅の整数丸めで 1px 未満のはみ出しが出るなど保守が重い。
- 却下: transform: scale() での縮小。iframe 内の dialog アニメーションで表示位置がずれる。
- 受容: 目次ありの MDX ページでは本文幅（880px）までしか見えない。

## 2026-08-15: Chatを`@lism-css/ui`から削除し、docsの作例へ移す

Chatはprimitives（Grid・Frame・Flow・Decorator・cbox）の組み合わせと少量のCSSで組めるため、汎用UI語彙でもJS付きインタラクティブUIでもなく、パッケージ内で立ち位置が浮いていた。時刻・既読・footer等の要求も発散しやすい。

- 決定: `@lism-css/ui`から削除し、docsの`/ui/block-examples/chat/`で`b--chat`の作例として紹介する。作例のCSSを`@layer lism-block`へコピーすれば、マークアップ変更なしで同じ見た目になる。
- 決定: パッケージに残すかの線引きは「手で書けない仕組みを持つか」。ShapeDividerはSVGパス生成があるので残す。
- 決定: docsの`ui/`は「Blocks / Block Examples / Components」の3分類にする。
- 却下: `c--chat`として紹介する。`b--`は「ベーススタイルをCSS管理する基礎部品」の印でパッケージ提供物専用ではない。利用者のプロジェクトにも`lism-block`レイヤーがあり、コピーしたCSSを`lism-block`へ置き`lism-custom`で上書きする運用はアーキテクチャそのまま。
- 却下: Patterns / Parts セクションの新設。上記3分類に吸収した。

## 2026-08-15: `@lism-css/ui`のクラスを`c--*`から`b--*`へ一括移行し、`c--`のまま残すものを固定する

#545の規約でuiの提供物は`b--`（ベーススタイルをCSS管理）と決めたため、#550で9ファミリーのプレフィックスを一括で置き換えた。

- 決定: 後方互換の`c--*`併記はしない破壊的変更。要素`_x`・モディファイア`--x`の形式は不変。`b--navMenu` / `b--shapeDivider`のcamelCaseは維持する。
- 決定: レイヤー順は`lism-base → lism-block → lism-trait → lism-primitive → lism-component → lism-custom → lism-utility`。`b--`のベーススタイルは利用者が明示的に足す`is--*` / `has--*` / `l--*`等に常に負ける位置に置く。
- 決定: `skills/lism-css-guide/antipatterns.md`の`.c--button:hover`は`c--`のまま残す。Custom Class一般のNG例であり、`b--`化すると「`b--`はCSS管理してよい」規約と矛盾する。
- 決定: docs独自クラス（`c--snsLinks`・`c--preview_*`等）、templates独自クラス（`c--ryokan-*`・`c--header_menuNav`等）、`packages/plugin/src/purge/shared.test.ts`のフィクスチャも`c--`のまま。
- 決定: primitiveクラスを残すかの基準。primitiveの既定宣言をそのまま使うなら残し（Alert / Callout / Avatar / Tabs）、異なる宣言が要るなら外してCSSが自前で持つ（Button）。レイアウトが任意なら既定出力を廃止し`layout` propで指定する（Accordion Root）。
- 決定: `u--cbox`はpropsのまま維持し、色味の調整はCSS側の`--cbox-*`変数で行う。cboxのcolor-mix計算式をui側へ複製しない。

## 2026-08-05: mockupの共有viteキャッシュはrename占有で排他する

`@lism-css/mockup`は依存最適化のviteキャッシュを複数プロセスで共有する。viteはキャッシュのcommitを連続の`renameSync`で行い、プロセス間の排他が無いため、同じcacheDirへ同時に書くと片方がENOTEMPTY / ENOENTで失敗し、負けた側はブラウザ表示が壊れる。

- 決定: 共有パスを`<共有パス>.inuse.<pid>`へrenameして原子的に占有する（`packages/mockup/src/core/cache-claim.ts`の`claimViteCacheDir`）。各プロセスが書くのは自分のpid名のディレクトリだけで、renameの元になるのは共有パスと死んだpidの残骸のみ。残骸は次の起動で回収する。
- 決定: 占有できなければ`null`を返し、呼び出し側はプロセス固有ディレクトリへ退避する。キャッシュ再利用を諦めて毎回事前バンドルするだけで機能は同じなので、この関数は例外を投げない。
- 却下: stale回収専用の第2ロックで直列化する案。回収用mutexがクラッシュで残ると、以後の回収が止まる。
- 却下: stale回収をせず、取れなければ常に退避する案。クラッシュ1回でOSのtmp掃除まで共有キャッシュが使えなくなる。
- 受容: pid再利用によるABA。生きたプロセスの占有ディレクトリを他プロセスが動かす操作は存在しないが、pidの再利用だけは区別できない。
